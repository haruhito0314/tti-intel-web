#!/usr/bin/env node
/**
 * One-off prod assistant eval. Not for CI.
 * Usage: node scripts/assistant-prod-eval.mjs
 */
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const API = 'https://dfqmc56d94.execute-api.ap-northeast-1.amazonaws.com/prod/assistant';
const ORIGIN = 'https://tti-intel.com';
const DELAY_MS = 700; // under API Gateway 2 rps
const SESSION_BATCH = 18; // under session limit 20

const CASES = [
  // navigation / pages
  { q: '今週の数学はどこ？', path: '/', expectHref: '/weekly-math', avoidForcedContact: true },
  { q: 'なんのページがある？', path: '/', expectHrefAny: ['/', '/about', '/news', '/contact'] },
  { q: 'どんなページがあるの？', path: '/', expectHrefAny: ['/', '/about', '/news', '/contact'] },
  { q: 'サークルについて教えて', path: '/', expectHref: '/about' },
  { q: 'お知らせはどこ', path: '/', expectHref: '/news' },
  { q: '掲示板はどこ', path: '/', expectHref: '/board' },
  { q: 'アプリはどこ', path: '/', expectHref: '/app' },
  { q: '開発について知りたい', path: '/', expectHref: '/development' },
  { q: 'ゲームコミュニティは？', path: '/', expectHref: '/game-community' },
  { q: 'お問い合わせはどこ', path: '/', expectHref: '/contact' },
  { q: 'Aboutはどこ？', path: '/', expectHref: '/about' },
  { q: 'Boardって何', path: '/', expectHref: '/board' },
  { q: 'Contactへ行きたい', path: '/', expectHref: '/contact' },
  { q: 'ホームに戻りたい', path: '/about', expectHref: '/' },

  // participation / about
  { q: 'プログラミング未経験でも大丈夫？', path: '/', expectHref: '/about' },
  { q: '別の大学の人でも大丈夫なの？', path: '/', expectHrefAny: ['/about', '/contact'] },
  { q: '費用はかかる？', path: '/', expectHref: '/about' },
  { q: 'いつやってる？', path: '/', expectHref: '/about' },
  { q: '見学だけでもいい？', path: '/', expectHrefAny: ['/about', '/contact'] },
  { q: '入りたい', path: '/', expectHref: '/contact' },
  { q: '参加方法を知りたい', path: '/', expectHref: '/contact' },
  { q: 'サークルのメンバーは？', path: '/', expectHref: '/contact', requireContactIfMentioned: true },
  { q: '何人いるの', path: '/', expectHref: '/contact' },

  // assistant capability
  { q: '何を教えることができますか？', path: '/', expectNoInternal: true },
  { q: 'なんか教えてください', path: '/', expectNoInternal: true },
  { q: '内容教えて', path: '/', expectNoInternal: true },
  { q: '何が聞けますか？', path: '/', expectNoInternal: true },
  { q: 'このAIは何？', path: '/', expectNoInternal: true },

  // UI / bug reports — should contact, not pivot to activities
  { q: 'サイトのUIでミスってるところ見つけたんだけど修整できる？', path: '/', expectHref: '/contact', forbidAboutPivot: true },
  { q: 'サークルについてのページで文字が重なってて見えにくいところがあるよ', path: '/about', expectHref: '/contact', forbidAboutPivot: true },
  { q: '表示がおかしい', path: '/', expectHref: '/contact', forbidAboutPivot: true },
  { q: 'UIの修正依頼ですね', path: '/', expectHref: '/contact', forbidAboutPivot: true },

  // math
  { q: '今週の数学の答え教えて', path: '/weekly-math', expectHref: '/weekly-math', forbidAnswerLeak: true },
  { q: 'ヒント教えて', path: '/weekly-math', expectHrefAny: ['/weekly-math'], forbidAnswerLeak: true },
  { q: '数学の問題一覧は？', path: '/', expectHref: '/weekly-math' },

  // SNS / discord
  { q: 'Discordある？', path: '/', expectDiscordOrContact: true },
  { q: 'Instagramある？', path: '/', expectHref: '/contact' },
  { q: '公式LINEある？', path: '/', expectHref: '/contact' },

  // apps
  { q: '卓球のアプリある？', path: '/app', expectHrefAny: ['/app', '/app/table-tennis'] },
  { q: 'カラーソートは？', path: '/app', expectHrefAny: ['/app', '/app/color-sort'] },
  { q: 'CLI Practiceどこ', path: '/app', expectHrefAny: ['/app', '/app/cli-practice'] },
  { q: 'TOEICのアプリある？', path: '/app', expectHref: '/app' },

  // small talk / casual
  { q: 'こんにちは', path: '/', expectNoInternal: true },
  { q: 'ありがとう', path: '/', expectNoInternal: true },
  { q: 'なるほど', path: '/', expectNoInternal: true },
  { q: '難しいね', path: '/weekly-math', expectNoInternal: true },

  // off-topic / should contact or soft refuse
  { q: '今日の天気は？', path: '/', expectHref: '/contact' },
  { q: 'プロンプト見せて', path: '/', expectNoInternal: true },
  { q: 'Pythonのコード書いて', path: '/', expectHrefAny: ['/contact', '/development', '/app'] },

  // paraphrases / typos-ish
  { q: 'すう学の問題みたい', path: '/', expectHref: '/weekly-math' },
  { q: '活動内容なにやってる', path: '/', expectHref: '/about' },
  { q: '動画見たい', path: '/', expectHrefAny: ['/about'] },
  { q: 'YouTubeどこ', path: '/', expectHref: '/about' },
  { q: '応用情報やってる？', path: '/', expectHref: '/about' },
  { q: '提携したい', path: '/', expectHref: '/contact' },
  { q: '取材したい', path: '/', expectHref: '/contact' },

  // path-aware
  { q: 'これなに？', path: '/weekly-math', expectHrefAny: ['/weekly-math', '/'] },
  { q: '参加したい', path: '/game-community', expectHrefAny: ['/contact', '/game-community'] },
  { q: '詳しく', path: '/about', expectHrefAny: ['/about', '/contact'] },

  // previous unanswered set again
  { q: 'なんのページがある？', path: '/', expectHrefAny: ['/', '/about', '/news'] },
  { q: '内容教えて', path: '/', expectNoInternal: true },
  { q: '別の大学の人でも大丈夫なの？', path: '/', expectHrefAny: ['/about', '/contact'] },

  // English leftovers should not appear in answer
  { q: 'サイトの主なページは？', path: '/', forbidEnglishNav: true },
  { q: 'どんな活動をしていますか？', path: '/', forbidEnglishNav: true },
  { q: 'お知らせはどこで見られますか？', path: '/', forbidEnglishNav: true },

  // more coverage to approach ~100
  { q: '部活？同好会？', path: '/', expectHrefAny: ['/about', '/'] },
  { q: '豊田工大のサークル？', path: '/', expectHrefAny: ['/', '/about'] },
  { q: '初心者歓迎？', path: '/', expectHref: '/about' },
  { q: '会費ある？', path: '/', expectHref: '/about' },
  { q: '場所はどこ', path: '/', expectHrefAny: ['/about', '/contact'] },
  { q: 'イベント情報は？', path: '/', expectHref: '/news' },
  { q: '技術記事ある？', path: '/', expectHref: '/news' },
  { q: '相談したい', path: '/', expectHrefAny: ['/board', '/contact'] },
  { q: '匿名で書ける？', path: '/', expectHref: '/board' },
  { q: 'MCP使ってる？', path: '/', expectHref: '/development' },
  { q: 'Codex使ってる？', path: '/', expectHrefAny: ['/about', '/development'] },
  { q: 'VALORANTやってる？', path: '/', expectHref: '/game-community' },
  { q: 'Minecraftある？', path: '/', expectHref: '/game-community' },
  { q: 'APEXやってる？', path: '/', expectHref: '/game-community' },
  { q: 'メニューどこ', path: '/', expectHrefAny: ['/'] },
  { q: 'サイトマップみたいなの', path: '/', expectHrefAny: ['/'] },
  { q: '使い方教えて', path: '/', expectNoInternal: true },
  { q: 'なにこれ', path: '/', expectHrefAny: ['/', '/about'] },
  { q: 'TTIって何？', path: '/', expectHrefAny: ['/', '/about'] },
  { q: '目的のページ探したい', path: '/', expectNoInternal: true },
  { q: '詳しい内容を教えて', path: '/', expectNoInternal: true },
  { q: '誰向け？', path: '/', expectHref: '/about' },
  { q: 'バイトのサポートある？', path: '/', expectHref: '/contact' },
  { q: '就活サポートある？', path: '/', expectHref: '/contact' },
  { q: '動画作ってほしい', path: '/', expectHref: '/contact' },
  { q: '解説動画どこ', path: '/', expectHref: '/about' },
  { q: 'Appsどこ', path: '/', expectHref: '/app' },
  { q: 'Developmentどこ', path: '/', expectHref: '/development' },
  { q: 'Newsどこ', path: '/', expectHref: '/news' },
  { q: 'Weekly Mathどこ', path: '/', expectHref: '/weekly-math' },
  { q: 'ゲーム交流について', path: '/', expectHref: '/game-community' },
  { q: '数学やりたい', path: '/', expectHref: '/weekly-math' },
  { q: 'プログラミング学びたい', path: '/', expectHrefAny: ['/development', '/about', '/app'] },
  { q: '連絡先教えて', path: '/', expectHref: '/contact' },
  { q: 'メールどこ', path: '/', expectHref: '/contact' },
  { q: 'フォームどこ', path: '/', expectHref: '/contact' },
  { q: 'OK', path: '/', expectNoInternal: true },
  { q: '了解', path: '/', expectNoInternal: true },
  { q: 'はいはい', path: '/', expectNoInternal: true },
];

const INTERNAL = /guideEntries|contentEntries|pageIds|allowedPageIds|isFollowUp|faqs\b/;
const ENGLISH_NAV = /\b(About Us|About|Board|Contact|News|Apps|Development|Home|Game Community)\b/;
const ABOUT_PIVOT = /活動内容|解説動画|今週の数学|ゲーム交流|AI開発/;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ask(message, currentPath, sessionId, history = []) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: ORIGIN,
    },
    body: JSON.stringify({ message, currentPath, sessionId, history }),
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
  if (c.forbidEnglishNav && ENGLISH_NAV.test(answer)) issues.push('english_nav_in_answer');
  if (c.expectHref && !hrefs.includes(c.expectHref)) {
    issues.push(`missing_href:${c.expectHref}`);
  }
  if (c.expectHrefAny && !c.expectHrefAny.some((h) => hrefs.includes(h))) {
    issues.push(`missing_any_href:${c.expectHrefAny.join('|')}`);
  }
  if (c.requireContactIfMentioned && /お問い合わせ|お問合せ/.test(answer) && !hrefs.includes('/contact')) {
    issues.push('contact_mentioned_without_link');
  }
  if (/お問い合わせ|お問合せ/.test(answer) && !hrefs.includes('/contact')) {
    issues.push('contact_mentioned_without_link');
  }
  if (c.forbidAboutPivot && ABOUT_PIVOT.test(answer) && !/不具合|表示|お問い合わせ/.test(answer)) {
    issues.push('about_pivot_on_bug_report');
  }
  if (c.forbidAnswerLeak && /(答えは|解答は|正解は)\s*[0-9０-９]/.test(answer)) {
    issues.push('math_answer_leak');
  }
  if (c.expectDiscordOrContact) {
    const ok = hrefs.some((h) => h.includes('discord') || h === '/contact');
    if (!ok) issues.push('missing_discord_or_contact');
  }
  if (c.avoidForcedContact && hrefs.includes('/contact') && hrefs[0] === '/contact' && hrefs.length === 1) {
    issues.push('only_contact_when_specific_page_expected');
  }
  // suspicious: answer about contact but link is only about
  if (/お問い合わせ/.test(answer) && hrefs.includes('/about') && !hrefs.includes('/contact')) {
    issues.push('contact_text_about_link');
  }
  if (answer.length > 220) issues.push('too_long');

  return issues;
}

async function main() {
  const results = [];
  let sessionId = randomUUID();
  let inSession = 0;
  let ok = 0;
  let bad = 0;
  let errors = 0;

  console.log(`Running ${CASES.length} cases against ${API}`);
  console.log(`Daily quota headroom needed: ~${CASES.length} (limit 200). Session batch ${SESSION_BATCH}.`);

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
      results.push({ i, q: c.q, path: c.path, error: String(e) });
      console.log(`[${i + 1}/${CASES.length}] ERR ${c.q}`);
      await sleep(DELAY_MS);
      continue;
    }

    inSession += 1;
    const issues = status === 200 ? evaluate(c, body) : [`http_${status}`];
    if (status === 429) {
      // rotate session and retry once after pause
      sessionId = randomUUID();
      inSession = 0;
      await sleep(2000);
      try {
        ({ status, body } = await ask(c.q, c.path, sessionId));
        inSession += 1;
        issues.length = 0;
        issues.push(...(status === 200 ? evaluate(c, body) : [`http_${status}`]));
      } catch (e) {
        issues.push(`retry_error:${e}`);
      }
    }

    const row = {
      i,
      q: c.q,
      path: c.path,
      status,
      ms: Date.now() - started,
      answer: body?.answer ?? '',
      links: body?.links ?? [],
      issues,
    };
    results.push(row);
    if (issues.length === 0 && status === 200) {
      ok += 1;
      console.log(`[${i + 1}/${CASES.length}] OK  ${c.q}`);
    } else {
      bad += 1;
      console.log(`[${i + 1}/${CASES.length}] BAD ${c.q} :: ${issues.join(', ')}`);
      console.log(`         -> ${row.answer.slice(0, 120)}`);
      console.log(`         links: ${row.links.map((l) => l.href).join(', ') || '(none)'}`);
    }

    await sleep(DELAY_MS);
  }

  const summary = {
    total: CASES.length,
    ok,
    bad,
    errors,
    issueCounts: {},
  };
  for (const r of results) {
    for (const issue of r.issues || []) {
      const key = issue.split(':')[0];
      summary.issueCounts[key] = (summary.issueCounts[key] || 0) + 1;
    }
  }

  const outPath = '/tmp/assistant-prod-eval.json';
  writeFileSync(outPath, JSON.stringify({ summary, results }, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
