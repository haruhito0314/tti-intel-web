# Public Page Responsive UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** HomeからContact・Adminまでの公開体験を、参加導線と技術紹介を同格にしながら、PC・スマートフォンで情報順序、操作対象、状態表示、アクセシビリティが一貫する形へ更新する。

**Architecture:** Site Shell and UI Foundationが提供するsemantic UI primitivesを各ページへ適用し、ページ固有ロジックやFirebase schemaは維持する。ページ単位のfocused component testsで視線順序と操作契約を固定し、最後に全ルートを4 viewport・2 theme・Reduced Motionで横断確認する。

**Tech Stack:** React 19、TypeScript 5.9、React Router 7、Tailwind CSS 4、Firebase 12、KaTeX、Vitest 4、Testing Library

## Global Constraints

- 先に `2026-07-14-site-shell-ui-foundation.md` のhandoff gateを終了コード0にする。
- 共有する`index.css`とUI call siteの衝突を避けるため、全体実行順は Foundation → Public Pages → Development WebGL とする。
- 共通 `ButtonLink`, `InteractiveCard`, `Card`, `LoadingState`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `Input`, `Textarea` を再実装しない。
- Firebase collection、document shape、認証、route path、投稿/管理workflowを変更しない。
- static cardにhover lift・pointer・矢印を付けない。全体リンクcard内に別のbutton/linkを置かない。
- PCの情報量を単純に隠すのではなく、スマホのDOM順序と段組みを読みやすくする。
- 320pxで横スクロールを発生させない。数式だけは自身の領域内で横スクロールを許可する。
- 主要操作は44px以上、入力文字は16px以上、色だけで状態を伝えない。
- Developmentの実装・CSSはこの計画では変更しない。

---

### Task 1: Homeの2目的CTAとタッチ向けカルーセルを実装する

**Files:**
- Modify: `frontend/src/pages/Home.tsx:234-294,389-403,412-534,668-684`
- Modify: `frontend/src/index.css:1623-1636`
- Create: `frontend/src/pages/Home.test.tsx`

**Interfaces:**
- Consumes: `ButtonLink`
- Produces: hero links `/about`「サークルについて」・`/development`「開発を見る」
- Preserves: page下部 `/contact` CTA
- Produces: carousel control `aria-controls` と44px hit area

- [ ] **Step 1: CTAとcarouselの失敗テストを書く**

```tsx
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
Element.prototype.scrollBy = vi.fn();
render(<MemoryRouter><Home /></MemoryRouter>);
expect(screen.getByRole('link', { name: 'サークルについて' })).toHaveAttribute('href', '/about');
expect(screen.getByRole('link', { name: '開発を見る' })).toHaveAttribute('href', '/development');
expect(screen.getByRole('link', { name: '入会について問い合わせる' })).toHaveAttribute('href', '/contact');
for (const name of ['サークルについて', '開発を見る', '入会について問い合わせる']) {
  expect(screen.getByRole('link', { name }).querySelector('button')).toBeNull();
}
for (const name of ['前の動画', '次の動画']) {
  const control = screen.getByRole('button', { name });
  expect(control).toHaveAttribute('aria-controls', 'home-video-carousel');
  expect(control).toHaveClass('min-h-11', 'min-w-11');
}
```

- [ ] **Step 2: testが旧Contact hero CTA・小さいcontrolで失敗することを確認する**

Run: `cd frontend && npm test -- src/pages/Home.test.tsx`

- [ ] **Step 3: Link内ButtonをButtonLinkへ置換する**

heroの2リンクだけを `/about`, `/development` へ変更する。page下部のContact CTAもLink+Buttonの入れ子を `ButtonLink` へ変えるが、文言と行き先は保つ。

- [ ] **Step 4: carouselをタッチ操作へ合わせる**

scrollerへ `id="home-video-carousel"`、操作へ「前の動画」「次の動画」のラベルを付ける。矢印はmobileで常時見え、端でdisabled状態を色以外でも示す。`.home-page button { min-height: 36px !important; }` を削除する。

- [ ] **Step 5: focused testを通しコミットする**

```bash
cd frontend
npm test -- src/pages/Home.test.tsx src/pages/NewsAnnouncement.test.tsx
npx eslint src/pages/Home.tsx src/pages/Home.test.tsx
npm run build
git add src/pages/Home.tsx src/pages/Home.test.tsx src/index.css
git commit -m "Balance Home conversion and development paths"
```

---

### Task 2: Aboutに活動ジャンプ、通常フロー、FAQ semanticsを追加する

**Files:**
- Modify: `frontend/src/pages/About.tsx:8-86,128-197,199-257,259-295`
- Modify: `frontend/src/pages/AboutActivityCards.test.tsx`
- Modify: `frontend/src/index.css:643-946`

**Interfaces:**
- Produces: `type ActivityAnchor = 'activity-video' | 'activity-development' | 'activity-game-community' | 'activity-weekly-math'`
- Produces: `<nav aria-label="活動へ移動">`
- Produces: event target `#next-event` と前後2リンク
- Produces: FAQ button/answer ID pair

- [ ] **Step 1: DOM順序とFAQを要求する失敗テストを追加する**

```tsx
const activityNav = screen.getByRole('navigation', { name: '活動へ移動' });
expect(within(activityNav).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual([
  '#activity-video', '#activity-development', '#activity-game-community', '#activity-weekly-math',
]);
const eventLinks = screen.getAllByRole('link', { name: '次回イベントを見る' });
const activities = screen.getByRole('region', { name: '活動紹介' });
expect(eventLinks).toHaveLength(2);
expect(eventLinks[0].compareDocumentPosition(activities) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
expect(activities.compareDocumentPosition(eventLinks[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
const faq = screen.getByRole('button', { name: /費用はかかりますか/ });
expect(faq).toHaveAttribute('aria-expanded', 'false');
await user.click(faq);
expect(faq).toHaveAttribute('aria-expanded', 'true');
expect(document.getElementById(faq.getAttribute('aria-controls')!)).toBeVisible();
```

- [ ] **Step 2: testがjump nav不在とFAQ aria不足で失敗することを確認する**

Run: `cd frontend && npm test -- src/pages/AboutActivityCards.test.tsx`

- [ ] **Step 3: activity dataへidを追加しjump navとevent linksを実装する**

4 activity articleへ安定IDを付ける。hero直後にjump nav、card群直前・直後に `#next-event` linkを一つずつ置き、event sectionへ対応IDを付ける。

- [ ] **Step 4: mobileを通常フローへ変更する**

PCは画像とcopyをCSS gridで重ねる現行表現を維持する。`max-width: 640px`では固定height・absolute copyを解除し、copy→actions→imageの通常flowにする。copy側だけがresponsive paddingを所有し、actionを44px以上にする。

- [ ] **Step 5: FAQ semanticsを実装する**

各buttonへ `id`, `aria-expanded`, `aria-controls`、answerへ `id`, `role="region"`, `aria-labelledby` を付ける。閉じた回答はDOMから外すか`hidden`にする。

- [ ] **Step 6: focused testを通しコミットする**

```bash
cd frontend
npm test -- src/pages/AboutActivityCards.test.tsx
npx eslint src/pages/About.tsx src/pages/AboutActivityCards.test.tsx
npm run build
git add src/pages/About.tsx src/pages/AboutActivityCards.test.tsx src/index.css
git commit -m "Improve About activity navigation and flow"
```

---

### Task 3: Game Communityの参加導線とstatic game cardsを実装する

**Files:**
- Modify: `frontend/src/pages/GameCommunity.tsx:1-17,193-202,258-286,404-423`
- Modify: `frontend/src/index.css:3928-3957,4323-4432,4836-4877`
- Create: `frontend/src/pages/GameCommunity.test.tsx`

**Interfaces:**
- Consumes: `ButtonLink`, `siteConfig.social.discord.url`
- Produces: hero and repeat CTA pairs
- Guarantees: Featured Gamesは非interactive `<article>`

- [ ] **Step 1: hero CTAとstatic cardの失敗テストを書く**

```tsx
vi.mock('@/hooks/useGameCommunityAnimations', () => ({
  useGameCommunityAnimations: () => undefined,
}));
render(<MemoryRouter><GameCommunity /></MemoryRouter>);
const hero = screen.getByRole('region', { name: 'ゲーム交流の紹介' });
const join = screen.getByRole('region', { name: 'ゲーム交流に参加' });
for (const region of [hero, join]) {
  expect(within(region).getByRole('link', { name: 'Discordに参加' })).toBeInTheDocument();
  expect(within(region).getByRole('link', { name: '活動について問い合わせる' })).toBeInTheDocument();
}
for (const title of ['VALORANT', 'APEX LEGENDS', 'Minecraft']) {
  const card = screen.getByRole('heading', { name: title }).closest('article')!;
  expect(within(card).queryByRole('link')).toBeNull();
  expect(within(card).queryByRole('button')).toBeNull();
  expect(card.querySelector('.game-featured-arrow')).toBeNull();
}
```

- [ ] **Step 2: testがhero CTA不在と矢印markupで失敗することを確認する**

Run: `cd frontend && npm test -- src/pages/GameCommunity.test.tsx`

- [ ] **Step 3: CTAをheroと下部へ実装する**

Discordは外部 `ButtonLink href` + `target="_blank" rel="noopener noreferrer"`、問い合わせは内部 `ButtonLink to="/contact"` とする。

- [ ] **Step 4: static cardの誤誘導を除く**

arrow markup、transform/box-shadow hover、pointer cursorを削除する。装飾的な色と画像は維持し、focus stylingは付けない。

- [ ] **Step 5: focused testを通しコミットする**

```bash
cd frontend
npm test -- src/pages/GameCommunity.test.tsx
npx eslint src/pages/GameCommunity.tsx src/pages/GameCommunity.test.tsx
npm run build
git add src/pages/GameCommunity.tsx src/pages/GameCommunity.test.tsx src/index.css
git commit -m "Clarify Game Community actions and cards"
```

---

### Task 4: Weekly Mathを要約・明示action・共通状態へ更新する

**Files:**
- Modify: `frontend/src/lib/weeklyMathDisplay.ts:1-12`
- Create: `frontend/src/lib/weeklyMathDisplay.test.ts`
- Modify: `frontend/src/components/MathMarkdown.tsx:9-29,62-64`
- Create: `frontend/src/components/MathMarkdown.test.tsx`
- Modify: `frontend/src/pages/WeeklyMath.tsx:15-45,66-127`
- Modify: `frontend/src/pages/WeeklyMathDetail.tsx:54-110,113-162`
- Modify: `frontend/src/pages/WeeklyMathSolution.tsx:59-137,163-210`
- Create: `frontend/src/pages/WeeklyMath.test.tsx`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Produces: `toWeeklyMathPreviewText(markdown: string, maxLength = 120): string`
- Produces: `MathMarkdown` root `.math-markdown`
- Consumes: `InteractiveCard actionLabel="問題を開く"`, `LoadingState`, `EmptyState`, `ErrorState`

- [ ] **Step 1: Unicode-safe previewの失敗テストを書く**

```ts
it('returns at most 120 Unicode code points with an ellipsis', () => {
  const result = toWeeklyMathPreviewText(`**問題** ${'あ'.repeat(140)}`);
  expect(Array.from(result)).toHaveLength(120);
  expect(result.endsWith('…')).toBe(true);
});
```

- [ ] **Step 2: card action/statusとformula overflowの失敗テストを書く**

```tsx
vi.mock('@/lib/weeklyMath', () => ({
  getWeeklyMathList: vi.fn(),
  getDefaultWeeklyMathTemplate: vi.fn(),
}));
expect((await screen.findAllByText('問題を開く')).length).toBeGreaterThan(0);
expect(await screen.findByText(/解答公開中|解答準備中/)).toBeInTheDocument();

const { container } = render(<MathMarkdown>{'$$x^2+y^2=z^2$$'}</MathMarkdown>);
expect(container.querySelector('.math-markdown .katex-display')).not.toBeNull();
expect(container.firstElementChild).toHaveClass('math-markdown');

// In separate tests, render WeeklyMathDetail and WeeklyMathSolution in matching Routes.
const { container: detailDom } = render(<WeeklyMathDetailHarness />);
expect(detailDom.querySelector('a button, button a')).toBeNull();
const { container: solutionDom } = render(<WeeklyMathSolutionHarness />);
expect(solutionDom.querySelector('a button, button a')).toBeNull();
```

- [ ] **Step 3: testsがpreview上限・action・root class不在で失敗することを確認する**

Run:

```bash
cd frontend
npm test -- src/lib/weeklyMathDisplay.test.ts src/components/MathMarkdown.test.tsx src/pages/WeeklyMath.test.tsx
```

- [ ] **Step 4: preview helperとMathMarkdown wrapperを実装する**

Markdown除去後のtextを `Array.from()` で code point単位に切り、超過時は先頭 `maxLength - 1` + `…` を返す。MathMarkdownの通常/エラー両方を `.math-markdown` rootで包み、CSSは `.math-markdown .katex-display { max-width:100%; overflow-x:auto; overflow-y:hidden; }` だけに適用する。

- [ ] **Step 5: list cardとasync statesを実装する**

各問題を `InteractiveCard` にし、title→公開status text→120文字要約→「問題を開く」の順にする。色barは `aria-hidden`。取得failureをstateへ保持し、`reloadKey`を依存に持つPromise loaderをErrorStateのretryで再実行する。空配列は理由と次回更新案内を表示する。

- [ ] **Step 6: detail/solutionのLink内ButtonをButtonLinkへ移す**

戻る、解答、問題へのnavigationだけをButtonLinkへ移し、公開判定やroute生成は変えない。

- [ ] **Step 7: focused testsを通しコミットする**

```bash
cd frontend
npm test -- src/lib/weeklyMathDisplay.test.ts src/components/MathMarkdown.test.tsx src/pages/WeeklyMath.test.tsx
npx eslint src/lib/weeklyMathDisplay.ts src/components/MathMarkdown.tsx src/pages/WeeklyMath.tsx src/pages/WeeklyMathDetail.tsx src/pages/WeeklyMathSolution.tsx
npm run build
git add src/lib/weeklyMathDisplay.ts src/lib/weeklyMathDisplay.test.ts src/components/MathMarkdown.tsx src/components/MathMarkdown.test.tsx src/pages/WeeklyMath.tsx src/pages/WeeklyMathDetail.tsx src/pages/WeeklyMathSolution.tsx src/pages/WeeklyMath.test.tsx src/index.css
git commit -m "Make Weekly Math cards concise and accessible"
```

---

### Task 5: Newsのfilter順序とchronologyを修正する

**Files:**
- Modify: `frontend/src/pages/News.tsx:7-56,78-203`
- Modify: `frontend/src/pages/NewsDetail.tsx:125-145`
- Modify: `frontend/src/pages/NewsAnnouncement.test.tsx`

**Interfaces:**
- Produces: categories derived from posts
- Produces DOM order: search → categories → tags → posts
- Produces: descending `publishedAt` order while pinned is label only

- [ ] **Step 1: category・DOM順・日付順の失敗テストを追加する**

```tsx
render(<MemoryRouter><News /></MemoryRouter>);
expect(screen.queryByRole('button', { name: 'イベント' })).not.toBeInTheDocument();
expect(screen.getByRole('searchbox', { name: 'ニュースを検索' })).toBeInTheDocument();
const tags = screen.getByRole('region', { name: 'タグ' });
const posts = screen.getByRole('region', { name: '記事一覧' });
const search = screen.getByRole('searchbox', { name: 'ニュースを検索' });
const categories = screen.getByRole('group', { name: 'カテゴリ' });
for (const [before, after] of [[search, categories], [categories, tags], [tags, posts]]) {
  expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}
const links = within(posts).getAllByRole('link');
expect(links[0]).toHaveAccessibleName(/Web開発をゼロから/);
expect(within(posts).getByText('固定')).toBeInTheDocument();
```

- [ ] **Step 2: testが空category・無label search・旧grid順で失敗することを確認する**

Run: `cd frontend && npm test -- src/pages/NewsAnnouncement.test.tsx`

- [ ] **Step 3: filtersをdata由来へ変更する**

categoriesは `['すべて', ...new Set(posts.map(post => post.category))]`、tagsはpost走査のfirst occurrence順にする。検索は `Input label="ニュースを検索" labelVisibility="sr-only"`。

- [ ] **Step 4: DOM順とchronologyを実装する**

一つのresponsive grid内でtagsをpostsより先に置き、`lg`だけgrid placementで右columnへ移す。filter後は `publishedAt` descendingにsortし、pinnedは「固定」badgeとしてのみ表示する。0件は理由と`Button`「条件をクリア」を持つ`EmptyState`にし、clickで検索・カテゴリ・タグを初期値へ戻す。testは0件条件を作り、clear後に全記事が戻ることをassertする。

NewsDetailの戻るnavigationに残る`Link > Button`も`ButtonLink`へ置換し、既存testへ `expect(container.querySelector('a button, button a')).toBeNull()` を追加する。

- [ ] **Step 5: focused testを通しコミットする**

```bash
cd frontend
npm test -- src/pages/NewsAnnouncement.test.tsx
npx eslint src/pages/News.tsx src/pages/NewsDetail.tsx src/pages/NewsAnnouncement.test.tsx
npm run build
git add src/pages/News.tsx src/pages/NewsDetail.tsx src/pages/NewsAnnouncement.test.tsx
git commit -m "Reorder News discovery and chronology"
```

---

### Task 6: Appsを2×2にし共通AppToolHeaderを導入する

**Files:**
- Create: `frontend/src/components/apps/AppToolHeader.tsx`
- Create: `frontend/src/components/apps/AppToolHeader.test.tsx`
- Create: `frontend/src/components/apps/index.ts`
- Modify: `frontend/src/pages/AppShowcase.tsx:8-57,101-217`
- Create: `frontend/src/pages/AppShowcase.test.tsx`

**Interfaces:**

```ts
export interface AppToolHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  aside?: ReactNode;
  className?: string;
}

type AppBase = {
  title: string;
  description: string;
  tags: readonly string[];
  images: readonly string[];
};
type AppItem = AppBase & (
  | { status: 'available'; to: string; href?: never }
  | { status: 'available'; href: string; to?: never }
  | { status: 'wip'; to?: never; href?: never }
);
```

`AppToolHeader`のDOM順は `/app`へ戻る→eyebrow→h1→description→action→aside。

- [ ] **Step 1: header orderingとapp availabilityの失敗テストを書く**

```tsx
render(
  <MemoryRouter>
    <AppToolHeader
      eyebrow="TOOL"
      title="卓球対戦表"
      description="対戦を組みます"
      action={<button>生成する</button>}
      aside={<p>12人</p>}
    />
  </MemoryRouter>,
);
const back = screen.getByRole('link', { name: 'Appsへ戻る' });
const eyebrow = screen.getByText('TOOL');
const heading = screen.getByRole('heading', { level: 1, name: '卓球対戦表' });
const description = screen.getByText('対戦を組みます');
const action = screen.getByRole('button', { name: '生成する' });
const aside = screen.getByText('12人');
for (const [before, after] of [[back, eyebrow], [eyebrow, heading], [heading, description], [description, action], [action, aside]]) {
  expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

render(<MemoryRouter><AppShowcase /></MemoryRouter>);
expect(screen.getByTestId('app-grid')).toHaveClass('md:grid-cols-2');
const toeicCard = screen.getByRole('heading', { name: 'TOEIC Practice' }).closest('article')!;
expect(within(toeicCard).queryByRole('link')).toBeNull();
```

- [ ] **Step 2: testsがAppToolHeader不在と3column gridで失敗することを確認する**

Run: `cd frontend && npm test -- src/components/apps/AppToolHeader.test.tsx src/pages/AppShowcase.test.tsx`

- [ ] **Step 3: AppToolHeaderを実装する**

backはButtonLink outline、小さな英字eyebrow、fluid h1、secondary description、action/asideの順にrenderする。header内でactionを生成せずReactNodeを受ける。

- [ ] **Step 4: app dataをdiscriminated unionへ変更する**

TOEICは `status:'wip'` の非interactive Card。3つの公開中internal toolは `InteractiveCard` と `ArrowRight` cueを使う。testで公開中3カードがlink、調整中1カードが非link、internal card内に`ExternalLink` markerがないことをassertする。gridを `md:grid-cols-2` に固定する。

- [ ] **Step 5: focused testsを通しコミットする**

```bash
cd frontend
npm test -- src/components/apps/AppToolHeader.test.tsx src/pages/AppShowcase.test.tsx
npx eslint src/components/apps src/pages/AppShowcase.tsx src/pages/AppShowcase.test.tsx
npm run build
git add src/components/apps src/pages/AppShowcase.tsx src/pages/AppShowcase.test.tsx
git commit -m "Standardize app cards and tool headers"
```

---

### Task 7: Table Tennisをスマホ向けに再階層化する

**Files:**
- Modify: `frontend/src/pages/TableTennisMatchMaker.tsx:211-286,288-388,390-455`
- Create: `frontend/src/pages/TableTennisMatchMaker.test.tsx`

**Interfaces:**
- Consumes: `AppToolHeader`, `Input`, `Button`, `useToast`
- Produces: print action「印刷・PDF保存」
- Produces: round `tablist` / `tab` / `tabpanel`

- [ ] **Step 1: label・print copy・tab semanticsの失敗テストを書く**

```tsx
render(<MemoryRouter><TableTennisMatchMakerPage /></MemoryRouter>);
expect(screen.getByRole('button', { name: '印刷・PDF保存' })).toBeInTheDocument();
expect(screen.getByRole('textbox', { name: '参加人数' })).toHaveClass('text-base');
expect(screen.getByRole('textbox', { name: 'クール数' })).toHaveClass('text-base');
const first = screen.getAllByRole('tab')[0];
expect(first).toHaveAttribute('aria-selected', 'true');
await user.click(screen.getAllByRole('tab')[1]);
expect(screen.getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true');
expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', screen.getAllByRole('tab')[1].id);
await user.keyboard('{ArrowLeft}{Home}{End}');
expect(screen.getAllByRole('tab').filter(tab => tab.tabIndex === 0)).toHaveLength(1);
```

- [ ] **Step 2: testが旧PDF文言とround button semanticsで失敗することを確認する**

Run: `cd frontend && npm test -- src/pages/TableTennisMatchMaker.test.tsx`

- [ ] **Step 3: AppToolHeaderとresponsive controlsを実装する**

動的人数をh1から外し、人数/クール数はheader後のcontrolsへ置く。actionを説明後へ渡し、phoneではtitle/action、inputs、history actionsを縦積みにする。既存の`type="text" inputMode="numeric"` sanitizeを保ち、shared Inputのlabelと`text-base`以上を使う。

- [ ] **Step 4: round tabsとToastを実装する**

各tabへ安定ID、`aria-selected`, `aria-controls`, roving `tabIndex`。ArrowLeft/ArrowRight/Home/Endでfocusとselectionを移す。active contentへ `role="tabpanel"`, `aria-labelledby`。popup blockedの `alert()` をerror Toastへ変える。

- [ ] **Step 5: focused testを通しコミットする**

```bash
cd frontend
npm test -- src/pages/TableTennisMatchMaker.test.tsx
npx eslint src/pages/TableTennisMatchMaker.tsx src/pages/TableTennisMatchMaker.test.tsx
npm run build
git add src/pages/TableTennisMatchMaker.tsx src/pages/TableTennisMatchMaker.test.tsx
git commit -m "Improve table tennis controls on mobile"
```

---

### Task 8: Color Sortへ非色覚cueと読み上げ状態を追加する

**Files:**
- Modify: `frontend/src/pages/ColorSortPuzzle.tsx:7-40,457-499,502-605,636-740`
- Create: `frontend/src/pages/ColorSortPuzzle.test.tsx`

**Interfaces:**

```ts
type ColorMeta = { label: string; symbol: string };
export type ColorToken = 'sky' | 'mint' | 'coral' | 'sun' | 'violet' | 'rose';
export const COLOR_META: Record<ColorToken, ColorMeta>;
```

- Produces: bottle accessible name = index + bottom-to-top contents + selected/valid-target state
- Produces: `aria-pressed` selection, visible unique symbols, polite message region

- [ ] **Step 1: unique metadataとbottle stateの失敗テストを書く**

```tsx
expect(new Set(Object.values(COLOR_META).map(meta => meta.symbol)).size).toBe(Object.keys(COLOR_META).length);
render(<MemoryRouter><ColorSortPuzzlePage /></MemoryRouter>);
const source = screen.getAllByRole('button', { name: /ボトル 1/ })[0];
expect(source).toHaveAccessibleName(/下から/);
await user.click(source);
expect(source).toHaveAttribute('aria-pressed', 'true');
expect(screen.getAllByRole('button', { name: /注ぎ先に選べます/ }).length).toBeGreaterThan(0);
expect(document.querySelectorAll('[data-layer-symbol]').length).toBeGreaterThan(0);
```

- [ ] **Step 2: testがcolor-only stateで失敗することを確認する**

Run: `cd frontend && npm test -- src/pages/ColorSortPuzzle.test.tsx`

- [ ] **Step 3: COLOR_METAとvisible symbolsを実装する**

全ColorTokenに日本語labelと一意の短いsymbolを定義する。液体layer内にsymbolを表示し、液体色・装飾span自体は `aria-hidden`。board近くにcompact legendを置き、testで各visible symbolがlegend内の対応labelと一対一になることをassertする。

- [ ] **Step 4: bottle semanticsとmessage wrappingを実装する**

各bottle buttonに `aria-pressed`。labelは空/内容、選択中、valid targetを文で連結する。instruction/errorは `role="status" aria-live="polite"`。固定height、`overflow-hidden`, `truncate`を外し全文wrapさせる。AppToolHeaderと44px actionsを適用する。

- [ ] **Step 5: focused testを通しコミットする**

```bash
cd frontend
npm test -- src/pages/ColorSortPuzzle.test.tsx
npx eslint src/pages/ColorSortPuzzle.tsx src/pages/ColorSortPuzzle.test.tsx
npm run build
git add src/pages/ColorSortPuzzle.tsx src/pages/ColorSortPuzzle.test.tsx
git commit -m "Add non-color cues to Color Sort"
```

---

### Task 9: CLI Practiceへstate保持mobile segmentsを追加する

**Files:**
- Modify: `frontend/src/pages/CliPractice.tsx:1-20,38-168`
- Modify: `frontend/src/components/cli-practice/Terminal.tsx:316-412`
- Modify: `frontend/src/components/cli-practice/TextEditor.tsx:95-143`
- Modify: `frontend/src/components/cli-practice/CommandSearch.tsx:40-74`
- Modify: `frontend/src/components/cli-practice/FilePreview.tsx`
- Modify: `frontend/src/components/cli-practice/FileTreePanel.tsx`
- Modify: `frontend/src/components/cli-practice/useTutorialProgress.ts`
- Create: `frontend/src/components/cli-practice/useCliState.ts`
- Modify: `frontend/src/pages/CliPractice.test.tsx`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Produces: `type MobilePanel = 'tutorial' | 'practice' | 'files'`
- Produces: tab labels 教材 / 実践 / ファイル
- Guarantees: 3 panels remain mounted; visibility alone changes

- [ ] **Step 1: tabsとstate保持の失敗テストを書く**

```tsx
expect(screen.getByRole('tablist', { name: '練習領域' })).toBeInTheDocument();
await user.click(screen.getByRole('tab', { name: '実践' }));
const terminal = screen.getByRole('textbox', { name: 'ターミナル入力' });
await user.type(terminal, 'touch notes.txt{enter}');
await user.click(screen.getByRole('tab', { name: 'ファイル' }));
expect(screen.getByText('notes.txt')).toBeInTheDocument();
await user.click(screen.getByRole('tab', { name: '教材' }));
await user.click(screen.getByRole('tab', { name: '実践' }));
expect(screen.getByText(/touch notes\.txt/)).toBeInTheDocument();
expect(screen.getAllByRole('tabpanel', { hidden: true })).toHaveLength(3);
await user.keyboard('{ArrowLeft}{Home}{End}');
expect(screen.getAllByRole('tab').filter(tab => tab.tabIndex === 0)).toHaveLength(1);
```

- [ ] **Step 2: testがmobile tablist不在で失敗することを確認する**

Run: `cd frontend && npm test -- src/pages/CliPractice.test.tsx`

- [ ] **Step 3: AppToolHeader、sticky progress、tablistを実装する**

current step/progressとtablistを一つのmobile sticky regionとして表示する。3 tabと3 panelをstable IDで接続し、ArrowLeft/ArrowRight/Home/Endのroving focusを実装する。inactive panelはmobileで`hidden`相当のCSSを使うがcomponentをconditional renderせず、desktop `lg`では全panelを3 columnsで表示する。

- [ ] **Step 4: inputsとfocusを修正する**

Terminal input/ghost、TextEditor textarea、CommandSearch inputをmobile 16px以上にする。TextEditorへ `aria-label="ファイルエディター"`、searchへscreen-reader labelを付ける。terminal/editor外枠は内部inputのfocusを拾う `focus-within` ringにする。

既存CLI lint 10件もこのTaskで解消する。

- `Terminal.tsx`と`useTutorialProgress.ts`のrender中ref更新をeffectへ移し、Terminal末尾の`useCliState`を新しい`useCliState.ts`へ移す。
- `TextEditor.tsx`はrender中ref読取をやめ、file/session keyで初期化する`useState`と保存時更新の`savedContent` stateを使う。
- `FilePreview.tsx`はeffect内の同期`setView`を除き、`{ path, view }` stateからpath変更時のactive viewを`preview`として導出する。
- `FileTreePanel.tsx`は4本のeffect内`setExpanded`を除き、cwd ancestorsとinstall flagsから`autoExpanded`を`useMemo`し、manual expanded setとのunionをrender時に使う。

- [ ] **Step 5: focused + existing CLI testsを通しコミットする**

```bash
cd frontend
npm test -- src/pages/CliPractice.test.tsx src/components/cli-practice
npx eslint src/pages/CliPractice.tsx src/components/cli-practice
npm run build
git add src/pages/CliPractice.tsx src/pages/CliPractice.test.tsx src/components/cli-practice src/index.css
git commit -m "Add stateful mobile panels to CLI practice"
```

---

### Task 10: Boardのmetadata、card action、like、状態を分離する

**Files:**
- Create: `frontend/src/components/board/BoardMetadata.tsx`
- Create: `frontend/src/components/board/BoardMetadata.test.tsx`
- Modify: `frontend/src/pages/Board.tsx:33-126,168-299,302-343`
- Modify: `frontend/src/pages/BoardDetail.tsx:41-181,183-253,256-447`
- Create: `frontend/src/pages/Board.test.tsx`
- Create: `frontend/src/pages/BoardDetail.test.tsx`

**Interfaces:**

```ts
interface BoardMetadataProps {
  author: string;
  createdAt: unknown;
  commentCount?: number;
  likeCount?: number;
}
```

- Produces row1: author + nonbreaking `<time>`
- Produces row2: comment + like counts
- Consumes: `InteractiveCard`, `LoadingState`, `EmptyState`, `ErrorState`, `ConfirmDialog`, Toast

Test harnessは実Firebaseへ接続せず、各test fileで次のhoisted mocksを完全に定義する。

```ts
const firebase = vi.hoisted(() => ({
  onSnapshot: vi.fn(), addDoc: vi.fn(), deleteDoc: vi.fn(), updateDoc: vi.fn(),
  collection: vi.fn((...args) => ({ kind: 'collection', args })),
  doc: vi.fn((...args) => ({ kind: 'doc', args })),
  query: vi.fn(value => value), orderBy: vi.fn(), increment: vi.fn(value => value),
  Timestamp: { now: vi.fn(() => ({ toDate: () => new Date('2026-07-14T10:00:00+09:00') })) },
}));
vi.mock('firebase/firestore', () => firebase);
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAdmin: true }) }));
vi.mock('@/hooks/useLikes', () => ({
  useLikes: () => ({ isLiked: vi.fn(() => false), toggleLike: vi.fn() }),
}));
const mockTimestamp = { toDate: () => new Date('2026-07-14T10:00:00+09:00') };
```

`onSnapshot` mockはquery kind/pathごとにthread list、thread document、commentsのsuccess/error callbackを個別に起動し、cleanup functionを返す。

- [ ] **Step 1: metadata structureとinteractive separationの失敗テストを書く**

```tsx
const metadata = render(<BoardMetadata author={'very-long-name'.repeat(8)} createdAt={mockTimestamp} commentCount={2} likeCount={3} />);
expect(metadata.getByTestId('board-meta-primary')).toBeInTheDocument();
expect(metadata.getByTestId('board-meta-social')).toBeInTheDocument();
expect(metadata.getByRole('time')).toHaveClass('whitespace-nowrap');
expect(metadata.getByText(/very-long/)).toHaveClass('min-w-0');

const threadLink = screen.getByRole('link', { name: /投稿タイトル/ });
expect(within(threadLink).queryByRole('button')).toBeNull();
```

- [ ] **Step 2: like/confirm/retryの失敗テストを書く**

```tsx
const like = screen.getByRole('button', { name: 'いいねする（3件）' });
expect(like).toHaveAttribute('aria-pressed', 'false');
await user.click(like);
expect(like).toHaveAttribute('aria-pressed', 'true');

await user.click(screen.getByRole('button', { name: '投稿を削除' }));
expect(screen.getByRole('dialog', { name: '投稿を削除' })).toBeInTheDocument();
expect(deleteDoc).not.toHaveBeenCalled();
```

- [ ] **Step 3: testsが1行metadata・confirm()・nested actionsで失敗することを確認する**

Run: `cd frontend && npm test -- src/components/board/BoardMetadata.test.tsx src/pages/Board.test.tsx src/pages/BoardDetail.test.tsx`

- [ ] **Step 4: BoardMetadataとcard sibling actionsを実装する**

authorは `min-w-0 break-words`、timeは `whitespace-nowrap`。thread navigationは一つのInteractiveCard、admin moderation barはその次のsiblingにしてphoneでwrapする。`preventDefault()` workaroundを削除する。

- [ ] **Step 5: async states、retry、Toast、ConfirmDialogを実装する**

subscription setupにreload keyを依存させ、ErrorState retryでkeyをincrementする。list/detail/commentのloading/empty/errorを共通化。thread/comment deleteはpending targetをstateに入れ、ConfirmDialog confirm時だけ実行する。成功/一般errorはToast、field errorはinput付近。

BoardDetailでは`threadError`と`commentsError`を別state、別ErrorState/retryとして扱い、一方のfailureで他方の取得済みcontentを消さない。戻るnavigationに残る`Link > Button`もButtonLinkへ置換する。

- [ ] **Step 6: Like semanticsとrollbackを実装する**

buttonへ `aria-pressed`、count込みlabel。iconは`aria-hidden`。optimistic update failure時は元のstateへ戻しerror Toastを出す。

- [ ] **Step 7: focused testsを通しコミットする**

```bash
cd frontend
npm test -- src/components/board/BoardMetadata.test.tsx src/pages/Board.test.tsx src/pages/BoardDetail.test.tsx
npx eslint src/components/board src/pages/Board.tsx src/pages/BoardDetail.tsx
npm run build
git add src/components/board src/pages/Board.tsx src/pages/Board.test.tsx src/pages/BoardDetail.tsx src/pages/BoardDetail.test.tsx
git commit -m "Clarify Board metadata and moderation actions"
```

---

### Task 11: Contactへ返信・privacy・required情報を追加する

**Files:**
- Modify: `frontend/src/pages/Contact.tsx:111-205`
- Create: `frontend/src/pages/Contact.test.tsx`

**Interfaces:**
- Produces: trust copy immediately before `<form>`
- Produces: mobile full-width submit action
- Consumes: `useToast`; success is `role="status"`, general submit failure is `role="alert"`

- [ ] **Step 1: copy順序とsubmit targetの失敗テストを書く**

```tsx
vi.mock('@emailjs/browser', () => ({ default: { send: vi.fn() } }));
render(<MemoryRouter><ToastProvider><Contact /></ToastProvider></MemoryRouter>);
const form = screen.getByRole('form', { name: 'お問い合わせフォーム' });
for (const copy of [
  '通常3営業日以内に返信します。',
  '入力情報はお問い合わせへの回答にのみ使用します。',
  '「任意」の表示がない項目は必須です。',
]) {
  const node = screen.getByText(copy);
  expect(node.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}
expect(screen.getByRole('button', { name: '送信する' })).toHaveClass('w-full', 'sm:w-auto');
```

成功testはEmailJS mockをresolveさせ、valid form submit後に`screen.findByRole('status')`へ成功文が出ること、失敗testはrejectさせ`screen.findByRole('alert')`へ一般エラーが出ることをassertする。required/format errorはToastへ出さずfield直下に残ることも確認する。

- [ ] **Step 2: testがtrust copy不在で失敗することを確認する**

Run: `cd frontend && npm test -- src/pages/Contact.test.tsx`

- [ ] **Step 3: compact trust blockとform namingを実装する**

form直前に3文を一つのcompact explanatory blockで表示する。formへaccessible nameを付け、送信buttonをphone full width・44px以上にする。EmailJSの送信契約は変えず、成功はsuccess Toast、一般送信failureはerror Toastへ統一し、field validationは入力直下へ残す。

- [ ] **Step 4: focused testを通しコミットする**

```bash
cd frontend
npm test -- src/pages/Contact.test.tsx
npx eslint src/pages/Contact.tsx src/pages/Contact.test.tsx
npm run build
git add src/pages/Contact.tsx src/pages/Contact.test.tsx
git commit -m "Add trust guidance to Contact form"
```

---

### Task 12: Admin dashboardとmembersを共通UIへ移行する

**Files:**
- Modify: `frontend/src/pages/Admin.tsx:29-98,134-197`
- Modify: `frontend/src/pages/AdminMembers.tsx:53-114,128-270`
- Create: `frontend/src/pages/Admin.test.tsx`
- Create: `frontend/src/pages/AdminMembers.test.tsx`

**Interfaces:**
- Consumes: `InteractiveCard`, `Card`, `ButtonLink`, states, Input, Toast, ConfirmDialog
- Preserves: auth and member Firestore workflow

- [ ] **Step 1: dashboard/link/header/member formの失敗テストを書く**

```tsx
expect(screen.getByTestId('admin-account-row')).toHaveClass('flex-col', 'sm:flex-row');
expect(screen.getByText(mockLongEmail)).toHaveClass('break-all', 'min-w-0');
for (const text of screen.getAllByText(/準備中/)) {
  const card = text.closest('article')!;
  expect(within(card).queryByRole('link')).toBeNull();
}
expect(screen.getByRole('textbox', { name: '管理者メールアドレス' })).toBeInTheDocument();
```

`useAuth`はsigned-out/loading/adminの各状態を返すconfigurable mockにし、AdminMembersではFirestore `getDocs`, `setDoc`, `deleteDoc`, `doc`, `collection` とToastをhoisted mockする。long emailは実際のadmin dataとしてrenderし、deleteはConfirmDialog confirm前後の`deleteDoc` call countで検証する。

- [ ] **Step 2: delete confirmationとretryの失敗テストを書く**

delete button click後、ConfirmDialogが開くまでremove処理を呼ばないこと、自分自身のdeleteはdisabled/inline reasonになること、fetch failureで再試行buttonが出ることをassertする。

- [ ] **Step 3: testsが旧horizontal header・confirm()で失敗することを確認する**

Run: `cd frontend && npm test -- src/pages/Admin.test.tsx src/pages/AdminMembers.test.tsx`

- [ ] **Step 4: Admin dashboardをsemantic cardsへ移す**

account rowはphone縦・sm横、emailはwrap。enabled destinationだけInteractiveCard、disabled cardは静的でhover/cueなし。二重paddingを外しsemantic surface/text tokenへ置換する。

- [ ] **Step 5: AdminMembersのform/states/deleteを移行する**

required email label、phone full-width submit、member cardはidentity/metadata/actionを縦積み可能にする。fetch error + retry、Toast、ConfirmDialogを使う。self delete guardはUIとhandler両方に残す。

- [ ] **Step 6: focused testsを通しコミットする**

```bash
cd frontend
npm test -- src/pages/Admin.test.tsx src/pages/AdminMembers.test.tsx
npx eslint src/pages/Admin.tsx src/pages/AdminMembers.tsx
npm run build
git add src/pages/Admin.tsx src/pages/Admin.test.tsx src/pages/AdminMembers.tsx src/pages/AdminMembers.test.tsx
git commit -m "Apply responsive shared UI to admin pages"
```

---

### Task 13: Admin Weekly Mathのmobile action群と確認Dialogを修正する

**Files:**
- Modify: `frontend/src/pages/AdminWeeklyMath.tsx:517-681,685-815`
- Modify: `frontend/src/pages/AdminWeeklyMathPreview.tsx:74-105,118-320,322-419`
- Create: `frontend/src/pages/AdminWeeklyMathResponsive.test.tsx`

**Interfaces:**
- Consumes: ButtonLink, Input, ConfirmDialog, semantic surface tokens
- Preserves: weekly-math create/edit/publish/delete workflow

- [ ] **Step 1: search/action size/confirmの失敗テストを書く**

```tsx
expect(screen.getByRole('searchbox', { name: '週を検索' })).toBeInTheDocument();
for (const action of screen.getAllByRole('button')) {
  expect(action).not.toHaveClass('h-8');
}
for (const action of screen.getAllByRole('button', { name: /保存|公開|編集|削除|プレビュー/ })) {
  expect(action).toHaveClass('min-h-11');
}
await user.click(screen.getByRole('button', { name: /問題を削除/ }));
expect(screen.getByRole('dialog', { name: /問題を削除/ })).toBeInTheDocument();
expect(deleteWeeklyMath).not.toHaveBeenCalled();
```

- [ ] **Step 2: testがsearch label・small actions・window.confirmで失敗することを確認する**

Run: `cd frontend && npm test -- src/pages/AdminWeeklyMathResponsive.test.tsx`

- [ ] **Step 3: navigation、search、responsive groupsを移行する**

Link+ButtonをButtonLinkへ置換。searchへsr-only label。header、latest rows、publish actions、editor/preview actionsを320pxで別groupにwrapし、saveをphone full widthにする。`h-8`を除く。

- [ ] **Step 4: surface tokenとConfirmDialogを適用する**

未定義 `var(--surface)` を `var(--surface-inset)`へ変更。Preview deletionをpending week state + ConfirmDialogへ移す。MathMarkdownの数式overflowはTask 4の共通fixを利用する。

- [ ] **Step 5: focused testを通しコミットする**

```bash
cd frontend
npm test -- src/pages/AdminWeeklyMathResponsive.test.tsx
npx eslint src/pages/AdminWeeklyMath.tsx src/pages/AdminWeeklyMathPreview.tsx
npm run build
git add src/pages/AdminWeeklyMath.tsx src/pages/AdminWeeklyMathPreview.tsx src/pages/AdminWeeklyMathResponsive.test.tsx
git commit -m "Improve Weekly Math admin responsiveness"
```

---

### Task 14: 公開ページ全体を自動・ブラウザ検証する

**Files:**
- Modify only if verification exposes a regression in files already listed above

- [ ] **Step 1: full automated gateを実行する**

```bash
cd frontend
npm test -- --run
npm run build
npx eslint src/pages src/components/apps src/components/board src/components/cli-practice src/components/MathMarkdown.tsx src/lib/weeklyMathDisplay.ts
```

Expected: 全コマンド終了コード0。既存テストを削除・skipして通さない。旧Development filesはこのscoped lintへ含めず、次のWebGL計画で置換後にsite-wide lintを実行する。

- [ ] **Step 2: 4 viewportをbrowserで確認する**

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5176
```

対象: `/`, `/about`, `/game-community`, `/weekly-math`, 一覧から遷移する`/weekly-math/:weekKey`, `/weekly-math/:weekKey/solution`, `/news`, `/news/web-development-tutorial-released`, `/app`, `/app/table-tennis`, `/app/color-sort`, `/app/cli-practice`, `/board`, 一覧から遷移する`/board/:id`, `/contact`, `/admin`, `/admin/members`, `/admin/weekly-math`, `/admin/weekly-math/preview`, `/not-found-browser-check`の404。

| Viewport | Theme / Mode | Gate |
| --- | --- | --- |
| 1440×1000 | light / dark | desktop hierarchy、2×2 Apps、3-column CLI |
| 1024×768 | light / dark | heading/nav collisionなし、cards均衡 |
| 390×844 | light / dark | mobile order、44px targets、forms 16px |
| 320×700 | light / Reduced Motion | no horizontal overflow、text wrapping |

- [ ] **Step 3: 操作flowを確認する**

Home carousel、About anchors/FAQ、News filters、Table tabs、Color Sort selection/invalid reason、CLI tutorial/terminal/file state保持、Board long author/like/admin/delete、Contact validation、signed-in Admin actionsをkeyboardだけでも実行する。

各routeでbrowser consoleから次をassertする。

```js
document.documentElement.scrollWidth <= window.innerWidth;
document.querySelectorAll('a button, button a, a a, button button').length === 0;
```

320pxでは主要actionの`getBoundingClientRect()`がwidth/heightとも44px以上であることを確認する。

- [ ] **Step 4: 最終差分を確認する**

```bash
git diff --check
git status --short
```

Expected: whitespace errorなし、対象外schema/route/Development差分なし。
