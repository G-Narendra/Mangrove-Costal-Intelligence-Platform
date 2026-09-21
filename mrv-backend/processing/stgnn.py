import pandas as pd
import numpy as np
import os
import tensorflow as tf
from tensorflow.keras.models import load_model

from config import MODELS_DIR, GRAPH_EDGES_PATH, node_feature_columns

# We need to manually register the custom GraphConvolutionLayer 
# if the model was saved with it.
class GraphConvolutionLayer(tf.keras.layers.Layer):
    def __init__(self, output_dim, activation=None, adjacency_matrix=None, **kwargs):
        super(GraphConvolutionLayer, self).__init__(**kwargs)
        self.output_dim = output_dim
        self.activation = tf.keras.activations.get(activation)
        self.dense_layer = None
        self.adjacency_matrix_np = adjacency_matrix
        self.adj_constant = None

    def build(self, input_shape):
        self.dense_layer = tf.keras.layers.Dense(self.output_dim, use_bias=True)
        if self.adjacency_matrix_np is not None:
             self.adj_constant = tf.constant(self.adjacency_matrix_np, dtype=tf.float32)
        else:
             # Default dummy matrix if not provided during init (e.g. at load time)
             # This means model might need re-compiling/surgery, but we try anyway
             num_nodes = input_shape[-2]
             self.adj_constant = tf.constant(np.eye(num_nodes), dtype=tf.float32)
        self.built = True

    def call(self, inputs):
        transformed_features = self.dense_layer(inputs)
        # inputs shape: (batch_size, num_nodes, num_features)
        
        # We need to do: A * XW
        # Permute to (batch_size, output_dim, num_nodes)
        permuted = tf.transpose(transformed_features, perm=[0, 2, 1])
        
        # Multiply: (num_nodes, num_nodes) @ (num_nodes, batch_size * output_dim)
        # Actually in Keras: tf.matmul(A, X) works if we reshape
        # But for inference, reshaping is tricky. 
        # So we use tensordot
        output = tf.tensordot(self.adj_constant, transformed_features, axes=[[1], [1]])
        # output is now (num_nodes, batch_size, output_dim)
        # Permute back to (batch_size, num_nodes, output_dim)
        output = tf.transpose(output, perm=[1, 0, 2])
        
        if self.activation is not None:
            output = self.activation(output)
        return output

    def get_config(self):
        config = super().get_config()
        config.update({
            "output_dim": self.output_dim,
            "activation": tf.keras.activations.serialize(self.activation),
        })
        return config

    def compute_output_shape(self, input_shape):
        """Mandatory for TimeDistributed/Wrapper layers in some Keras/TF versions."""
        return (input_shape[0], input_shape[1], self.output_dim)

def setup_adjacency_matrix(df: pd.DataFrame, edges_df: pd.DataFrame):
    """
    Creates an adjacency matrix from the graph edges for the STGNN.
    Returns the matrix and a patch_id to matrix index map.
    """
    unique_patches = sorted(df['patch_id'].unique())
    num_patches = len(unique_patches)
    patch_to_idx = {pid: i for i, pid in enumerate(unique_patches)}
    
    A = np.zeros((num_patches, num_patches))
    
    for _, row in edges_df.iterrows():
        src = row['source_patch_id']
        dst = row['destination_patch_id']
        if src in patch_to_idx and dst in patch_to_idx:
            # We treat structural connectivity as undirected for the baseline GCN
            i, j = patch_to_idx[src], patch_to_idx[dst]
            A[i, j] = 1.0
            A[j, i] = 1.0  
            
    # Add self loops
    np.fill_diagonal(A, 1.0)
    
    # Normalize: D^(-0.5) * A * D^(-0.5)
    row_sum = np.sum(A, axis=1)
    D_inv_sqrt = np.power(row_sum, -0.5, where=row_sum!=0)
    D_inv_sqrt[np.isinf(D_inv_sqrt)] = 0.
    D_inv_sqrt_mat = np.diag(D_inv_sqrt)
    
    A_normalized = D_inv_sqrt_mat.dot(A).dot(D_inv_sqrt_mat)
    return A_normalized, patch_to_idx

def predict_future_carbon(historical_df: pd.DataFrame, current_df: pd.DataFrame) -> pd.DataFrame:
    """
    Uses the Spatio-Temporal Graph Neural Network to predict a 12-MONTH sequence
    of carbon absorption using an auto-regressive approach.
    """
    model_path = os.path.join(MODELS_DIR, 'STGNN_MODEL.h5')
    if not os.path.exists(model_path):
        print("STGNN Model not found. Skipping future forecast.")
        return current_df
        
    print("Initializing STGNN 12-Month Dynamic Forecast...")
    
    # Combine history and current to get the last 3 months for the initial seed
    full_df = pd.concat([historical_df, current_df], ignore_index=True)
    full_df['date'] = pd.to_datetime(full_df['date'])
    full_df = full_df.sort_values('date')
    
    # Get the latest 3 unique months
    unique_months = sorted(full_df['date'].dt.to_period('M').unique())
    if len(unique_months) < 3:
        print("Insufficient historical data for STGNN (requires 3 months). Skipping forecast.")
        return current_df
        
    seed_months = unique_months[-3:]
    seed_dates = [m.to_timestamp() for m in seed_months]
    
    # Filter DF to those 3 seed months
    predict_df = full_df[full_df['date'].isin(seed_dates)].copy()
    
    # Load connectivity
    if not os.path.exists(GRAPH_EDGES_PATH):
        print("Graph edges not found. Cannot build STGNN. Skipping forecast.")
        return current_df
        
    edges_df = pd.read_csv(GRAPH_EDGES_PATH)
    A_norm, patch_map = setup_adjacency_matrix(predict_df, edges_df)
    
    # Define features. We MUST include monthly_absorption_tCO2e_ha to feed it back.
    # We exclude ID and Date.
    feature_columns = [col for col in node_feature_columns if col not in ['patch_id', 'date']]
    
    # Find the index of the target feature in the feature vector
    target_feat_idx = -1
    if 'monthly_absorption_tCO2e_ha' in feature_columns:
        target_feat_idx = feature_columns.index('monthly_absorption_tCO2e_ha')
    
    # Missing columns should be zeroed out
    for col in feature_columns:
        if col not in predict_df.columns:
            predict_df[col] = 0.0
            
    num_patches = len(patch_map)
    num_features = len(feature_columns)
    
    # Start with the initial seed (1, 3, num_patches, num_features)
    X_window = np.zeros((1, 3, num_patches, num_features))
    for t_idx, current_date in enumerate(seed_dates):
        df_at_t = predict_df[predict_df['date'] == current_date]
        for _, row in df_at_t.iterrows():
            pid = row['patch_id']
            if pid in patch_map:
                p_idx = patch_map[pid]
                X_window[0, t_idx, p_idx, :] = row[feature_columns].values
                
    # Load model
    try:
        model = load_model(
            model_path, 
            custom_objects={'GraphConvolutionLayer': GraphConvolutionLayer}
        )
        
        # 12-Month Auto-regressive Loop
        # Row: Patches, Column: Months
        all_forecasts = np.zeros((num_patches, 12)) 
        
        current_X = X_window.copy()
        
        print(f"Running 12-month auto-regressive inference for {num_patches} patches...")
        print(f"Initial seed X_window mean: {np.mean(current_X):.6f}")
        
        for m in range(12):
            y_pred = model.predict(current_X, verbose=0) # Shape: (1, num_patches)
            month_preds = y_pred[0]
            
            # Diagnostic: check for zero output
            if m == 0 and np.all(month_preds == 0):
                print(f"Warning: STGNN month 0 prediction is all zeros!")
                
            all_forecasts[:, m] = month_preds
            
            # Prepare next window: Shift T-2, T-1, T-0 to T-1, T-0, T+1
            next_X = np.zeros((1, 3, num_patches, num_features))
            next_X[0, 0, :, :] = current_X[0, 1, :, :] # T-1
            next_X[0, 1, :, :] = current_X[0, 2, :, :] # T-0
            
            # For T+1, we use the prediction for the target feature,
            # and reuse the latest known environmental features (Sentinel/Lidar)
            # as a stable driver baseline.
            next_X[0, 2, :, :] = current_X[0, 2, :, :] 
            if target_feat_idx != -1:
                next_X[0, 2, :, target_feat_idx] = month_preds
            
            current_X = next_X
            
        # Map predictions back to the current DataFrame patches
        # We store the 12-month sequence as a list in a new column
        current_df['forecast_sequence'] = None
        current_df['forecast_sequence'] = current_df['forecast_sequence'].astype(object)
        
        # Also keep the first month for backward compatibility
        current_df['forecast_absorption_tCO2e_ha'] = 0.0
        
        for pid, p_idx in patch_map.items():
            sequence = all_forecasts[p_idx].tolist()
            mask = current_df['patch_id'] == pid
            # We use a trick to assign lists to cells in pandas
            for idx in current_df[mask].index:
                current_df.at[idx, 'forecast_sequence'] = sequence
                current_df.at[idx, 'forecast_absorption_tCO2e_ha'] = sequence[0]
            
        print(f"Dynamic 12-month prediction complete for {num_patches} patches.")
    except Exception as e:
        print(f"STGNN 12-Month Inference failed: {e}")
        import traceback
        traceback.print_exc()
        
    return current_df
