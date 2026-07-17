#!/usr/bin/env node
/** Append ~20 cases to the 130-eval and regenerate PDF. */
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const API = 'https://dfqmc56d94.execute-api.ap-northeast-1.amazonaws.com/prod/assistant';
const ORIGIN = 'https://tti-intel.com';
const DELAY_MS = 700;
const OUT_STEM = 'assistant-eval-2026-07-18-150';

const EXTRA = [
  { cat: 'extra', q: 'お知らせと開発、どっちから読めばいい？', expectHrefAny: ['/news', '/development'] },
  { cat: 'extra', q: 'ゲームやりたいんだけどコミュニティページある？', expectHrefAny: ['/game-community'] },
  { cat: 'extra', q: 'CLI Practiceって何？どこ？', path: '/app', expectHrefAny: ['/app', '/app/cli-practice'] },
  { cat: 'extra', q: 'イベント情報どこで見る？', expectHrefAny: ['/news'] },
  { cat: 'extra', q: '部活？同好会？', expectHrefAny: ['/about', '/'] },
  { cat: 'extra', q: '豊田工大の学生しか入れないの？', expectHrefAny: ['/about', '/contact'] },
  { cat: 'extra', q: '週何回集まってる？', expectHrefAny: ['/about'] },
  { cat: 'extra', q: 'MCP使ってる？', expectHrefAny: ['/development'] },
  { cat: 'extra', q: 'メニューどこ', expectHrefAny: ['/'] },
  { cat: 'extra', q: 'サイトマップみたいなの', expectNoLinks: true },
  { cat: 'extra', q: 'なにこれ', expectHrefAny: ['/', '/about'] },
  { cat: 'extra', q: '動画作ってほしい', expectHrefAny: ['/contact', '/about'] },
  { cat: 'extra', q: 'メールで問い合わせたい', expectHrefAny: ['/contact'] },
  { cat: 'extra', q: 'フォームどこ', expectHrefAny: ['/contact'] },
  { cat: 'extra', q: 'APEXやってる？', expectHrefAny: ['/game-community'] },
  { cat: 'extra', q: '解答ある？', path: '/weekly-math', expectHrefAny: ['/weekly-math'] },
  { cat: 'extra', q: 'ヒントくれ', path: '/weekly-math', expectHrefAny: ['/weekly-math'] },
  { cat: 'extra', q: 'はいはい', expectNoLinks: true },
  { cat: 'extra', q: 'そだね', expectNoLinks: true },
  { cat: 'extra', q: 'おつ', expectNoLinks: true },
  // retest previous BADs
  { cat: 'retest', q: 'ちょっと待って、ページ一覧ほしい。お問い合わせの場所も', expectHrefAny: ['/contact'] },
  { cat: 'retest', q: 'こんにちは！TTIって何？あとお問い合わせどこ？', expectToyotaTi: true, expectHrefAny: ['/contact'] },
  { cat: 'retest', q: 'なんのページがあるの？ニュースも見たい', expectHrefAny: ['/news'] },
  { cat: 'retest', q: '数学の問題一覧は？', expectHrefAny: ['/weekly-math'] },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ask(message, currentPath, sessionId) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    body: JSON.stringify({ message, currentPath, sessionId, history: [] }),
  });
  return { status: res.status, body: await res.json() };
}

function evaluate(c, body) {
  const issues = [];
  const answer = typeof body?.answer === 'string' ? body.answer : '';
  const hrefs = (body?.links || []).map((l) => l.href);
  if (!answer) issues.push('empty_answer');
  if (c.expectNoLinks && hrefs.length > 0) issues.push('unexpected_links');
  if (c.expectHrefAny && !c.expectHrefAny.some((h) => hrefs.includes(h))) {
    issues.push(`missing_any_href:${c.expectHrefAny.join('|')}`);
  }
  if (c.expectToyotaTi && !hrefs.some((h) => h.includes('toyota-ti.ac.jp'))) {
    issues.push('missing_toyota_ti');
  }
  if (/weekly-math|pageIds/i.test(answer)) issues.push('leaked_slug');
  if (/現在の話題は|近い質問は/.test(answer)) issues.push('meta_prompt_leak');
  return issues;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function main() {
  const basePath = resolve('tmp', `${OUT_STEM}.json`);
  const base = JSON.parse(readFileSync(basePath, 'utf8'));
  const results = [...base.results];
  let sessionId = randomUUID();
  let inSession = 0;
  let startI = results.length;

  console.log(`Appending ${EXTRA.length} to existing ${results.length}`);

  for (let i = 0; i < EXTRA.length; i += 1) {
    const c = EXTRA[i];
    if (inSession >= 18) {
      sessionId = randomUUID();
      inSession = 0;
      await sleep(1200);
    }
    const path = c.path || '/';
    let status;
    let body;
    ({ status, body } = await ask(c.q, path, sessionId));
    inSession += 1;
    if (status === 429) {
      sessionId = randomUUID();
      inSession = 0;
      await sleep(2000);
      ({ status, body } = await ask(c.q, path, sessionId));
      inSession += 1;
    }
    const issues = status === 200 ? evaluate(c, body) : [`http_${status}`];
    const row = {
      i: startI + i + 1,
      q: c.q,
      path,
      cat: c.cat,
      status,
      answer: body?.answer ?? '',
      links: body?.links ?? [],
      issues,
    };
    results.push(row);
    console.log(`[${row.i}] ${issues.length ? 'BAD' : 'OK '} ${c.q.slice(0, 40)} ${issues.length ? `:: ${issues.join(',')}` : ''}`);
    await sleep(DELAY_MS);
  }

  const summary = {
    total: results.length,
    ok: results.filter((r) => (r.issues || []).length === 0).length,
    bad: results.filter((r) => (r.issues || []).length > 0).length,
    errors: 0,
    issueCounts: {},
    generatedAt: new Date().toISOString(),
  };
  for (const r of results) {
    for (const issue of r.issues || []) {
      const key = String(issue).split(':')[0];
      summary.issueCounts[key] = (summary.issueCounts[key] || 0) + 1;
    }
  }

  writeFileSync(basePath, JSON.stringify({ summary, results }, null, 2));

  const badRows = results.filter((r) => (r.issues || []).length > 0);
  const byCat = {};
  for (const r of results) {
    byCat[r.cat] = byCat[r.cat] || { ok: 0, bad: 0, total: 0 };
    byCat[r.cat].total += 1;
    if ((r.issues || []).length === 0) byCat[r.cat].ok += 1;
    else byCat[r.cat].bad += 1;
  }

  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"/>
<title>Assistant Eval ${summary.total}</title>
<style>
@page{size:A4;margin:14mm}
body{font-family:"Hiragino Sans","Hiragino Kaku Gothic ProN",sans-serif;font-size:10px;line-height:1.45}
h1{font-size:18px}h2{font-size:14px;border-bottom:1px solid #ccc;padding-bottom:4px}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th,td{border:1px solid #ddd;padding:4px 6px;vertical-align:top;word-wrap:break-word}
th{background:#f8fafc;text-align:left}
tr.fail{background:#fff5f5}
.pill{display:inline-block;background:#f3f4f6;border-radius:8px;padding:8px 12px;margin:4px 8px 4px 0}
.bad{border:1px solid #fecaca;background:#fff7f7;padding:8px;margin:8px 0;border-radius:6px;page-break-inside:avoid}
</style></head><body>
<h1>Assistant Production Eval (${summary.total})</h1>
<p>Generated: ${esc(summary.generatedAt)}</p>
<div>
<div class="pill"><strong>${summary.total}</strong><br/>total</div>
<div class="pill"><strong>${summary.ok}</strong><br/>OK</div>
<div class="pill"><strong>${summary.bad}</strong><br/>BAD</div>
</div>
<p>issueCounts: <code>${esc(JSON.stringify(summary.issueCounts))}</code></p>
<h2>By category</h2>
<table><thead><tr><th>Category</th><th>Total</th><th>OK</th><th>BAD</th></tr></thead><tbody>
${Object.entries(byCat).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v.total}</td><td>${v.ok}</td><td>${v.bad}</td></tr>`).join('')}
</tbody></table>
<h2>BAD cases</h2>
${badRows.length === 0 ? '<p><em>None</em></p>' : badRows.map((r) => `
<section class="bad"><h3>#${r.i} [${esc(r.cat)}]</h3>
<p><strong>Q:</strong> ${esc(r.q)}</p>
<p><strong>Issues:</strong> ${esc((r.issues || []).join(', '))}</p>
<p><strong>Answer:</strong> ${esc(r.answer)}</p>
<p><strong>Links:</strong> ${esc((r.links || []).map((l) => `${l.title} (${l.href})`).join(' / ') || '(none)')}</p>
</section>`).join('')}
<h2>All results</h2>
<table><thead><tr><th>#</th><th>Cat</th><th>Q</th><th>Answer</th><th>Links</th><th>Issues</th></tr></thead><tbody>
${results.map((r) => {
  const ok = (r.issues || []).length === 0;
  return `<tr class="${ok ? 'ok' : 'fail'}"><td>${r.i}</td><td>${esc(r.cat)}</td><td>${esc(r.q)}</td><td>${esc(r.answer)}</td><td>${esc((r.links || []).map((l) => `${l.title}(${l.href})`).join(', ') || '(none)')}</td><td>${esc((r.issues || []).join(', ') || 'OK')}</td></tr>`;
}).join('\n')}
</tbody></table>
</body></html>`;

  const htmlPath = resolve('tmp', `${OUT_STEM}.html`);
  const pdfPath = resolve('tmp', `${OUT_STEM}.pdf`);
  const mdPath = resolve('tmp', `${OUT_STEM}.md`);
  writeFileSync(htmlPath, html);
  writeFileSync(mdPath, `# Assistant eval ${summary.total}\n\nok=${summary.ok} bad=${summary.bad}\n\n${JSON.stringify(summary.issueCounts)}\n`);

  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (existsSync(chrome)) {
    spawnSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`], { timeout: 120000 });
  }

  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote ${pdfPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
