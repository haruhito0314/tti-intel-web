from __future__ import annotations

from collections import Counter
from hashlib import sha256
from html import escape
import json
from pathlib import Path

import pdfplumber
from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "output/evals/assistant-circle-site-routing-2026-08-10"
OUTPUT = ROOT / "output/pdf/assistant-circle-site-routing-evaluation-2026-08-10.pdf"
CONFIG_PATH = ROOT / "lambdas/eval/fixtures/assistant-evaluation-config.json"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

manifest = json.loads((EVIDENCE / "manifest.json").read_text(encoding="utf-8"))
for filename, key in {"dataset.json": "dataset", "results.json": "results", "results.csv": "csv", "summary.json": "summary"}.items():
    entry = manifest["files"][key]
    if entry["filename"] != filename or sha256((EVIDENCE / filename).read_bytes()).hexdigest() != entry["sha256"]:
        raise SystemExit(f"evidence manifest mismatch: {filename}")

dataset = json.loads((EVIDENCE / "dataset.json").read_text(encoding="utf-8"))
results = json.loads((EVIDENCE / "results.json").read_text(encoding="utf-8")).get("cases", [])
summary = json.loads((EVIDENCE / "summary.json").read_text(encoding="utf-8"))
configuration = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
cases = dataset.get("cases", [])
if len(cases) != 100 or summary.get("model") != "gpt-5.6-luna" or summary.get("configuration") != configuration:
    raise SystemExit("frozen report contract mismatch")

scope_counts = Counter(case["expectedScope"] for case in cases)
luna_calls = sum(case["expectedLunaCallCount"] for case in cases)
zero_calls = sum(case["expectedLunaCallCount"] == 0 for case in cases)
web_calls = sum(case["expectedWebCallCount"] for case in cases)
topic_counts = Counter(case["category"] for case in cases)
if scope_counts != {"circle": 32, "site": 32, "university": 16, "out_of_scope": 16, "conversation": 4}:
    raise SystemExit("scope count contract mismatch")
if len(topic_counts) != 25 or any(count != 4 for count in topic_counts.values()):
    raise SystemExit("25 topic x 4 variant contract mismatch")
if (luna_calls, zero_calls, web_calls) != (64, 36, 0):
    raise SystemExit("64/36/0 call contract mismatch")

font_path = Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf")
if not font_path.exists():
    raise SystemExit("Arial Unicode font is unavailable")
pdfmetrics.registerFont(TTFont("JP", str(font_path)))
FONT = "JP"
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleJP", parent=styles["Title"], fontName=FONT, fontSize=22, leading=29, alignment=TA_CENTER, textColor=colors.HexColor("#10243E"), spaceAfter=8 * mm))
styles.add(ParagraphStyle(name="SubJP", parent=styles["BodyText"], fontName=FONT, fontSize=10, leading=16, alignment=TA_CENTER, textColor=colors.HexColor("#52657A")))
styles.add(ParagraphStyle(name="HeadJP", parent=styles["Heading2"], fontName=FONT, fontSize=14, leading=20, textColor=colors.HexColor("#10243E"), spaceBefore=4 * mm, spaceAfter=3 * mm))
styles.add(ParagraphStyle(name="BodyJP", parent=styles["BodyText"], fontName=FONT, fontSize=9.2, leading=15, textColor=colors.HexColor("#23364A"), spaceAfter=2.5 * mm))
styles.add(ParagraphStyle(name="SmallJP", parent=styles["BodyText"], fontName=FONT, fontSize=7.7, leading=11, textColor=colors.HexColor("#33485D")))
styles.add(ParagraphStyle(name="HeaderJP", parent=styles["BodyText"], fontName=FONT, fontSize=7.7, leading=11, textColor=colors.white))
P = lambda text, style="BodyJP": Paragraph(str(text), styles[style])

def table(rows, widths, header="#10243E"):
    value = Table([[P(escape(str(cell)), "HeaderJP" if row_index == 0 else "SmallJP") for cell in row] for row_index, row in enumerate(rows)], colWidths=widths, repeatRows=1)
    value.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(header)), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#B9C6D3")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F2F6F8")]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return value

measured = int(summary.get("measured") or 0)
story = [
    Spacer(1, 14 * mm), P("Luna AI Assistant", "TitleJP"),
    P("サークル・サイト範囲ルーティング 100問評価 / デプロイ前ドライラン", "SubJP"), Spacer(1, 8 * mm),
    P("結論", "HeadJP"),
    P("<b>100件の固定評価は、Lunaを使う範囲とローカル応答の範囲を分離して検証します。</b> このPDFはローカルdry-runであり、production endpoint、OpenAI API、AWS環境にはアクセスしていません。"),
    P("<b>64 Luna calls / 36 zero-call responses / 0 web calls</b> を固定契約として、ケースごとのscope、呼出し数、利用量、リンク、プライバシー境界を判定します。"),
    table([
        ["指標", "値", "意味"],
        ["固定ケース", "100", "25テーマ x 4表現ゆれ"],
        ["モデル", "gpt-5.6-luna", "評価対象モデル"],
        ["Luna呼出し", "64", "circle / site のみ、各1回"],
        ["ローカル応答", "36", "university / conversation / out_of_scope は0回"],
        ["Web呼出し", "0", "全ケースでツール無効"],
        ["本番実測", str(measured), "このPDFはローカルdry-run"],
    ], [44 * mm, 32 * mm, 90 * mm]),
    PageBreak(), P("スコープと評価マトリクス", "HeadJP"),
    table([
        ["scope", "ケース", "Luna", "リンク・応答境界"],
        ["circle", 32, "1", "TTI Intelligenceの活動・参加・作品"],
        ["site", 32, "1", "サイト内容とCodex/Vercel/AWS/Plugin/CLI/MCP"],
        ["university", 16, "0", "公式サイト root URL のみ"],
        ["out_of_scope", 16, "0", "短い案内、リンクなし"],
        ["conversation", 4, "0", "短い会話応答、リンクなし"],
    ], [35 * mm, 25 * mm, 22 * mm, 84 * mm], "#0B6B62"),
    Spacer(1, 6 * mm), P("判定すること", "HeadJP"),
    P("期待scopeとの一致、ケース固有のLuna/Web呼出し数、HTTP状態、遅延、必須・禁止概念、許可リンク、ゼロ呼出し時の5種token counterの全ゼロを検査します。大学ケースは <b>https://www.toyota-ti.ac.jp/</b> の完全一致だけを許可し、大学の詳細を説明する文章を失敗にします。"),
    PageBreak(), P("テレメトリーとプライバシー", "HeadJP"),
    P("相関記録とテレメトリーには run UUID、case ID、server request ID、観測時刻、assistantScope、期待/観測のLuna・Web呼出し数、token counterだけを保存します。質問文、履歴、session ID、回答本文、その他の私的内容は保存しません。"),
    table([
        ["照合", "要件"],
        ["run", "UUID、開始/終了時刻、100件のcase IDを完全一致"],
        ["request", "100個の一意なserver request IDを完全一致"],
        ["telemetry", "scopeと期待/観測呼出し数、ゼロ呼出しusageを検証"],
        ["links", "大学rootのみ、会話・範囲外はリンクなし"],
    ], [45 * mm, 121 * mm]),
    Spacer(1, 6 * mm), P("ローカル実行の境界", "HeadJP"),
    P("dry-runはfixtureと評価器、証跡ファイルの整合性だけを確認します。Luna payloadを構築せず、production/OpenAI呼出しを行いません。本番評価を認可した場合も、ローカルscopeのリクエストはsession IDを送らず、テレメトリーでゼロusageを要求します。"),
    PageBreak(), P("再現性と次の手順", "HeadJP"),
    P("dataset.json、results.json、results.csv、summary.jsonはmanifest.jsonのSHA-256で照合してからPDFを生成します。モデル、ツール無効、評価用の単価設定、実行状態はsummary.jsonに固定します。"),
    P("本番未実行のため、正答率・遅延・token・費用は未測定です。デプロイ許可後に同じ凍結データセットを1回実行し、privacy-safe telemetryを照合してこのPDFを再生成します。"),
    P("合格条件", "HeadJP"),
    P("100件のscope、case ID、server request ID、時刻範囲を一致させ、64件のcircle/siteでLuna 1回、36件のlocal scopeでLuna 0回かつ5つのusage counterがすべて0、全100件でWeb 0回を確認します。"),
]

def footer(canvas, document):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#D7E0E8"))
    canvas.line(18 * mm, 13 * mm, A4[0] - 18 * mm, 13 * mm)
    canvas.setFont(FONT, 7.5)
    canvas.setFillColor(colors.HexColor("#718096"))
    canvas.drawString(18 * mm, 8 * mm, "TTI Intelligence / Assistant Scope Evaluation")
    canvas.drawRightString(A4[0] - 18 * mm, 8 * mm, str(document.page))
    canvas.restoreState()

document = SimpleDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=16 * mm, bottomMargin=18 * mm, title="Assistant Scope Routing Evaluation", author="TTI Intelligence")
document.build(story, onFirstPage=footer, onLaterPages=footer)
reader = PdfReader(str(OUTPUT))
if len(reader.pages) != 4:
    raise SystemExit(f"unexpected page count: {len(reader.pages)}")
with pdfplumber.open(OUTPUT) as document_check:
    extracted = "\n".join(page.extract_text() or "" for page in document_check.pages)
for required in ("gpt-5.6-luna", "100", "64 Luna calls / 36 zero-call responses / 0 web calls", "本番未実行", "assistantScope"):
    if required not in extracted:
        raise SystemExit(f"missing report text: {required}")
print(OUTPUT)
