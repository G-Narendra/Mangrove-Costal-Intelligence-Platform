# Ethics Forms Reference Guide (MCIP)

This guide contains the exact text and checkmark values you should fill into the two ethics files:
1. `Ethics_Screening_Form.docx`
2. `Ethics_long_form.docx`

---

## Part 1: Ethics Screening Form

### Table 0: Student & Supervisor Details
*   **Student Name:** `Naren [Your Last Name]`
*   **Email:** `[Your Student Email]`
*   **Research project title:** `Mangrove Carbon Intelligence Platform (MCIP)`
*   **Programme of study/module:** `MSc Data Science & Artificial Intelligence — CST4275 Individual Project` *(Pre-filled)*
*   **Supervisor Name:** `Dr. Krishnadas Nanath` *(Pre-filled)*
*   **Email:** `K.Nanath@mdx.ac.ae` *(Pre-filled)*

### Table 1: Self-Assessment Questions
*Check **No** for all 10 questions. (These are already pre-filled in the template).*

### Student Signature Section
*   **Student Signature:** `/s/ Naren` *(or sign physically)*
*   **Date:** `29/06/2026`

---

## Part 2: Ethics Long Form

### Section 1 – Applicant Details (Table 0)

#### 1.1 Details of Applicant
*   **Name:** `Naren [Your Last Name]`
*   **Department/Position:** `MSc Student (Data Science & AI)`
*   **Qualifications:** `BSc`
*   **Email:** `[Your Student Email]`
*   **Tel:** `[Your Phone Number]`

#### 1.2 Details of Supervisor
*   **Name:** `Dr. Krishnadas Nanath`
*   **Programme of study/module:** `MSc Data Science & AI (CST4275)`
*   **Qualifications:** `PhD`
*   **Email:** `K.Nanath@mdx.ac.ae`
*   **Tel:** `[Supervisor Phone]`

---

### Section 2 – Details of the Proposed Study (Table 1)

#### 2.1 Research project title
`Mangrove Carbon Intelligence Platform (MCIP): Automated Blue Carbon MRV Using Spatio-Temporal Graph Neural Networks and Explainable AI`

#### 2.2 Proposed start date
`01 June 2026`

#### 2.3 Proposed end date
`01 October 2026`

#### 2.4 Describe the aim and rationale of this study?
> **Aim:** To design, develop, and evaluate the Mangrove Carbon Intelligence Platform (MCIP), an automated digital Measurement, Reporting, and Verification (MRV) system that leverages Spatio-Temporal Graph Neural Networks (ST-GNNs) and Explainable AI (SHAP) to estimate above-ground biomass (AGB) and soil organic carbon (SOC) stocks in mangrove ecosystems.
>
> **Rationale:** Mangroves are critical blue carbon sinks, sequestering up to ten times more carbon per hectare than terrestrial forests. However, traditional carbon MRV relies on manual, labor-intensive forestry surveys that cost between $150,000 and $500,000 per project and take months to complete. This high cost and low scalability create a bottleneck for carbon credit projects under standards like Verra (VM0033). While remote sensing (using NASA GEDI and ESA Sentinel-1/2) offers a scalable alternative, satellite observations are frequently obstructed by cloud cover in tropical regions and suffer from spatial gaps. MCIP addresses these gaps using deep neural imputation and Spatio-Temporal Graph Neural Networks, which exploit the spatial and temporal dependencies of coastal ecosystems. Furthermore, the platform integrates game-theoretic Explainable AI (SHAP) to explain model predictions, transforming a 'black box' machine learning model into a transparent, auditable system. This reduces verification costs by up to 70%, accelerates credit issuance, and increases transparency for institutional carbon buyers.

#### 2.5 Discuss the research questions and/or hypotheses of this study?
> This study addresses three key research questions:
> 1. **RQ1:** To what extent can a Spatio-Temporal Graph Neural Network (ST-GNN) outperform traditional machine learning models (such as Random Forest and XGBoost) and non-spatial deep learning models (such as LSTMs) in estimating above-ground biomass and soil organic carbon in fragmented mangrove ecosystems?
> 2. **RQ2:** What is the optimal deep learning architecture for imputing missing spatial and temporal remote sensing observations caused by cloud cover and orbital gaps in coastal wetland zones, and what is its impact on subsequent carbon stock estimation accuracy?
> 3. **RQ3:** How can game-theoretic post-hoc explainability methods (specifically SHAP) be integrated into the MRV pipeline to satisfy the auditability requirements of international carbon standards (such as Verra VM0033) and provide actionable insights into the environmental drivers of carbon sequestration?

#### 2.6 Details of study design, data collection methods...
> **Study Design & Data Collection:**
> This research is an empirical, product-based development project utilizing secondary data from open-source satellite sensors:
> 
> 1. **Remote Sensing Data Collection:**
>    *   **ESA Sentinel-1** (C-band Synthetic Aperture Radar) for cloud-penetrating structural and canopy density measurements.
>    *   **ESA Sentinel-2** (Multispectral) for vegetation greenness indices (NDVI, NDRE, EVI) and water index (NDWI).
>    *   **NASA GEDI** (Global Ecosystem Dynamics Investigation) spaceborne LiDAR waveforms for canopy height calibration.
> 
> 2. **Ground-Truth Reference Data:**
>    *   Secondary ground-truth above-ground biomass (AGB) and soil organic carbon (SOC) datasets sourced from published scientific literature, global mangrove databases (such as the Global Mangrove Watch), and regional reports (such as the UAE National Blue Carbon Programme progress report).
> 
> 3. **Machine Learning Modeling & Pipeline:**
>    *   **Spatial Imputation:** Multi-temporal autoencoders and convolutional neural networks to fill cloud-obstructed and orbital data gaps.
>    *   **Graph Construction:** Modelling the coastal zone as a spatial graph where nodes represent geographic patches (with Sentinel spectral features) and edges represent spatial adjacency and hydrological connections.
>    *   **Carbon Stock Estimation:** Implementing a Spatio-Temporal Graph Neural Network (ST-GNN) that propagates features across space and models temporal biomass variations.
>    *   **Model Explanation:** Integrating SHAP (Shapley Additive exPlanations) to calculate feature importances and local explanations for each carbon estimation, ensuring compliance with verification standards.
> 
> **References:**
> *   *Dubayah, R., et al. (2020).* The Global Ecosystem Dynamics Investigation: High-resolution laser ranging of the Earth's forests and topography. *Science of Remote Sensing*.
> *   *Kipf, T. N., & Welling, M. (2017).* Semi-supervised classification with graph convolutional networks. *ICLR*.
> *   *Lundberg, S. M., & Lee, S. I. (2017).* A unified approach to interpreting model predictions. *NIPS*.

---

### Section 3 – Initial Checklist (Table 2)

*   **3.1 Does this research involve human participants:** Mark `No [X]`
*   **3.2 Does this research involve secondary data collection:** Mark `Yes [X]`
*   **3.2.1 Do you have the necessary approval to access the data:** Mark `Yes [X]`
    *   *Justification text to insert under 3.2.1:* `All satellite data (Sentinel-1/2, GEDI) and ground-truth validation datasets are publicly available, open-source, and licensed for academic research use.`
*   **3.3 Outputs not likely to cause harm and in-line with local legislation:** Mark `Yes [X]`
*   **3.4 Will the study require data collection by proxy:** Mark `No [X]`

---

### Section 4 – Anonymity, confidentiality, and consent (Table 3)

*   **4.1 Collect/analyse personal or sensitive personal data:** Mark `No [X]`
*   **4.2 Will lists of identity numbers/codes... be stored securely:** Mark `NA [X]`
*   **4.3 Will you tell participants that their data will be treated confidentially:** Mark `NA [X]`
*   **4.4 Obtain Written Informed Consent directly from research participants:** Mark `NA [X]`
*   **4.5 Obtain Written Informed Consent directly from gatekeepers:** Mark `NA [X]`
*   **4.6 Inform participants that participation is voluntary:** Mark `NA [X]`
*   **4.7 Process for managing withdrawal of consent:** Mark `NA [X]`
*   **4.8 Research/data collection without knowledge or consent:** Mark `No [X]`
*   **4.9 Provide a Written Debriefing Sheet:** Mark `NA [X]`
*   **4.10 Consent from people appearing in visual data:** Mark `No [X]`
*   **4.11 Audio or video record interviews and/or observations:** Mark `No [X]`
*   **4.12 Involve participants responding to internet surveys, social media, etc.:** Mark `No [X]`
*   **4.13 Do you have a Data Management Plan:** Mark `Yes [X]`
    *   *Details text to insert under 4.13:* `Research data is stored on a secure, local system with automated cloud backups. Only the researcher and supervisor have access. Codes are stored in private GitHub repositories. Data will be archived for five years following publication/grading and then securely destroyed.`

---

### Section 5 – Avoiding harm: risk assessment (Table 4)

*   **5.1 Use an experimental research design (assigning participants to conditions):** Mark `No [X]`
*   **5.2 Involve discussion of sensitive topics:** Mark `No [X]`
*   **5.3 Pain or more than mild discomfort likely to result:** Mark `No [X]`
*   **5.4 Induce psychological stress or anxiety:** Mark `No [X]`
*   **5.5 Involve prolonged and repetitive testing (of humans):** Mark `No [X]`
*   **5.6 Conducted off-site (outside Dubai campus premises):** Mark `No [X]` *(Research is purely computer-based)*
*   **5.7 Alone with individual participants placing you at risk:** Mark `NA [X]`
*   **5.8 Methodology raises adverse risks/safety issues for you or others:** Mark `No [X]`
*   **5.9 Outputs likely to cause harm to others:** Mark `No [X]`

---

### Section 6 – Research Sponsorship and/or Collaboration (Table 5)

*   **6.1 Research has a sponsor with ethical implications:** Mark `No [X]`
*   **6.2 Involve an international collaborator or research overseas:** Mark `No [X]`
*   **6.3 Approval from an External Research Ethics Committee:** Mark `No [X]`
*   **6.4 Conducted in a language other than English:** Mark `No [X]`

---

### Section 7 – Other Issues (Table 6)

*   **7.1 Does the research involve any ethical and/or legal issues not already covered:** Mark `No [X]`
*   **7.2 Do you require training on the requirements of GDPR:** Mark `No [X]`
*   **7.3 Risks to safety for you or others greater than normal life:** Mark `No [X]`
*   **7.4 Participants receive any reimbursements or payments:** Mark `No [X]`
*   **7.5 Conflict of interests to be declared:** Mark `No [X]`

---

### Section 8 – Pre-Submission Checklist (Table 7)

*   **Participant Information Sheet:** Mark `NA [X]`
*   **Informed Consent Sheet:** Mark `NA [X]`
*   **Debriefing Sheet:** Mark `NA [X]`
*   **Copy of questionnaire/interview guide:** Mark `NA [X]`
*   **Letter of permission:** Mark `NA [X]`
*   **Evidence of external approval – for access to secondary data:** Mark `NA [X]`
*   **Completed Risk Assessment Form:** Mark `NA [X]`
*   **Disclosure of Conflict of Interests:** Mark `NA [X]`
*   **Evidence of external approval – from external ethics body:** Mark `NA [X]`
*   **Evidence of relevant licence for research with animals:** Mark `NA [X]`

---

### Section 9: Declarations

*   **Principal Investigator or Student Researcher Name:** `Naren`
*   **Signature:** `/s/ Naren` *(or sign physically)*
*   **Date:** `29 June 2026`
