from pathlib import Path
import hashlib, json
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

ROOT = Path('/Users/haruhito/Documents/Github/web')
EVID = ROOT/'output/evals/assistant-noise-eval-2026-07-19'
OUT = ROOT/'output/pdf/assistant-noise-evaluation-2026-07-19.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)

expected = {'dataset.json':'5bb9bbe256da9ca1fa42f22ee1c2682b5e0295bc9d89f0c0a99fbda62e860f27',
            'results.json':'bfcc2b86eb9c7abea7061fcb6ba5722ad0d72c00540081da1550c6408f3d6760',
            'results.csv':'09e56e1a0b9f07ad3238878520b443ef3cee58c9fd7b75aaf3c1abee7c198f4e',
            'summary.json':'29d721f408e3393df10fa8f508b4a59bba488e3046ff7a6833b156c08b71f34c'}
for name, digest in expected.items():
    got = hashlib.sha256((EVID/name).read_bytes()).hexdigest()
    if got != digest: raise SystemExit(f'hash mismatch: {name}')
summary = json.loads((EVID/'summary.json').read_text())
results = json.loads((EVID/'results.json').read_text())
if len(results.get('cases', [])) != 100 or summary.get('model') != 'gpt-5.4-nano-2026-03-17' or summary.get('reasoningEffort') != 'medium': raise SystemExit('frozen contract mismatch')

font = '/System/Library/Fonts/Supplemental/AppleGothic.ttf'
try: pdfmetrics.registerFont(TTFont('JP', font, subfontIndex=0)); font_name='JP'
except Exception: font_name='Helvetica'
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='JBody', parent=styles['BodyText'], fontName=font_name, fontSize=9.2, leading=14, spaceAfter=5))
styles.add(ParagraphStyle(name='JSmall', parent=styles['BodyText'], fontName=font_name, fontSize=7.5, leading=10))
styles.add(ParagraphStyle(name='JTitle', parent=styles['Title'], fontName=font_name, fontSize=22, leading=28, alignment=TA_CENTER, spaceAfter=14))
styles.add(ParagraphStyle(name='JHead', parent=styles['Heading2'], fontName=font_name, fontSize=14, leading=18, spaceBefore=8, spaceAfter=7))
P=lambda s, st='JBody': Paragraph(s, styles[st])
story=[]
story += [Spacer(1,22*mm), P('GPT-5.4 nano アシスタント<br/>ノイズ耐性評価レポート','JTitle'), P('2026年7月19日｜固定100ケース・初回実測','JBody'), Spacer(1,8*mm)]
story += [P('<b>結論</b>　100件中77件が期待ファクト完全一致（77.0%）。安全性ラベルは100/100（この評価規則内）。重いノイズで52%まで低下し、複数質問の取りこぼしが主な課題でした。'), P('これは結果を見て学習・調整した後の数字ではありません。質問、期待値、実行条件を先に凍結し、有料API実行を1回だけ行った初回測定です。')]
story += [Spacer(1,4*mm), P('主要指標','JHead')]
data=[['指標','結果'],['ケース完全一致','77/100 (77.0%)'],['Fact precision / recall / F1','90.33% / 85.67% / 86.10%'],['mode / link / unsupported','94% / 84% / 96%'],['安全性（記録ラベル）','100/100'],['実モデル呼び出し','64件（決定的経路36件）'],['モデル / 推論','gpt-5.4-nano-2026-03-17 / medium'],['推定コスト','$0.0259146（cached input 0）']]
t=Table(data,colWidths=[62*mm,105*mm]); t.setStyle(TableStyle([('FONTNAME',(0,0),(-1,-1),font_name),('FONTSIZE',(0,0),(-1,-1),9),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#17324d')),('TEXTCOLOR',(0,0),(-1,0),colors.white),('GRID',(0,0),(-1,-1),.3,colors.HexColor('#b8c5d1')),('VALIGN',(0,0),(-1,-1),'TOP'),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#eef3f7')]),('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6)])); story.append(t)
story += [PageBreak(), P('ノイズ・経路別の結果','JHead')]
data=[['条件','正答'],['clean (25)','21/25 (84%)'],['light (25)','23/25 (92%)'],['medium (25)','20/25 (80%)'],['heavy (25)','13/25 (52%)'],['1 ask (40)','36/40 (90%)'],['2 asks (40)','28/40 (70%)'],['3 asks (20)','13/20 (65%)'],['high / no planner (36)','22/36 (61.1%)'],['planner / nano (64)','55/64 (85.9%)']]
t=Table(data,colWidths=[75*mm,92*mm]); t.setStyle(TableStyle([('FONTNAME',(0,0),(-1,-1),font_name),('FONTSIZE',(0,0),(-1,-1),9),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#17324d')),('TEXTCOLOR',(0,0),(-1,0),colors.white),('GRID',(0,0),(-1,-1),.3,colors.HexColor('#b8c5d1')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#eef3f7')])])) ; story.append(t)
story += [Spacer(1,6*mm), P('<b>読み方の注意：</b> planner群とhigh群はランダム化比較ではなく、現在のルーターが選んだ群です。従って「nanoが原因で改善した」とは断定できず、即答経路のゲート条件が弱いという診断材料です。heavyの低下は明確ですが、lightがcleanを上回るため、単調な劣化曲線とは言えません。')]
story += [P('失敗23件の主因','JHead'), P('・複数質問を即答経路で1ファクトに縮約（10件）<br/>・heavyノイズによる意味／モード誤分類（3件）<br/>・planner後に正しい選択を初期ファクトで上書き（否定付き大学スコープ4件）<br/>・対応済み意図をunsupportedへ変更（3件）<br/>・意味置換／モードずれ（2件）<br/>・unsupported複合依頼の誤ルーティング（1件）')]
story += [PageBreak(), P('改善の優先順位','JHead'), P('1. 複数節、否定、heavy正規化、複合アクションはplannerへ送る。即答採用前に節の網羅性を検査する。<br/>2. plannerのselectedFactIdsをレンダリングまで権威として扱い、actualFactIds・mode・linksを照合する。<br/>3. 日本語の揺れ（かな、小書き、空白、反復記号、TTI表記）を分類前に正規化する。<br/>4. supportedからunsupportedへ変わったときは再計画または初期意図を保持する。<br/>5. 23失敗を回帰テスト化し、同じ文面への過学習ではなく新しい言い換えで再評価する。')]
story += [P('評価範囲と限界','JHead'), P('ローカル静的パイプラインをconcurrency=1で1回実行した結果です。currentPathは全件「/」、contentSearchはstub-emptyで、API Gateway/Lambdaの本番E2E、ブラウザUI、動的検索、非ルートパス、負荷、セッション、障害復旧は測っていません。results.jsonには回答本文がなく、自然な文章品質は評価対象外です。安全性100%も、この100件と記録規則の範囲に限ります。費用はOpenAI価格表に基づく推定で、請求額ではありません。')]
story += [PageBreak(), P('再現用ファイルと実行条件','JHead'), P('固定データと結果は次のディレクトリに保存されています。<br/>output/evals/assistant-noise-eval-2026-07-19/'), P('含まれるもの：dataset.json（100問）、results.json、results.csv、summary.json、manifest.json。SHA-256はmanifest.jsonおよび生成スクリプトのfail-closed検証で照合します。'), P('モデル：gpt-5.4-nano-2026-03-17、reasoning effort：medium。実モデル呼び出し64、リトライ0、エラー0、cached input tokens 0。総トークン100,971（input 95,523 / output 5,448、reasoning 3,681はoutput内数）。'), P('単価（2026-07-19確認）：input $0.20/M、cached input $0.02/M、output $1.25/M。計算：95,523×0.20/M + 0×0.02/M + 5,448×1.25/M = $0.0259146。')]
doc=SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=18*mm,leftMargin=18*mm,topMargin=16*mm,bottomMargin=16*mm,title='GPT-5.4 nano アシスタント ノイズ耐性評価')
doc.build(story)
print(OUT)
