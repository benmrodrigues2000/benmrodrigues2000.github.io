#!/usr/bin/env python3
"""
Build cv.pdf — the printable half of the CV, drawn in the site's own
"Gestalt in orbit" system (see the header comment of css/style.css).

Same ground, same meaning colours, same shapes as benmrodrigues2000.github.io:

  SIMILARITY ....... violet = now / state, cyan = connection, coral = action
                     filled node = work, hollow ring = training
  PROXIMITY ........ tight inside a group, wide between groups
  COMMON REGION .... one framed box per group (skills, project, method)
  CONNECTEDNESS .... one broken line links the method flow
  CONTINUITY ....... a single vertical axis runs down the record, numbered
  CLOSURE .......... broken rings on every node; the alias is sliced into
                     strips and still reads as one word
  FIGURE / GROUND .. starfield behind, bright figures in front
  PRÄGNANZ ......... circles and lines only — nothing without a job

One A4 page, like the site's own promise ("one page, five blocks").
It uses the site's real fonts (fonts/*.woff2), decompressed to TTF on the fly,
so the PDF and the pages share one typeface set.

Usage:  python3 tools/build-cv-pdf.py [out.pdf]
Needs:  pip install reportlab fonttools brotli
"""

import os
import random
import sys
import tempfile

from reportlab.lib.colors import Color
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "cv.pdf")
FONTS = os.path.join(ROOT, "fonts")

# ---------------------------------------------------------------- palette ---
# Mirrors :root in css/style.css (dark theme). One colour, one meaning.
CANVAS = Color(0x04 / 255, 0x05 / 255, 0x0E / 255)     # --canvas
SURFACE = Color(0x0A / 255, 0x0D / 255, 0x1D / 255)    # --surface
INK = Color(0xEC / 255, 0xEE / 255, 0xFA / 255)        # --ink
MUTED = Color(0x95 / 255, 0x9D / 255, 0xBD / 255)      # --muted
RULE = Color(0x1E / 255, 0x24 / 255, 0x46 / 255)       # --rule
RULE_STRONG = Color(0x2F / 255, 0x37 / 255, 0x66 / 255)
STATE = Color(0xA7 / 255, 0x8B / 255, 0xFA / 255)      # violet — here / now
LINK = Color(0x7D / 255, 0xD3 / 255, 0xFC / 255)       # cyan   — connection
ACT = Color(0xFF / 255, 0x9E / 255, 0x64 / 255)        # coral  — action

MARGIN = 34
AXIS = 52          # x of the continuity axis
LEFT = 84          # content start (axis + rail)
BOTTOM = 28        # lowest y content may reach (1 cm foot)


# ------------------------------------------------------------------ fonts ---
def load_fonts():
    """Decompress the site's woff2 files into TTFs ReportLab can embed."""
    tmp = tempfile.mkdtemp(prefix="cvfonts-")
    try:
        from fontTools.ttLib import TTFont as FTFont
        from fontTools.varLib import instancer

        out = {}
        for name, src, weight in (
            ("DISPLAY", "bebas-neue-400-latin.woff2", None),
            ("MONO", "ibm-plex-mono-400-latin.woff2", None),
            ("MONO_MED", "ibm-plex-mono-500-latin.woff2", None),
            ("READ", "inter-400_700-latin.woff2", 400),
            ("READ_MED", "inter-400_700-latin.woff2", 600),
            ("READ_BOLD", "inter-400_700-latin.woff2", 700),
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
        return {"DISPLAY": "Helvetica", "MONO": "Courier",
                "MONO_MED": "Courier-Bold", "READ": "Helvetica",
                "READ_MED": "Helvetica", "READ_BOLD": "Helvetica-Bold"}


F = load_fonts()


# -------------------------------------------------------------- utilities ---
def wrap(text, font, size, width):
    """Greedy word wrap, measured with the real font metrics."""
    lines, cur = [], ""
    for word in text.split():
        trial = (cur + " " + word).strip()
        if pdfmetrics.stringWidth(trial, font, size) <= width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


# ----------------------------------------------------------------- content ---
PROFILE = (
    "Programador e especialista em IA. Uso modelos de IA todos os dias e transformo esse "
    "uso em produtos para pequenas empresas: websites, landing pages, integrações de IA e "
    "reparação de código."
)

RECORD = [
    ("2026 - agora", "Freelancer", "Programador & Especialista em IA", "now",
     "Websites, landing pages e integrações de IA para pequenas empresas, mais reparação "
     "de código."),
    ("2026", "Freedom Outdoor", "Estágio · Running & Trail", "work",
     "Construí O Provador: questionário de cinco passos sobre o stock real da loja, "
     "pontuado em seis eixos. Responsável pelo website da loja."),
    ("2020 - 22", "Operador de Robot", "Ferreira de Sá S.A.", "work",
     "Operação e monitorização de robôs industriais em ambiente de produção."),
    ("2018 - 21", "Colaborador", "Pingo Doce", "work",
     "Apoio ao cliente e operações — onde começou a paixão por servir bem o cliente."),
    ("2025 - 26", "Curso Sentido 3", "CRPG · Gaia", "train",
     "Programa de regresso ao trabalho com aulas de terapeutas qualificados."),
    ("2019 - 21", "TeSP Desenvolvimento de Software", "ESAN · Universidade de Aveiro", "train",
     "Dois anos concluídos, programa pausado por razões de saúde."),
    ("Concluído", "Técnico de Multimédia", "Curso profissional · 12.º ano", "train",
     "Multimédia, design e tecnologias web — a primeira caixa de ferramentas."),
]

SKILL_GROUPS = [
    ("01 · CÓDIGO", INK,
     ["Python", "JavaScript", "HTML / CSS", "WordPress", "Bases de dados",
      "Revisão de código"]),
    ("02 · IA APLICADA", LINK,
     ["APIs de IA", "GPT", "Gemini", "Prompts", "Formulários inteligentes",
      "Assistentes"]),
    ("03 · WEB & CLIENTE", ACT,
     ["Web design", "Landing pages", "Web responsiva", "Serviço ao cliente"]),
]

STATS = [("5", "perguntas até ao parecer"), ("6", "eixos de pontuação"),
         ("100%", "stock real da loja"), ("2026", "publicado e em uso")]

STEPS = ["Pergunta", "Briefing", "Prompt", "Crítica", "Código", "Publicação"]

PRINCIPLES = [
    ("01", "Começar pela pergunta.",
     "Resultado, cliente e restrição antes do primeiro prompt."),
    ("02", "Tornar o invisível visível.",
     "Cada prompt que importa é guardado, numerado e anotado."),
    ("03", "Servir o cliente primeiro.",
     "Prazos claros, linguagem simples; um cliente feliz faz parte da entrega."),
]


# ------------------------------------------------------------------ sheet ---
class Sheet:
    """A top-down cursor plus the shared drawing primitives."""

    def __init__(self, path, g=1.0):
        """g = gap scale (1.0 = the designed spacing, lower = tighter)."""
        self.c = canvas.Canvas(path, pagesize=A4)
        self.c.setTitle("CV - Ruben Rodrigues - Programador & Especialista em IA")
        self.c.setAuthor("Ruben Monteiro Correia Rodrigues")
        self.c.setSubject("Currículo v.2026 · Esmoriz, Portugal")
        self.w, self.h = A4
        self.g = g
        self.left, self.axis, self.right = LEFT, AXIS, self.w - MARGIN
        self.width = self.right - self.left
        self.y = self.h - 38

    def gap(self, v):
        return v * self.g

    # -- ground ----------------------------------------------------------
    def ground(self):
        c = self.c
        c.setFillColor(CANVAS)
        c.rect(0, 0, self.w, self.h, stroke=0, fill=1)
        rng = random.Random(20260924)      # fixed seed = the same sky every build
        # Figure/ground: stars stay faint and small so they read as ground, never
        # as noise behind the type — the site's sky is equally restrained.
        for _ in range(170):
            x, y = rng.uniform(0, self.w), rng.uniform(0, self.h)
            c.setFillAlpha(rng.uniform(0.05, 0.20))
            c.setFillColor(INK)
            c.circle(x, y, rng.choice((0.3, 0.4, 0.5, 0.7)), stroke=0, fill=1)
        for _ in range(9):                 # a few coloured stars
            x, y = rng.uniform(0, self.w), rng.uniform(0, self.h)
            c.setFillAlpha(0.20)
            c.setFillColor(rng.choice((LINK, STATE, ACT)))
            c.circle(x, y, 0.7, stroke=0, fill=1)
        c.setFillAlpha(1)

    def axis_line(self, top, bottom):
        """Continuity: one vertical line the service record hangs from."""
        c = self.c
        steps = 90
        for i in range(steps):
            t = i / steps
            y0 = top - (top - bottom) * t
            y1 = top - (top - bottom) * (t + 1 / steps)
            fade = 1 - abs(t - 0.35) * 0.55
            c.setStrokeColor(Color(
                RULE_STRONG.red * fade + CANVAS.red * (1 - fade),
                RULE_STRONG.green * fade + CANVAS.green * (1 - fade),
                RULE_STRONG.blue * fade + CANVAS.blue * (1 - fade)))
            c.setLineWidth(0.9)
            c.line(self.axis, y0, self.axis, y1)

    def node(self, y, label, colour=RULE_STRONG, r=11):
        """Closure: a broken ring on the axis, with the section number inside."""
        c = self.c
        c.setFillColor(CANVAS)
        c.circle(self.axis, y, r + 2, stroke=0, fill=1)
        c.setStrokeColor(colour)
        c.setLineWidth(1.15)
        c.setDash(4.4, 2.6)
        c.circle(self.axis, y, r, stroke=1, fill=0)
        c.setDash()
        c.setFillColor(INK)
        c.setFont(F["MONO_MED"], 7.4)
        c.drawCentredString(self.axis, y - 2.5, label)

    def section(self, num, kicker, title, colour=RULE_STRONG, pad=4, lead=6):
        """Numbered node + mono kicker + Bebas title (lead = air above)."""
        self.y -= self.gap(lead)
        self.node(self.y - 2, num, colour)
        c = self.c
        c.setFillColor(MUTED)
        c.setFont(F["MONO"], 7.4)
        c.drawString(self.left, self.y, kicker.upper())
        self.y -= self.gap(16)
        c.setFillColor(INK)
        c.setFont(F["DISPLAY"], 20)
        c.drawString(self.left, self.y, title.upper())
        self.y -= self.gap(pad) + 3

    def chip(self, x, y, text, size=6.8, pad=11):
        c = self.c
        w = pdfmetrics.stringWidth(text.upper(), F["MONO"], size) + pad + 4
        c.setStrokeColor(RULE_STRONG)
        c.setLineWidth(0.8)
        c.setFillColor(SURFACE)
        c.roundRect(x, y - 4.0, w, 13, 6.5, stroke=1, fill=1)
        c.setFillColor(INK)
        c.setFont(F["MONO"], size)
        c.drawString(x + pad / 2 + 1.5, y, text.upper())
        return w

    def region(self, y_top, height, x=None, width=None):
        """Common region: the one enclosure style, shared by every group."""
        c = self.c
        x = self.left if x is None else x
        width = self.width if width is None else width
        c.setStrokeColor(RULE)
        c.setLineWidth(0.9)
        c.setFillColor(SURFACE)
        c.setFillAlpha(0.72)
        c.roundRect(x, y_top - height, width, height, 12, stroke=1, fill=1)
        c.setFillAlpha(1)

    def text(self, x, y, s, font, size, colour=MUTED):
        c = self.c
        c.setFillColor(colour)
        c.setFont(font, size)
        c.drawString(x, y, s)


# ------------------------------------------------------------------- build ---
def build(path=OUT, g=1.0):
    s = Sheet(path, g)
    c = s.c
    s.ground()

    # ------------------------------------------------ masthead · identity
    c.setFillColor(MUTED)
    c.setFont(F["MONO"], 7.2)
    c.drawString(s.left, s.y, "CURRICULUM V.2026")
    c.setFillColor(INK)
    c.drawRightString(s.right, s.y, "ESMORIZ, PT - TERRA")
    s.y -= s.gap(30)

    c.setFillColor(INK)
    c.setFont(F["DISPLAY"], 43)
    c.drawString(s.left, s.y, "RUBEN RODRIGUES")

    # Closure: the alias, sliced into strips, still reads as one word. It sits in
    # the open band beside the name, faint — texture, never competing with it.
    name_w = pdfmetrics.stringWidth("RUBEN RODRIGUES", F["DISPLAY"], 43)
    alias = "AYYLIENADO"
    alias_w = pdfmetrics.stringWidth(alias, F["DISPLAY"], 26)
    x0 = min(s.left + name_w + 26, s.right - alias_w - 4)
    x0 = max(x0, s.left)                      # never overlap the name either
    avail = min(alias_w, s.right - x0 - 2)
    c.saveState()
    p = c.beginPath()
    pitch = 10.5
    i = 0
    while i * pitch < avail:
        p.rect(x0 + i * pitch, s.y - 3, 6.6, 21)
        i += 1
    c.clipPath(p, stroke=0, fill=0)
    c.setFillAlpha(0.22)
    c.setFillColor(INK)
    c.setFont(F["DISPLAY"], 26)
    c.drawString(x0, s.y, alias)
    c.restoreState()
    c.setFillAlpha(1)

    s.y -= 15
    c.setFillColor(STATE)
    c.setFont(F["MONO_MED"], 9.2)
    c.drawString(s.left, s.y, "PROGRAMADOR & ESPECIALISTA EM IA")
    s.y -= 14
    # Proximity: the three ways in sit on one line, separated by a small dot.
    contact = "benmrodrigues2000@gmail.com  ·  github.com/benmrodrigues2000  ·  benmrodrigues2000.github.io"
    s.text(s.left, s.y, contact, F["MONO"], 6.9, MUTED)
    s.y -= s.gap(17)

    # ------------------------------------------------------------- 01 perfil
    axis_top = s.y + 4
    s.section("01", "Perfil", "Quem sou", pad=9, lead=4)
    for line in wrap(PROFILE, F["READ"], 8.8, s.width):
        s.text(s.left, s.y, line, F["READ"], 8.8, MUTED)
        s.y -= 11.6
    s.y -= s.gap(8)

    # -------------------------------------------- 02 registo de serviço
    s.section("02", "Registo de serviço / trabalho e formação", "O percurso até aqui", pad=15, lead=10)
    # Legend: shape encodes type, and the key is always in view.
    lx = s.left + 4
    for label, dot, filled in (("AGORA", STATE, True),
                               ("TRABALHO", INK, True),
                               ("FORMAÇÃO", INK, False)):
        if filled:
            c.setFillColor(dot)
            c.circle(lx, s.y + 3, 3.8, stroke=0, fill=1)
        else:
            c.setFillColor(CANVAS)
            c.setStrokeColor(dot)
            c.setLineWidth(1.3)
            c.circle(lx, s.y + 3, 3.2, stroke=1, fill=1)
        s.text(lx + 8, s.y, label, F["MONO"], 7.0, MUTED)
        lx += 8 + pdfmetrics.stringWidth(label, F["MONO"], 7.0) + 20
    s.y -= 13

    for entry in RECORD:
        year, role, org, kind, what = entry
        my = s.y + 2
        # The mark: violet = now, filled = work, hollow ring = training.
        c.setFillColor(CANVAS)
        c.circle(s.axis, my, 6.4, stroke=0, fill=1)   # punch the axis line out
        if kind == "now":
            c.setFillAlpha(0.28)
            c.setFillColor(STATE)
            c.circle(s.axis, my, 6.6, stroke=0, fill=1)
            c.setFillAlpha(1)
            c.setFillColor(STATE)
            c.circle(s.axis, my, 3.8, stroke=0, fill=1)
        elif kind == "work":
            c.setFillColor(INK)
            c.circle(s.axis, my, 3.8, stroke=0, fill=1)
        else:
            c.setFillColor(CANVAS)
            c.setStrokeColor(INK)
            c.setLineWidth(1.3)
            c.circle(s.axis, my, 3.2, stroke=1, fill=1)
        s.text(s.left, s.y - 2, year.upper(), F["MONO"], 7.3, MUTED)
        s.text(s.left + 92, s.y - 1, role, F["READ_BOLD"], 9.2, INK)
        rw = pdfmetrics.stringWidth(role, F["READ_BOLD"], 9.2)
        s.text(s.left + 92 + rw + 8, s.y - 1.5, "— %s" % org, F["MONO"], 6.8, MUTED)
        s.y -= 12
        for line in wrap(what, F["READ"], 8.3, s.width - 92):
            s.text(s.left + 92, s.y, line, F["READ"], 8.3, MUTED)
            s.y -= 10.4
        if entry is not RECORD[-1]:
            c.setStrokeColor(RULE)
            c.setLineWidth(0.7)
            c.line(s.left, s.y + 4, s.right, s.y + 4)
        s.y -= s.gap(3.5)
    entry_bottom = s.y + 6

    # -------------------------------------------------------- 03 competências
    s.section("03", "Competências", "O que sei fazer", pad=9, lead=10)
    # Common region: one frame holds the skills. Inside it, a coloured dot and a
    # mono label open each row (similarity), and a hairline closes each group
    # (proximity) — so three sets read as three even though the frame is shared.
    label_w = 106
    row_w = s.width - label_w - 12
    row_rows = []
    for _label, _dot, chips in SKILL_GROUPS:
        rows, cx = 1, 0
        for ch in chips:
            w = pdfmetrics.stringWidth(ch.upper(), F["MONO"], 6.8) + 13 + 4
            if cx + w > row_w:
                rows += 1
                cx = w
            else:
                cx += w
        row_rows.append(rows)
    gh = 13 + sum(row_rows) * 15 + (len(SKILL_GROUPS) - 1) * 3
    s.region(s.y, gh)
    cy = s.y - 14
    for i, (label, dot, chips) in enumerate(SKILL_GROUPS):
        c.setFillColor(dot)
        c.circle(s.left + 14, cy + 2.5, 3, stroke=0, fill=1)
        s.text(s.left + 23, cy, label, F["MONO"], 7.0, INK)
        cx = s.left + label_w
        for ch in chips:
            w = pdfmetrics.stringWidth(ch.upper(), F["MONO"], 6.8) + 13
            if cx + w > s.left + label_w + row_w:
                cy -= 15
                cx = s.left + label_w
            s.chip(cx, cy, ch, pad=9)
            cx += w + 4
        cy -= 15
    s.y -= gh + s.gap(12)

    # --------------------------------------------------- 04 projeto destaque
    s.section("04", "Projeto em destaque", "O Provador, ao vivo", ACT, pad=9, lead=10)
    s.region(s.y, 51)
    sw = s.width / 4
    for i, (num, cap) in enumerate(STATS):
        x = s.left + i * sw
        if i:
            c.setStrokeColor(RULE)
            c.setLineWidth(0.8)
            c.line(x, s.y - 9, x, s.y - 44)
        c.setFillColor(STATE if i == 0 else INK)
        c.setFont(F["DISPLAY"], 25)
        c.drawString(x + 14, s.y - 28, num)
        for j, line in enumerate(wrap(cap, F["READ"], 7.8, sw - 28)):
            s.text(x + 14, s.y - 39 - j * 9.4, line, F["READ"], 7.8, MUTED)
    s.y -= 51
    feat = ("Questionário de cinco passos que cruza o perfil do corredor com o stock real "
            "da loja e devolve um parecer honesto, com exportação em PDF.")
    line_y = s.y - 11
    for line in wrap(feat, F["READ"], 8.4, s.width - 150):
        s.text(s.left, line_y, line, F["READ"], 8.4, MUTED)
        line_y -= 10.8
    c.setFillColor(LINK)
    c.setFont(F["MONO_MED"], 8.0)
    c.drawString(s.left, min(line_y, s.y - 11), "FREEDOMOUTDOOR.PT/PROVADOR  »")
    s.y = min(line_y, s.y - 11) - s.gap(20)

    # ------------------------------------------------------------- 05 método
    s.section("05", "Método", "Como o trabalho sai", pad=9, lead=10)
    # Connectedness: broken line, one shared path; the last node closes the loop.
    s.region(s.y, 31)
    x = s.left + 14
    for i, st in enumerate(STEPS):
        last = i == len(STEPS) - 1
        c.setFillColor(STATE if last else CANVAS)
        c.setStrokeColor(STATE if last else LINK)
        c.setLineWidth(1.2)
        c.circle(x + 4, s.y - 17, 4.2, stroke=1, fill=1)
        s.text(x + 12, s.y - 19.5, st.upper(), F["MONO"], 7.2, INK if last else MUTED)
        w = pdfmetrics.stringWidth(st.upper(), F["MONO"], 7.2)
        if not last:
            c.setStrokeColor(LINK)
            c.setLineWidth(0.9)
            c.setDash(2.6, 2.2)
            c.line(x + 19 + w, s.y - 17, x + 31 + w, s.y - 17)
            c.setDash()
        x += 31 + w + 13
    s.y -= 31 + s.gap(8)

    for num, head, tail in PRINCIPLES:
        s.text(s.left, s.y, num, F["MONO_MED"], 7.4, LINK)
        s.text(s.left + 24, s.y, head, F["READ_BOLD"], 8.8, INK)
        hw = pdfmetrics.stringWidth(head, F["READ_BOLD"], 8.8)
        s.text(s.left + 24 + hw + 7, s.y, tail, F["READ"], 8.4, MUTED)
        s.y -= s.gap(14)

    # -------------------------------------------------------------- sign-off
    s.axis_line(axis_top, entry_bottom)
    s.y -= s.gap(4)
    c.setStrokeColor(RULE)
    c.setLineWidth(0.8)
    c.line(s.left, s.y, s.right, s.y)
    # Brand mark: broken orbit around a planet (closure).
    c.setStrokeColor(LINK)
    c.setLineWidth(1.1)
    c.setDash(5.5, 3)
    c.circle(s.left + 8, s.y - 13, 8, stroke=1, fill=0)
    c.setDash()
    c.setFillColor(STATE)
    c.circle(s.left + 8, s.y - 13, 3.6, stroke=0, fill=1)
    c.setFillColor(LINK)
    c.circle(s.left + 15.5, s.y - 7, 1.3, stroke=0, fill=1)
    s.text(s.left + 24, s.y - 11, "FEITO EM ESMORIZ, PORTUGAL", F["MONO"], 7.0, MUTED)
    s.text(s.left + 24, s.y - 20,
           "© 2026 RUBEN MONTEIRO CORREIA RODRIGUES · AYYLIENADO ONLINE",
           F["MONO"], 7.0, MUTED)
    c.setFillColor(MUTED)
    c.setFont(F["MONO"], 7.0)
    c.drawRightString(s.right, s.y - 15, "BENMRODRIGUES2000.GITHUB.IO")

    c.showPage()
    c.save()
    return s.y - 20


def build_fitted(path=OUT):
    """Render at the designed spacing; tighten the gaps only if it overflows."""
    for g in [1.0, 0.96, 0.92, 0.88, 0.84, 0.8, 0.76, 0.72, 0.68]:
        bottom = build(path, g)
        if bottom >= BOTTOM:
            return g, bottom
    return g, bottom


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else OUT
    used, bottom = build_fitted(target)
    print("wrote %s — one page, gap scale %.2f, last content y = %.1f (floor %d)"
          % (target, used, bottom, BOTTOM))
    if bottom < BOTTOM:
        print("WARNING: content still runs past the bottom margin by %.1f pt"
              % (BOTTOM - bottom))
        sys.exit(1)
