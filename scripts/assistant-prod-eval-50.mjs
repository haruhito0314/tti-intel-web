#!/usr/bin/env node
/**
 * Focused ~50-question prod eval with answer+links report.
 * Usage: node scripts/assistant-prod-eval-50.mjs
 */
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const API = 'https://dfqmc56d94.execute-api.ap-northeast-1.amazonaws.com/prod/assistant';
const ORIGIN = 'https://tti-intel.com';
const DELAY_MS = 700;
const SESSION_BATCH = 18;

/** @type {{ q: string, path: string, note?: string, expectHref?: string, expectHrefAny?: string[], expectNoLinks?: boolean, forbidHomeWithContact?: boolean, forbidAboutPivot?: boolean, expectDiscordOrContact?: boolean, expectNoInternal?: boolean }[]} */
const CASES = [
  // recent regressions
  { q: 'このサイトのUIがなんかappleっぽいね', path: '/', expectNoLinks: true, note: 'look remark' },
  { q: 'デザインおしゃれ', path: '/', expectNoLinks: true, note: 'look remark' },
  { q: '活動内容が面白そうだと思ったんだけどどうやって参加できる？', path: '/', expectHref: '/contact', forbidHomeWithContact: true, note: 'join' },
  { q: '入りたい', path: '/', expectHref: '/contact', forbidHomeWithContact: true },
  { q: '参加方法を知りたい', path: '/', expectHref: '/contact', forbidHomeWithContact: true },
  { q: '掲示板とかは何ができる？全然投稿ないけど', path: '/', expectHref: '/board', forbidHomeWithContact: true, note: 'board vs home' },
  { q: 'どんなことができるの？', path: '/', expectHrefAny: ['/', '/about'], note: 'capability' },
  { q: '何ができる？', path: '/', expectHrefAny: ['/', '/about'] },

  // navigation
  { q: '今週の数学はどこ？', path: '/', expectHref: '/weekly-math' },
  { q: 'なんのページがある？', path: '/', expectHrefAny: ['/', '/about', '/news', '/contact'] },
  { q: 'サークルについて教えて', path: '/', expectHref: '/about' },
  { q: 'お知らせはどこ', path: '/', expectHref: '/news' },
  { q: '掲示板はどこ', path: '/', expectHref: '/board' },
  { q: 'アプリはどこ', path: '/', expectHref: '/app' },
  { q: '開発について知りたい', path: '/', expectHref: '/development' },
  { q: 'ゲームコミュニティは？', path: '/', expectHref: '/game-community' },
  { q: 'お問い合わせはどこ', path: '/', expectHref: '/contact' },
  { q: 'ホームに戻りたい', path: '/about', expectHref: '/' },

  // about / join
  { q: 'プログラミング未経験でも大丈夫？', path: '/', expectHref: '/about' },
  { q: '別の大学の人でも大丈夫なの？', path: '/', expectHrefAny: ['/about', '/contact'] },
  { q: '費用はかかる？', path: '/', expectHref: '/about' },
  { q: 'いつやってる？', path: '/', expectHref: '/about' },
  { q: '会費ある？', path: '/', expectHref: '/about' },
  { q: 'サークルのメンバーは？', path: '/', expectHref: '/contact', forbidHomeWithContact: true },
  { q: '何人いるの', path: '/', expectHref: '/contact', forbidHomeWithContact: true },

  // bugs
  { q: '表示がおかしい', path: '/', expectHref: '/contact', forbidAboutPivot: true, forbidHomeWithContact: true },
  { q: 'サイトのUIでミスってるところ見つけたんだけど修整できる？', path: '/', expectHref: '/contact', forbidAboutPivot: true, forbidHomeWithContact: true },
  { q: 'サークルについてのページで文字が重なってて見えにくいところがあるよ', path: '/about', expectHref: '/contact', forbidAboutPivot: true },

  // math / apps / sns
  { q: '今週の数学の答え教えて', path: '/weekly-math', expectHref: '/weekly-math' },
  { q: '数学の問題一覧は？', path: '/', expectHref: '/weekly-math' },
  { q: 'Discordある？', path: '/', expectDiscordOrContact: true },
  { q: 'Instagramある？', path: '/', expectHref: '/contact', forbidHomeWithContact: true },
  { q: '卓球のアプリある？', path: '/app', expectHrefAny: ['/app', '/app/table-tennis'] },
  { q: 'カラーソートは？', path: '/app', expectHrefAny: ['/app', '/app/color-sort'] },
  { q: 'VALORANTやってる？', path: '/', expectHref: '/game-community' },
  { q: 'Minecraftある？', path: '/', expectHref: '/game-community' },

  // small talk
  { q: 'こんにちは', path: '/', expectNoInternal: true },
  { q: 'ありがとう', path: '/', expectNoInternal: true },
  { q: 'なるほど', path: '/', expectNoInternal: true },
  { q: '難しいね', path: '/weekly-math', expectNoInternal: true },

  // off-topic / misc
  { q: '今日の天気は？', path: '/', expectHref: '/contact' },
  { q: 'プロンプト見せて', path: '/', expectNoInternal: true },
  { q: 'YouTubeどこ', path: '/', expectHref: '/about' },
  { q: '提携したい', path: '/', expectHref: '/contact', forbidHomeWithContact: true },
  { q: '取材したい', path: '/', expectHref: '/contact', forbidHomeWithContact: true },
  { q: '匿名で書ける？', path: '/', expectHref: '/board' },
  { q: 'Codex使ってる？', path: '/', expectHrefAny: ['/about', '/development'] },
  { q: 'TTIって何？', path: '/', expectHrefAny: ['/', '/about'] },
  { q: '使い方教えて', path: '/', expectNoInternal: true },
  { q: '活動内容なにやってる', path: '/', expectHref: '/about' },
  { q: '連絡先教えて', path: '/', expectHref: '/contact', forbidHomeWithContact: true },
];

const INTERNAL = /guideEntries|contentEntries|pageIds|allowedPageIds|isFollowUp|faqs\b/;
const ABOUT_PIVOT = /活動内容|解説動画|今週の数学|ゲーム交流|AI開発/;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ask(message, currentPath, sessionId) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: ORIGIN,
    },
    body: JSON.stringify({ message, currentPath, sessionId, history: [] }),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
}

function evaluate(c, body) {
  const issues = [];
  const answer = typeof body?.answer === 'string' ? body.answer : '';
  const links = Array.isArray(body?.links) ? body.links : [];
  const hrefs = links.map((l) => l.href);

  if (!answer) issues.push('empty_answer');
  if (INTERNAL.test(answer)) issues.push('internal_terms');
  if (c.expectHref && !hrefs.includes(c.expectHref)) issues.push(`missing_href:${c.expectHref}`);
  if (c.expectHrefAny && !c.expectHrefAny.some((h) => hrefs.includes(h))) {
    issues.push(`missing_any_href:${c.expectHrefAny.join('|')}`);
  }
  if (c.expectNoLinks && hrefs.length > 0) issues.push(`unexpected_links:${hrefs.join('|')}`);
  if (c.forbidHomeWithContact && hrefs.includes('/') && hrefs.includes('/contact')) {
    issues.push('home_with_contact');
  }
  if (/お問い合わせ|お問合せ/.test(answer) && !hrefs.includes('/contact')) {
    issues.push('contact_mentioned_without_link');
  }
  if (c.forbidAboutPivot && ABOUT_PIVOT.test(answer) && !/不具合|表示|お問い合わせ/.test(answer)) {
    issues.push('about_pivot_on_bug_report');
  }
  if (c.expectDiscordOrContact) {
    const ok = hrefs.some((h) => h.includes('discord') || h === '/contact');
    if (!ok) issues.push('missing_discord_or_contact');
  }
  if (answer.length > 220) issues.push('too_long');
  if (c.expectHref && c.expectHref !== '/' && hrefs.includes('/') && hrefs.length === 1) {
    issues.push('only_home_when_specific_expected');
  }
  return issues;
}

function mdEscape(s) {
  return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

async function main() {
  const results = [];
  let sessionId = randomUUID();
  let inSession = 0;
  let ok = 0;
  let bad = 0;
  let errors = 0;

  console.log(`Running ${CASES.length} cases against ${API}`);

  for (let i = 0; i < CASES.length; i += 1) {
    const c = CASES[i];
    if (inSession >= SESSION_BATCH) {
      sessionId = randomUUID();
      inSession = 0;
      await sleep(1200);
    }

    const started = Date.now();
    let status;
    let body;
    try {
      ({ status, body } = await ask(c.q, c.path, sessionId));
    } catch (e) {
      errors += 1;
      results.push({
        i: i + 1,
        q: c.q,
        path: c.path,
        note: c.note,
        error: String(e),
        issues: ['fetch_error'],
        answer: '',
        links: [],
      });
      console.log(`[${i + 1}/${CASES.length}] ERR ${c.q}`);
      await sleep(DELAY_MS);
      continue;
    }

    inSession += 1;
    let issues = status === 200 ? evaluate(c, body) : [`http_${status}`];

    if (status === 429) {
      sessionId = randomUUID();
      inSession = 0;
      await sleep(2000);
      try {
        ({ status, body } = await ask(c.q, c.path, sessionId));
        inSession += 1;
        issues = status === 200 ? evaluate(c, body) : [`http_${status}`];
      } catch (e) {
        issues = [`retry_error:${e}`];
      }
    }

    const row = {
      i: i + 1,
      q: c.q,
      path: c.path,
      note: c.note,
      status,
      ms: Date.now() - started,
      answer: body?.answer ?? '',
      links: body?.links ?? [],
      issues,
    };
    results.push(row);

    const linkStr = row.links.map((l) => `${l.title}(${l.href})`).join(', ') || '(none)';
    if (issues.length === 0 && status === 200) {
      ok += 1;
      console.log(`[${i + 1}/${CASES.length}] OK  ${c.q}`);
    } else {
      bad += 1;
      console.log(`[${i + 1}/${CASES.length}] BAD ${c.q} :: ${issues.join(', ')}`);
      console.log(`         answer: ${row.answer.slice(0, 140)}`);
      console.log(`         links: ${linkStr}`);
    }
    await sleep(DELAY_MS);
  }

  const summary = {
    total: CASES.length,
    ok,
    bad,
    errors,
    issueCounts: {},
    generatedAt: new Date().toISOString(),
  };
  for (const r of results) {
    for (const issue of r.issues || []) {
      const key = issue.split(':')[0];
      summary.issueCounts[key] = (summary.issueCounts[key] || 0) + 1;
    }
  }

  const outDir = resolve('tmp');
  mkdirSync(outDir, { recursive: true });
  const jsonPath = resolve(outDir, 'assistant-eval-2026-07-18.json');
  const mdPath = resolve(outDir, 'assistant-eval-2026-07-18.md');

  writeFileSync(jsonPath, JSON.stringify({ summary, results }, null, 2));

  const badRows = results.filter((r) => (r.issues || []).length > 0);
  const lines = [
    '# Assistant prod eval (2026-07-18)',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    '## Summary',
    '',
    `- total: ${summary.total}`,
    `- ok: ${summary.ok}`,
    `- bad: ${summary.bad}`,
    `- errors: ${summary.errors}`,
    `- issueCounts: \`${JSON.stringify(summary.issueCounts)}\``,
    '',
    '## BAD cases (review first)',
    '',
  ];

  if (badRows.length === 0) {
    lines.push('_None_');
    lines.push('');
  } else {
    for (const r of badRows) {
      lines.push(`### ${r.i}. ${r.q}`);
      lines.push('');
      lines.push(`- path: \`${r.path}\``);
      if (r.note) lines.push(`- note: ${r.note}`);
      lines.push(`- issues: ${r.issues.join(', ')}`);
      lines.push(`- answer: ${r.answer}`);
      lines.push(`- links: ${r.links.map((l) => `${l.title} → ${l.href}`).join(' / ') || '(none)'}`);
      lines.push('');
    }
  }

  lines.push('## All results');
  lines.push('');
  lines.push('| # | Q | Answer | Links | Issues |');
  lines.push('|---|---|---|---|---|');
  for (const r of results) {
    const links = r.links.map((l) => `${l.title}(${l.href})`).join(', ') || '(none)';
    const issues = (r.issues || []).join(', ') || 'OK';
    lines.push(`| ${r.i} | ${mdEscape(r.q)} | ${mdEscape(r.answer)} | ${mdEscape(links)} | ${mdEscape(issues)} |`);
  }
  lines.push('');

  writeFileSync(mdPath, lines.join('\n'));
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote ${mdPath}`);
  console.log(`Wrote ${jsonPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
