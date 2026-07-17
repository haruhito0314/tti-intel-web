#!/usr/bin/env node
/**
 * Second focused ~50-question prod eval (post-fix pass).
 * Usage: node scripts/assistant-prod-eval-50b.mjs
 */
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const API = 'https://dfqmc56d94.execute-api.ap-northeast-1.amazonaws.com/prod/assistant';
const ORIGIN = 'https://tti-intel.com';
const DELAY_MS = 700;
const SESSION_BATCH = 18;
const OUT_STEM = 'assistant-eval-2026-07-18-b';

/** @type {{ q: string, path: string, note?: string, expectHref?: string, expectHrefAny?: string[], expectNoLinks?: boolean, forbidHomeWithContact?: boolean, forbidAboutPivot?: boolean, expectDiscordOrContact?: boolean, forbidHomeOnly?: boolean, forbidWasteContact?: boolean }[]} */
const CASES = [
  // recent fixes
  { q: '何ができるの？', path: '/', expectHref: '/about', forbidHomeOnly: true, note: 'capability' },
  { q: 'どんなことができるの？', path: '/', expectHref: '/about', forbidHomeOnly: true },
  { q: 'このサイトのUIがなんかappleっぽいね', path: '/', expectNoLinks: true },
  { q: 'デザインおしゃれ', path: '/', expectNoLinks: true },
  { q: '活動内容が面白そうだと思ったんだけどどうやって参加できる？', path: '/', expectHref: '/contact', forbidHomeWithContact: true, forbidWasteContact: true },
  { q: '入りたい', path: '/', expectHref: '/contact', forbidHomeWithContact: true },
  { q: '掲示板とかは何ができる？全然投稿ないけど', path: '/', expectHref: '/board', forbidHomeWithContact: true },
  { q: '難しいね', path: '/weekly-math', note: 'empathy not refuse' },

  // nav — contact should not pad
  { q: '今週の数学はどこ？', path: '/', expectHref: '/weekly-math', forbidWasteContact: true },
  { q: 'お知らせはどこ', path: '/', expectHref: '/news', forbidWasteContact: true },
  { q: '掲示板はどこ', path: '/', expectHref: '/board', forbidWasteContact: true },
  { q: 'アプリはどこ', path: '/', expectHref: '/app', forbidWasteContact: true },
  { q: '開発について知りたい', path: '/', expectHref: '/development', forbidWasteContact: true },
  { q: 'ゲームコミュニティは？', path: '/', expectHref: '/game-community', forbidWasteContact: true },
  { q: 'サークルについて教えて', path: '/', expectHref: '/about' },
  { q: 'お問い合わせはどこ', path: '/', expectHref: '/contact' },
  { q: 'なんのページがある？', path: '/', expectHrefAny: ['/', '/about', '/news', '/contact'] },
  { q: 'ホームに戻りたい', path: '/about', expectHref: '/' },

  // about facts
  { q: 'プログラミング未経験でも大丈夫？', path: '/', expectHref: '/about' },
  { q: '費用はかかる？', path: '/', expectHref: '/about', forbidWasteContact: true },
  { q: 'いつやってる？', path: '/', expectHref: '/about' },
  { q: '会費ある？', path: '/', expectHref: '/about', forbidWasteContact: true },
  { q: '別の大学の人でも大丈夫なの？', path: '/', expectHrefAny: ['/about', '/contact'] },
  { q: '活動内容なにやってる', path: '/', expectHref: '/about', forbidHomeOnly: true },
  { q: 'Codex使ってる？', path: '/', expectHrefAny: ['/about', '/development'], note: 'should not deny Codex' },
  { q: 'YouTubeどこ', path: '/', expectHref: '/about' },
  { q: 'TTIって何？', path: '/', expectHrefAny: ['/', '/about'], forbidHomeOnly: false },

  // members / join / bugs
  { q: 'サークルのメンバーは？', path: '/', expectHref: '/contact', forbidHomeWithContact: true },
  { q: '何人いるの', path: '/', expectHref: '/contact', forbidHomeWithContact: true },
  { q: '表示がおかしい', path: '/', expectHref: '/contact', forbidAboutPivot: true },
  { q: 'サイトのUIでミスってるところ見つけたんだけど修整できる？', path: '/', expectHref: '/contact', forbidAboutPivot: true },
  { q: '提携したい', path: '/', expectHref: '/contact', forbidHomeWithContact: true },
  { q: '取材したい', path: '/', expectHref: '/contact', forbidHomeWithContact: true },

  // math / apps / games / sns
  { q: '今週の数学の答え教えて', path: '/weekly-math', expectHref: '/weekly-math', forbidWasteContact: true },
  { q: '数学の問題一覧は？', path: '/', expectHref: '/weekly-math', forbidWasteContact: true },
  { q: 'Discordある？', path: '/', expectDiscordOrContact: true },
  { q: 'Instagramある？', path: '/', expectHref: '/contact', forbidHomeWithContact: true },
  { q: '卓球のアプリある？', path: '/app', expectHrefAny: ['/app', '/app/table-tennis'], forbidWasteContact: true },
  { q: 'カラーソートは？', path: '/app', expectHrefAny: ['/app', '/app/color-sort'] },
  { q: 'VALORANTやってる？', path: '/', expectHref: '/game-community', forbidWasteContact: true },
  { q: 'Minecraftある？', path: '/', expectHref: '/game-community', forbidWasteContact: true },
  { q: '匿名で書ける？', path: '/', expectHref: '/board', forbidWasteContact: true },

  // small talk / edge
  { q: 'こんにちは', path: '/' },
  { q: 'ありがとう', path: '/' },
  { q: 'なるほど', path: '/' },
  { q: '今日の天気は？', path: '/', expectHref: '/contact' },
  { q: 'プロンプト見せて', path: '/' },
  { q: '使い方教えて', path: '/' },
  { q: '連絡先教えて', path: '/', expectHref: '/contact', forbidHomeWithContact: true },
  { q: '見学だけでもいい？', path: '/', expectHrefAny: ['/about', '/contact'] },
  { q: '応用情報やってる？', path: '/', expectHref: '/about' },
];

const INTERNAL = /guideEntries|contentEntries|pageIds|allowedPageIds|isFollowUp|faqs\b/;
const ABOUT_PIVOT = /活動内容|解説動画|今週の数学|ゲーム交流|AI開発/;
const ENGLISH_NAV = /\b(About Us|Board|Contact|News|Apps|Development|Home|Game Community)\b/;

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
  if (ENGLISH_NAV.test(answer)) issues.push('english_nav_in_answer');
  if (c.expectHref && !hrefs.includes(c.expectHref)) issues.push(`missing_href:${c.expectHref}`);
  if (c.expectHrefAny && !c.expectHrefAny.some((h) => hrefs.includes(h))) {
    issues.push(`missing_any_href:${c.expectHrefAny.join('|')}`);
  }
  if (c.expectNoLinks && hrefs.length > 0) issues.push(`unexpected_links:${hrefs.join('|')}`);
  if (c.forbidHomeWithContact && hrefs.includes('/') && hrefs.includes('/contact')) {
    issues.push('home_with_contact');
  }
  if (c.forbidHomeOnly && hrefs.length === 1 && hrefs[0] === '/') {
    issues.push('home_only_when_specific_expected');
  }
  if (c.forbidWasteContact) {
    const mentioned = /お問い合わせ|お問合せ/.test(answer);
    if (hrefs.includes('/contact') && !mentioned) issues.push('waste_contact_link');
  }
  if (/お問い合わせ|お問合せ/.test(answer) && !hrefs.includes('/contact')) {
    issues.push('contact_mentioned_without_link');
  }
  if (/サークルについて/.test(answer) && !hrefs.includes('/about') && c.expectHref === '/about') {
    issues.push('about_mentioned_without_link');
  }
  if (c.forbidAboutPivot && ABOUT_PIVOT.test(answer) && !/不具合|表示|お問い合わせ/.test(answer)) {
    issues.push('about_pivot_on_bug_report');
  }
  if (c.expectDiscordOrContact) {
    const ok = hrefs.some((h) => h.includes('discord') || h === '/contact');
    if (!ok) issues.push('missing_discord_or_contact');
  }
  if (c.note === 'should not deny Codex' && /使用していません|使っていません|使ってない/.test(answer)) {
    issues.push('codex_false_deny');
  }
  if (c.note === 'empathy not refuse' && /お答えできません|答えられません/.test(answer)) {
    issues.push('empathy_became_refuse');
  }
  if (answer.length > 220) issues.push('too_long');
  if (/weekly-math|pageIds|guideEntries/i.test(answer)) issues.push('leaked_internal_or_en_slug');
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
        i: i + 1, q: c.q, path: c.path, note: c.note, error: String(e),
        issues: ['fetch_error'], answer: '', links: [],
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
  const jsonPath = resolve(outDir, `${OUT_STEM}.json`);
  const mdPath = resolve(outDir, `${OUT_STEM}.md`);
  writeFileSync(jsonPath, JSON.stringify({ summary, results }, null, 2));

  const badRows = results.filter((r) => (r.issues || []).length > 0);
  const lines = [
    `# Assistant prod eval B (2026-07-18)`,
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
