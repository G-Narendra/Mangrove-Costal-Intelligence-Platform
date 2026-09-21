"""
generate_mcip_poster.py - Institutional Academic Research Poster Generator
MSc Data Science & AI | CST4090 Thesis | Middlesex University Dubai
Author: Narendra Gandikota | Supervisor: Dr. Krishnadas Nanath
Target: 44" x 44" Square Format (Publication Ready)
"""

import os, sys, math
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# ---------------------------------------------------------------------------
# PATH CONFIGURATION
# ---------------------------------------------------------------------------
ROOT_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTER_DIR  = os.path.join(ROOT_DIR, "posters")
PPT_DIR     = os.path.join(POSTER_DIR, "ppt")
OUT_PPTX    = os.path.join(PPT_DIR, "MCIP_Poster.pptx")
os.makedirs(PPT_DIR, exist_ok=True)

MDX_LOGO    = os.path.join(POSTER_DIR, "mdx logo.png")
MRV_LOGO    = os.path.join(ROOT_DIR, "mrv", "public", "logo.png")
FIG1_MAP    = os.path.join(ROOT_DIR, "Visuals Notebooks", "Stage_1_Mangrove_Pixels_Predicted.png")
FIG2_GRAPH  = os.path.join(ROOT_DIR, "Visuals Notebooks", "Stage_3_NetworkX_Graph_of_Sedimental_and_Tidal Connectivity.png")
FIG3_DASH   = os.path.join(ROOT_DIR, "Visuals Notebooks", "web_Dashboard.png")
QR_CODE     = os.path.join(PPT_DIR, "qr_code.png")

# ---------------------------------------------------------------------------
# COLOR PALETTE (Modern Academic & High-Tech Ecological Theme)
# ---------------------------------------------------------------------------
NAVY_DEEP   = RGBColor(0x07, 0x12, 0x24)   # Midnight Navy for header/footer
NAVY_CARD   = RGBColor(0x0B, 0x1E, 0x38)   # Rich navy for formula & stat cards
NAVY_ACCENT = RGBColor(0x13, 0x2A, 0x4D)   # Subtle darker blue
PURPLE_HEAD = RGBColor(0x3E, 0x12, 0x7A)   # Academic Royal Purple header strip
PURPLE_LIGHT= RGBColor(0xF3, 0xEE, 0xFA)   # Very soft purple tint
EMERALD     = RGBColor(0x00, 0xD2, 0x84)   # Vibrant Ecological Green (Metrics & Ticks)
CYAN_TEAL   = RGBColor(0x00, 0xB4, 0xD8)   # Oceanic Cyan (Lines & Badges)
RED_MDX     = RGBColor(0xD2, 0x12, 0x2E)   # Official Middlesex University Red
GOLD        = RGBColor(0xFA, 0xB0, 0x05)   # Warning / Gold accent
WHITE       = RGBColor(0xFF, 0xFF, 0xFF)   # Pure White
BG_PANEL    = RGBColor(0xF8, 0xFA, 0xFC)   # Ultra-light slate background
CARD_BG     = RGBColor(0xFF, 0xFF, 0xFF)   # White cards
BORDER      = RGBColor(0xCB, 0xD5, 0xE1)   # Slate-300 border
BORDER_DARK = RGBColor(0x1E, 0x3A, 0x8A)   # Dark border accent
TEXT_DARK   = RGBColor(0x0F, 0x17, 0x2A)   # Slate-900 (High-contrast text)
TEXT_MUTED  = RGBColor(0x47, 0x55, 0x69)   # Slate-600 (Secondary text)
TEXT_LIGHT  = RGBColor(0x94, 0xA3, 0xB8)   # Slate-400 (Muted dark theme text)
TBL_HDR     = RGBColor(0x0B, 0x1A, 0x38)   # Table header deep navy
TBL_ALT     = RGBColor(0xF1, 0xF5, 0xF9)   # Table alternate row slate-100
HL_ROW      = RGBColor(0xD1, 0xFA, 0xE5)   # Emerald row highlight for ST-GNN

FONT_T = "Calibri"     # Title & Headers
FONT_H = "Calibri"     # Subheaders
FONT_B = "Calibri"     # Body text
FONT_M = "Consolas"    # Monospace equations

# ---------------------------------------------------------------------------
# INITIALIZE 44" x 44" SLIDE
# ---------------------------------------------------------------------------
prs = Presentation()
prs.slide_width  = Inches(44.0)
prs.slide_height = Inches(44.0)
slide = prs.slides.add_slide(prs.slide_layouts[6])  # Blank layout

W, H = 44.0, 44.0
MARGIN = 0.50

def no_line(shape):
    shape.line.fill.background()

def draw_rect(x, y, w, h, fill=None, line_color=None, line_width=1.0, round_rect=False):
    st = MSO_SHAPE.ROUNDED_RECTANGLE if round_rect else MSO_SHAPE.RECTANGLE
    s = slide.shapes.add_shape(st, Inches(x), Inches(y), Inches(w), Inches(h))
    if round_rect:
        try: s.adjustments[0] = 0.08
        except: pass
    if fill is None:
        s.fill.background()
    else:
        s.fill.solid()
        s.fill.fore_color.rgb = fill
    if line_color is None:
        no_line(s)
    else:
        s.line.color.rgb = line_color
        s.line.width = Pt(line_width)
    s.shadow.inherit = False
    return s

def draw_text(x, y, w, h, paras, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, line_spacing=1.15, pad=0.0):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = Inches(pad)
    first = True
    for para in paras:
        if isinstance(para, dict):
            para = [para]
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.alignment = align
        p.line_spacing = line_spacing
        p.space_after = Pt(2)
        p.space_before = Pt(0)
        for r_dict in para:
            run = p.add_run()
            run.text = r_dict.get('text', '')
            run.font.size = Pt(r_dict.get('size', 14))
            run.font.bold = r_dict.get('bold', False)
            run.font.italic = r_dict.get('italic', False)
            run.font.name = r_dict.get('font', FONT_B)
            run.font.color.rgb = r_dict.get('color', TEXT_DARK)
    return tb

def add_section_header(x, y, w, number_str, title_str):
    h = 1.05
    # Purple container pill
    draw_rect(x, y, w, h, fill=PURPLE_HEAD, line_color=None, round_rect=True)
    # Left cyan accent bar
    draw_rect(x, y, 0.22, h, fill=CYAN_TEAL)
    # Circular number badge
    d = 0.68
    num_x = x + 0.35
    num_y = y + (h - d) / 2
    draw_rect(num_x, num_y, d, d, fill=EMERALD, round_rect=True)
    num_shp = slide.shapes[-1]
    num_shp.adjustments[0] = 0.5
    tf = num_shp.text_frame
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = number_str
    r.font.size = Pt(24)
    r.font.bold = True
    r.font.color.rgb = NAVY_DEEP
    r.font.name = FONT_H

    # Title text
    tx = num_x + d + 0.28
    tw = w - (tx - x) - 0.20
    draw_text(tx, y, tw, h,
              [[{'text': title_str, 'size': 26, 'bold': True, 'color': WHITE, 'font': FONT_H}]],
              anchor=MSO_ANCHOR.MIDDLE)
    return h

def add_mini_label(x, y, w, label_text, color=PURPLE_HEAD):
    draw_rect(x, y + 0.05, 0.12, 0.32, fill=CYAN_TEAL)
    draw_text(x + 0.22, y, w - 0.22, 0.42,
              [[{'text': label_text, 'size': 15.5, 'bold': True, 'color': color, 'font': FONT_H}]],
              anchor=MSO_ANCHOR.MIDDLE)
    return 0.46

def add_stat_card(x, y, w, h, stat_value, stat_label, value_color=EMERALD):
    draw_rect(x, y, w, h, fill=NAVY_CARD, line_color=CYAN_TEAL, line_width=1.0, round_rect=True)
    draw_text(x + 0.10, y + 0.10, w - 0.20, h * 0.56,
              [[{'text': stat_value, 'size': 27, 'bold': True, 'color': value_color, 'font': FONT_T}]],
              align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.BOTTOM)
    draw_text(x + 0.10, y + h * 0.58, w - 0.20, h * 0.40,
              [[{'text': stat_label, 'size': 13, 'bold': False, 'color': WHITE, 'font': FONT_B}]],
              align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.TOP, line_spacing=1.05)

def add_table_data(x, y, w, rows, col_fractions, font_size=13, hdr_size=14, row_height=0.52, hdr_height=0.60, highlight_idx=None):
    num_rows = len(rows)
    num_cols = len(rows[0])
    total_h = hdr_height + row_height * (num_rows - 1)
    gt = slide.shapes.add_table(num_rows, num_cols, Inches(x), Inches(y), Inches(w), Inches(total_h))
    tbl = gt.table
    for c_idx, frac in enumerate(col_fractions):
        tbl.columns[c_idx].width = Inches(w * frac)
    tbl.rows[0].height = Inches(hdr_height)
    for r_idx in range(1, num_rows):
        tbl.rows[r_idx].height = Inches(row_height)

    # Header
    for c_idx in range(num_cols):
        cell = tbl.cell(0, c_idx)
        cell.margin_left = Inches(0.08)
        cell.margin_right = Inches(0.08)
        cell.margin_top = Inches(0.04)
        cell.margin_bottom = Inches(0.04)
        cell.vertical_anchor = MSO_ANCHOR.MIDDLE
        cell.fill.solid()
        cell.fill.fore_color.rgb = TBL_HDR
        tf = cell.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.LEFT if c_idx == 0 else PP_ALIGN.CENTER
        r = p.add_run()
        r.text = str(rows[0][c_idx])
        r.font.size = Pt(hdr_size)
        r.font.bold = True
        r.font.color.rgb = WHITE
        r.font.name = FONT_H

    # Rows
    for r_idx in range(1, num_rows):
        is_hl = (highlight_idx is not None and r_idx == highlight_idx)
        bg = HL_ROW if is_hl else (TBL_ALT if r_idx % 2 == 0 else WHITE)
        text_color = PURPLE_HEAD if is_hl else TEXT_DARK
        for c_idx in range(num_cols):
            cell = tbl.cell(r_idx, c_idx)
            cell.margin_left = Inches(0.08)
            cell.margin_right = Inches(0.08)
            cell.margin_top = Inches(0.04)
            cell.margin_bottom = Inches(0.04)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            cell.fill.solid()
            cell.fill.fore_color.rgb = bg
            tf = cell.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            p.alignment = PP_ALIGN.LEFT if c_idx == 0 else PP_ALIGN.CENTER
            r = p.add_run()
            r.text = str(rows[r_idx][c_idx])
            r.font.size = Pt(font_size)
            r.font.bold = is_hl
            r.font.color.rgb = text_color
            r.font.name = FONT_B
    return total_h

# ===========================================================================
# 1. CANVAS BASE
# ===========================================================================
draw_rect(0, 0, W, H, fill=WHITE)

# ===========================================================================
# 2. HEADER BANNER (Y: 0.00" -> 5.25")
# ===========================================================================
HDR_H = 5.25
draw_rect(0, 0, W, HDR_H, fill=NAVY_DEEP)

# Geometric subtle background styling
draw_rect(W - 16.5, 0, 16.5, HDR_H, fill=NAVY_CARD)
# Decorative cyan accent lines
draw_rect(0, HDR_H - 0.16, W, 0.16, fill=CYAN_TEAL)
draw_rect(0, 0, 0.35, HDR_H - 0.16, fill=EMERALD)

# Constellation tech dots on top-right background
dot_coords = [(31.2, 1.1), (32.5, 0.7), (33.8, 1.5), (33.2, 2.4), (34.6, 3.1), (31.8, 3.7)]
for dx, dy in dot_coords:
    ds = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(dx), Inches(dy), Inches(0.12), Inches(0.12))
    ds.fill.solid()
    ds.fill.fore_color.rgb = CYAN_TEAL
    no_line(ds)

# Header Left Content
hx = MARGIN + 0.25
draw_text(hx, 0.32, 28.5, 0.46,
          [[{'text': "MIDDLESEX UNIVERSITY DUBAI  •  FACULTY OF SCIENCE & TECHNOLOGY",
             'size': 17.5, 'bold': True, 'color': CYAN_TEAL, 'font': FONT_H}]])

draw_text(hx, 0.76, 30.0, 1.85,
          [[{'text': "Mangrove Carbon Intelligence Platform (MCIP)",
             'size': 47, 'bold': True, 'color': WHITE, 'font': FONT_T}]],
          line_spacing=0.96)

draw_text(hx, 2.68, 29.5, 0.82,
          [[{'text': "Spatio-Temporal Graph Neural Networks for Automated Blue Carbon MRV in UAE Mangrove Ecosystems",
             'size': 20, 'bold': False, 'color': EMERALD, 'font': FONT_H}]],
          line_spacing=1.05)

draw_text(hx, 3.65, 29.5, 0.48,
          [[{'text': "Narendra Gandikota", 'size': 16.5, 'bold': True, 'color': WHITE},
            {'text': "  |  NG661@live.mdx.ac.uk  |  MSc Data Science & AI CST4090 Thesis  |  Supervisor: ", 'size': 15, 'color': TEXT_LIGHT},
            {'text': "Dr. Krishnadas Nanath", 'size': 15.5, 'bold': True, 'color': WHITE},
            {'text': "  |  October 2026", 'size': 15, 'color': TEXT_LIGHT}]])

draw_text(hx, 4.28, 29.5, 0.44,
          [[{'text': "Regulatory Framework: ", 'size': 13.5, 'bold': True, 'color': CYAN_TEAL},
            {'text': "Verra VM0033 Methodology  •  IPCC Tier-2 Blue Carbon Accounting  •  UAE Federal Decree-Law No. 45/2021", 'size': 13.5, 'color': WHITE}]])

# Coastal Sentinel Badge (Header Right-Center)
cs_x = 30.80
cs_y = 0.65
cs_w = 4.20
cs_h = 3.95
draw_rect(cs_x, cs_y, cs_w, cs_h, fill=NAVY_CARD, line_color=EMERALD, line_width=1.5, round_rect=True)
if os.path.exists(MRV_LOGO):
    slide.shapes.add_picture(MRV_LOGO, Inches(cs_x + (cs_w - 2.20)/2), Inches(cs_y + 0.30), Inches(2.20), Inches(2.20))
draw_text(cs_x, cs_y + 2.65, cs_w, 0.42,
          [[{'text': "COASTAL SENTINEL", 'size': 15, 'bold': True, 'color': EMERALD, 'font': FONT_H}]],
          align=PP_ALIGN.CENTER)
draw_text(cs_x, cs_y + 3.10, cs_w, 0.65,
          [[{'text': "Production Cloud Platform\nme-central1 Sovereign Region", 'size': 12, 'color': WHITE}]],
          align=PP_ALIGN.CENTER, line_spacing=1.05)

# MDX University Logo Card (Header Far-Right)
mdx_x = 35.40
mdx_y = 0.65
mdx_w = 7.60
mdx_h = 3.95
draw_rect(mdx_x, mdx_y, mdx_w, mdx_h, fill=WHITE, line_color=BORDER, line_width=1.0, round_rect=True)
# Red accent top strip on logo card
draw_rect(mdx_x, mdx_y, mdx_w, 0.22, fill=RED_MDX)

if os.path.exists(MDX_LOGO):
    # MDX logo has aspect ratio ~2.06:1. Use width=6.20", height=3.00"
    slide.shapes.add_picture(MDX_LOGO, Inches(mdx_x + (mdx_w - 6.40)/2), Inches(mdx_y + 0.42), Inches(6.40), Inches(2.95))

draw_text(mdx_x, mdx_y + 3.42, mdx_w, 0.42,
          [[{'text': "DUBAI CAMPUS  •  UNITED ARAB EMIRATES", 'size': 12.5, 'bold': True, 'color': NAVY_DEEP}]],
          align=PP_ALIGN.CENTER)

# ===========================================================================
# 3. 3-COLUMN MAIN BODY (Y: 5.65" -> 38.60", Available Height = 32.95")
# ===========================================================================
BTOP = 5.65
BBOT = 38.60
BH   = BBOT - BTOP
GAP  = 0.38
CW   = (W - 2 * MARGIN - 2 * GAP) / 3.0   # ~ 13.74"
PAD  = 0.36
IW   = CW - 2 * PAD                       # ~ 13.02"

C1X = MARGIN
C2X = MARGIN + CW + GAP
C3X = MARGIN + 2 * (CW + GAP)

# Draw Column Background Panels
for cx in (C1X, C2X, C3X):
    draw_rect(cx, BTOP, CW, BH, fill=BG_PANEL, line_color=BORDER, line_width=1.0, round_rect=True)

# ═══════════════════════════════════════════════════════════════════════════
# COLUMN 1: NARRATIVE, PROBLEM & GOAL
# ═══════════════════════════════════════════════════════════════════════════
x1 = C1X + PAD
y1 = BTOP + 0.20

y1 += add_section_header(C1X + 0.12, y1, CW - 0.24, "01", "NARRATIVE, PROBLEM & GOAL")
y1 += 0.30

# Problem Statement Card
y1 += add_mini_label(x1, y1, IW, "THE BLUE CARBON MRV BOTTLENECK")
prob_text = (
    "The UAE is home to over 40,000 hectares of coastal mangroves, sequestering up to "
    "6 tCO2e/ha/year in aboveground biomass and sediment. Despite vital ecological value for UAE "
    "Net Zero 2050, no automated Measurement, Reporting and Verification (MRV) framework exists. "
    "Manual field allometry costs $50,000+ per verification cycle and incurs 3 to 6 months latency, "
    "leaving UAE mangrove assets commercially invisible on the $2B Voluntary Carbon Market (VCM)."
)
draw_text(x1, y1, IW, 1.70, [[{'text': prob_text, 'size': 14.5, 'color': TEXT_DARK}]], line_spacing=1.18)
y1 += 1.75

# 3 Stat Cards
cg = 0.20
cw3 = (IW - 2 * cg) / 3.0
ch3 = 2.05
add_stat_card(x1, y1, cw3, ch3, "40K+ ha", "UAE Mangrove\nCover Monitored")
add_stat_card(x1 + cw3 + cg, y1, cw3, ch3, "$2B", "Voluntary Carbon\nMarket Disconnect")
add_stat_card(x1 + 2 * (cw3 + cg), y1, cw3, ch3, "70%", "MRV Cost\nReduction Target")
y1 += ch3 + 0.30

# Central Research Question Callout
y1 += add_mini_label(x1, y1, IW, "CENTRAL RESEARCH QUESTION")
rq_box_h = 1.85
draw_rect(x1, y1, IW, rq_box_h, fill=NAVY_CARD, line_color=CYAN_TEAL, line_width=1.2, round_rect=True)
draw_text(x1 + 0.25, y1 + 0.14, IW - 0.50, 0.30,
          [[{'text': "CST4090 PRIMARY RESEARCH INQUIRY", 'size': 12, 'bold': True, 'color': CYAN_TEAL}]])
rq_text = (
    "\"Can a Spatio-Temporal Graph Neural Network (ST-GNN) trained on multi-source satellite "
    "data and hydrodynamic tidal connectivity provide significantly more accurate, robust, and "
    "explainable monthly carbon sequestration estimates and 12-month forecasts than non-spatial "
    "or non-temporal baseline models?\""
)
draw_text(x1 + 0.25, y1 + 0.44, IW - 0.50, rq_box_h - 0.50,
          [[{'text': rq_text, 'size': 14.2, 'italic': True, 'color': WHITE}]], line_spacing=1.16)
y1 += rq_box_h + 0.30

# Figure 1: Geospatial Mangrove Classification Map
y1 += add_mini_label(x1, y1, IW, "GEOSPATIAL SATELLITE CLASSIFICATION")
fig1_box_h = 6.60
draw_rect(x1, y1, IW, fig1_box_h, fill=WHITE, line_color=BORDER, line_width=1.0, round_rect=True)
if os.path.exists(FIG1_MAP):
    # Image aspect ~1.68:1. Use width=12.20", height=5.10"
    slide.shapes.add_picture(FIG1_MAP, Inches(x1 + (IW - 12.20)/2), Inches(y1 + 0.18), Inches(12.20), Inches(5.10))

draw_text(x1 + 0.20, y1 + 5.35, IW - 0.40, 1.15,
          [[{'text': "Figure 1: ", 'size': 12.5, 'bold': True, 'color': PURPLE_HEAD},
            {'text': "Geospatial ANN pixel classification across UAE coastline (Abu Dhabi, Dubai, Umm Al Quwain). "
                     "Identifies 3,230 validated coordinate points harmonizing Sentinel-2 10m bands & Sentinel-1 SAR.",
             'size': 12, 'color': TEXT_MUTED}]], line_spacing=1.12)
y1 += fig1_box_h + 0.30

# Research Objectives (Compact numbered list)
y1 += add_mini_label(x1, y1, IW, "CORE RESEARCH OBJECTIVES")
objectives = [
    "1. Multi-Sensor Data Fusion: Harmonize ESA Sentinel-1 SAR, Sentinel-2 Optical, and NASA GEDI LiDAR.",
    "2. Neural LiDAR Imputation: Solve GEDI 4%/mo sparsity via Sundarbans-to-UAE transfer learning.",
    "3. Hydrodynamic Graph Topology: Construct 25 DBSCAN patch nodes with 73 directional tidal edges.",
    "4. Spatio-Temporal Modeling: Train ST-GNN over 69 continuous months (2021-2026); benchmark vs 4 baselines.",
    "5. Causal Explainability: Formulate SHAP feature attribution satisfying Verra VM0033 additionality audits.",
    "6. Cloud Platform Deployment: Engineer Coastal Sentinel with real-time GIS map, alerts, and PDF dossiers."
]
for obj in objectives:
    draw_text(x1 + 0.10, y1, IW - 0.20, 0.44,
              [[{'text': obj, 'size': 12.8, 'color': TEXT_DARK}]], line_spacing=1.08)
    y1 += 0.44
y1 += 0.22

# Multi-Source Ingestion Table
y1 += add_mini_label(x1, y1, IW, "MULTI-SOURCE SATELLITE REPOSITORY (69 MONTHS)")
dataset_rows = [
    ["Sensor / Platform", "Modalities / Bands", "Spatial / Temporal"],
    ["ESA Sentinel-2", "B2-B8, B11, B12, NDVI", "10m / 5-day cycle (2021-2026)"],
    ["ESA Sentinel-1", "C-band SAR (VV, VH, Ratio)", "10m / All-weather radar"],
    ["NASA GEDI L2A", "LiDAR RH100, PAI, Canopy H", "25m footprint (Sparse ~4%/mo)"],
    ["OpenWeatherMap", "Temp, Wind, Sea Pressure", "Continuous hourly reanalysis"],
    ["Ground Truth", "3,230 Validated Coordinates", "UAE Ministry & EAD verified"]
]
t1_h = add_table_data(x1, y1, IW, dataset_rows, [0.32, 0.38, 0.30], font_size=12.2, hdr_size=13, row_height=0.50, hdr_height=0.56)
y1 += t1_h + 0.28

# Regulatory & Ecosystem Context Card (Bottom of Column 1)
reg_h = 2.15
draw_rect(x1, y1, IW, reg_h, fill=WHITE, line_color=BORDER, line_width=1.0, round_rect=True)
draw_text(x1 + 0.18, y1 + 0.12, IW - 0.36, 0.30,
          [[{'text': "REGULATORY ALIGNMENT & UAE NET ZERO 2050", 'size': 12, 'bold': True, 'color': PURPLE_HEAD}]])
draw_text(x1 + 0.18, y1 + 0.44, IW - 0.36, reg_h - 0.50,
          [[{'text': "• National Strategy: Directly supports UAE Net Zero 2050 and 100 Million Mangroves Target.\n"
                     "• EAD Integration: Aligned with Environment Agency Abu Dhabi coastal ecosystem thresholds.\n"
                     "• Sovereign Data: Hosted on Google Cloud me-central1 adhering to UAE Data Decree-Law 45/2021.\n"
                     "• Continuous Monitoring: 69 continuous monthly time-series snapshots (Jan 2021 – Sep 2026).",
             'size': 11.5, 'color': TEXT_DARK}]], line_spacing=1.16)

# ═══════════════════════════════════════════════════════════════════════════
# COLUMN 2: RESEARCH METHODOLOGY & ST-GNN ARCHITECTURE
# ═══════════════════════════════════════════════════════════════════════════
x2 = C2X + PAD
y2 = BTOP + 0.20

y2 += add_section_header(C2X + 0.12, y2, CW - 0.24, "02", "RESEARCH METHODOLOGY & ST-GNN")
y2 += 0.30

# 4-Phase Architecture Pipeline
y2 += add_mini_label(x2, y2, IW, "END-TO-END METHODOLOGY PIPELINE")
pipe_h = 2.50
draw_rect(x2, y2, IW, pipe_h, fill=NAVY_DEEP, line_color=CYAN_TEAL, line_width=1.0, round_rect=True)

steps = [
    ("PHASE 1: INGESTION", "GEE automated ingestion of Sentinel-1/2 & GEDI tracks (69 continuous months)."),
    ("PHASE 2: IMPUTATION", "Transfer learning from Sundarbans to UAE arid mangroves solving LiDAR sparsity."),
    ("PHASE 3: GRAPH TOPOLOGY", "DBSCAN clustering yields 25 patch nodes, 73 tidal flow edges, and 7 spatial edges."),
    ("PHASE 4: ST-GNN & MRV", "Spatial GCN + Temporal LSTM forecasting 12 months ahead with SHAP audit trails.")
]
sy = y2 + 0.12
for i, (title_p, desc_p) in enumerate(steps):
    draw_rect(x2 + 0.20, sy, 0.38, 0.38, fill=EMERALD, round_rect=True)
    num_s = slide.shapes[-1]; num_s.adjustments[0] = 0.5
    tf = num_s.text_frame; tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    r = p.add_run(); r.text = str(i+1); r.font.size = Pt(14); r.font.bold = True; r.font.color.rgb = NAVY_DEEP

    draw_text(x2 + 0.70, sy - 0.02, IW - 0.85, 0.48,
              [[{'text': title_p + ": ", 'size': 12, 'bold': True, 'color': CYAN_TEAL},
                {'text': desc_p, 'size': 11.5, 'color': WHITE}]], line_spacing=1.06)
    sy += 0.58
y2 += pipe_h + 0.30

# Figure 2: ST-GNN Graph Topology
y2 += add_mini_label(x2, y2, IW, "ST-GNN HYDRODYNAMIC GRAPH TOPOLOGY")
fig2_box_h = 7.45
draw_rect(x2, y2, IW, fig2_box_h, fill=WHITE, line_color=BORDER, line_width=1.0, round_rect=True)
if os.path.exists(FIG2_GRAPH):
    # Ratio ~1.22:1. Width=9.60", Height=6.05"
    slide.shapes.add_picture(FIG2_GRAPH, Inches(x2 + (IW - 9.60)/2), Inches(y2 + 0.16), Inches(9.60), Inches(6.05))

draw_text(x2 + 0.20, y2 + 6.30, IW - 0.40, 1.05,
          [[{'text': "Figure 2: ", 'size': 12.5, 'bold': True, 'color': PURPLE_HEAD},
            {'text': "NetworkX graph of UAE mangrove patches. 25 DBSCAN nodes connected by 73 directional tidal flow "
                     "edges (capturing allochthonous sediment flux) and 7 spatial Euclidean distance edges.",
             'size': 12, 'color': TEXT_MUTED}]], line_spacing=1.12)
y2 += fig2_box_h + 0.28

# GEDI LiDAR Neural Imputation Breakthrough Card
y2 += add_mini_label(x2, y2, IW, "NASA GEDI LiDAR NEURAL IMPUTATION ENGINE")
imp_h = 2.05
draw_rect(x2, y2, IW, imp_h, fill=WHITE, line_color=BORDER, line_width=1.0, round_rect=True)
draw_text(x2 + 0.18, y2 + 0.12, IW - 0.36, 0.30,
          [[{'text': "SOLVING ARID-COAST LiDAR SPARSITY VIA TRANSFER LEARNING", 'size': 12, 'bold': True, 'color': PURPLE_HEAD}]])
draw_text(x2 + 0.18, y2 + 0.42, IW - 0.36, imp_h - 0.50,
          [[{'text': "• Sparsity Challenge: NASA GEDI L2A LiDAR provides orbital spot tracks covering only ~4% of UAE patches/mo.\n"
                     "• Transfer Solution: Deep Neural Regressor trained on dense Sundarbans benchmark and fine-tuned for UAE.\n"
                     "• Performance: Reconstructs continuous RH100 canopy height & PAI profiles with R² = 0.812 on validation tracks.\n"
                     "• Literature First: First operational framework bridging optical-SAR-LiDAR for Arabian Gulf mangrove stands.",
             'size': 11.5, 'color': TEXT_DARK}]], line_spacing=1.16)
y2 += imp_h + 0.30

# Mathematical Formulations (2 Formatted Cards)
y2 += add_mini_label(x2, y2, IW, "MATHEMATICAL ACCOUNTING FORMULATIONS")
f_box_w = (IW - 0.25) / 2.0
f_box_h = 2.50

# Card 1: Mangrove Health Score
draw_rect(x2, y2, f_box_w, f_box_h, fill=NAVY_CARD, line_color=CYAN_TEAL, line_width=1.0, round_rect=True)
draw_text(x2 + 0.15, y2 + 0.10, f_box_w - 0.30, 0.30,
          [[{'text': "MANGROVE HEALTH SCORE (MHS)", 'size': 11.5, 'bold': True, 'color': CYAN_TEAL}]])
draw_text(x2 + 0.15, y2 + 0.40, f_box_w - 0.30, 0.52,
          [[{'text': "MHS = (NDVI x 40) + ((RH100/10) x 30) + ((Abs/15) x 30)", 'size': 12, 'bold': True, 'color': EMERALD, 'font': FONT_M}]])
draw_text(x2 + 0.15, y2 + 0.98, f_box_w - 0.30, 1.45,
          [[{'text': "• NDVI (40%): Photosynthetic canopy vigor\n"
                     "• RH100 (30%): LiDAR 100th percentile canopy height\n"
                     "• Absorption (30%): Monthly carbon uptake rate\n"
                     "• Range: 0 (Dead/Degraded) to 100 (Peak Vitality)",
             'size': 11.2, 'color': WHITE}]], line_spacing=1.15)

# Card 2: IPCC Tier-2 Carbon Accounting
draw_rect(x2 + f_box_w + 0.25, y2, f_box_w, f_box_h, fill=NAVY_CARD, line_color=EMERALD, line_width=1.0, round_rect=True)
draw_text(x2 + f_box_w + 0.40, y2 + 0.10, f_box_w - 0.30, 0.30,
          [[{'text': "IPCC TIER-2 CARBON ACCOUNTING", 'size': 11.5, 'bold': True, 'color': EMERALD}]])
draw_text(x2 + f_box_w + 0.40, y2 + 0.40, f_box_w - 0.30, 0.52,
          [[{'text': "C_Stock (MgC/ha) = Biomass x 0.47\nCO2e (tCO2e/ha) = C_Stock x (44/12)",
             'size': 12, 'bold': True, 'color': WHITE, 'font': FONT_M}]], line_spacing=1.05)
draw_text(x2 + f_box_w + 0.40, y2 + 1.00, f_box_w - 0.30, 1.40,
          [[{'text': "• Biomass: Derived from GEDI LiDAR RH100 + PAI\n"
                     "• Allometry: Arid Avicenna marina coefficient\n"
                     "• Conversion: 0.47 IPCC carbon fraction\n"
                     "• CO2 Equivalence: Molecular weight ratio (44/12)",
             'size': 11.2, 'color': WHITE}]], line_spacing=1.15)
y2 += f_box_h + 0.30

# ST-GNN Architecture Specification
y2 += add_mini_label(x2, y2, IW, "ST-GNN TENSOR & SPATIO-TEMPORAL OPERATOR")
gnn_spec = (
    "• Input Tensor: X in R^(N x T x F) where N = 25 patch nodes, T = 3 lookback months, F = 9 features.\n"
    "• Spatial Operator: Graph Convolution A_hat = D_tilde^(-1/2) * A_tilde * D_tilde^(-1/2) with self-loops.\n"
    "• Temporal Operator: Multi-layer LSTM capturing sequential phenological and tidal inundation dynamics.\n"
    "• 12-Month Forecast Horizon: Auto-regressive multi-step prediction with empirical confidence bands."
)
draw_text(x2 + 0.10, y2, IW - 0.20, 1.65, [[{'text': gnn_spec, 'size': 13, 'color': TEXT_DARK}]], line_spacing=1.20)
y2 += 1.70

# Train/Val/Test Split & Ablation Matrix
y2 += add_mini_label(x2, y2, IW, "EXPERIMENTAL SPLIT & ARCHITECTURE ABLATION")
split_rows = [
    ["Dataset Partition", "Calendar Span", "Snapshots", "Purpose"],
    ["Training Set", "Jan 2021 – Dec 2024", "48 Months", "Weight optimization"],
    ["Validation Set", "Jan 2025 – Jun 2025", "6 Months", "Hyperparameter tuning"],
    ["Test Set (Held-out)", "Jul 2025 – Sep 2026", "15 Months", "Unseen evaluation"]
]
t2_h = add_table_data(x2, y2, IW, split_rows, [0.30, 0.34, 0.18, 0.18], font_size=12, hdr_size=12.5, row_height=0.46, hdr_height=0.52)
y2 += t2_h + 0.25

ablation_rows = [
    ["Candidate Model", "Spatial", "Temporal", "Key Inductive Bias"],
    ["Random Forest", "No", "No", "Tabular feature bagging baseline"],
    ["Graph-RF", "Yes", "No", "Static node degree & centrality embeddings"],
    ["Pure LSTM", "No", "Yes", "Temporal sequence learning per patch"],
    ["Static GCN", "Yes", "No", "Spatial graph convolution without temporal memory"],
    ["ST-GNN (Ours)", "Yes", "Yes", "Spatio-temporal graph message passing"]
]
t3_h = add_table_data(x2, y2, IW, ablation_rows, [0.28, 0.14, 0.14, 0.44], font_size=12, hdr_size=12.5, row_height=0.46, hdr_height=0.52, highlight_idx=5)
y2 += t3_h + 0.15

# ═══════════════════════════════════════════════════════════════════════════
# COLUMN 3: EMPIRICAL BENCHMARKS & THE PRODUCT PLATFORM
# ═══════════════════════════════════════════════════════════════════════════
x3 = C3X + PAD
y3 = BTOP + 0.20

y3 += add_section_header(C3X + 0.12, y3, CW - 0.24, "03", "RESULTS & COASTAL SENTINEL")
y3 += 0.30

# Empirical Benchmarks Table
y3 += add_mini_label(x3, y3, IW, "EMPIRICAL MODEL BENCHMARKING RESULTS")
perf_rows = [
    ["Architecture", "RMSE (MgC/ha)", "MAE (MgC/ha)", "R² Score", "Nash-Sutcliffe"],
    ["Random Forest", "0.384", "0.291", "0.612", "0.584"],
    ["Graph Random Forest", "0.292", "0.224", "0.721", "0.702"],
    ["Pure LSTM", "0.241", "0.183", "0.789", "0.763"],
    ["Static GCN", "0.213", "0.162", "0.814", "0.791"],
    ["ST-GNN (MCIP Ours)", "0.142", "0.108", "0.892", "0.854"]
]
t4_h = add_table_data(x3, y3, IW, perf_rows, [0.34, 0.17, 0.17, 0.16, 0.16], font_size=13, hdr_size=13.5, row_height=0.54, hdr_height=0.60, highlight_idx=5)
y3 += t4_h + 0.25

# Key Finding Callout
finding_h = 1.35
draw_rect(x3, y3, IW, finding_h, fill=NAVY_CARD, line_color=EMERALD, line_width=1.2, round_rect=True)
draw_text(x3 + 0.20, y3 + 0.10, IW - 0.40, 0.28,
          [[{'text': "KEY BENCHMARK FINDING", 'size': 11.5, 'bold': True, 'color': EMERALD}]])
draw_text(x3 + 0.20, y3 + 0.38, IW - 0.40, finding_h - 0.45,
          [[{'text': "ST-GNN achieves 63% lower RMSE and 45.7% higher R² than Random Forest. "
                     "Incorporating 73 hydrodynamic tidal edges captures non-local carbon flux across patches.",
             'size': 13.5, 'color': WHITE}]], line_spacing=1.14)
y3 += finding_h + 0.30

# SHAP Causal Feature Attribution (Custom styled progress bars)
y3 += add_mini_label(x3, y3, IW, "SHAP CAUSAL FEATURE ATTRIBUTION")
shap_features = [
    ("Sentinel-2 NDVI (Photosynthetic Vigor)", 38, EMERALD),
    ("Sentinel-1 SAR VV Backscatter (Biomass)", 29, CYAN_TEAL),
    ("NASA GEDI LiDAR RH100 (Canopy Height)", 21, PURPLE_HEAD),
    ("NASA GEDI PAI (Plant Area Index)", 8, GOLD),
    ("Hydrodynamic Tidal Connectivity (Flow Edge)", 4, TEXT_MUTED)
]
bar_total_w = IW - 2.80
for feat_name, pct, bar_col in shap_features:
    draw_text(x3, y3, IW, 0.30,
              [[{'text': feat_name, 'size': 12, 'bold': True, 'color': TEXT_DARK}]])
    y3 += 0.30
    # Background bar
    draw_rect(x3, y3, bar_total_w, 0.24, fill=TBL_ALT, line_color=BORDER, line_width=0.5, round_rect=True)
    # Foreground filled bar
    fill_w = max(0.20, bar_total_w * (pct / 100.0))
    draw_rect(x3, y3, fill_w, 0.24, fill=bar_col, round_rect=True)
    # Percentage label
    draw_text(x3 + bar_total_w + 0.15, y3 - 0.04, 2.50, 0.28,
              [[{'text': f"{pct}% Contribution", 'size': 12, 'bold': True, 'color': TEXT_DARK}]])
    y3 += 0.36
y3 += 0.25

# Figure 3: Coastal Sentinel Production Platform
y3 += add_mini_label(x3, y3, IW, "COASTAL SENTINEL: PRODUCTION MRV PLATFORM")
fig3_box_h = 7.10
draw_rect(x3, y3, IW, fig3_box_h, fill=WHITE, line_color=BORDER, line_width=1.0, round_rect=True)
if os.path.exists(FIG3_DASH):
    # Ratio ~1.96:1. Width=12.20", Height=5.80"
    slide.shapes.add_picture(FIG3_DASH, Inches(x3 + (IW - 12.20)/2), Inches(y3 + 0.18), Inches(12.20), Inches(5.60))

draw_text(x3 + 0.20, y3 + 5.90, IW - 0.40, 1.05,
          [[{'text': "Figure 3: ", 'size': 12.5, 'bold': True, 'color': PURPLE_HEAD},
            {'text': "Coastal Sentinel Live Dashboard: Next.js 15 + Firebase platform featuring interactive GIS Leaflet "
                     "map, real-time patch telemetry, 12-month ST-GNN forecasts, and XAI natural language co-pilot.",
             'size': 12, 'color': TEXT_MUTED}]], line_spacing=1.12)
y3 += fig3_box_h + 0.30

# Dual Alert Engine & Verra VM0033 Compliance (Two side-by-side cards)
y3 += add_mini_label(x3, y3, IW, "AUTONOMOUS ALERTS & VERRA VM0033 AUDIT")
b_w = (IW - 0.25) / 2.0
b_h = 2.45

# Card 1: Alert System
draw_rect(x3, y3, b_w, b_h, fill=WHITE, line_color=BORDER, line_width=1.0, round_rect=True)
draw_text(x3 + 0.15, y3 + 0.12, b_w - 0.30, 0.30,
          [[{'text': "AUTONOMOUS ALERT ENGINE", 'size': 11.5, 'bold': True, 'color': PURPLE_HEAD}]])
draw_text(x3 + 0.15, y3 + 0.44, b_w - 0.30, b_h - 0.50,
          [[{'text': "• Level 1 (5–10%): Informational monitoring anomaly.\n"
                     "• Level 2 (10–20%): Warning + automated SHAP causal narrative.\n"
                     "• Level 3 (>20%): Critical stress triggering intervention.\n"
                     "• Proactive forward scanning via weather reanalysis.",
             'size': 11, 'color': TEXT_DARK}]], line_spacing=1.16)

# Card 2: Verra VM0033
draw_rect(x3 + b_w + 0.25, y3, b_w, b_h, fill=WHITE, line_color=BORDER, line_width=1.0, round_rect=True)
draw_text(x3 + b_w + 0.40, y3 + 0.12, b_w - 0.30, 0.30,
          [[{'text': "VERRA VM0033 COMPLIANCE", 'size': 11.5, 'bold': True, 'color': PURPLE_HEAD}]])
draw_text(x3 + b_w + 0.40, y3 + 0.44, b_w - 0.30, b_h - 0.50,
          [[{'text': "• Automated Baseline & Project Additionality calculation.\n"
                     "• Permanence & 10–20% Non-Permanence Risk Buffer.\n"
                     "• 1-Click Tamper-evident PDF Dossier generation.\n"
                     "• Sovereign UAE cloud hosting (me-central1).",
             'size': 11, 'color': TEXT_DARK}]], line_spacing=1.16)
y3 += b_h + 0.28

# Production Platform Scale Specs (Bottom of Column 3)
scale_h = 2.15
draw_rect(x3, y3, IW, scale_h, fill=NAVY_DEEP, line_color=CYAN_TEAL, line_width=1.0, round_rect=True)
draw_text(x3 + 0.20, y3 + 0.10, IW - 0.40, 0.28,
          [[{'text': "COASTAL SENTINEL PRODUCTION SYSTEM BENCHMARKS", 'size': 11.5, 'bold': True, 'color': CYAN_TEAL}]])

spec_items = [
    ("< 600ms", "API Response Latency\n(FastAPI me-central1)", EMERALD),
    ("69 Months", "Continuous Satellite Depth\n(Jan 2021 – Sep 2026)", WHITE),
    ("25 Patches", "DBSCAN Monitored Nodes\nAcross UAE Coastline", EMERALD),
    ("1-Click PDF", "Verra VM0033 Dossier\nAutomated Issuance", WHITE)
]
sw_item = (IW - 0.60) / 4.0
sx_curr = x3 + 0.15
for val, lbl, col in spec_items:
    draw_text(sx_curr, y3 + 0.40, sw_item, 0.50,
              [[{'text': val, 'size': 18, 'bold': True, 'color': col, 'font': FONT_T}]],
              align=PP_ALIGN.CENTER)
    draw_text(sx_curr, y3 + 0.95, sw_item, 0.85,
              [[{'text': lbl, 'size': 10.5, 'color': TEXT_LIGHT}]],
              align=PP_ALIGN.CENTER, line_spacing=1.05)
    sx_curr += sw_item + 0.10

# ===========================================================================
# 4. BOTTOM ROW: CONCLUSIONS (Left) & REFERENCES + QR (Right)
# Y: 39.00" -> 43.10" (Height = 4.10")
# ===========================================================================
FRTOP = 38.95
FRBOT = 43.15
FRH   = FRBOT - FRTOP
HW    = (W - 2 * MARGIN - GAP) / 2.0  # ~ 21.31"
CLX   = MARGIN
RFX   = MARGIN + HW + GAP

# Draw Bottom Panels
draw_rect(CLX, FRTOP, HW, FRH, fill=BG_PANEL, line_color=BORDER, line_width=1.0, round_rect=True)
draw_rect(RFX, FRTOP, HW, FRH, fill=BG_PANEL, line_color=BORDER, line_width=1.0, round_rect=True)

# ── Left: Conclusions & Scientific Impact ──
cx4 = CLX + PAD
cy4 = FRTOP + 0.18
iw_c = HW - 2 * PAD

cy4 += add_section_header(CLX + 0.12, cy4, HW - 0.24, "04", "CONCLUSIONS & SCIENTIFIC CONTRIBUTIONS")
cy4 += 0.26

conclusions = [
    ("Empirical Superiority: ", "ST-GNN outperforms all 4 baseline models on RMSE, MAE, R² and NSE, proving spatial graph topology and temporal dynamics together drive accurate blue carbon MRV."),
    ("Hydrodynamic Innovation: ", "Novel 73-edge tidal proxy models directional sediment flow, capturing allochthonous vs autochthonous carbon exchange without destructive field isotopic sampling."),
    ("Arid-Coast Imputation: ", "Transfer learning from Sundarbans to UAE arid mangroves resolves GEDI LiDAR sparsity (~4%/mo), establishing the first 69-month continuous canopy height series in the Gulf."),
    ("Regulatory Democratization: ", "Replaces $50K manual field surveys with continuous automated audits, cutting verification costs by 70% and unlocking UAE mangroves on the $2B Voluntary Carbon Market.")
]

for title_c, desc_c in conclusions:
    # Emerald check mark badge
    cd = 0.32
    draw_rect(cx4, cy4 + 0.04, cd, cd, fill=EMERALD, round_rect=True)
    c_shp = slide.shapes[-1]; c_shp.adjustments[0] = 0.5
    tf = c_shp.text_frame; tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    r = p.add_run(); r.text = "✓"; r.font.size = Pt(13); r.font.bold = True; r.font.color.rgb = NAVY_DEEP

    draw_text(cx4 + cd + 0.16, cy4, iw_c - cd - 0.20, 0.48,
              [[{'text': title_c, 'size': 12.5, 'bold': True, 'color': PURPLE_HEAD},
                {'text': desc_c, 'size': 12, 'color': TEXT_DARK}]], line_spacing=1.12)
    cy4 += 0.48

# Future work mini strip
fw_box_h = 0.58
draw_rect(cx4, cy4 + 0.05, iw_c, fw_box_h, fill=NAVY_DEEP, line_color=CYAN_TEAL, line_width=0.8, round_rect=True)
draw_text(cx4 + 0.20, cy4 + 0.12, iw_c - 0.40, 0.44,
          [[{'text': "FUTURE WORK: ", 'size': 12, 'bold': True, 'color': CYAN_TEAL},
            {'text': "Sentinel-3 ocean color coupling  •  Hyperspectral CHIME expansion  •  Saltmarsh & Seagrass scope  •  Edge mobile app", 'size': 11.5, 'color': WHITE}]])

# ── Right: References & Verification ──
rx5 = RFX + PAD
ry5 = FRTOP + 0.18
iw_r = HW - 2 * PAD

ry5 += add_section_header(RFX + 0.12, ry5, HW - 0.24, "05", "REFERENCES & VERIFICATION")
ry5 += 0.26

# References on left half of this panel, QR code on right half
qr_card_w = 4.80
ref_text_w = iw_r - qr_card_w - 0.35

references = [
    "[1] Dubayah, R. et al. (2020). The Global Ecosystem Dynamics Investigation: High-resolution laser ranging of forest canopies. Science of Remote Sensing, 1, 100002.",
    "[2] Kipf, T.N. & Welling, M. (2017). Semi-supervised classification with graph convolutional networks. ICLR.",
    "[3] Yu, B., Yin, H. & Zhu, Z. (2018). Spatio-temporal graph convolutional networks. IJCAI, pp. 3634–3640.",
    "[4] Lundberg, S.M. & Lee, S.I. (2017). A unified approach to interpreting model predictions. NeurIPS, pp. 4765–4774.",
    "[5] Verra (2022). VM0033 Tidal Wetland and Seagrass Restoration Methodology, v2.1. Washington DC: Verra.",
    "[6] Macreadie, P.I. et al. (2021). The future of blue carbon science. Nature Reviews Earth & Environment, 2(12).",
    "[7] Hamilton, S.E. & Friess, D.A. (2018). Global carbon stocks and potential losses due to mangrove deforestation. Nature Climate Change, 8(3)."
]

for ref_str in references:
    draw_text(rx5, ry5, ref_text_w, 0.36,
              [[{'text': ref_str, 'size': 10.5, 'color': TEXT_DARK}]], line_spacing=1.06)
    ry5 += 0.36

# QR Code Verification Card
qr_x = rx5 + ref_text_w + 0.35
qr_y = FRTOP + 0.85
draw_rect(qr_x, qr_y, qr_card_w, 3.20, fill=WHITE, line_color=BORDER, line_width=1.0, round_rect=True)
draw_text(qr_x, qr_y + 0.12, qr_card_w, 0.30,
          [[{'text': "REPRODUCIBILITY & CODE", 'size': 11.5, 'bold': True, 'color': PURPLE_HEAD}]],
          align=PP_ALIGN.CENTER)

if os.path.exists(QR_CODE):
    slide.shapes.add_picture(QR_CODE, Inches(qr_x + (qr_card_w - 1.90)/2), Inches(qr_y + 0.46), Inches(1.90), Inches(1.90))

draw_text(qr_x + 0.10, qr_y + 2.42, qr_card_w - 0.20, 0.65,
          [[{'text': "Scan for GitHub Repository & Live MRV Pipeline", 'size': 10.5, 'bold': True, 'color': NAVY_DEEP}],
           [{'text': "Open-Source Models • Colab Notebooks • Verra Dossiers", 'size': 9.5, 'color': TEXT_MUTED}]],
          align=PP_ALIGN.CENTER, line_spacing=1.05)

# ===========================================================================
# 5. FOOTER BRANDING STRIP (Y: 43.25" -> 44.00", Height = 0.75")
# ===========================================================================
FY = 43.25
FH = H - FY
draw_rect(0, FY, W, FH, fill=NAVY_DEEP)
draw_rect(0, FY, W, 0.08, fill=CYAN_TEAL)

# Footer elements
draw_text(MARGIN, FY + 0.14, 12.0, 0.50,
          [[{'text': "MSc Data Science & Artificial Intelligence  |  CST4090 Post-Graduate Thesis",
             'size': 13.5, 'bold': True, 'color': WHITE}],
           [{'text': "Middlesex University Dubai  •  Department of Computer Engineering & Informatics",
             'size': 11.5, 'color': CYAN_TEAL}]],
          line_spacing=1.10)

draw_text(13.0, FY + 0.16, 18.0, 0.44,
          [[{'text': "Author: Narendra Gandikota (NG661@live.mdx.ac.uk)  •  Supervisor: Dr. Krishnadas Nanath",
             'size': 13, 'color': WHITE}]],
          align=PP_ALIGN.CENTER)

draw_text(W - MARGIN - 11.5, FY + 0.14, 11.5, 0.50,
          [[{'text': "Dubai Knowledge Park, Blocks 16, 17, 19  •  Dubai, UAE",
             'size': 12, 'bold': True, 'color': WHITE}],
           [{'text': "Published: October 2026  •  Verra VM0033 Compliant",
             'size': 11.5, 'color': EMERALD}]],
          align=PP_ALIGN.RIGHT, line_spacing=1.10)

# ===========================================================================
# 6. SAVE PRESENTATION
# ===========================================================================
prs.save(OUT_PPTX)
print("SUCCESS: Master MCIP Poster saved to:", OUT_PPTX)
print(f"Dimensions: {prs.slide_width/914400:.1f}\" x {prs.slide_height/914400:.1f}\"")
print("Total shapes generated:", len(slide.shapes))
