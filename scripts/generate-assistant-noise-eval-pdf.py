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
EVIDENCE = ROOT / "output/evals/assistant-luna-structured-knowledge-2026-08-03"
OUTPUT = ROOT / "output/pdf/assistant-luna-structured-knowledge-evaluation-2026-08-03.pdf"
CONFIG_PATH = ROOT / "lambdas/eval/fixtures/assistant-evaluation-config.json"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

manifest = json.loads((EVIDENCE / "manifest.json").read_text(encoding="utf-8"))
mapping = {"dataset.json": "dataset", "results.json": "results", "results.csv": "csv", "summary.json": "summary"}
for filename, key in mapping.items():
    entry = manifest["files"][key]
    if entry["filename"] != filename:
        raise SystemExit(f"manifest mismatch: {filename}")
    if sha256((EVIDENCE / filename).read_bytes()).hexdigest() != entry["sha256"]:
        raise SystemExit(f"hash mismatch: {filename}")

dataset = json.loads((EVIDENCE / "dataset.json").read_text(encoding="utf-8"))
results = json.loads((EVIDENCE / "results.json").read_text(encoding="utf-8")).get("cases", [])
summary = json.loads((EVIDENCE / "summary.json").read_text(encoding="utf-8"))
configuration = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
if len(dataset.get("cases", [])) != 100 or summary.get("model") != "gpt-5.6-luna":
    raise SystemExit("frozen report contract mismatch")
if summary.get("configuration") != configuration:
    raise SystemExit("summary does not match the shared evaluator configuration")

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

def make_table(rows, widths, header_color="#10243E"):
    table = Table([
        [P(escape(str(cell)), "HeaderJP" if index == 0 else "SmallJP") for cell in row]
        for index, row in enumerate(rows)
    ], colWidths=widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(header_color)),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#B9C6D3")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F2F6F8")]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table

measured = int(summary.get("measured") or 0)
accuracy = summary.get("accuracy")
accuracy_text = f"{accuracy * 100:.1f}%" if accuracy is not None else "未測定"
cost = summary.get("estimatedCostUsd")
cost_text = f"USD {cost:.6f}" if cost is not None else "未測定"
category_counts = Counter(case["category"] for case in dataset["cases"])
variant_counts = Counter(case["variant"] for case in dataset["cases"])

story = [
    Spacer(1, 14 * mm),
    P("Luna AI Assistant", "TitleJP"),
    P("100問 受入評価マトリクス / デプロイ前ドライラン報告", "SubJP"),
    Spacer(1, 8 * mm),
    P("結論", "HeadJP"),
    P("<b>100問の固定データセットと評価器は検証済みです。</b> 本番APIとOpenAI APIは呼んでいません。したがって、正答率、レイテンシ、token、費用は未測定です。実測値を推測で補完せず、デプロイ許可後に同じデータセットを1回だけ実行する設計にしています。"),
    Spacer(1, 3 * mm),
    make_table([
        ["指標", "値", "解釈"],
        ["固定ケース", "100", "25テーマ x 4表現ゆれ"],
        ["評価カテゴリ", "7", "サイト・大学・開発・一般・安全性"],
        ["本番実測", str(measured), "このPDFはローカルdry-run"],
        ["Web検索", "0", "tools: [] / 検索なし"],
        ["正答率", accuracy_text, "本番実行後に算出"],
        ["推定費用", cost_text, "token実測後に算出"],
    ], [48 * mm, 33 * mm, 85 * mm]),
    Spacer(1, 6 * mm),
    P("自動判定の範囲", "HeadJP"),
    P("回答の必須概念と禁止概念、大学とTTI Intelligenceの区別表現、CLI Practice/TOEIC誘導、本文URL、危険なリンク、HTTP状態、レイテンシ、Luna呼出し1回、Web呼出し0回、token整合性を検査します。最新・医療・金融の固定16ケースは文と節に分け、同じ節の否定・回避表現を考慮する有限の判定規則で確認します。回答指紋は主題語を除いて比較します。"),
    PageBreak(),
    P("カテゴリ別の設計", "HeadJP"),
]
category_rows = [["カテゴリ", "ケース数", "実測正答率"]]
for category, count in category_counts.items():
    category_rows.append([category, count, "未測定"])
story.extend([
    make_table(category_rows, [111 * mm, 25 * mm, 30 * mm], "#0B6B62"),
    Spacer(1, 6 * mm),
    P("表現ゆれ", "HeadJP"),
    P(" / ".join(f"{escape(name)}: {count}件" for name, count in variant_counts.items())),
    P("clean、typo/noise、shortまたはshort/follow-up、compoundを組み合わせ、誤字・空白・略語・短文・履歴参照・複数要求を含めました。一般知識、最新性が必要な質問、高リスク質問は合計24件、Codex/Vercel/AWS/Plugin/CLI/MCPは合計24件です。"),
    P("代表的な受入条件", "HeadJP"),
    make_table([
        ["領域", "確認内容"],
        ["大学全体", "豊田工業大学の部活動をAIサークルだけに縮約しない"],
        ["区別", "大学とTTI Intelligenceを別の主体として説明する"],
        ["開発", "Codex/Vercel/AWS/Plugin/CLI/MCPを説明し、CLI Practiceへ誘導しない"],
        ["一般知識", "安定した知識は回答し、不要なサイトリンクを出さない"],
        ["最新情報", "Web未使用のため最新値を断定せず、確認限界を示す"],
        ["高リスク", "診断・利益保証をせず、専門家や公式情報の確認を促す"],
    ], [48 * mm, 118 * mm]),
    PageBreak(),
    P("モデル・費用・プライバシー", "HeadJP"),
])
prices = configuration["pricingUsdPerMillion"]
story.extend([
    make_table([
        ["設定", "値"],
        ["モデル", summary["configuration"]["model"]],
        ["Web検索", "無効"],
        ["Luna呼出し期待値", "通常質問ごとに1回"],
        ["Web呼出し期待値", "各ケース0回"],
        ["input", f"USD {prices['input']:.2f} / 100万token"],
        ["cached input", f"USD {prices['cachedInput']:.2f} / 100万token"],
        ["cache write", f"USD {prices['cacheWrite']:.2f} / 100万token"],
        ["output", f"USD {prices['output']:.2f} / 100万token"],
    ], [70 * mm, 96 * mm]),
    Spacer(1, 4 * mm),
    P("<b>費用の注意:</b> 上記は公式価格表ではなく、共有設定ファイルに置いた評価用の仮定です。実行日の公式価格を必ず再確認してから本番測定します。cached inputとcache writeを分け、不整合なtoken値では費用を0扱いにせず「算出不能」とします。"),
    P("保存しない情報", "HeadJP"),
    P("結果・CSV・PDF・実行証跡にはsession ID、質問文、回答本文、会話履歴を保存しません。照合記録にはrun ID、case ID、server request ID、時刻だけを保存し、最終結果では安全な件数指標と短い不可逆な回答指紋を使用します。評価入力の原本はバージョン管理されたfixtureに限定します。"),
    P("失敗例", "HeadJP"),
])
failed = [result for result in results if result.get("passed") is False]
if not results:
    story.append(P("本番未実行のため失敗例はありません。許可後の評価で最大8件を、回答本文を含めずに掲載します。"))
elif not failed:
    story.append(P("自動判定上の失敗はありませんでした。"))
else:
    failure_rows = [["Case", "Category", "Issues"]]
    for result in failed[:8]:
        failure_rows.append([result.get("caseId", ""), result.get("category", ""), ", ".join(result.get("issues", []))[:180]])
    story.append(make_table(failure_rows, [22 * mm, 58 * mm, 86 * mm], "#8C2F39"))

story.extend([
    PageBreak(),
    P("実行境界と次の手順", "HeadJP"),
    P("この成果物はローカルdry-runです。production endpoint、OpenAI API、AWS環境、日次上限にはアクセスしていません。デプロイ許可後に限り、同じ凍結データセットを1回実行します。runnerが個人情報を含まない照合記録を保存し、書き出したLambda JSONL logから別スクリプトが100件の呼出し/token telemetryを生成・照合してPDFを再生成します。"),
    P("合格条件", "HeadJP"),
    P("100件を欠落なく実行し、UUID run ID、100個のcase ID、実responseのserver request ID、時刻範囲を完全一致させ、各通常質問でLuna 1回・Web 0回を確認します。免責文とは別の節にある最新情報断定、受診抑制、借金・集中投資の指示も失敗です。この判定は固定ケース用であり、一般的な意味理解や安全性を保証しないため、失敗例と境界例は人手でも確認します。"),
    P("再現性", "HeadJP"),
    P("dataset.json、results.json、results.csv、summary.jsonをmanifest.jsonのSHA-256で照合してから生成しました。モデル、検索設定、単価設定、実行状態はsummary.jsonへ固定されています。"),
])

def footer(canvas, document):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#D7E0E8"))
    canvas.line(18 * mm, 13 * mm, A4[0] - 18 * mm, 13 * mm)
    canvas.setFont(FONT, 7.5)
    canvas.setFillColor(colors.HexColor("#718096"))
    canvas.drawString(18 * mm, 8 * mm, "TTI Intelligence / Luna Assistant Evaluation")
    canvas.drawRightString(A4[0] - 18 * mm, 8 * mm, str(document.page))
    canvas.restoreState()

document = SimpleDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=16 * mm, bottomMargin=18 * mm, title="Luna AI Assistant 100問受入評価", author="TTI Intelligence")
document.build(story, onFirstPage=footer, onLaterPages=footer)

reader = PdfReader(str(OUTPUT))
if len(reader.pages) != 4:
    raise SystemExit(f"unexpected page count: {len(reader.pages)}")
with pdfplumber.open(OUTPUT) as document_check:
    extracted = "\n".join(page.extract_text() or "" for page in document_check.pages)
for required in ("gpt-5.6-luna", "100", "本番未実行", "cached input", "Web"):
    if required not in extracted:
        raise SystemExit(f"missing report text: {required}")
print(OUTPUT)
