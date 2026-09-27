"""
generate_mcip_poster.py - Institutional Academic Research Poster Generator (V5 Masterpiece)
MSc Data Science & AI | CST4090 Thesis | Middlesex University Dubai
Author: Narendra Gandikota | Supervisor: Dr. Krishnadas Nanath
Target: 44" x 44" Square Format (Publication Ready, 3200x3200 300 DPI Export)
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

VISUALS_DIR = os.path.join(ROOT_DIR, "Visuals Notebooks")
MDX_LOGO    = os.path.join(POSTER_DIR, "mdx logo.png")
MRV_LOGO    = os.path.join(ROOT_DIR, "mrv", "public", "logo.png")
QR_CODE     = os.path.join(PPT_DIR, "qr_code.png")

# Authentic Thesis Research Figures
FIG1_FRAMEWORK = os.path.join(VISUALS_DIR, "Figure_2_1_Conceptual_Framework.png")
FIG1_CONFUSION = os.path.join(VISUALS_DIR, "Stage_1_Classifiaction_Confusion_Matrix.png")
FIG2_GEDI      = os.path.join(PPT_DIR, "fig2_gedi_imputation.png")
FIG3_GRAPH     = os.path.join(PPT_DIR, "fig3_graph_composite.png")
FIG4_PLATFORM  = os.path.join(PPT_DIR, "fig4_platform_xai.png")

# ---------------------------------------------------------------------------
# COLOR PALETTE (Prestigious Oceanic & Deep-Tech Ecological Theme)
# ---------------------------------------------------------------------------
NAVY_DEEP   = RGBColor(0x06, 0x11, 0x22)   # Midnight Navy canvas background
NAVY_PANEL  = RGBColor(0x0A, 0x1B, 0x35)   # Rich deep navy for high-contrast cards
NAVY_CARD   = RGBColor(0x0F, 0x25, 0x48)   # Solid card background
NAVY_HOVER  = RGBColor(0x16, 0x33, 0x60)   # Card accent
CYAN_ACCENT = RGBColor(0x00, 0xB4, 0xD8)   # Oceanic Cyan (Badges, lines, tech highlights)
EMERALD     = RGBColor(0x00, 0xD2, 0x84)   # Vibrant Ecological Green (Metrics & Ticks)
EMERALD_BG  = RGBColor(0x05, 0x3B, 0x28)   # Emerald dark accent fill
RED_MDX     = RGBColor(0xD2, 0x12, 0x2E)   # Official Middlesex University Red
GOLD        = RGBColor(0xFA, 0xB0, 0x05)   # Warning / Gold accent
WHITE       = RGBColor(0xFF, 0xFF, 0xFF)   # Pure White
BG_PANEL    = RGBColor(0xF8, 0xFA, 0xFC)   # Ultra-light slate background
CARD_BG     = RGBColor(0xFF, 0xFF, 0xFF)   # White cards
BORDER      = RGBColor(0xCB, 0xD5, 0xE1)   # Slate-300 border
BORDER_CYAN = RGBColor(0x00, 0xB4, 0xD8)   # Cyan border
BORDER_EM   = RGBColor(0x00, 0xD2, 0x84)   # Emerald border
TEXT_DARK   = RGBColor(0x0F, 0x17, 0x2A)   # Slate-900 (High-contrast text)
TEXT_MUTED  = RGBColor(0x47, 0x55, 0x69)   # Slate-600 (Secondary text)
TEXT_LIGHT  = RGBColor(0x94, 0xA3, 0xB8)   # Slate-400 (Muted dark theme text)
TBL_HDR     = RGBColor(0x08, 0x18, 0x30)   # Table header deep navy
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

def draw_rect(x, y, w, h, fill=None, line_color=None, line_width=1.0, round_rect=False, corner_radius=0.06):
    st = MSO_SHAPE.ROUNDED_RECTANGLE if round_rect else MSO_SHAPE.RECTANGLE
    s = slide.shapes.add_shape(st, Inches(x), Inches(y), Inches(w), Inches(h))
    if round_rect:
        try: s.adjustments[0] = corner_radius
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

def draw_text(x, y, w, h, paras, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, line_spacing=1.18, pad=0.0):
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
    h = 1.10
    draw_rect(x, y, w, h, fill=NAVY_DEEP, line_color=CYAN_ACCENT, line_width=1.2, round_rect=True, corner_radius=0.15)
    draw_rect(x, y, 0.22, h, fill=CYAN_ACCENT)
    d = 0.72
    num_x = x + 0.35
    num_y = y + (h - d) / 2
    draw_rect(num_x, num_y, d, d, fill=EMERALD, round_rect=True, corner_radius=0.5)
    num_shp = slide.shapes[-1]
    tf = num_shp.text_frame
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = number_str
    r.font.size = Pt(26)
    r.font.bold = True
    r.font.color.rgb = NAVY_DEEP
    r.font.name = FONT_H

    tx = num_x + d + 0.30
    tw = w - (tx - x) - 0.20
    draw_text(tx, y, tw, h,
              [[{'text': title_str, 'size': 25, 'bold': True, 'color': WHITE, 'font': FONT_H}]],
              anchor=MSO_ANCHOR.MIDDLE)
    return h

def add_mini_label(x, y, w, label_text, color=NAVY_DEEP):
    draw_rect(x, y + 0.05, 0.14, 0.34, fill=CYAN_ACCENT)
    draw_text(x + 0.24, y, w - 0.24, 0.44,
              [[{'text': label_text, 'size': 15.5, 'bold': True, 'color': color, 'font': FONT_H}]],
              anchor=MSO_ANCHOR.MIDDLE)
    return 0.44

def add_stat_card(x, y, w, h, stat_value, stat_label, value_color=EMERALD, subtext=None):
    draw_rect(x, y, w, h, fill=NAVY_CARD, line_color=CYAN_ACCENT, line_width=1.0, round_rect=True, corner_radius=0.12)
    val_h = h * 0.52
    draw_text(x + 0.10, y + 0.08, w - 0.20, val_h,
              [[{'text': stat_value, 'size': 29, 'bold': True, 'color': value_color, 'font': FONT_T}]],
              align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.BOTTOM)
    lbl_paras = [[{'text': stat_label, 'size': 13.5, 'bold': True, 'color': WHITE, 'font': FONT_B}]]
    if subtext:
        lbl_paras.append([{'text': subtext, 'size': 11.8, 'color': CYAN_ACCENT, 'font': FONT_B}])
    draw_text(x + 0.10, y + val_h + 0.04, w - 0.20, h - val_h - 0.12,
              lbl_paras, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.TOP, line_spacing=1.10)

def add_table_data(x, y, w, rows, col_fractions, font_size=12.8, hdr_size=13.6, row_height=0.52, hdr_height=0.54, highlight_idx=None):
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
        cell.margin_left = cell.margin_right = Inches(0.12)
        cell.margin_top = cell.margin_bottom = Inches(0.06)
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
        text_color = NAVY_DEEP if is_hl else TEXT_DARK
        for c_idx in range(num_cols):
            cell = tbl.cell(r_idx, c_idx)
            cell.margin_left = cell.margin_right = Inches(0.12)
            cell.margin_top = cell.margin_bottom = Inches(0.06)
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
# 2. HEADER BANNER (Y: 0.00" -> 5.35")
# ===========================================================================
HDR_H = 5.35
draw_rect(0, 0, W, HDR_H, fill=NAVY_DEEP)
draw_rect(W - 16.5, 0, 16.5, HDR_H, fill=NAVY_PANEL)
draw_rect(0, HDR_H - 0.16, W, 0.16, fill=CYAN_ACCENT)
draw_rect(0, 0, 0.35, HDR_H - 0.16, fill=EMERALD)

# Middlesex University Institutional Logo Pill (Top-Left)
hx = MARGIN + 0.25
if os.path.exists(MDX_LOGO):
    draw_rect(hx, 0.28, 1.85, 0.82, fill=WHITE, line_color=BORDER_CYAN, line_width=1.0, round_rect=True, corner_radius=0.15)
    slide.shapes.add_picture(MDX_LOGO, Inches(hx + 0.08), Inches(0.34), Inches(1.68), Inches(0.70))

draw_text(hx + 2.10, 0.42, 26.5, 0.46,
          [[{'text': "MIDDLESEX UNIVERSITY DUBAI  •  FACULTY OF SCIENCE & TECHNOLOGY",
             'size': 17.5, 'bold': True, 'color': CYAN_ACCENT, 'font': FONT_H}]])

draw_text(hx, 1.15, 29.5, 1.45,
          [[{'text': "Mangrove Coastal Intelligence Platform (MCIP)",
             'size': 46, 'bold': True, 'color': WHITE, 'font': FONT_T}]],
          line_spacing=0.96)

draw_text(hx, 2.65, 29.5, 0.78,
          [[{'text': "Spatio-Temporal Graph Neural Networks for Automated Blue Carbon MRV in UAE Mangrove Ecosystems",
             'size': 20.5, 'bold': False, 'color': EMERALD, 'font': FONT_H}]],
          line_spacing=1.05)

draw_text(hx, 3.55, 29.5, 0.45,
          [[{'text': "Narendra Gandikota", 'size': 16.5, 'bold': True, 'color': WHITE},
            {'text': "  |  NG661@live.mdx.ac.uk  |  MSc Data Science & AI CST4090 Thesis  |  Supervisor: ", 'size': 15.5, 'color': TEXT_LIGHT},
            {'text': "Dr. Krishnadas Nanath", 'size': 16, 'bold': True, 'color': WHITE},
            {'text': "  |  October 2026", 'size': 15.5, 'color': TEXT_LIGHT}]])

draw_text(hx, 4.18, 29.5, 0.44,
          [[{'text': "Regulatory Framework: ", 'size': 14.5, 'bold': True, 'color': CYAN_ACCENT},
            {'text': "Verra VM0033 Methodology  •  IPCC Tier-2 Blue Carbon Accounting  •  UAE Federal Decree-Law No. 45/2021", 'size': 14.0, 'color': WHITE}]])

# ===========================================================================
# Official MCIP Project Logo & Platform Identity Showcase (Header Far-Right)
# ===========================================================================
card_x = 30.20
card_y = 0.45
card_w = 13.00
card_h = 4.45

draw_rect(card_x, card_y, card_w, card_h, fill=NAVY_CARD, line_color=CYAN_ACCENT, line_width=1.5, round_rect=True, corner_radius=0.08)
draw_rect(card_x, card_y, card_w, 0.14, fill=EMERALD, round_rect=True, corner_radius=0.08)

logo_size = 3.65
logo_x = card_x + 0.32
logo_y = card_y + 0.42

if os.path.exists(MRV_LOGO):
    slide.shapes.add_picture(MRV_LOGO, Inches(logo_x), Inches(logo_y), Inches(logo_size), Inches(logo_size))

info_x = logo_x + logo_size + 0.35
info_w = (card_x + card_w) - info_x - 0.32
info_y = card_y + 0.30

draw_text(info_x, info_y, info_w, 0.32,
          [[{'text': "OFFICIAL RESEARCH & PLATFORM IDENTITY", 'size': 11.5, 'bold': True, 'color': CYAN_ACCENT, 'font': FONT_H}]])

draw_text(info_x, info_y + 0.32, info_w, 0.52,
          [[{'text': "Mangrove Coastal Intelligence", 'size': 21.5, 'bold': True, 'color': WHITE, 'font': FONT_T}]])

draw_text(info_x, info_y + 0.84, info_w, 0.36,
          [[{'text': "Coastal Sentinel AI Digital Twin Platform", 'size': 14.5, 'bold': True, 'color': EMERALD, 'font': FONT_H}]])

specs_runs = [
    [{'text': "• Model Core: ", 'size': 12.2, 'bold': True, 'color': CYAN_ACCENT},
     {'text': "Spatio-Temporal Graph Neural Network (ST-GNN)\n", 'size': 12.2, 'color': TEXT_LIGHT}],
    [{'text': "• Multi-Sensor: ", 'size': 12.2, 'bold': True, 'color': CYAN_ACCENT},
     {'text': "Sentinel-1/2 SAR & NASA GEDI LiDAR Ingestion\n", 'size': 12.2, 'color': TEXT_LIGHT}],
    [{'text': "• Cloud Region: ", 'size': 12.2, 'bold': True, 'color': CYAN_ACCENT},
     {'text': "me-central1 UAE Sovereign Infrastructure\n", 'size': 12.2, 'color': TEXT_LIGHT}],
    [{'text': "• Carbon Standards: ", 'size': 12.2, 'bold': True, 'color': CYAN_ACCENT},
     {'text': "Verra VM0033 & IPCC Tier-2 Compliant", 'size': 12.2, 'color': TEXT_LIGHT}]
]
draw_text(info_x, info_y + 1.20, info_w, 1.85, specs_runs, line_spacing=1.12)

pill_y = card_y + 3.65
pill_h = 0.44
draw_rect(info_x, pill_y, info_w - 0.20, pill_h, fill=RGBColor(6, 18, 32), line_color=EMERALD, line_width=1.0, round_rect=True, corner_radius=0.22)
draw_text(info_x, pill_y + 0.05, info_w - 0.20, 0.34,
          [[{'text': "● PRODUCTION SYSTEM ACTIVE  •  10-MIN AUDIT CADENCE", 'size': 11.0, 'bold': True, 'color': EMERALD, 'font': FONT_H}]],
          align=PP_ALIGN.CENTER)

# ===========================================================================
# 3. 3-COLUMN MAIN BODY (Y: 5.60" -> 38.75", Available Height = 33.15")
# ===========================================================================
BTOP = 5.60
BBOT = 38.75
BH   = BBOT - BTOP
GAP  = 0.40
CW   = (W - 2 * MARGIN - 2 * GAP) / 3.0   # ~ 13.73"
PAD  = 0.36
IW   = CW - 2 * PAD                       # ~ 13.01"

C1X = MARGIN
C2X = MARGIN + CW + GAP
C3X = MARGIN + 2 * (CW + GAP)

for cx in (C1X, C2X, C3X):
    draw_rect(cx, BTOP, CW, BH, fill=BG_PANEL, line_color=BORDER, line_width=1.0, round_rect=True, corner_radius=0.04)

# ═══════════════════════════════════════════════════════════════════════════
# COLUMN 1: NARRATIVE, PROBLEM & THEORETICAL FOUNDATION
# Target y1 end: 38.75"
# ═══════════════════════════════════════════════════════════════════════════
x1 = C1X + PAD
y1 = BTOP + 0.18

y1 += add_section_header(C1X + 0.12, y1, CW - 0.24, "01", "PROBLEM & THEORETICAL FOUNDATION")
y1 += 0.18

# Problem Statement Card
y1 += add_mini_label(x1, y1, IW, "THE BLUE CARBON MRV BOTTLENECK")
prob_card_h = 2.30
draw_rect(x1, y1, IW, prob_card_h, fill=WHITE, line_color=BORDER, line_width=1.0, round_rect=True, corner_radius=0.08)
draw_rect(x1, y1, 0.18, prob_card_h, fill=RED_MDX)
prob_text = [
    [{'text': "• Coastal Mangrove Sequestration: ", 'size': 14.2, 'bold': True, 'color': NAVY_DEEP},
     {'text': "The UAE is home to >40,000 hectares of arid mangroves (Avicennia marina), sequestering up to 6 tCO2e/ha/year in biomass and sediment, pivotal for the UAE Net Zero 2050 Strategic Initiative.\n", 'size': 13.8, 'color': TEXT_DARK}],
    [{'text': "• Methodological Failure: ", 'size': 14.2, 'bold': True, 'color': NAVY_DEEP},
     {'text': "Traditional manual MRV relies on physical field campaigns (arborist tape measurements and destructive sediment coring), costing $120,000+ per 5-year cycle, taking 6 to 18 months of lab audit delay, and failing to differentiate allochthonous sediment.\n", 'size': 13.8, 'color': TEXT_DARK}],
    [{'text': "• $2.0B Market Disconnect: ", 'size': 14.2, 'bold': True, 'color': NAVY_DEEP},
     {'text': "High verification barriers and audit opacity exclude UAE blue carbon assets from the international Voluntary Carbon Market (VCM), leaving valuable natural capital unmonetized.", 'size': 13.8, 'color': TEXT_DARK}]
]
draw_text(x1 + 0.35, y1 + 0.10, IW - 0.45, prob_card_h - 0.18, prob_text, line_spacing=1.16)
y1 += prob_card_h + 0.18

# 3 Stat Cards
cg = 0.20
cw3 = (IW - 2 * cg) / 3.0
ch3 = 2.05
add_stat_card(x1, y1, cw3, ch3, "40K+ ha", "UAE Mangrove Canopy", EMERALD, "EAD Verified Ground")
add_stat_card(x1 + cw3 + cg, y1, cw3, ch3, "$2.0B", "Voluntary Carbon Gap", GOLD, "Unmonetized Assets")
add_stat_card(x1 + 2 * (cw3 + cg), y1, cw3, ch3, "70%", "MRV Cost Reduction", CYAN_ACCENT, "Automated Digital MRV")
y1 += ch3 + 0.18

# Central Research Question Callout
y1 += add_mini_label(x1, y1, IW, "PRIMARY RESEARCH INQUIRY")
rq_box_h = 1.95
draw_rect(x1, y1, IW, rq_box_h, fill=NAVY_DEEP, line_color=CYAN_ACCENT, line_width=1.2, round_rect=True, corner_radius=0.08)
draw_text(x1 + 0.25, y1 + 0.12, IW - 0.50, 0.28,
          [[{'text': "POST-GRADUATE RESEARCH HYPOTHESIS", 'size': 12.5, 'bold': True, 'color': CYAN_ACCENT}]])
rq_text = (
    "\"Can a Spatio-Temporal Graph Neural Network (ST-GNN) trained on multi-source satellite "
    "telemetry and hydrodynamic tidal connectivity provide significantly more accurate, robust, and "
    "explainable monthly carbon sequestration estimates and 12-month forecasts than non-spatial "
    "or non-temporal baseline models?\""
)
draw_text(x1 + 0.25, y1 + 0.42, IW - 0.50, rq_box_h - 0.48,
          [[{'text': rq_text, 'size': 14.8, 'italic': True, 'color': WHITE}]], line_spacing=1.18)
y1 += rq_box_h + 0.18

# Figure 1: Conceptual Framework & Literature Review Synthesis
y1 += add_mini_label(x1, y1, IW, "THEORETICAL ARCHITECTURE & SYNTHESIS")
fig1_box_h = 8.45
draw_rect(x1, y1, IW, fig1_box_h, fill=WHITE, line_color=BORDER, line_width=1.0, round_rect=True, corner_radius=0.08)
if os.path.exists(FIG1_FRAMEWORK):
    slide.shapes.add_picture(FIG1_FRAMEWORK, Inches(x1 + (IW - 12.40)/2), Inches(y1 + 0.12), Inches(12.40), Inches(7.00))

draw_text(x1 + 0.25, y1 + 7.20, IW - 0.50, 1.20,
          [[{'text': "Figure 1: Conceptual Framework of the Literature Review. ", 'size': 14.0, 'bold': True, 'color': NAVY_DEEP},
            {'text': "Harmonizes Remote Sensing (Theme 1), 3D Spaceborne LiDAR (Theme 2), Relational ST-GNNs (Theme 3), "
                     "Carbon Accounting Standards (Theme 4), and Explainable AI (Theme 5) to resolve 3 critical research gaps: GEDI 3D sparsity, "
                     "1D spatial isolation, and audit opacity, culminating in the MCIP Autonomous Digital Twin.",
             'size': 13.2, 'color': TEXT_MUTED}]], line_spacing=1.14)
y1 += fig1_box_h + 0.18

# Multi-Source Ingestion Table
y1 += add_mini_label(x1, y1, IW, "MULTI-SOURCE SATELLITE REPOSITORY (68 CONSECUTIVE MONTHS)")
dataset_rows = [
    ["Satellite Sensor", "Constellation / Instrument", "Spatial / Temporal Resolution", "Extracted Features & Physical Relevance"],
    ["Sentinel-2 MSI", "ESA Multispectral (13 bands)", "10 m / 5-day cycle", "B01-B12, NDVI, EVI, NDWI, MNDWI (Photosynthetic vigour)"],
    ["Sentinel-1 SAR", "ESA C-Band SAR (5.405 GHz)", "10 m / 6–12 days", "VV, VH backscatter, VV/VH ratio (Canopy volumetric density)"],
    ["NASA GEDI LiDAR", "ISS Spaceborne Laser Altimeter", "25 m footprint (sparse)", "RH100, RH98, RH95, RH75, RH50, PAI, FHD, FCOVER, Biomass"],
    ["OpenWeatherMap", "ERA5 Atmospheric Reanalysis", "Continuous hourly", "Sea surface temperature, wind vectors, barometric pressure"]
]
t1_h = add_table_data(x1, y1, IW, dataset_rows, [0.24, 0.26, 0.22, 0.28], font_size=12.8, hdr_size=13.6, row_height=0.52, hdr_height=0.54)
y1 += t1_h + 0.18

# Core Research Objectives (O1 - O6)
y1 += add_mini_label(x1, y1, IW, "CORE RESEARCH OBJECTIVES (O1 – O6)")
objectives = [
    ("O1. Multi-Sensor Fusion: ", "Co-register Sentinel-1 SAR, Sentinel-2 Multispectral & GEDI LiDAR over 68 months (Jan 2021 – Aug 2026)."),
    ("O2. Neural LiDAR Imputation: ", "Develop transfer learning imputation resolving GEDI sparsity from Sundarbans to UAE arid mangrove stands."),
    ("O3. Hydrodynamic Graph Formulation: ", "Delineate 53 DBSCAN patch nodes connected by 86 directional tidal and sedimental flux edges."),
    ("O4. Spatio-Temporal Deep Learning: ", "Train ST-GNN forecasting 12 months ahead; rigorously benchmark vs Random Forest, LSTM, and GCN."),
    ("O5. Causal Explainability & Auditing: ", "Formulate SHAP feature attribution with Gemini 2.5 Flash conversational auditing under Verra VM0033."),
    ("O6. Enterprise Production Deployment: ", "Deploy Coastal Sentinel on sovereign Google Cloud me-central1 with <600ms query latency.")
]
for obj_title, obj_desc in objectives:
    draw_text(x1 + 0.10, y1, IW - 0.20, 0.43,
              [[{'text': obj_title, 'size': 13.6, 'bold': True, 'color': NAVY_DEEP},
                {'text': obj_desc, 'size': 13.0, 'color': TEXT_DARK}]], line_spacing=1.10)
    y1 += 0.43
y1 += 0.18

# Stage 1 Deep ANN Empirical Pixel Classification Card
y1 += add_mini_label(x1, y1, IW, "STAGE 1: MULTI-SPECTRAL CANOPY PIXEL CLASSIFICATION")
s1_card_h = 3.85
draw_rect(x1, y1, IW, s1_card_h, fill=WHITE, line_color=BORDER, line_width=1.0, round_rect=True, corner_radius=0.08)

cm_w = 4.80
cm_h = 3.60
if os.path.exists(FIG1_CONFUSION):
    slide.shapes.add_picture(FIG1_CONFUSION, Inches(x1 + 0.18), Inches(y1 + 0.12), Inches(cm_w), Inches(cm_h))

cm_info_x = x1 + cm_w + 0.35
cm_info_w = IW - cm_w - 0.50
draw_text(cm_info_x, y1 + 0.12, cm_info_w, 0.32,
          [[{'text': "STAGE 1 DEEP ANN TEST PARTITION RESULTS", 'size': 13.8, 'bold': True, 'color': NAVY_DEEP}]])

cm_metrics = [
    [{'text': "• Dataset Scope: ", 'size': 13.6, 'bold': True, 'color': NAVY_DEEP},
     {'text': "62,310 test pixels across 5 balanced classes (Forest, Mangrove, Sand, Urban, Water).\n", 'size': 13.2, 'color': TEXT_DARK}],
    [{'text': "• Class Balancing: ", 'size': 13.6, 'bold': True, 'color': NAVY_DEEP},
     {'text': "RandomUnderSampler applied to eliminate severe coastal sand/water majority bias.\n", 'size': 13.2, 'color': TEXT_DARK}],
    [{'text': "• Mangrove Precision: ", 'size': 13.6, 'bold': True, 'color': NAVY_DEEP},
     {'text': "0.9996 (99.96%)  •  ", 'size': 13.2, 'color': TEXT_DARK},
     {'text': "Mangrove Recall: ", 'size': 13.6, 'bold': True, 'color': NAVY_DEEP},
     {'text': "0.9994 (12,450 test pixels, TPR = 99.94%)\n", 'size': 13.2, 'color': TEXT_DARK}],
    [{'text': "• Macro Metrics: ", 'size': 13.6, 'bold': True, 'color': NAVY_DEEP},
     {'text': "Accuracy: 99.95%  •  Macro F1-Score: 0.9995  •  Loss: 0.00073 restored from epoch 6.\n", 'size': 13.2, 'color': TEXT_DARK}],
    [{'text': "• Discriminative Isolation: ", 'size': 13.6, 'bold': True, 'color': NAVY_DEEP},
     {'text': "Zero confusion with urban infrastructure or tidal water, reliably isolating 3,230 coordinates.", 'size': 13.2, 'color': TEXT_DARK}]
]
draw_text(cm_info_x, y1 + 0.46, cm_info_w, s1_card_h - 0.52, cm_metrics, line_spacing=1.18)
y1 += s1_card_h + 0.18

# Regulatory Alignment & UAE Net Zero 2050 Card (Bottom of Column 1)
y1 += add_mini_label(x1, y1, IW, "REGULATORY ALIGNMENT & UAE NET ZERO 2050 POLICY")
reg_h = BBOT - y1
draw_rect(x1, y1, IW, reg_h, fill=NAVY_DEEP, line_color=CYAN_ACCENT, line_width=1.2, round_rect=True, corner_radius=0.08)
draw_text(x1 + 0.25, y1 + 0.16, IW - 0.50, 0.32,
          [[{'text': "SOVEREIGN POLICY ALIGNMENT & STANDARDS COMPLIANCE", 'size': 14.5, 'bold': True, 'color': CYAN_ACCENT}]])

reg_bullets = [
    ("• UAE Net Zero 2050 Strategic Initiative: ",
     "Directly operationalizes the national COP28 pledge to plant and safeguard 100 Million Mangroves by 2030, establishing verified blue carbon natural capital across all seven emirates.\n"),
    ("• Verra VM0033 Standard Compliance: ",
     "Adheres strictly to Tidal Wetland and Seagrass Restoration methodology v2.1, enforcing standardized baseline additionality, allometric biomass scaling, and 100-year permanence risk buffers (10–20%).\n"),
    ("• Sovereign Data Localization: ",
     "Enterprise hosting in Google Cloud me-central1 (Doha/Dammam), fully complying with UAE Federal Decree-Law No. 45/2021 regarding environmental and geospatial data sovereignty.\n"),
    ("• 70% Verification Cost Reduction: ",
     "Slashes traditional manual MRV audit costs from $120,000 per 5-year cycle down to $5,000 spot ground-truthing, eliminating audit lag from 18 months to 50 seconds.\n"),
    ("• Unlocking the $2.0B Voluntary Carbon Market: ",
     "Establishes high-integrity digital MRV provenance, transforming unmonetized UAE coastal ecosystems into internationally tradeable, premium-grade blue carbon credits.")
]
draw_text(x1 + 0.25, y1 + 0.52, IW - 0.50, reg_h - 0.60,
          [[{'text': b_title, 'size': 13.8, 'bold': True, 'color': EMERALD},
            {'text': b_desc, 'size': 13.2, 'color': WHITE}] for b_title, b_desc in reg_bullets],
          line_spacing=1.18)
y1 += reg_h

# ═══════════════════════════════════════════════════════════════════════════
# COLUMN 2: RESEARCH METHODOLOGY, GEDI IMPUTATION & ST-GNN
# Target y2 end: 38.75"
# ═══════════════════════════════════════════════════════════════════════════
x2 = C2X + PAD
y2 = BTOP + 0.18

y2 += add_section_header(C2X + 0.12, y2, CW - 0.24, "02", "METHODOLOGY, GEDI IMPUTATION & ST-GNN")
y2 += 0.18

# 4-Phase Architecture Pipeline
y2 += add_mini_label(x2, y2, IW, "END-TO-END 4-STAGE METHODOLOGY PIPELINE")
pipe_h = 2.50
draw_rect(x2, y2, IW, pipe_h, fill=NAVY_DEEP, line_color=CYAN_ACCENT, line_width=1.0, round_rect=True, corner_radius=0.08)

steps = [
    ("STAGE 0: INGESTION & QA", "Automated Synchronicity Gate ingests Sentinel-1/2 & GEDI across 3,230 coordinates (68 months, 2021-2026)."),
    ("STAGE 1: PIXEL CLASSIFIER", "Deep ANN classifier trained on balanced Sentinel-2 bands isolates pure mangrove canopy pixels (99.95% acc)."),
    ("STAGE 2: NEURAL IMPUTATION", "Cross-biome transfer learning from Sundarbans (84,200 points) to UAE dwarf stands solving GEDI ~4%/mo void."),
    ("STAGE 3: TOPOLOGY & ST-GNN", "DBSCAN clusters 53 patch nodes; 86 hydrodynamic edges pass sediment messages; ST-GNN forecasts 12 months ahead.")
]
sy = y2 + 0.12
for i, (title_p, desc_p) in enumerate(steps):
    draw_rect(x2 + 0.20, sy, 0.42, 0.42, fill=EMERALD, round_rect=True, corner_radius=0.5)
    num_s = slide.shapes[-1]
    tf = num_s.text_frame; tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    r = p.add_run(); r.text = str(i); r.font.size = Pt(13.5); r.font.bold = True; r.font.color.rgb = NAVY_DEEP

    draw_text(x2 + 0.78, sy - 0.02, IW - 0.95, 0.50,
              [[{'text': title_p + ": ", 'size': 13.8, 'bold': True, 'color': CYAN_ACCENT},
                {'text': desc_p, 'size': 13.0, 'color': WHITE}]], line_spacing=1.10)
    sy += 0.56
y2 += pipe_h + 0.18

# Figure 2: GEDI LiDAR Neural Imputation Breakthrough Card
y2 += add_mini_label(x2, y2, IW, "CROSS-BIOME 3D CANOPY HEIGHT NEURAL IMPUTATION")
fig2_card_h = 5.15
draw_rect(x2, y2, IW, fig2_card_h, fill=WHITE, line_color=BORDER, line_width=1.0, round_rect=True, corner_radius=0.08)
if os.path.exists(FIG2_GEDI):
    slide.shapes.add_picture(FIG2_GEDI, Inches(x2 + (IW - 12.40)/2), Inches(y2 + 0.10), Inches(12.40), Inches(3.80))

draw_text(x2 + 0.25, y2 + 3.96, IW - 0.50, 1.12,
          [[{'text': "Figure 2: Transfer Learning Convergence across NASA GEDI LiDAR Structural Profiles. ", 'size': 14.0, 'bold': True, 'color': NAVY_DEEP},
            {'text': "Pre-trained on 84,200 dense Sundarbans coordinates and fine-tuned on sparse UAE coastal returns. "
                     "For primary canopy height (rh100), neural imputation achieves RMSE = 3.13 m (Val MSE = 9.81, R² = 0.842), "
                     "delivering a 46.2% error reduction over Linear Regression (5.82 m) and 25.1% over XGBoost (4.18 m). "
                     "Yields complete 35-dimensional feature vectors across all 68 consecutive months.",
             'size': 13.2, 'color': TEXT_MUTED}]], line_spacing=1.12)
y2 += fig2_card_h + 0.18

# Figure 3: Non-Euclidean Hydrodynamic Graph Topology
y2 += add_mini_label(x2, y2, IW, "ST-GNN HYDRODYNAMIC GRAPH TOPOLOGY & ADJACENCY MATRIX")
fig3_box_h = 5.65
draw_rect(x2, y2, IW, fig3_box_h, fill=WHITE, line_color=BORDER, line_width=1.0, round_rect=True, corner_radius=0.08)
if os.path.exists(FIG3_GRAPH):
    slide.shapes.add_picture(FIG3_GRAPH, Inches(x2 + (IW - 12.40)/2), Inches(y2 + 0.10), Inches(12.40), Inches(4.30))

draw_text(x2 + 0.25, y2 + 4.46, IW - 0.50, 1.12,
          [[{'text': "Figure 3: Hydrodynamic Graph Construction & Adjacency Matrix across UAE Coastline. ", 'size': 14.0, 'bold': True, 'color': NAVY_DEEP},
            {'text': "(A) 53 DBSCAN mangrove patch nodes connected by 86 directional tidal and sedimental edges along the Arabian Gulf. "
                     "(B) ST-GNN 53x53 weighted adjacency matrix heatmap with Viridis colormap, encoding sedimental (1.0), tidal (0.5), and spatial proximity (0.25) coupling weights, "
                     "modeling non-Euclidean hydrodynamic connectivity that conventional pixel CNNs miss.",
             'size': 13.2, 'color': TEXT_MUTED}]], line_spacing=1.12)
y2 += fig3_box_h + 0.18

# Mathematical Accounting Formulations (Dual Navy Cards)
y2 += add_mini_label(x2, y2, IW, "MATHEMATICAL ACCOUNTING FORMULATIONS")
f_box_w = (IW - 0.25) / 2.0
f_box_h = 2.95

# Card 1: Mangrove Health Score
draw_rect(x2, y2, f_box_w, f_box_h, fill=NAVY_CARD, line_color=CYAN_ACCENT, line_width=1.0, round_rect=True, corner_radius=0.10)
draw_text(x2 + 0.18, y2 + 0.12, f_box_w - 0.36, 0.28,
          [[{'text': "MANGROVE HEALTH SCORE (MHS)", 'size': 13.5, 'bold': True, 'color': CYAN_ACCENT}]])
draw_text(x2 + 0.18, y2 + 0.40, f_box_w - 0.36, 0.46,
          [[{'text': "MHS = (NDVI x 40) + ((RH100/10) x 30) + ((Abs/15) x 30)", 'size': 13.5, 'bold': True, 'color': EMERALD, 'font': FONT_M}]])
mhs_bullets = [
    [{'text': "• NDVI (40%): ", 'size': 13.2, 'bold': True, 'color': WHITE},
     {'text': "Photosynthetic canopy vigor\n", 'size': 12.8, 'color': TEXT_LIGHT}],
    [{'text': "• RH100 (30%): ", 'size': 13.2, 'bold': True, 'color': WHITE},
     {'text': "LiDAR 100th percentile canopy height\n", 'size': 12.8, 'color': TEXT_LIGHT}],
    [{'text': "• Absorption (30%): ", 'size': 13.2, 'bold': True, 'color': WHITE},
     {'text': "Monthly carbon uptake rate\n", 'size': 12.8, 'color': TEXT_LIGHT}],
    [{'text': "• Index Range: ", 'size': 13.2, 'bold': True, 'color': WHITE},
     {'text': "0 (Degraded) to 100 (Peak Vitality)", 'size': 12.8, 'color': TEXT_LIGHT}]
]
draw_text(x2 + 0.18, y2 + 0.90, f_box_w - 0.36, 1.85, mhs_bullets, line_spacing=1.14)

# Card 2: IPCC Tier-2 Carbon Accounting
draw_rect(x2 + f_box_w + 0.25, y2, f_box_w, f_box_h, fill=NAVY_CARD, line_color=EMERALD, line_width=1.0, round_rect=True, corner_radius=0.10)
draw_text(x2 + f_box_w + 0.43, y2 + 0.12, f_box_w - 0.36, 0.28,
          [[{'text': "IPCC TIER-2 BLUE CARBON ACCOUNTING", 'size': 13.5, 'bold': True, 'color': EMERALD}]])
draw_text(x2 + f_box_w + 0.43, y2 + 0.40, f_box_w - 0.36, 0.46,
          [[{'text': "C_Stock (MgC/ha) = Biomass x 0.47\nCO2e (tCO2e/ha) = C_Stock x (44/12)",
             'size': 13.5, 'bold': True, 'color': WHITE, 'font': FONT_M}]], line_spacing=1.04)
ipcc_bullets = [
    [{'text': "• Biomass: ", 'size': 13.2, 'bold': True, 'color': WHITE},
     {'text': "Derived from GEDI LiDAR RH100 + PAI\n", 'size': 12.8, 'color': TEXT_LIGHT}],
    [{'text': "• Allometry: ", 'size': 13.2, 'bold': True, 'color': WHITE},
     {'text': "Arid Avicennia marina coefficient\n", 'size': 12.8, 'color': TEXT_LIGHT}],
    [{'text': "• Carbon Fraction: ", 'size': 13.2, 'bold': True, 'color': WHITE},
     {'text': "0.47 IPCC Tier-2 standard\n", 'size': 12.8, 'color': TEXT_LIGHT}],
    [{'text': "• CO2 Conversion: ", 'size': 13.2, 'bold': True, 'color': WHITE},
     {'text': "Molecular weight ratio (44/12)", 'size': 12.8, 'color': TEXT_LIGHT}]
]
draw_text(x2 + f_box_w + 0.43, y2 + 0.90, f_box_w - 0.36, 1.85, ipcc_bullets, line_spacing=1.14)
y2 += f_box_h + 0.18

# ST-GNN Architecture Specification
y2 += add_mini_label(x2, y2, IW, "ST-GNN TENSOR & SPATIO-TEMPORAL OPERATOR")
gnn_box_h = 2.45
draw_rect(x2, y2, IW, gnn_box_h, fill=WHITE, line_color=BORDER, line_width=1.0, round_rect=True, corner_radius=0.08)
gnn_spec = [
    [{'text': "• Input Tensor: ", 'size': 13.8, 'bold': True, 'color': NAVY_DEEP},
     {'text': "X in R^(N x T x F) where N = 53 patch nodes, T = 3 lookback months, F = 35 multi-sensor physical features.\n", 'size': 13.2, 'color': TEXT_DARK}],
    [{'text': "• Spatial Graph Convolution: ", 'size': 13.8, 'bold': True, 'color': NAVY_DEEP},
     {'text': "A_hat = D_tilde^(-1/2) * A_tilde * D_tilde^(-1/2) passing messages across 86 tidal edges.\n", 'size': 13.2, 'color': TEXT_DARK}],
    [{'text': "• Temporal Recurrence: ", 'size': 13.8, 'bold': True, 'color': NAVY_DEEP},
     {'text': "Bidirectional LSTM capturing seasonal phenological cycles and lagged sedimentation dynamics.\n", 'size': 13.2, 'color': TEXT_DARK}],
    [{'text': "• 12-Month Autoregressive Forecast: ", 'size': 13.8, 'bold': True, 'color': NAVY_DEEP},
     {'text': "Horizon forecasting with empirical 95% confidence intervals satisfying Verra permanence.\n", 'size': 13.2, 'color': TEXT_DARK}],
    [{'text': "• Topo-Inductive Bias: ", 'size': 13.8, 'bold': True, 'color': NAVY_DEEP},
     {'text': "Captures non-local carbon transport that Euclidean CNNs and non-relational time-series miss.", 'size': 13.2, 'color': TEXT_DARK}]
]
draw_text(x2 + 0.20, y2 + 0.12, IW - 0.40, gnn_box_h - 0.24, gnn_spec, line_spacing=1.16)
y2 += gnn_box_h + 0.18

# Candidate Architecture Ablation Matrix
y2 += add_mini_label(x2, y2, IW, "CANDIDATE ARCHITECTURE ABLATION MATRIX")
ablation_rows = [
    ["Candidate Model", "Spatial", "Temporal", "Key Inductive Bias & Mechanism"],
    ["Random Forest (Baseline 1)", "No", "No", "Tabular feature bagging baseline (non-spatial, non-temporal)"],
    ["Temporal LSTM (Baseline 2)", "No", "Yes", "Sequential temporal recurrence per patch without spatial adjacency"],
    ["Spatial GCN (Baseline 3)", "Yes", "No", "Spatial graph convolution without temporal sequence recurrence"],
    ["ST-GNN (Proposed MCIP)", "Yes", "Yes", "Spatio-temporal message passing over 86 hydrodynamic tidal/sediment edges"]
]
t3_h = add_table_data(x2, y2, IW, ablation_rows, [0.30, 0.11, 0.11, 0.48], font_size=12.8, hdr_size=13.6, row_height=0.48, hdr_height=0.50, highlight_idx=4)
y2 += t3_h + 0.18

# Spatio-Temporal Graph Message Passing Operator Card
y2 += add_mini_label(x2, y2, IW, "SPATIO-TEMPORAL GRAPH MESSAGE PASSING OPERATOR")
msg_h = 2.20
draw_rect(x2, y2, IW, msg_h, fill=NAVY_CARD, line_color=CYAN_ACCENT, line_width=1.0, round_rect=True, corner_radius=0.08)
draw_text(x2 + 0.20, y2 + 0.10, IW - 0.40, 0.28,
          [[{'text': "MATHEMATICAL FORMULATION: HYDRODYNAMIC MESSAGE PASSING", 'size': 13.2, 'bold': True, 'color': CYAN_ACCENT}]])
draw_text(x2 + 0.20, y2 + 0.38, IW - 0.40, 0.46,
          [[{'text': "H^(l+1) = sigma( D_tilde^(-1/2) * (A_topo . W_flux) * D_tilde^(-1/2) * H^(l) * Theta^(l) )",
             'size': 13.5, 'bold': True, 'color': EMERALD, 'font': FONT_M}]])
msg_exp = [
    [{'text': "• Topo-Weight Tensor (A_topo . W_flux): ", 'size': 13.2, 'bold': True, 'color': WHITE},
     {'text': "Direct Hadamard product scales topological edges by ebb/flood tidal velocities.\n", 'size': 12.8, 'color': TEXT_LIGHT}],
    [{'text': "• Degree Renormalization: ", 'size': 13.2, 'bold': True, 'color': WHITE},
     {'text': "Symmetric normalization D_tilde prevents numerical explosion over dense creek channels.\n", 'size': 12.8, 'color': TEXT_LIGHT}],
    [{'text': "• Parameter Matrix Theta^(l): ", 'size': 13.2, 'bold': True, 'color': WHITE},
     {'text': "Trainable transformation weights projecting multi-sensor embeddings to carbon state.", 'size': 12.8, 'color': TEXT_LIGHT}]
]
draw_text(x2 + 0.20, y2 + 0.86, IW - 0.40, msg_h - 0.92, msg_exp, line_spacing=1.14)
y2 += msg_h + 0.18

# Callout banner at bottom of Column 2: Resolving the 1D Island Fallacy
y2 += add_mini_label(x2, y2, IW, "THEORETICAL INSIGHT: RESOLVING THE '1D ISLAND FALLACY'")
island_h = BBOT - y2
draw_rect(x2, y2, IW, island_h, fill=NAVY_DEEP, line_color=EMERALD, line_width=1.2, round_rect=True, corner_radius=0.08)
draw_text(x2 + 0.22, y2 + 0.16, IW - 0.44, 0.32,
          [[{'text': "ALLOCHTHONOUS VS AUTOCHTHONOUS FLUX ATTRIBUTION", 'size': 14.5, 'bold': True, 'color': EMERALD}]])

island_bullets = [
    ("• The 1D Island Fallacy: ",
     "Conventional remote sensing and isolated point-regression models treat mangrove stands as disconnected islands, incorrectly attributing tidal sediment accumulation to biological carbon sequestration.\n"),
    ("• Hydrodynamic Message Passing: ",
     "ST-GNN resolves this fundamental bottleneck by propagating multi-sensor feature tensors across 86 directed hydrodynamic edges weighted by ebb/flood velocities along coastal tidal channels.\n"),
    ("• Empirical Validation (Spring Flood Case): ",
     "Rigorously validated across coupled Patch 19 (barrier island) -> Patch 25 (inner lagoon). During an extreme tidal surge, an 18% increase in SAR backscatter occurred with static optical NDVI (0.64).\n"),
    ("• Verra VM0033 Integrity Enforcement: ",
     "ST-GNN correctly recognized the influx as allochthonous marine sediment deposition rather than autochthonous mangrove growth, withholding 142 unearned carbon credits and preventing fraudulent over-issuance.")
]
draw_text(x2 + 0.22, y2 + 0.50, IW - 0.44, island_h - 0.58,
          [[{'text': b_title, 'size': 13.8, 'bold': True, 'color': CYAN_ACCENT},
            {'text': b_desc, 'size': 13.2, 'color': WHITE}] for b_title, b_desc in island_bullets],
          line_spacing=1.16)
y2 += island_h

# ═══════════════════════════════════════════════════════════════════════════
# COLUMN 3: EMPIRICAL BENCHMARKS, XAI & COASTAL SENTINEL
# Target y3 end: 38.75"
# ═══════════════════════════════════════════════════════════════════════════
x3 = C3X + PAD
y3 = BTOP + 0.18

y3 += add_section_header(C3X + 0.12, y3, CW - 0.24, "03", "BENCHMARKS, XAI & COASTAL SENTINEL")
y3 += 0.18

# Empirical Benchmarks Table
y3 += add_mini_label(x3, y3, IW, "EMPIRICAL MODEL BENCHMARKING RESULTS")
perf_rows = [
    ["Model Architecture", "Ablated Architectural Component", "RMSE (tCO2e/ha)", "MAE (tCO2e/ha)", "R² Score", "Nash-Sutcliffe (NSE)"],
    ["Random Forest (Baseline 1)", "Spatial Graph & Temporal Recurrence", "0.2430", "0.1985", "0.612", "0.589"],
    ["Temporal LSTM (Baseline 2)", "Spatial Graph Convolutions", "0.1685", "0.1342", "0.764", "0.741"],
    ["Spatial GCN (Baseline 3)", "Temporal Sequence Recurrence", "0.1412", "0.1150", "0.808", "0.792"],
    ["ST-GNN (Proposed MCIP)", "None (Full Spatio-Temporal Topology)", "0.0874", "0.0740", "0.912", "0.895"]
]
t4_h = add_table_data(x3, y3, IW, perf_rows, [0.26, 0.26, 0.13, 0.13, 0.11, 0.11], font_size=12.8, hdr_size=13.6, row_height=0.52, hdr_height=0.54, highlight_idx=4)
y3 += t4_h + 0.18

# Key Finding Callout
finding_h = 1.85
draw_rect(x3, y3, IW, finding_h, fill=NAVY_DEEP, line_color=EMERALD, line_width=1.5, round_rect=True, corner_radius=0.10)
draw_text(x3 + 0.22, y3 + 0.14, IW - 0.44, 0.30,
          [[{'text': "KEY BENCHMARK FINDING: STATISTICAL SUPERIORITY", 'size': 13.8, 'bold': True, 'color': EMERALD}]])
draw_text(x3 + 0.22, y3 + 0.48, IW - 0.44, finding_h - 0.56,
          [[{'text': "ST-GNN achieves a 64.0% lower RMSE (0.0874 vs 0.2430 tCO2e/ha) than Random Forest, 48.1% lower than LSTM, "
                     "and 38.1% lower than Spatial GCN. Super-additive gain (R² = 0.912, NSE = 0.895) proves that coastal blue carbon dynamics "
                     "depend fundamentally on inseparable spatio-temporal interactions.",
             'size': 13.8, 'color': WHITE}]], line_spacing=1.20)
y3 += finding_h + 0.18

# SHAP Causal Feature Attribution
y3 += add_mini_label(x3, y3, IW, "SHAP CAUSAL FEATURE ATTRIBUTION (VM0033 AUDIT)")
shap_features = [
    ("Sentinel-2 NDVI (Photosynthetic Canopy Vigor)", 38, EMERALD),
    ("Sentinel-1 SAR VV Backscatter (Woody Biomass & Density)", 29, CYAN_ACCENT),
    ("NASA GEDI LiDAR RH100 (100th Percentile Canopy Height)", 21, NAVY_HOVER),
    ("NASA GEDI PAI (Plant Area Index & Foliage Density)", 8, GOLD),
    ("Hydrodynamic Tidal Connectivity (Sediment Flow Vectors)", 4, TEXT_MUTED)
]
bar_total_w = IW - 2.80
for feat_name, pct, bar_col in shap_features:
    draw_text(x3, y3, IW, 0.28,
              [[{'text': feat_name, 'size': 13.5, 'bold': True, 'color': TEXT_DARK}]])
    y3 += 0.28
    draw_rect(x3, y3, bar_total_w, 0.26, fill=TBL_ALT, line_color=BORDER, line_width=0.5, round_rect=True, corner_radius=0.3)
    fill_w = max(0.25, bar_total_w * (pct / 100.0))
    draw_rect(x3, y3, fill_w, 0.26, fill=bar_col, round_rect=True, corner_radius=0.3)
    draw_text(x3 + bar_total_w + 0.15, y3 - 0.04, 2.50, 0.28,
              [[{'text': f"{pct}% Contribution", 'size': 13.0, 'bold': True, 'color': TEXT_DARK}]])
    y3 += 0.32
y3 += 0.18

# Figure 4: Coastal Sentinel Production Platform & Autonomous XAI Specialist
y3 += add_mini_label(x3, y3, IW, "COASTAL SENTINEL: PRODUCTION PLATFORM & XAI")
fig4_box_h = 4.95
draw_rect(x3, y3, IW, fig4_box_h, fill=WHITE, line_color=BORDER, line_width=1.0, round_rect=True, corner_radius=0.08)
if os.path.exists(FIG4_PLATFORM):
    slide.shapes.add_picture(FIG4_PLATFORM, Inches(x3 + (IW - 12.40)/2), Inches(y3 + 0.12), Inches(12.40), Inches(3.45))

draw_text(x3 + 0.25, y3 + 3.65, IW - 0.50, 1.20,
          [[{'text': "Figure 4: Coastal Sentinel Live Production MRV Platform & Auditor-Ready XAI Specialist. ", 'size': 14.0, 'bold': True, 'color': NAVY_DEEP},
            {'text': "(A) Executive MRV Dashboard monitoring 53 verified patches across the UAE coast (562.8k tCO2e stock, $35/tCO2e valuation). "
                     "(B) Explainable AI Conversational Specialist converting SHAP tensors and weather reanalysis into natural language audit trails via Google Genkit and Gemini 2.5 Flash.",
             'size': 13.2, 'color': TEXT_MUTED}]], line_spacing=1.14)
y3 += fig4_box_h + 0.18

# Dual Alert Engine & Verra VM0033 Compliance (Two side-by-side cards)
y3 += add_mini_label(x3, y3, IW, "AUTONOMOUS ALERTS & VERRA VM0033 AUDIT")
b_w = (IW - 0.25) / 2.0
b_h = 3.00

# Card 1: Alert System
draw_rect(x3, y3, b_w, b_h, fill=WHITE, line_color=BORDER, line_width=1.0, round_rect=True, corner_radius=0.08)
draw_text(x3 + 0.18, y3 + 0.14, b_w - 0.36, 0.28,
          [[{'text': "AUTONOMOUS ALERT ENGINE", 'size': 13.5, 'bold': True, 'color': NAVY_DEEP}]])
alert_bullets = [
    [{'text': "• Level 1 (5–10%): ", 'size': 13.2, 'bold': True, 'color': NAVY_DEEP},
     {'text': "Informational anomaly telemetry\n", 'size': 12.8, 'color': TEXT_DARK}],
    [{'text': "• Level 2 (10–20%): ", 'size': 13.2, 'bold': True, 'color': NAVY_DEEP},
     {'text': "Warning + SHAP causal narrative\n", 'size': 12.8, 'color': TEXT_DARK}],
    [{'text': "• Level 3 (>20%): ", 'size': 13.2, 'bold': True, 'color': NAVY_DEEP},
     {'text': "Critical canopy stress intervention\n", 'size': 12.8, 'color': TEXT_DARK}],
    [{'text': "• Proactive Scanning: ", 'size': 13.2, 'bold': True, 'color': NAVY_DEEP},
     {'text': "Forward looking via weather reanalysis\n", 'size': 12.8, 'color': TEXT_DARK}],
    [{'text': "• Heartbeat Daemon: ", 'size': 13.2, 'bold': True, 'color': NAVY_DEEP},
     {'text': "Continuous 10-minute keep-alive pings", 'size': 12.8, 'color': TEXT_DARK}]
]
draw_text(x3 + 0.18, y3 + 0.46, b_w - 0.36, b_h - 0.52, alert_bullets, line_spacing=1.18)

# Card 2: Verra VM0033
draw_rect(x3 + b_w + 0.25, y3, b_w, b_h, fill=WHITE, line_color=BORDER, line_width=1.0, round_rect=True, corner_radius=0.08)
draw_text(x3 + b_w + 0.43, y3 + 0.14, b_w - 0.36, 0.28,
          [[{'text': "VERRA VM0033 COMPLIANCE", 'size': 13.5, 'bold': True, 'color': NAVY_DEEP}]])
vm_bullets = [
    [{'text': "• Baseline Additionality: ", 'size': 13.2, 'bold': True, 'color': NAVY_DEEP},
     {'text': "Automated historical baseline counterfactual\n", 'size': 12.8, 'color': TEXT_DARK}],
    [{'text': "• 100-Yr Permanence: ", 'size': 13.2, 'bold': True, 'color': NAVY_DEEP},
     {'text': "10–20% dynamic risk buffer allocation\n", 'size': 12.8, 'color': TEXT_DARK}],
    [{'text': "• Audit Dossiers: ", 'size': 13.2, 'bold': True, 'color': NAVY_DEEP},
     {'text': "1-Click investor-ready PDF generation\n", 'size': 12.8, 'color': TEXT_DARK}],
    [{'text': "• Sovereign Hosting: ", 'size': 13.2, 'bold': True, 'color': NAVY_DEEP},
     {'text': "UAE cloud localization in me-central1\n", 'size': 12.8, 'color': TEXT_DARK}],
    [{'text': "• Cryptographic Ledger: ", 'size': 13.2, 'bold': True, 'color': NAVY_DEEP},
     {'text': "SHA-256 verifiable hash certificates", 'size': 12.8, 'color': TEXT_DARK}]
]
draw_text(x3 + b_w + 0.43, y3 + 0.46, b_w - 0.36, b_h - 0.52, vm_bullets, line_spacing=1.18)
y3 += b_h + 0.18

# Production Platform Scale Specs
scale_h = 2.20
draw_rect(x3, y3, IW, scale_h, fill=NAVY_DEEP, line_color=CYAN_ACCENT, line_width=1.0, round_rect=True, corner_radius=0.08)
draw_text(x3 + 0.20, y3 + 0.14, IW - 0.40, 0.28,
          [[{'text': "COASTAL SENTINEL PRODUCTION SYSTEM BENCHMARKS", 'size': 13.2, 'bold': True, 'color': CYAN_ACCENT}]])

spec_items = [
    ("< 600ms", "API Response Latency\n(FastAPI me-central1)", EMERALD),
    ("68 Months", "Continuous Satellite Depth\n(Jan 2021 – Aug 2026)", WHITE),
    ("53 Patches", "DBSCAN Monitored Nodes\nAcross UAE Coastline", EMERALD),
    ("1-Click PDF", "Verra VM0033 Dossier\nAutomated Issuance", WHITE)
]
sw_item = (IW - 0.60) / 4.0
sx_curr = x3 + 0.15
for val, lbl, col in spec_items:
    draw_text(sx_curr, y3 + 0.44, sw_item, 0.50,
              [[{'text': val, 'size': 21, 'bold': True, 'color': col, 'font': FONT_T}]],
              align=PP_ALIGN.CENTER)
    draw_text(sx_curr, y3 + 1.00, sw_item, 0.95,
              [[{'text': lbl, 'size': 12.2, 'color': TEXT_LIGHT}]],
              align=PP_ALIGN.CENTER, line_spacing=1.10)
    sx_curr += sw_item + 0.10
y3 += scale_h + 0.18

# Enterprise Cloud Architecture & Sovereign Governance Card
y3 += add_mini_label(x3, y3, IW, "ENTERPRISE CLOUD ARCHITECTURE & SOVEREIGN GOVERNANCE")
cloud_box_h = 2.75
draw_rect(x3, y3, IW, cloud_box_h, fill=WHITE, line_color=BORDER, line_width=1.0, round_rect=True, corner_radius=0.08)
draw_text(x3 + 0.20, y3 + 0.14, IW - 0.40, 0.28,
          [[{'text': "ENTERPRISE FULL-STACK TOPOLOGY (RENDER + VERCEL EDGE)", 'size': 13.8, 'bold': True, 'color': NAVY_DEEP}]])
cloud_text = [
    [{'text': "• Decoupled Architecture: ", 'size': 13.8, 'bold': True, 'color': NAVY_DEEP},
     {'text': "Next.js 15 App Router + React 19 on Vercel Serverless Edge, paired with PyTorch Geometric + FastAPI backend on Render.\n", 'size': 13.2, 'color': TEXT_DARK}],
    [{'text': "• Sovereign Data Governance: ", 'size': 13.8, 'bold': True, 'color': NAVY_DEEP},
     {'text': "Full data localization in Google Cloud me-central1 (Doha/Dammam) adhering to UAE Federal Decree-Law No. 45/2021.\n", 'size': 13.2, 'color': TEXT_DARK}],
    [{'text': "• Scalable Microservices: ", 'size': 13.8, 'bold': True, 'color': NAVY_DEEP},
     {'text': "Sub-600ms query execution across 53 patches, providing live telemetry modals and 12-month projections.", 'size': 13.2, 'color': TEXT_DARK}]
]
draw_text(x3 + 0.20, y3 + 0.48, IW - 0.40, cloud_box_h - 0.56, cloud_text, line_spacing=1.18)
y3 += cloud_box_h + 0.18

# Verra VM0033 Digital MRV Integrity & Cryptographic Ledger Card
y3 += add_mini_label(x3, y3, IW, "VERRA VM0033 DIGITAL MRV INTEGRITY & CRYPTOGRAPHIC LEDGER")
ledger_h = 2.95
draw_rect(x3, y3, IW, ledger_h, fill=WHITE, line_color=BORDER, line_width=1.0, round_rect=True, corner_radius=0.08)
draw_text(x3 + 0.20, y3 + 0.14, IW - 0.40, 0.28,
          [[{'text': "IMMUTABLE AUDIT TRAIL & METHODOLOGICAL COMPLIANCE", 'size': 13.8, 'bold': True, 'color': NAVY_DEEP}]])
ledger_bullets = [
    [{'text': "• Cryptographic SHA-256 Hashing: ", 'size': 13.8, 'bold': True, 'color': NAVY_DEEP},
     {'text': "Every monthly carbon stock calculation (562.8k tCO2e across 53 patches) generates a tamper-evident digital certificate.\n", 'size': 13.2, 'color': TEXT_DARK}],
    [{'text': "• Additionality & Permanence: ", 'size': 13.8, 'bold': True, 'color': NAVY_DEEP},
     {'text': "Enforces historical baseline modeling and 100-year permanence buffers (10–20%), preventing credit over-issuance.\n", 'size': 13.2, 'color': TEXT_DARK}],
    [{'text': "• 1-Click Institutional PDF Dossiers: ", 'size': 13.8, 'bold': True, 'color': NAVY_DEEP},
     {'text': "Automates generation of investor-grade audit reports compliant with international carbon registries.\n", 'size': 13.2, 'color': TEXT_DARK}],
    [{'text': "• High-Trust Verification: ", 'size': 13.8, 'bold': True, 'color': NAVY_DEEP},
     {'text': "Eliminates commercial fraud and greenwashing by linking credit tokens directly to verified Copernicus telemetry.", 'size': 13.2, 'color': TEXT_DARK}]
]
draw_text(x3 + 0.20, y3 + 0.48, IW - 0.40, ledger_h - 0.56, ledger_bullets, line_spacing=1.18)
y3 += ledger_h + 0.18

# Production Daemons & High-Frequency Pipeline Orchestration Card (Bottom of Column 3)
y3 += add_mini_label(x3, y3, IW, "AUTONOMOUS CRON ORCHESTRATION & CADENCE SPECS")
daemon_h = BBOT - y3
draw_rect(x3, y3, IW, daemon_h, fill=NAVY_DEEP, line_color=EMERALD, line_width=1.2, round_rect=True, corner_radius=0.08)
draw_text(x3 + 0.22, y3 + 0.16, IW - 0.44, 0.32,
          [[{'text': "AUTONOMOUS CRON ORCHESTRATION & CADENCE SPECIFICATIONS", 'size': 14.5, 'bold': True, 'color': EMERALD}]])

daemon_bullets = [
    ("• 10-Minute Keep-Alive Heartbeat: ",
     "Autonomous external daemon hits /api/health every 600s, eliminating Render container cold starts and slashing latency from 45.2s to 420ms (99.1% latency improvement).\n"),
    ("• Daily Coastal Threat Scanner: ",
     "Configured daily at 00:00 UTC via GET /api/alerts/trigger-daily across all 53 patches, recalculating daily anomaly indices and environmental risk thresholds.\n"),
    ("• Monthly 28th-Day MRV Sync: ",
     "Synchronizes with Copernicus satellite orbits on the 28th at 02:00 UTC, executing automated cloud masking, GEDI imputation, and ST-GNN inference in 50.6 seconds.\n"),
    ("• Production Deployments: ",
     "Live web client operational at https://coastal-sentinel-web.vercel.app with containerized API services running at https://coastal-sentinel-api-lbza.onrender.com.")
]
draw_text(x3 + 0.22, y3 + 0.52, IW - 0.44, daemon_h - 0.60,
          [[{'text': d_title, 'size': 13.8, 'bold': True, 'color': CYAN_ACCENT},
            {'text': d_desc, 'size': 13.2, 'color': WHITE}] for d_title, d_desc in daemon_bullets],
          line_spacing=1.18)
y3 += daemon_h

# ===========================================================================
# 4. BOTTOM ROW: CONCLUSIONS (Left) & REFERENCES + QR (Right)
# Y: 39.00" -> 43.20" (Height = 4.20")
# ===========================================================================
FRTOP = 39.00
FRBOT = 43.20
FRH   = FRBOT - FRTOP
HW    = (W - 2 * MARGIN - GAP) / 2.0  # ~ 21.30"
CLX   = MARGIN
RFX   = MARGIN + HW + GAP

draw_rect(CLX, FRTOP, HW, FRH, fill=BG_PANEL, line_color=BORDER, line_width=1.0, round_rect=True, corner_radius=0.04)
draw_rect(RFX, FRTOP, HW, FRH, fill=BG_PANEL, line_color=BORDER, line_width=1.0, round_rect=True, corner_radius=0.04)

# ── Left: Conclusions & Scientific Impact ──
cx4 = CLX + PAD
cy4 = FRTOP + 0.18
iw_c = HW - 2 * PAD

cy4 += add_section_header(CLX + 0.12, cy4, HW - 0.24, "04", "CONCLUSIONS & SCIENTIFIC CONTRIBUTIONS")
cy4 += 0.20

conclusions = [
    ("Empirical Superiority: ", "ST-GNN outperforms Random Forest, LSTM, and GCN on RMSE (0.0874 tCO2e/ha), MAE (0.0740), R² (0.912) and NSE (0.895), proving spatial topology and temporal dynamics together drive accurate blue carbon MRV."),
    ("Hydrodynamic Innovation: ", "Novel 86-edge directed graph models sediment transport, capturing allochthonous vs autochthonous carbon exchange without destructive physical sediment coring."),
    ("Arid-Coast Imputation: ", "Transfer learning from Sundarbans to UAE arid mangroves resolves GEDI LiDAR sparsity (~4%/mo), establishing the first 68-month continuous canopy height series in the Gulf (rh100 RMSE = 3.13 m)."),
    ("Commercial Democratization: ", "Replaces $120K manual field surveys with automated digital audits, cutting verification costs by 70% and unlocking UAE mangroves on the $2B Voluntary Carbon Market.")
]

for title_c, desc_c in conclusions:
    cd = 0.34
    draw_rect(cx4, cy4 + 0.04, cd, cd, fill=EMERALD, round_rect=True, corner_radius=0.5)
    c_shp = slide.shapes[-1]
    tf = c_shp.text_frame; tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    r = p.add_run(); r.text = "✓"; r.font.size = Pt(14); r.font.bold = True; r.font.color.rgb = NAVY_DEEP

    draw_text(cx4 + cd + 0.18, cy4, iw_c - cd - 0.22, 0.48,
              [[{'text': title_c, 'size': 13.8, 'bold': True, 'color': NAVY_DEEP},
                {'text': desc_c, 'size': 13.0, 'color': TEXT_DARK}]], line_spacing=1.14)
    cy4 += 0.48

# Future work mini strip
fw_box_h = 0.58
draw_rect(cx4, cy4 + 0.06, iw_c, fw_box_h, fill=NAVY_DEEP, line_color=CYAN_ACCENT, line_width=0.8, round_rect=True, corner_radius=0.08)
draw_text(cx4 + 0.20, cy4 + 0.12, iw_c - 0.40, 0.44,
          [[{'text': "FUTURE WORK: ", 'size': 13.5, 'bold': True, 'color': CYAN_ACCENT},
            {'text': "Sentinel-3 ocean color coupling  •  Hyperspectral CHIME expansion  •  Saltmarsh & Seagrass scope  •  Edge mobile surveyor app", 'size': 12.8, 'color': WHITE}]])

# ── Right: References & Verification ──
rx5 = RFX + PAD
ry5 = FRTOP + 0.18
iw_r = HW - 2 * PAD

ry5 += add_section_header(RFX + 0.12, ry5, HW - 0.24, "05", "REFERENCES & REPRODUCIBILITY")
ry5 += 0.20

qr_card_w = 5.20
ref_text_w = iw_r - qr_card_w - 0.35

# CURATED LANDMARK REFERENCES COVERING THE 7 REQUESTED CORE FOCUS AREAS
references = [
    ("[1] Global Warming / Blue Carbon: ", "Macreadie, P.I. et al. (2021). Blue carbon as a natural climate solution. Nature Reviews Earth & Environment, 2(12), pp. 826–839."),
    ("[2] UAE Announcement / Policy: ", "MOCCAE (2023). UAE National Blue Carbon Programme: COP28 Progress Report. Ministry of Climate Change and Environment, Dubai, UAE."),
    ("[3] Sentinel-1 SAR Coastal Radar: ", "Melo, J. et al. (2022). Integrating Sentinel-1 and Sentinel-2 for mangrove mapping in arid coastal zones. ISPRS J. Photogramm. Remote Sens., 188, pp. 145–160."),
    ("[4] Sentinel-2 Multispectral: ", "Pham, T.D. et al. (2019). Estimating and mapping above-ground biomass of mangrove species using Sentinel-2 and machine learning. GISci. Remote Sens., 56(3), pp. 352–375."),
    ("[5] NASA GEDI Spaceborne LiDAR: ", "Dubayah, R. et al. (2020). The Global Ecosystem Dynamics Investigation: High-resolution laser ranging of forest canopies. Science of Remote Sensing, 1, 100002."),
    ("[6] Graph Neural Networks (GNN): ", "Kipf, T.N. & Welling, M. (2017). Semi-supervised classification with graph convolutional networks. 5th Int. Conf. on Learning Representations (ICLR 2017)."),
    ("[7] Spatio-Temporal GNN (ST-GNN): ", "Yu, B., Yin, H. & Zhu, Z. (2018). Spatio-temporal graph convolutional networks: A deep learning framework for traffic forecasting. 27th IJCAI, pp. 3634–3640.")
]

for ref_title, ref_str in references:
    draw_text(rx5, ry5, ref_text_w, 0.37,
              [[{'text': ref_title, 'size': 12.5, 'bold': True, 'color': NAVY_DEEP},
                {'text': ref_str, 'size': 12.0, 'color': TEXT_DARK}]], line_spacing=1.10)
    ry5 += 0.37

# QR Code Verification Card
qr_x = rx5 + ref_text_w + 0.35
qr_y = FRTOP + 0.80
draw_rect(qr_x, qr_y, qr_card_w, 3.25, fill=WHITE, line_color=BORDER, line_width=1.0, round_rect=True, corner_radius=0.08)
draw_text(qr_x, qr_y + 0.12, qr_card_w, 0.30,
          [[{'text': "REPRODUCIBILITY & CODE", 'size': 13.0, 'bold': True, 'color': NAVY_DEEP}]],
          align=PP_ALIGN.CENTER)

if os.path.exists(QR_CODE):
    slide.shapes.add_picture(QR_CODE, Inches(qr_x + (qr_card_w - 1.95)/2), Inches(qr_y + 0.46), Inches(1.95), Inches(1.95))

draw_text(qr_x + 0.10, qr_y + 2.46, qr_card_w - 0.20, 0.68,
          [[{'text': "Scan for GitHub Repository & Live Pipeline", 'size': 12.0, 'bold': True, 'color': NAVY_DEEP}],
           [{'text': "Open-Source Models • Colab Notebooks • Verra Dossiers", 'size': 11.2, 'color': TEXT_MUTED}]],
          align=PP_ALIGN.CENTER, line_spacing=1.08)

# ===========================================================================
# 5. FOOTER BRANDING STRIP (Y: 43.35" -> 44.00", Height = 0.65")
# ===========================================================================
FY = 43.35
FH = H - FY
draw_rect(0, FY, W, FH, fill=NAVY_DEEP)
draw_rect(0, FY, W, 0.08, fill=CYAN_ACCENT)

draw_text(MARGIN, FY + 0.12, 12.0, 0.50,
          [[{'text': "MSc Data Science & Artificial Intelligence  |  CST4090 Post-Graduate Thesis",
             'size': 13.5, 'bold': True, 'color': WHITE}],
           [{'text': "Middlesex University Dubai  •  Department of Computer Engineering & Informatics",
             'size': 11.5, 'color': CYAN_ACCENT}]],
          line_spacing=1.10)

draw_text(13.0, FY + 0.14, 18.0, 0.44,
          [[{'text': "Author: Narendra Gandikota (NG661@live.mdx.ac.uk)  •  Supervisor: Dr. Krishnadas Nanath",
             'size': 13.5, 'color': WHITE}]],
          align=PP_ALIGN.CENTER)

draw_text(W - MARGIN - 11.5, FY + 0.12, 11.5, 0.50,
          [[{'text': "Dubai Knowledge Park, Blocks 16, 17, 19  •  Dubai, UAE",
             'size': 12.5, 'bold': True, 'color': WHITE}],
           [{'text': "Published: October 2026  •  Verra VM0033 Compliant",
             'size': 12.0, 'color': EMERALD}]],
          align=PP_ALIGN.RIGHT, line_spacing=1.10)

# ===========================================================================
# 6. SAVE PRESENTATION
# ===========================================================================
prs.save(OUT_PPTX)
print("SUCCESS: Master MCIP Poster saved to:", OUT_PPTX)
print(f"Dimensions: {prs.slide_width/914400:.1f}\" x {prs.slide_height/914400:.1f}\"")
print(f"Column ends: y1={y1:.2f}\", y2={y2:.2f}\", y3={y3:.2f}\" (Target: {BBOT:.2f}\")")
print("Total shapes generated:", len(slide.shapes))
