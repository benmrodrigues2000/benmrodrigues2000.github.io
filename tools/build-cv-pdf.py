#!/usr/bin/env python3
"""
Build cv.pdf — the document half of the CV: one clean A4 page meant to be
sent, printed and read by recruiters and clients.

The web page (cv.html) lives inside the site's "Gestalt in orbit" system;
this PDF keeps the same content, typefaces and meaning colours but flips the
figure/ground to paper, the way a CV is expected to look:

  FIGURE / GROUND .. white sheet, dark type — the document is the figure
  PROXIMITY ........ tight inside an entry (role / org / dates / text),
                     air between entries, more air between sections
  COMMON REGION .... two columns: the record on the left, the reference
                     material (skills, method) on the right; the featured
                     project sits in its own tinted panel
  SIMILARITY ....... one colour, one meaning — violet marks structure and
                     "now", the link blue marks addresses you can open;
                     every section opens the same way (label + hairline)
  CONNECTEDNESS .... the method steps hang from one line
  CONTINUITY ....... a single hairline runs between the columns
  CLOSURE .......... the orbit mark in the footer — an open ring that still
                     reads as a whole

It uses the site's real fonts (fonts/*.woff2 → TTF in memory), so the PDF
and the pages share one typeface set: Inter for reading, IBM Plex Mono for
dates and addresses.

Usage:  python3 tools/build-cv-pdf.py [out.pdf]
Needs:  pip install reportlab fonttools brotli
Fails (exit 1) if the content no longer fits on one page.
"""

import os
import sys
import tempfile

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "cv.pdf")
FONTS = os.path.join(ROOT, "fonts")

# ---------------------------------------------------------------- palette ---
# The site's light theme (html[data-theme="light"] in css/style.css).
PAPER = HexColor("#FFFFFF")
INK = HexColor("#141830")        # --ink        headings, names
BODY = HexColor("#2B3050")       # reading text
MUTED = HexColor("#565E88")      # --muted      organisations, dates, captions
RULE = HexColor("#D8DCEE")       # --rule       hairlines
PANEL = HexColor("#F5F6FC")      # tinted panel / chip fill
ACCENT = HexColor("#6D4AE0")     # --state      violet — structure, "now"
LINK = HexColor("#0B77A8")       # --link       blue  — addresses you can open

# ----------------------------------------------------------------- layout ---
W, H = A4
MARGIN_X = 42
MARGIN_TOP = 44
MARGIN_BOTTOM = 40
LEFT, RIGHT = MARGIN_X, W - MARGIN_X
CONTENT_W = RIGHT - LEFT
MAIN_W = 322
GUTTER = 26
SIDE_W = CONTENT_W - MAIN_W - GUTTER
SIDE_X = LEFT + MAIN_W + GUTTER
FOOTER_Y = MARGIN_BOTTOM + 14      # baseline of the footer line
FLOOR = FOOTER_Y + 22              # lowest point content may reach


# ------------------------------------------------------------------ fonts ---
def load_fonts():
    """Decompress the site's woff2 files into TTFs ReportLab can embed."""
    tmp = tempfile.mkdtemp(prefix="cvfonts-")
    try:
        from fontTools.ttLib import TTFont as FTFont
        from fontTools.varLib import instancer

        out = {}
        for name, src, weight in (
            ("READ", "inter-400_700-latin.woff2", 400),
            ("READ_MED", "inter-400_700-latin.woff2", 500),
            ("READ_SEMI", "inter-400_700-latin.woff2", 600),
            ("READ_BOLD", "inter-400_700-latin.woff2", 700),
            ("MONO", "ibm-plex-mono-400-latin.woff2", None),
            ("MONO_MED", "ibm-plex-mono-500-latin.woff2", None),
        ):
            f = FTFont(os.path.join(FONTS, src))
            f.flavor = None
            if weight and "fvar" in f:
                instancer.instantiateVariableFont(f, {"wght": weight}, inplace=True)
            path = os.path.join(tmp, "%s.ttf" % name)
            f.save(path)
            pdfmetrics.registerFont(TTFont(name, path))
            out[name] = name
        return out
    except Exception as exc:  # pragma: no cover - fallback keeps it runnable
        print("warning: brand fonts unavailable (%s) - using base14" % exc)
        return {"READ": "Helvetica", "READ_MED": "Helvetica",
                "READ_SEMI": "Helvetica-Bold", "READ_BOLD": "Helvetica-Bold",
                "MONO": "Courier", "MONO_MED": "Courier-Bold"}


F = load_fonts()


# ----------------------------------------------------------------- content ---
# Everything a reader sees is here; the layout code below never hard-codes copy.
NAME = "Ruben Rodrigues"
FULL_NAME = "Ruben Monteiro Correia Rodrigues"
TITLE = "Programador & Especialista em IA"
AVAILABILITY = "Disponível para projetos"
LOCATION = "Esmoriz, Portugal"
EMAIL = "benmrodrigues2000@gmail.com"
GITHUB = "github.com/benmrodrigues2000"
SITE = "benmrodrigues2000.github.io"
CV_PAGE = SITE + "/cv.html"
VERSION = "Currículo · 2026"

PROFILE = (
    "Programador e especialista em IA. Trabalho em websites, landing pages, integrações "
    "de IA e reparação de código para pequenas empresas. Construí recentemente O Provador "
    "para a Freedom Outdoor — um sistema de recomendação de sapatilhas sobre o stock real "
    "da loja, hoje em produção."
)

# (role, organisation, dates, is_now, [paragraphs or bullets])
EXPERIENCE = [
    ("Programador & Especialista em IA", "Freelancer · Esmoriz", "2026 – atual", True,
     ["Websites, landing pages, integrações de IA e reparação de código para pequenas "
      "empresas. Portefólio em benmrodrigues2000.github.io."]),
    ("Responsável pelo website · Estágio", "Freedom Outdoor · Running & Trail", "2026", False,
     ["• Construí O Provador: questionário de cinco passos que cruza o perfil do corredor "
      "com o stock real da loja e devolve uma recomendação pontuada em seis eixos, com "
      "exportação em PDF.",
      "• Adaptei o projeto para uma página WordPress, agora ao vivo."]),
    ("Operador de Robot", "Ferreira de Sá S.A.", "2020 – 2022", False,
     ["Operação e monitorização de robôs industriais em ambiente de produção."]),
    ("Colaborador", "Pingo Doce", "2018 – 2021", False,
     ["Apoio ao cliente e operações de loja."]),
]

PROJECT = {
    "name": "O Provador",
    "client": "Freedom Outdoor",
    "url": "freedomoutdoor.pt/provador",
    "text": ("Sistema de recomendação de sapatilhas de corrida: um questionário de cinco "
             "passos cruza o perfil do corredor com o stock real da loja e devolve um parecer "
             "pontuado em seis eixos, com exportação em PDF. Cliente real, em produção."),
    "stats": [("5", "perguntas"), ("6", "eixos de pontuação"),
              ("100%", "stock real da loja"), ("2026", "em produção")],
    "role": "Responsável pelo website e construtor do quiz",
    "stack": "Python · JavaScript · Base de dados · WordPress",
}

# (course, institution, dates, note)
EDUCATION = [
    ("Curso Sentido 3", "CRPG · Vila Nova de Gaia", "2025 – 2026",
     "Programa de regresso ao trabalho com aulas de terapeutas qualificados."),
    ("TeSP em Desenvolvimento de Software", "ESAN · Universidade de Aveiro", "2019 – 2021",
     "Dois anos concluídos; programa pausado por razões de saúde."),
    ("Técnico de Multimédia", "Curso profissional · 12.º ano", "Concluído",
     "Multimédia, design e tecnologias web."),
]

SKILLS = [
    ("Código", ["Python", "JavaScript", "HTML / CSS", "WordPress", "Bases de dados",
                "Revisão de código"]),
    ("IA aplicada", ["APIs de IA", "GPT", "Gemini", "Design de prompts",
                     "Formulários inteligentes", "Assistentes"]),
    ("Web & cliente", ["Web design", "Landing pages", "Web responsiva",
                       "Serviço ao cliente"]),
]

SERVICES = ["Websites e landing pages", "Integrações de IA",
            "Revisão e reparação de código"]

STEPS = ["Pergunta", "Briefing", "Prompt", "Crítica", "Código", "Publicação"]
STEPS_NOTE = "A crítica repete-se até a resposta servir — depois publica-se."

PRINCIPLES = [
    ("Começar pela pergunta.",
     "O que tem de funcionar, para quem, e o que não pode ser feito."),
    ("Guardar o processo.",
     "Os prompts que valem ficam guardados, com versão e nota do que partiu."),
    ("Explicar sem tecnicismos.",
     "Prazos ditos de início e linguagem que se percebe."),
]


# -------------------------------------------------------------- utilities ---
def sw(text, font, size):
    return pdfmetrics.stringWidth(text, font, size)


def wrap(text, font, size, width):
    """Greedy word wrap, measured with the real font metrics."""
    lines, cur = [], ""
    for word in text.split():
        trial = (cur + " " + word).strip()
        if sw(trial, font, size) <= width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def wrap_runs(runs, width):
    """Wrap mixed-style text. runs = [(text, font, size, colour)], returns lines
    of [(word, font, size, colour, x_offset)] ready to draw."""
    words = []
    for text, font, size, colour in runs:
        for w in text.split():
            words.append((w, font, size, colour))
    lines, cur, x = [], [], 0.0
    for w, font, size, colour in words:
        ww = sw(w, font, size)
        space = sw(" ", font, size) if cur else 0
        if cur and x + space + ww > width:
            lines.append(cur)
            cur, x, space = [], 0.0, 0
        cur.append((w, font, size, colour, x + space))
        x += space + ww
    if cur:
        lines.append(cur)
    return lines


def check_glyphs():
    """Every character in the copy must exist in the embedded fonts."""
    strings = [NAME, FULL_NAME, TITLE, AVAILABILITY, LOCATION, EMAIL, GITHUB, SITE,
               CV_PAGE, VERSION, PROFILE, STEPS_NOTE, PROJECT["text"], PROJECT["role"],
               PROJECT["stack"], PROJECT["url"], PROJECT["name"], PROJECT["client"]]
    for e in EXPERIENCE:
        strings += [e[0], e[1], e[2]] + list(e[4])
    for e in EDUCATION:
        strings += list(e)
    for g, items in SKILLS:
        strings += [g] + items
    strings += SERVICES + STEPS + [a + b for a, b in PRINCIPLES]
    strings += [n + c for n, c in PROJECT["stats"]]
    chars = set("".join(strings))
    missing = {}
    for name in set(F.values()):
        font = pdfmetrics.getFont(name)
        cmap = getattr(getattr(font, "face", None), "charToGlyph", None)
        if not cmap:
            continue
        bad = sorted(ch for ch in chars if ord(ch) not in cmap and not ch.isspace())
        if bad:
            missing[name] = bad
    if missing:
        raise SystemExit("glyphs missing from the embedded fonts: %r" % missing)


# ------------------------------------------------------------------ sheet ---
class Sheet:
    """Drawing primitives shared by both columns."""

    def __init__(self, path, g=1.0):
        self.c = canvas.Canvas(path, pagesize=A4, pageCompression=1)
        c = self.c
        c.setTitle("Currículo — %s — %s" % (NAME, TITLE))
        c.setAuthor(FULL_NAME)
        c.setSubject("%s · %s" % (VERSION, LOCATION))
        c.setKeywords("currículo, cv, programador, inteligência artificial, websites, "
                      "landing pages, integrações de IA, Esmoriz, Portugal")
        c.setCreator("tools/build-cv-pdf.py")
        if hasattr(c, "setLang"):
            c.setLang("pt-PT")
        self.g = g                       # gap scale: 1.0 = designed spacing

    def gap(self, v):
        return v * self.g

    # -- text --------------------------------------------------------------
    def text(self, x, y, s, font, size, colour=BODY, tracking=0, align="left"):
        c = self.c
        c.setFillColor(colour)
        c.setFont(font, size)
        width = sw(s, font, size) + tracking * max(len(s) - 1, 0)
        if align == "right":
            x -= width
        elif align == "center":
            x -= width / 2
        c.drawString(x, y, s, charSpace=tracking)
        return width

    def paragraph(self, x, y, text, width, font, size, colour=BODY, leading=None):
        """Draw a wrapped paragraph; return the baseline of its last line."""
        leading = leading or size * 1.4
        lines = wrap(text, font, size, width)
        for i, line in enumerate(lines):
            self.text(x, y - i * leading, line, font, size, colour)
        return y - (len(lines) - 1) * leading

    def rich(self, x, y, runs, width, leading):
        """Draw wrapped mixed-style text (bold lead + regular tail); return the
        baseline of its last line."""
        lines = wrap_runs(runs, width)
        for i, line in enumerate(lines):
            for word, font, size, colour, dx in line:
                self.text(x + dx, y - i * leading, word, font, size, colour)
        return y - (len(lines) - 1) * leading

    def link(self, x, y, s, font, size, url, colour=LINK, align="left"):
        width = self.text(x, y, s, font, size, colour, align=align)
        x0 = x - width if align == "right" else x
        self.c.linkURL(url, (x0, y - size * 0.3, x0 + width, y + size * 0.85),
                       relative=0, thickness=0)
        return width

    # -- structure ---------------------------------------------------------
    def rule(self, x0, x1, y, colour=RULE, width=0.6):
        c = self.c
        c.setStrokeColor(colour)
        c.setLineWidth(width)
        c.line(x0, y, x1, y)

    def heading(self, x, y, label, width):
        """Similarity: every section opens the same way — a small violet label
        with a hairline running to the edge of its column."""
        w = self.text(x, y, label.upper(), F["READ_BOLD"], 7.4, ACCENT, tracking=0.8)
        self.rule(x + w + 9, x + width, y + 2.6)
        return y - self.gap(15)

    def chip(self, x, y, label):
        """Outlined tag; y is the baseline. Returns the chip width."""
        c = self.c
        size = 7.2
        w = sw(label, F["READ_MED"], size) + 12
        c.setFillColor(PANEL)
        c.setStrokeColor(RULE)
        c.setLineWidth(0.6)
        c.roundRect(x, y - 3.7, w, 12.6, 3, stroke=1, fill=1)
        self.text(x + 6, y, label, F["READ_MED"], size, INK)
        return w

    def chips(self, x, y, labels, width):
        """Flow chips inside a column. Returns the baseline of the last row."""
        cx, row_h = x, 16.5
        for label in labels:
            w = sw(label, F["READ_MED"], 7.2) + 12
            if cx > x and cx + w > x + width:
                cx = x
                y -= row_h
            self.chip(cx, y, label)
            cx += w + 4
        return y

    def orbit(self, x, y, r=6.5):
        """Brand mark: open ring around a planet with one small moon (closure)."""
        c = self.c
        c.setStrokeColor(ACCENT)
        c.setLineWidth(0.9)
        c.setDash(3.2, 2.2)
        c.circle(x, y, r, stroke=1, fill=0)
        c.setDash()
        c.setFillColor(ACCENT)
        c.circle(x, y, r * 0.42, stroke=0, fill=1)
        c.setFillColor(LINK)
        c.circle(x + r * 0.72, y + r * 0.62, 1.1, stroke=0, fill=1)


# ------------------------------------------------------------------- build ---
# All gaps are baseline-to-baseline. Spacing inside an entry is fixed
# (proximity must survive any fitting); only the air between entries and
# sections is scaled by `g` when the page would overflow.
BODY_LEAD = 11.8       # reading text leading (8.6 pt)
HEAD_GAP = 16          # section label -> first content baseline
ENTRY_GAP = 20         # last line of an entry -> title of the next
SECTION_GAP = 25       # last line of a section -> next section label
PANEL_GAP = 18         # bottom edge of the project panel -> next label
GROUP_GAP = 21.5       # last chip row -> next skill group title


def entry(s, x, y, w, title, sub, dates, paras, now=False):
    """One record: title / subtitle / right-aligned dates, then the text.
    Returns the baseline of the last line."""
    s.text(x, y, title, F["READ_SEMI"], 9.6, INK)
    s.text(x + w, y, dates, F["MONO"], 7.4, ACCENT if now else MUTED, align="right")
    y -= 11.6
    s.text(x, y, sub, F["READ"], 8.4, MUTED)
    for p in paras:
        y -= 12.4 if p is paras[0] else BODY_LEAD
        if p.startswith("• "):
            s.text(x + 1, y, "•", F["READ"], 8.6, MUTED)
            y = s.paragraph(x + 9, y, p[2:], w - 9, F["READ"], 8.6, BODY, leading=BODY_LEAD)
        else:
            y = s.paragraph(x, y, p, w, F["READ"], 8.6, BODY, leading=BODY_LEAD)
    return y


def project_panel(s, x, y, w):
    """The featured project in its own tinted common region (y = top edge).
    Returns the y of the bottom edge."""
    c = s.c
    pad = 12
    inner = w - 2 * pad
    body_lines = wrap(PROJECT["text"], F["READ"], 8.6, inner)
    col_w = inner / 4
    caps = [wrap(cap, F["READ"], 6.9, col_w - 10) for _num, cap in PROJECT["stats"]]
    n_cap = max(len(cl) for cl in caps)

    title_off, body_off = 15, 14           # panel top -> title; title -> body
    stats_off, cap_off, cap_lead = 21, 9.5, 8.2
    meta_off, meta_lead, bottom_pad = 15, 10.5, 12
    panel_h = (title_off + body_off + (len(body_lines) - 1) * BODY_LEAD + stats_off
               + cap_off + (n_cap - 1) * cap_lead + meta_off + meta_lead + bottom_pad)

    c.setFillColor(PANEL)
    c.setStrokeColor(RULE)
    c.setLineWidth(0.6)
    c.roundRect(x, y - panel_h, w, panel_h, 5, stroke=1, fill=1)

    py = y - title_off
    s.text(x + pad, py, "%s — %s" % (PROJECT["name"], PROJECT["client"]),
           F["READ_SEMI"], 9.6, INK)
    s.link(x + w - pad, py, PROJECT["url"], F["MONO"], 7.4,
           "https://" + PROJECT["url"], colour=LINK, align="right")
    py -= body_off
    for line in body_lines:
        s.text(x + pad, py, line, F["READ"], 8.6, BODY)
        py -= BODY_LEAD
    py += BODY_LEAD - stats_off                      # number baseline
    cap_last = py - cap_off - (n_cap - 1) * cap_lead
    # Proximity: each number hugs its caption; hairlines separate the four.
    for i, ((num, _cap), lines) in enumerate(zip(PROJECT["stats"], caps)):
        cx = x + pad + i * col_w
        if i:
            c.setStrokeColor(RULE)
            c.setLineWidth(0.6)
            c.line(cx - 7, py + 9.5, cx - 7, cap_last - 2)
        s.text(cx, py, num, F["READ_BOLD"], 12.5, ACCENT if i == 0 else INK)
        for j, line in enumerate(lines):
            s.text(cx, py - cap_off - j * cap_lead, line, F["READ"], 6.9, MUTED)
    py = cap_last - meta_off
    s.text(x + pad, py, "Papel", F["READ_SEMI"], 7.6, INK)
    s.text(x + pad + 34, py, PROJECT["role"], F["READ"], 7.8, BODY)
    py -= meta_lead
    s.text(x + pad, py, "Stack", F["READ_SEMI"], 7.6, INK)
    s.text(x + pad + 34, py, PROJECT["stack"], F["READ"], 7.8, BODY)
    return y - panel_h


def build(path=OUT, g=1.0):
    s = Sheet(path, g)
    c = s.c

    # ------------------------------------------------------------ header
    y = H - MARGIN_TOP - 20                       # baseline of the name
    s.text(LEFT, y, NAME, F["READ_BOLD"], 27, INK, tracking=-0.4)
    s.text(LEFT, y - 17.5, TITLE, F["READ_SEMI"], 11, ACCENT)
    # Availability: the violet dot the site uses for "live / now".
    c.setFillColor(ACCENT)
    c.circle(LEFT + 2.6, y - 31.2, 2.1, stroke=0, fill=1)
    s.text(LEFT + 9, y - 34, AVAILABILITY, F["READ"], 8.4, MUTED)

    # Contact block, right-aligned, top-aligned with the name's cap height.
    cy = y - 13.4
    s.text(RIGHT, cy, LOCATION, F["READ"], 8.4, MUTED, align="right")
    for label, url in ((EMAIL, "mailto:" + EMAIL),
                       (GITHUB, "https://" + GITHUB),
                       (SITE, "https://" + SITE + "/")):
        cy -= 11.4
        s.link(RIGHT, cy, label, F["READ"], 8.4, url, colour=INK, align="right")

    header_bottom = min(cy, y - 34) - 14
    s.rule(LEFT, RIGHT, header_bottom, RULE, 0.7)
    top = header_bottom - 21

    # Continuity: one hairline runs between the two columns.
    c.setStrokeColor(RULE)
    c.setLineWidth(0.5)
    c.line(SIDE_X - GUTTER / 2, top + 4, SIDE_X - GUTTER / 2, FLOOR - 4)

    # ======================================================== main column
    x, w = LEFT, MAIN_W
    y = s.heading(x, top, "Perfil", w)
    y = s.paragraph(x, y, PROFILE, w, F["READ"], 8.9, BODY, leading=12.4)
    y -= s.gap(SECTION_GAP) + 1.5

    y = s.heading(x, y, "Experiência", w)
    for i, (role, org, dates, now, paras) in enumerate(EXPERIENCE):
        y = entry(s, x, y, w, role, org, dates, paras, now)
        y -= s.gap(ENTRY_GAP) if i < len(EXPERIENCE) - 1 else s.gap(SECTION_GAP) - 3

    y = s.heading(x, y, "Projeto em destaque", w)
    y = project_panel(s, x, y + 6, w)
    y -= s.gap(PANEL_GAP)

    y = s.heading(x, y, "Formação", w)
    for i, (course, inst, dates, note) in enumerate(EDUCATION):
        y = entry(s, x, y, w, course, inst, dates, [note])
        if i < len(EDUCATION) - 1:
            y -= s.gap(ENTRY_GAP)
    main_bottom = y - 3                       # descender of the last line

    # ======================================================== side column
    x, w = SIDE_X, SIDE_W
    y = s.heading(x, top, "Competências", w)
    for i, (group, items) in enumerate(SKILLS):
        s.text(x, y, group, F["READ_SEMI"], 8.4, INK)
        y = s.chips(x, y - 15.5, items, w)
        y -= s.gap(GROUP_GAP) if i < len(SKILLS) - 1 else s.gap(SECTION_GAP)

    y = s.heading(x, y, "Serviços", w)
    for i, item in enumerate(SERVICES):
        c.setFillColor(ACCENT)
        c.circle(x + 2, y + 2.6, 1.4, stroke=0, fill=1)
        s.text(x + 9, y, item, F["READ"], 8.4, BODY)
        y -= 12.4 if i < len(SERVICES) - 1 else s.gap(SECTION_GAP)

    # Method: the steps hang from one line (connectedness); the last node is
    # filled — the loop closes on delivery.
    y = s.heading(x, y, "Método de trabalho", w)
    step_h = 13.4
    top_dot = y + 2.8
    c.setStrokeColor(RULE)
    c.setLineWidth(0.8)
    c.line(x + 4, top_dot, x + 4, top_dot - step_h * (len(STEPS) - 1))
    for i, step in enumerate(STEPS):
        last = i == len(STEPS) - 1
        dy = top_dot - i * step_h
        c.setFillColor(ACCENT if last else PAPER)
        c.setStrokeColor(ACCENT)
        c.setLineWidth(0.9)
        c.circle(x + 4, dy, 2.6, stroke=1, fill=1)
        s.text(x + 13, dy - 2.7, "%02d" % (i + 1), F["MONO"], 6.8, MUTED)
        s.text(x + 28, dy - 2.9, step, F["READ_SEMI" if last else "READ"], 8.4,
               INK if last else BODY)
    y = top_dot - step_h * (len(STEPS) - 1) - 13
    y = s.paragraph(x, y, STEPS_NOTE, w, F["READ"], 7.6, MUTED, leading=10.4)
    y -= s.gap(17)
    for i, (head, tail) in enumerate(PRINCIPLES):
        y = s.rich(x, y, [(head, F["READ_SEMI"], 8.2, INK), (tail, F["READ"], 8.2, BODY)],
                   w, 11.2)
        if i < len(PRINCIPLES) - 1:
            y -= s.gap(17)
    side_bottom = y - 3

    # ------------------------------------------------------------ footer
    s.rule(LEFT, RIGHT, FOOTER_Y + 12, RULE, 0.6)
    s.orbit(LEFT + 6.5, FOOTER_Y + 2.4)
    s.text(LEFT + 19, FOOTER_Y, "%s · %s · %s" % (FULL_NAME, VERSION, LOCATION),
           F["READ"], 7.2, MUTED)
    s.link(RIGHT, FOOTER_Y, CV_PAGE, F["MONO"], 7.0, "https://" + CV_PAGE,
           colour=MUTED, align="right")

    c.showPage()
    c.save()
    return min(main_bottom, side_bottom)


def build_fitted(path=OUT):
    """Render at the designed spacing; tighten the gaps only if it overflows."""
    for g in [1.0, 0.95, 0.9, 0.85, 0.8]:
        bottom = build(path, g)
        if bottom >= FLOOR:
            return g, bottom
    return g, bottom


if __name__ == "__main__":
    check_glyphs()
    target = sys.argv[1] if len(sys.argv) > 1 else OUT
    used, bottom = build_fitted(target)
    print("wrote %s — one page, gap scale %.2f, lowest content y = %.1f (floor %d)"
          % (target, used, bottom, FLOOR))
    if bottom < FLOOR:
        print("ERROR: content runs past the bottom margin by %.1f pt" % (FLOOR - bottom))
        sys.exit(1)
