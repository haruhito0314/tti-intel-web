# Site Shell and UI Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 初回スプラッシュを維持したまま、全ルートが共有するナビゲーション、Footer、操作部品、状態表示、フォーム、フォーカス管理、色・文字の基盤をPC・スマートフォン双方で統一する。

**Architecture:** `siteConfig` を主要導線と活動導線の唯一の情報源にし、`Layout` がスキップリンク、ルートフォーカス、Header、main、Footerを所有する。見た目を共有するボタンとリンクは別のネイティブ要素として実装し、カード・Dialog・フォーム・状態表示は小さな型付きUI primitiveへ集約する。初回スプラッシュは専用ゲートへ分離し、表示中だけ背後のアプリを `inert` にする。

**Tech Stack:** React 19、TypeScript 5.9、React Router 7、Tailwind CSS 4、CSS、Vitest 4、Testing Library

## Global Constraints

- 初回スプラッシュの画像、色、最低表示時間 `2200ms`、フェード `420ms` は変更しない。
- Reduced Motionでもスプラッシュを同じ最低時間だけ静止表示し、進捗は情報として残す。
- PCヘッダーは Home / About Us / Activities / News / Apps / Board / Contact の順とする。
- ActivitiesはPCで開閉メニュー、モバイルで Development / Game Community / Weekly Math を常時展開する。
- モバイルメニューとDialogは Escape、フォーカストラップ、背景の `inert`、起点へのフォーカス復帰を持つ。
- ページ遷移リンクは `ButtonLink` または `InteractiveCard`、処理実行は `Button` を使い、インタラクティブ要素を入れ子にしない。
- 主要操作は44×44px以上、フォーム文字は16px以上、フォーカスリングは常に視認可能にする。
- `Card` と `CardContent` が同時に余白を持たない構造を標準にする。
- 通常本文・日付・説明には `--text-secondary` 以上のコントラストを使い、弱い色は装飾だけに使う。
- この計画では各公開ページの情報順序は変更しない。ページ固有の移行は Public Page Responsive UX 計画で行う。

## Baseline note

- 計画作成時の `npm run build` は成功する。
- `npm test` は60件成功・4件失敗で、Node 25環境の不完全な`localStorage`が `AboutActivityCards.test.tsx` を落としている。Task 3で安定したStorage mockを追加し、既存test自体は弱めない。
- `npm run lint` はCLI群と旧`DevHeroScene4.tsx`を中心に11件の既存errorがある。Foundation phaseは対象fileのscoped ESLintをgateとし、CLIはPublic Page計画、旧Development sceneはWebGL計画で解消した後に最終site-wide lintを通す。

---

### Task 1: ナビゲーション構造を型付き設定へ分離する

**Files:**
- Modify: `frontend/src/config/site.ts:13-58`
- Create: `frontend/src/config/site.test.ts`

**Interfaces:**
- Produces: `siteConfig.primaryNavigation: readonly NavigationItem[]`
- Produces: `siteConfig.activityNavigation: readonly NavigationItem[]`
- Produces: `siteConfig.footerNavigation: { public: readonly NavigationItem[]; activities: readonly NavigationItem[] }`
- Preserves temporarily: `siteConfig.navigation = primaryNavigation` をTask 6完了まで互換aliasとして残す

- [ ] **Step 1: 導線と順序を要求する失敗テストを書く**

`frontend/src/config/site.test.ts`を作成する。

```ts
import { describe, expect, it } from 'vitest';
import { siteConfig } from './site';

describe('siteConfig navigation', () => {
  it('balances public and activity destinations', () => {
    expect(siteConfig.primaryNavigation.map(({ name, href }) => [name, href])).toEqual([
      ['Home', '/'],
      ['About Us', '/about'],
      ['News', '/news'],
      ['Apps', '/app'],
      ['Board', '/board'],
      ['Contact', '/contact'],
    ]);
    expect(siteConfig.activityNavigation.map(({ name, href }) => [name, href])).toEqual([
      ['Development', '/development'],
      ['Game Community', '/game-community'],
      ['Weekly Math', '/weekly-math'],
    ]);
    expect(siteConfig.footerNavigation).toEqual({
      public: siteConfig.primaryNavigation,
      activities: siteConfig.activityNavigation,
    });
  });
});
```

- [ ] **Step 2: focused testが新しいプロパティ未実装で失敗することを確認する**

Run:

```bash
cd frontend
npm test -- src/config/site.test.ts
```

Expected: `primaryNavigation` / `activityNavigation` が存在せずFAILする。

- [ ] **Step 3: NavigationItemと3配列を実装する**

`site.ts`に次の公開型を追加し、Footer用配列は同じオブジェクトを再利用する。

```ts
export type NavigationItem = Readonly<{ name: string; href: string }>;

const primaryNavigation = [
  { name: 'Home', href: '/' },
  { name: 'About Us', href: '/about' },
  { name: 'News', href: '/news' },
  { name: 'Apps', href: '/app' },
  { name: 'Board', href: '/board' },
  { name: 'Contact', href: '/contact' },
] as const satisfies readonly NavigationItem[];

const activityNavigation = [
  { name: 'Development', href: '/development' },
  { name: 'Game Community', href: '/game-community' },
  { name: 'Weekly Math', href: '/weekly-math' },
] as const satisfies readonly NavigationItem[];

// Remove this alias in Task 6 after Header, DevHeader, and Footer migrate.
const navigation = primaryNavigation;

const footerNavigation = {
  public: primaryNavigation,
  activities: activityNavigation,
} as const;
```

- [ ] **Step 4: testを通す**

Run:

```bash
cd frontend
npm test -- src/config/site.test.ts
npm run build
```

Expected: PASS。既存Header/Footerは互換aliasによりbuild可能。

- [ ] **Step 5: 設定変更をコミットする**

```bash
git add frontend/src/config/site.ts frontend/src/config/site.test.ts
git commit -m "Define primary and activity navigation"
```

---

### Task 2: ButtonLink、InteractiveCard、単一余白Cardを共通化する

**Files:**
- Modify: `frontend/src/components/ui/Button.tsx:1-100`
- Create: `frontend/src/components/ui/ButtonLink.tsx`
- Create: `frontend/src/components/ui/InteractiveCard.tsx`
- Modify: `frontend/src/components/ui/Card.tsx:1-60`
- Modify: `frontend/src/components/ui/index.ts`
- Create: `frontend/src/components/ui/interactivePrimitives.test.tsx`
- Modify structured Card call sites: `frontend/src/pages/About.tsx`, `Admin.tsx`, `AdminMembers.tsx`, `AdminWeeklyMath.tsx`, `AdminWeeklyMathPreview.tsx`, `AppShowcase.tsx`, `Board.tsx`, `BoardDetail.tsx`, `Contact.tsx`, `Home.tsx`, `News.tsx`, `NewsDetail.tsx`, `TableTennisMatchMaker.tsx`, `WeeklyMath.tsx`, `WeeklyMathDetail.tsx`, `WeeklyMathSolution.tsx`

**Interfaces:**
- Produces: `buttonClassName({ variant, size, className })`
- Produces: `ButtonLinkProps = InternalButtonLinkProps | ExternalButtonLinkProps`
- Produces: `InteractiveCardProps extends Omit<LinkProps, 'className' | 'children'>` と必須 `actionLabel`
- Produces: `Card` の既定 `padding="none"`; 既存の明示的 `padding` は維持
- Produces: `CardContent` の既定 `padding="md"` = `p-4 sm:p-6`
- Guarantees: `ButtonLink` は `<a>`、`Button` は `<button>`、`InteractiveCard` は単一の `<a>` を生成する

- [ ] **Step 1: ネイティブ要素と余白規則の失敗テストを書く**

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Button, ButtonLink, Card, CardContent, InteractiveCard } from './index';

it('renders navigation styling without nesting a button', () => {
  render(<MemoryRouter><ButtonLink to="/about">About</ButtonLink></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('makes an interactive card one link', () => {
  render(<MemoryRouter><InteractiveCard to="/app" actionLabel="Appsを見る"><h2>Apps</h2></InteractiveCard></MemoryRouter>);
  const link = screen.getByRole('link', { name: /Apps/ });
  expect(link.querySelector('a,button')).toBeNull();
});

it('lets CardContent own responsive structured padding', () => {
  const { container } = render(<Card><CardContent>body</CardContent></Card>);
  expect(container.firstElementChild).not.toHaveClass('p-6');
  expect(screen.getByText('body')).toHaveClass('p-4', 'sm:p-6');
});
```

- [ ] **Step 2: testが未実装exportと旧Card既定余白で失敗することを確認する**

Run: `cd frontend && npm test -- src/components/ui/interactivePrimitives.test.tsx`

Expected: `ButtonLink` / `InteractiveCard` のexport不足またはCard余白でFAILする。

- [ ] **Step 3: ボタンの見た目を共有関数へ抽出する**

`Button.tsx`からvariant・sizeクラスの組み立てを次の署名でexportする。`sm`を含む全サイズで `min-h-[44px]` を外さない。

```ts
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export interface ButtonStyleProps { variant?: ButtonVariant; size?: ButtonSize }
export function buttonClassName(options?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}): string;
```

- [ ] **Step 4: 内部・外部リンクを判別するButtonLinkを実装する**

```ts
type SharedButtonLinkProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};
type InternalButtonLinkProps = SharedButtonLinkProps & Omit<LinkProps, 'to' | 'className'> & { to: To; href?: never };
type ExternalButtonLinkProps = SharedButtonLinkProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; to?: never };
export type ButtonLinkProps = InternalButtonLinkProps | ExternalButtonLinkProps;
```

外部リンクで `target="_blank"` の場合は呼び出し側が `rel="noopener noreferrer"` を指定する。

- [ ] **Step 5: InteractiveCardを単一リンクとして実装する**

`InteractiveCard`はinternal router link専用とし、`LinkProps`に `variant`、`contentClassName`、必須 `actionLabel` を加える。内部に別のリンクやボタンを置かず、タイトル・状態・要約・常時見えるactionLabel・方向キューをchildrenとして一つのリンク内に並べる。方向キューは `aria-hidden="true"`、リンク自体のaccessible nameは見出しとactionLabelから得る。外部遷移が必要な通常CTAは`ButtonLink href`を使う。

```ts
export type CardVariant = 'default' | 'glass' | 'elevated';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
}

export interface InteractiveCardProps extends Omit<LinkProps, 'className' | 'children'> {
  children: ReactNode;
  actionLabel: string;
  variant?: CardVariant;
  className?: string;
  contentClassName?: string;
}
```

- [ ] **Step 6: Cardの既定余白をnoneへ変更しテストを通す**

`Card`の `padding = 'none'` へ変更し、`CardContent`へ `padding?: CardPadding` と既定 `md`（`p-4 sm:p-6`）を追加する。既存の明示 `className="p-*"` は `padding="none"` として二重指定を避ける。CardContentを使わない空状態などはCardへ `padding="md"` / `lg` を明示する。

全call siteを次の機械的ルールで同じcommit内に移行する。

```text
Card + CardContent                 -> Card padding="none"
CardContent className contains p-* -> CardContent padding="none"
CardContent without explicit p-*   -> default responsive md padding
Card without CardContent/padding   -> add the old intended padding explicitly
```

特に`BoardDetail.tsx`のロック済みtext-center cardはCard既定横余白へ依存しているため、`padding="md"`を明示する。

Run:

```bash
cd frontend
npm test -- src/components/ui/interactivePrimitives.test.tsx
npx eslint src/components/ui/Button.tsx src/components/ui/ButtonLink.tsx src/components/ui/InteractiveCard.tsx src/components/ui/Card.tsx
npm run build
```

Expected: PASS、lint出力なし。

- [ ] **Step 7: primitiveをコミットする**

```bash
git add frontend/src/components/ui frontend/src/pages/About.tsx frontend/src/pages/Admin.tsx frontend/src/pages/AdminMembers.tsx frontend/src/pages/AdminWeeklyMath.tsx frontend/src/pages/AdminWeeklyMathPreview.tsx frontend/src/pages/AppShowcase.tsx frontend/src/pages/Board.tsx frontend/src/pages/BoardDetail.tsx frontend/src/pages/Contact.tsx frontend/src/pages/Home.tsx frontend/src/pages/News.tsx frontend/src/pages/NewsDetail.tsx frontend/src/pages/TableTennisMatchMaker.tsx frontend/src/pages/WeeklyMath.tsx frontend/src/pages/WeeklyMathDetail.tsx frontend/src/pages/WeeklyMathSolution.tsx
git commit -m "Add semantic link and card primitives"
```

---

### Task 3: 読み込み・空・エラー・確認状態を共通化する

**Files:**
- Create: `frontend/src/components/ui/StateDisplay.tsx`
- Create: `frontend/src/components/ui/ConfirmDialog.tsx`
- Modify: `frontend/src/components/ui/Dialog.tsx:1-101`
- Modify: `frontend/src/components/ui/index.ts`
- Modify: `frontend/src/components/ErrorBoundary.tsx`
- Create: `frontend/src/components/ui/StateDisplay.test.tsx`
- Create: `frontend/src/components/ui/Dialog.test.tsx`
- Modify: `frontend/src/test/setup.ts`

**Interfaces:**
- Produces: `LoadingState({ label?, children?, className? })`
- Produces: `EmptyState({ title, description, action? })`
- Produces: `ErrorState({ title?, description, onRetry?, retryLabel? })`
- Produces: `ConfirmDialog({ open, title, description, confirmLabel?, cancelLabel?, confirmVariant?, isConfirming?, onConfirm, onClose })`
- Produces: `Dialog` が必須 `title` / `description`、`initialFocusRef`、`closeLabel?` を受ける

```ts
export interface LoadingStateProps { label?: string; children?: ReactNode; className?: string }
export interface EmptyStateProps { title: string; description: string; icon?: ReactNode; action?: ReactNode; className?: string }
export interface ErrorStateProps { title?: string; description: string; onRetry?: () => void; retryLabel?: string; action?: ReactNode; className?: string }
export interface DialogProps {
  open: boolean; onClose(): void; title: string; description: string; children: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>; closeLabel?: string;
}
export interface ConfirmDialogProps {
  open: boolean; onClose(): void; onConfirm(): void; title: string; description: string;
  confirmLabel?: string; cancelLabel?: string; confirmVariant?: 'primary' | 'danger'; isConfirming?: boolean;
}
```

- [ ] **Step 1: 状態表示とDialogのaccessible nameを要求するテストを書く**

```tsx
it('offers a retry action for recoverable errors', async () => {
  const onRetry = vi.fn();
  render(<ErrorState description="取得できませんでした" onRetry={onRetry} />);
  await userEvent.click(screen.getByRole('button', { name: '再試行' }));
  expect(onRetry).toHaveBeenCalledOnce();
});

it('labels a confirmation dialog and restores the trigger focus', async () => {
  render(<ConfirmHarness />);
  const trigger = screen.getByRole('button', { name: '削除' });
  await userEvent.click(trigger);
  expect(screen.getByRole('dialog', { name: '投稿を削除' })).toHaveAttribute('aria-describedby');
  await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
  expect(trigger).toHaveFocus();
});

it('moves focus to the requested initial control after showModal', async () => {
  render(<DialogInitialFocusHarness />);
  await userEvent.click(screen.getByRole('button', { name: '開く' }));
  expect(screen.getByRole('textbox', { name: '確認文字列' })).toHaveFocus();
});
```

- [ ] **Step 2: focused testsが未実装またはaria関連付け不足で失敗することを確認する**

Run: `cd frontend && npm test -- src/components/ui/StateDisplay.test.tsx src/components/ui/Dialog.test.tsx`

- [ ] **Step 3: 状態表示を実装する**

`LoadingState`は `role="status"` と画面読み上げ用labelを持ち、`children`に内容へ近いskeletonを受ける。children未指定時だけ共通3-row skeletonを表示する。`EmptyState`は理由と次の操作、`ErrorState`は `role="alert"` と任意の再試行Buttonを表示する。actionは呼び出し側が `Button` / `ButtonLink` を渡す。

- [ ] **Step 4: DialogのID関連付けとフォーカス復帰を実装する**

`useId()`で必須title/descriptionのIDを作り、`aria-labelledby`と`aria-describedby`を常に付ける。open直前の `document.activeElement` を保存し、`showModal()`後に `initialFocusRef.current?.focus()`、close後に起点へ復帰する。ネイティブ`cancel`イベントを `preventDefault()` して `onClose`へ集約し、旧document-level Escape listenerは削除する。閉じるボタンは44pxにする。

`jsdom`に `showModal` / `close` がなければ `src/test/setup.ts` に最小polyfillを置く。同じsetupでMap-backed Storage mockを `localStorage` / `sessionStorage` へ登録し、`getItem`, `setItem`, `removeItem`, `clear`, `key`, `length` の標準契約を実装する。これでBaselineのAbout 4 failuresが消えることを確認する。

- [ ] **Step 5: ConfirmDialogをDialog上に実装する**

確認ボタンは `confirmVariant="danger"` の場合 `variant="danger"`、`isConfirming` の場合 `isLoading` とdisabled、キャンセルは `variant="secondary"` とする。ボタン順はDOM上「キャンセル」「確認」、モバイルでは縦積み可能にする。

`ErrorBoundary`は`ErrorState`を使い、再読み込みはnative Button、ホーム遷移はButtonLinkとして入れ子なしに移行する。

- [ ] **Step 6: focused testsを通す**

Run:

```bash
cd frontend
npm test -- src/components/ui/StateDisplay.test.tsx src/components/ui/Dialog.test.tsx
npx eslint src/components/ui/StateDisplay.tsx src/components/ui/Dialog.tsx src/components/ui/ConfirmDialog.tsx src/components/ErrorBoundary.tsx
npm run build
```

- [ ] **Step 7: 共通状態をコミットする**

```bash
git add frontend/src/components/ui frontend/src/components/ErrorBoundary.tsx frontend/src/test/setup.ts
git commit -m "Standardize async states and confirmation dialogs"
```

---

### Task 4: InputとTextareaへ必須の名前・エラー関連付けを追加する

**Files:**
- Modify: `frontend/src/components/ui/Input.tsx:1-55`
- Modify: `frontend/src/components/ui/Textarea.tsx:1-56`
- Create: `frontend/src/components/ui/FormControls.test.tsx`
- Modify: `frontend/src/pages/News.tsx:84-92`
- Modify: `frontend/src/pages/BoardDetail.tsx:425-438`
- Modify: `frontend/src/pages/AdminMembers.tsx:193-200`
- Modify: `frontend/src/pages/AdminWeeklyMath.tsx:611-617`

**Interfaces:**
- Consumes: `label`, `error`, `helperText`, 標準input/textarea属性
- Produces: 必須 `label: string` と `labelVisibility?: 'visible' | 'sr-only'` を持つ `InputProps` / `TextareaProps`
- Guarantees: error時 `aria-invalid="true"`; error/helper IDを `aria-describedby` へ連結

```ts
export type FieldLabelVisibility = 'visible' | 'sr-only';
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  labelVisibility?: FieldLabelVisibility;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}
// TextareaProps is the same contract over TextareaHTMLAttributes<HTMLTextAreaElement>.
```

- [ ] **Step 1: label、helper、errorの関連付けを要求する失敗テストを書く**

```tsx
it('connects an invalid input to its visible error', () => {
  render(<Input label="メールアドレス" error="入力してください" />);
  const input = screen.getByRole('textbox', { name: 'メールアドレス' });
  const error = screen.getByText('入力してください');
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAttribute('aria-describedby', error.id);
});

it('supports a visually hidden label without losing its name', () => {
  render(<Textarea label="本文" labelVisibility="sr-only" helperText="500文字以内" />);
  expect(screen.getByRole('textbox', { name: '本文' })).toHaveAttribute('aria-describedby');
});
```

- [ ] **Step 2: testが旧aria実装で失敗することを確認する**

Run: `cd frontend && npm test -- src/components/ui/FormControls.test.tsx`

- [ ] **Step 3: useIdと説明IDを実装する**

hookは条件分岐せず常に `const generatedId = useId(); const inputId = id ?? generatedId;` の順で呼ぶ。`helperText`と`error`は別IDを持てる構造にする。呼び出し側の既存 `aria-describedby` がある場合はスペース区切りで保持する。`labelVisibility="sr-only"` は共通 `.sr-only` classを使う。

既存のplaceholder-only call siteであるNews検索、BoardDetailコメント、AdminMembersメール、AdminWeeklyMath検索には、このTask内で明示labelまたは`labelVisibility="sr-only"`を追加し、型変更直後もbuild可能にする。

- [ ] **Step 4: focused testとlintを通す**

Run:

```bash
cd frontend
npm test -- src/components/ui/FormControls.test.tsx
npx eslint src/components/ui/Input.tsx src/components/ui/Textarea.tsx src/pages/News.tsx src/pages/BoardDetail.tsx src/pages/AdminMembers.tsx src/pages/AdminWeeklyMath.tsx
npm run build
```

- [ ] **Step 5: フォーム基盤をコミットする**

```bash
git add frontend/src/components/ui/Input.tsx frontend/src/components/ui/Textarea.tsx frontend/src/components/ui/FormControls.test.tsx frontend/src/pages/News.tsx frontend/src/pages/BoardDetail.tsx frontend/src/pages/AdminMembers.tsx frontend/src/pages/AdminWeeklyMath.tsx
git commit -m "Connect form controls to labels and errors"
```

---

### Task 5: PC Activitiesメニューと完全なモバイルメニューを実装する

**Files:**
- Create: `frontend/src/components/layout/SiteHeader.tsx`
- Create: `frontend/src/components/layout/SiteHeader.test.tsx`
- Modify: `frontend/src/components/layout/Header.tsx:1-119`
- Modify: `frontend/src/components/layout/DevHeader.tsx`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: `siteConfig.primaryNavigation`, `siteConfig.activityNavigation`
- Produces: internal `SiteHeader({ tone?: 'default' | 'development' })`
- Preserves: public `Header()` / `DevHeader()` は安定wrapper
- Guarantees: Activities配下で親がactive、モバイル活動リンク常時表示、Escape/Tab/復帰/inert

- [ ] **Step 1: desktop/mobile導線とキーボード挙動の失敗テストを書く**

desktopとmobileを別々のtest/renderにし、desktopは`within(screen.getByTestId('desktop-site-nav'))`、mobileは`within(screen.getByRole('dialog', { name: 'サイトメニュー' }))`へscopeする。

```tsx
const desktopNav = screen.getByTestId('desktop-site-nav');
const activities = within(desktopNav).getByRole('button', { name: 'Activities' });
expect(activities).toHaveAttribute('aria-current', 'page');
await user.click(activities);
expect(within(desktopNav).getByRole('link', { name: 'Development' })).toHaveAttribute('href', '/development');

// Start a separate test with a fresh render for mobile.
await user.click(screen.getByRole('button', { name: 'メニューを開く' }));
const dialog = screen.getByRole('dialog', { name: 'サイトメニュー' });
expect(dialog).toHaveAttribute('open');
expect(within(dialog).getByRole('heading', { name: '活動' })).toBeInTheDocument();
expect(within(dialog).getByRole('link', { name: 'Game Community' })).toBeInTheDocument();
expect(within(dialog).getByRole('button', { name: 'メニューを閉じる' })).toBeInTheDocument();
await user.keyboard('{Escape}');
expect(screen.getByRole('button', { name: 'メニューを開く' })).toHaveFocus();
```

- [ ] **Step 2: testがActivities不在とフォーカス復帰不足で失敗することを確認する**

Run: `cd frontend && npm test -- src/components/layout/SiteHeader.test.tsx`

- [ ] **Step 3: desktop Activitiesメニューを実装する**

親buttonは `aria-expanded` / `aria-controls`、子メニューはクリック・Escape・外側クリックで閉じる。`/development`, `/game-community`, `/weekly-math` と各詳細ルートでは親に `aria-current="page"` とactive classを付ける。Tab移動を妨げず、hoverだけに依存しない。

- [ ] **Step 4: mobile dialogを実装する**

mobile sheetは`createPortal(..., document.body)`でnative `<dialog>`としてHeaderの外へ置き、`showModal()`によるbrowser標準の背景inertとfocus containmentを使う。primary linksのAbout Us直後に「活動」見出しと3リンク、dialog内に明示的な閉じるbuttonを置く。open時は最初のリンクへfocus、native `cancel`でEscape close、リンク選択でもcloseし、triggerへ復帰する。body scroll lockをcleanupする。jsdom testでは`showModal` polyfillを使い、実browser gateでTab/Shift+Tabがdialog外へ出ないこととHeaderロゴ/ThemeToggle/main/Footerが操作不能なことを確認する。

- [ ] **Step 5: DevHeaderを同じ情報構造と操作規則へ合わせる**

`Header`と`DevHeader`はそれぞれ `tone` を渡す薄いwrapperにする。没入型の配色・ロゴ表現はtone別classで維持し、navigation DOMとmobile focus behaviorは`SiteHeader`一箇所で実装する。

- [ ] **Step 6: 44px targetとfocus-visible CSSを追加してtestを通す**

Run:

```bash
cd frontend
npm test -- src/components/layout/SiteHeader.test.tsx src/components/layout/DevHeader.test.tsx
npx eslint src/components/layout/SiteHeader.tsx src/components/layout/Header.tsx src/components/layout/DevHeader.tsx
npm run build
```

- [ ] **Step 7: Headerをコミットする**

```bash
git add frontend/src/components/layout frontend/src/index.css
git commit -m "Expose activities in accessible site navigation"
```

---

### Task 6: FooterをPCの3領域とモバイルのコンパクト構成へ変更する

**Files:**
- Modify: `frontend/src/components/layout/Footer.tsx:1-177`
- Modify: `frontend/src/components/layout/Layout.tsx:10-21`
- Modify: `frontend/src/config/site.ts`
- Create: `frontend/src/components/layout/Footer.test.tsx`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: `siteConfig.footerNavigation`, `siteConfig.social`, `siteConfig.contactEmail`
- Consumes: `useLocation()` でContactルートを判定
- Produces: desktop brand/contact + public menu + activity menu
- Produces: mobile persistent brand/social + native `details` Contact/Menu accordion

- [ ] **Step 1: リンク構成、accordion、管理者リンク位置の失敗テストを書く**

```tsx
render(<MemoryRouter initialEntries={['/contact']}><Footer /></MemoryRouter>);
const footer = screen.getByRole('contentinfo');
const desktop = within(footer).getByTestId('footer-desktop');
const mobile = within(footer).getByTestId('footer-mobile');
expect(within(desktop).getByRole('link', { name: 'Development' })).toHaveAttribute('href', '/development');
expect(within(mobile).getByText('連絡先').closest('details')).not.toHaveAttribute('open');
expect(within(footer).getByRole('link', { name: '管理者ページ' }).closest('[data-footer-legal]')).not.toBeNull();
expect(footer).toHaveAttribute('data-compact-contact', 'true');
```

- [ ] **Step 2: focused testが旧4列Footerで失敗することを確認する**

Run: `cd frontend && npm test -- src/components/layout/Footer.test.tsx`

- [ ] **Step 3: desktop 3領域を実装する**

ブランド/説明/住所/メール/SNS、公開メニュー、活動メニューを3領域にする。管理者リンクはcopyrightと同じlegal rowへ移す。SNSリンクは44px hit areaにする。

- [ ] **Step 4: mobile details accordionを実装する**

モバイルだけ `details` / `summary` を「連絡先」「メニュー」に使う。「メニュー」内で公開・活動リンクを小見出しで分ける。Contactルートでは住所・メール全文を繰り返さず、「連絡先はこのページ上部に掲載しています」という短い案内だけを表示する。`Layout`は `<Footer key={pathname} />` とし、route遷移でnative open stateを閉じた初期値へ戻す。

- [ ] **Step 5: testとlintを通す**

Header、DevHeader、Footerの旧`siteConfig.navigation`参照が0件になったら、Task 1の互換aliasと旧`footerLinks`を`site.ts`から削除する。

Run:

```bash
cd frontend
npm test -- src/components/layout/Footer.test.tsx
npx eslint src/components/layout/Footer.tsx src/components/layout/Layout.tsx src/config/site.ts
npm run build
```

- [ ] **Step 6: Footerをコミットする**

```bash
git add frontend/src/components/layout/Footer.tsx frontend/src/components/layout/Footer.test.tsx frontend/src/components/layout/Layout.tsx frontend/src/config/site.ts frontend/src/index.css
git commit -m "Make footer compact and activity aware"
```

---

### Task 7: スプラッシュのinert化、スキップリンク、SPA遷移フォーカスを実装する

**Files:**
- Create: `frontend/src/components/layout/InitialSplashGate.tsx`
- Create: `frontend/src/components/layout/InitialSplashGate.test.tsx`
- Create: `frontend/src/components/layout/RouteAccessibility.tsx`
- Create: `frontend/src/components/layout/RouteAccessibility.test.tsx`
- Create: `frontend/src/components/layout/Layout.test.tsx`
- Modify: `frontend/src/components/layout/Layout.tsx:1-23`
- Modify: `frontend/src/components/layout/index.ts`
- Modify: `frontend/src/App.tsx:1-250`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Produces: `InitialSplashGate({ children })` が既存2200ms + 420ms lifecycleを所有
- Produces: `RouteAccessibility({ mainId? })` がpathname変更後 `#main-content` へfocusしpage titleを通知
- Produces: `<main id="main-content" tabIndex={-1}>`
- Produces: `<a className="skip-link" href="#main-content">本文へスキップ</a>`

- [ ] **Step 1: スプラッシュとルートfocusの失敗テストを書く**

fake timersと `matchMedia` mockを使い、次を検証する。

```tsx
expect(screen.getByRole('progressbar', { name: '読み込み中' })).toBeInTheDocument();
expect(screen.getByTestId('app-content')).toHaveAttribute('inert');
act(() => vi.advanceTimersByTime(2199));
expect(screen.getByRole('progressbar')).toBeInTheDocument();
act(() => vi.advanceTimersByTime(17)); // allow the first rAF at/after 2200ms to start fading
expect(screen.getByTestId('app-content')).toHaveAttribute('inert');
act(() => vi.advanceTimersByTime(419));
expect(screen.getByTestId('app-content')).toHaveAttribute('inert');
act(() => vi.advanceTimersByTime(1));
expect(screen.getByTestId('app-content')).not.toHaveAttribute('inert');
```

Reduced Motionの別testではstatic class、progress値がframeごとに変わらないこと、2199msまで表示、fade完了までinertをassertする。さらにリンク遷移後に `#main-content` がfocusされ、スキップリンクのhrefが一致し、新しいdocument titleがpolite live regionへ入ることを検証する。hashだけの変更ではscroll/focusを再実行しないこともassertする。

- [ ] **Step 2: focused testが背後appのinert不足で失敗することを確認する**

Run: `cd frontend && npm test -- src/components/layout/InitialSplashGate.test.tsx src/components/layout/Layout.test.tsx src/components/layout/RouteAccessibility.test.tsx`

- [ ] **Step 3: InitialSplashGateへ既存実装を移す**

`InitialSplash`, `easeOutCubic`, `SPLASH_MIN_MS`, `OVERLAY_FADE_MS`とeffectを見た目を変えず移す。children wrapperへ `data-testid="app-content"`, `inert={showSplash || undefined}`, `aria-hidden={showSplash || undefined}`を付け、420ms fadeの完了まで外さない。Reduced Motionでは `.initial-splash--reduced-motion` を付け、CSS animation/transitionとframeごとのprogress更新を止め、固定progress表示のまま同じtimerを使う。

- [ ] **Step 4: LayoutとRouteAccessibilityを実装する**

`RouteAccessibility`は初回renderではfocusを動かさず、2回目以降のpathname変更後に `requestAnimationFrame` でmainをfocusする。hash変更だけでは動かさない。既存PageSeoが更新したdocument titleをMutationObserverで読み、sr-only `aria-live="polite"` へ通知する。mainのoutlineは通常非表示、`:focus-visible`のみ共通ringを出す。

- [ ] **Step 5: Appから重複lifecycleを除き共通PageLoaderへLoadingStateを使う**

Router全体を `InitialSplashGate` childrenにする。`PageLoader`は `<LoadingState label="ページを読み込み中" />` を使い、弱いコントラストのspinner文言を除く。

- [ ] **Step 6: focused testを通す**

Run:

```bash
cd frontend
npm test -- src/components/layout/InitialSplashGate.test.tsx src/components/layout/Layout.test.tsx src/components/layout/RouteAccessibility.test.tsx
npx eslint src/App.tsx src/components/layout/InitialSplashGate.tsx src/components/layout/RouteAccessibility.tsx src/components/layout/Layout.tsx
npm run build
```

- [ ] **Step 7: app shellをコミットする**

```bash
git add frontend/src/App.tsx frontend/src/components/layout frontend/src/index.css
git commit -m "Make splash and route focus accessible"
```

---

### Task 8: 色・文字・フォーカス・Toastの視認性を共通トークンへ統一する

**Files:**
- Modify: `frontend/src/index.css:1-220`
- Modify: `frontend/src/components/layout/ThemeToggle.tsx`
- Modify: `frontend/src/components/ui/Toast.tsx:48-102`
- Create: `frontend/src/components/ui/Toast.test.tsx`
- Create: `frontend/src/test/designSystem.test.ts`

**Interfaces:**
- Produces CSS tokens: `--surface-page`, `--surface-card`, `--surface-inset`, `--surface-overlay`, `--surface-immersive`, `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-decoration`, `--border-subtle`, `--focus-ring`
- Produces utility classes: `.text-secondary`, `.text-tertiary`, `.focus-ring`; existing `.apple-hero` / `.apple-section` become fluid directly
- Guarantees: Toast viewport mobile inset、statusのlive semantics、44px dismiss

- [ ] **Step 1: Toastのlive regionとdismiss accessible nameを要求する失敗テストを書く**

```tsx
render(<ToastHarness />);
await user.click(screen.getByRole('button', { name: '通知を追加' }));
expect(screen.getByRole('status')).toHaveTextContent('保存しました');
expect(screen.getByRole('button', { name: '通知を閉じる' })).toHaveClass('min-h-11', 'min-w-11');
```

- [ ] **Step 2: testが旧 `role="alert"` と小さいDismissで失敗することを確認する**

Run: `cd frontend && npm test -- src/components/ui/Toast.test.tsx src/test/designSystem.test.ts`

`designSystem.test.ts`ではCSS sourceを読み、light/dark secondary tokenの相対輝度contrastが4.5:1以上、white on primary blueが4.5:1以上、既存`.apple-hero` / `.apple-section` ruleに`clamp(`があり1024pxだけのfont-size jumpがないこと、共通control sizeに44pxがあることをassertする。

- [ ] **Step 3: semantic tokensとfluid typeを定義する**

ライト/ダークの両方で本文用secondaryをAA相当へ上げる。`#86868B`とdark 30% whiteは`--text-decoration`としてplaceholderや装飾に限定する。未定義の`--dark-bg-news`はsemantic surfaceへ置換する。既存 `.apple-hero` / `.apple-section` の1024px breakpoint jumpを、`clamp(min, vw, max)`を使うfluid値へ直接置換する。

- [ ] **Step 4: 共通focus ringと44px targetを適用する**

Button、ButtonLink、InteractiveCard、Header、ThemeToggle、Footer、Dialog、Toast、details summaryに `:focus-visible` の2px ring + offsetを適用する。componentごとのTailwind ringと二重にならないよう一方へ統一する。`outline: none` は同じselector内でringが出る場合だけ許可する。shared button、header control、social、Toast dismiss、summaryは44px以上にする。

- [ ] **Step 5: Toastをstatus別live regionへ修正する**

success/infoは `role="status"`、error/warningは `role="alert"` とする。containerを `inset-inline: 1rem` / desktop右寄せにし、閉じるラベルを日本語化、44px targetへ変更する。

- [ ] **Step 6: focused test、全test、lint、buildを実行する**

Run:

```bash
cd frontend
npm test -- src/components/ui/Toast.test.tsx
npm test -- src/test/designSystem.test.ts
npm test -- --run
npm run build
npx eslint src/App.tsx src/config/site.ts src/components/ui src/components/layout src/test
```

Expected: 全コマンド終了コード0。buildに新しいwarning/errorがなく、既知のCLI/旧Development lintはこのscoped gateへ含めない。

- [ ] **Step 7: ブラウザでshellを検証する**

`npm run dev -- --host 127.0.0.1 --port 5176` を起動し、`/`, `/development`, `/contact` を次で確認する。

| Viewport | Theme / Mode | 確認内容 |
| --- | --- | --- |
| 1440×1000 | light / dark | Activities開閉、active親、3領域Footer、focus ring |
| 1024×768 | light | 見出しの急拡大なし、nav衝突なし |
| 390×844 | light / dark | mobile menu trap、accordion、44px target、横スクロールなし |
| 320×700 | Reduced Motion | splash静止2.2秒、menu/Footer横スクロールなし |

- [ ] **Step 8: 基盤をコミットする**

```bash
git add frontend/src/index.css frontend/src/components/layout/ThemeToggle.tsx frontend/src/components/ui/Toast.tsx frontend/src/components/ui/Toast.test.tsx frontend/src/test/designSystem.test.ts
git commit -m "Unify site color type and focus foundations"
```

---

## Foundation handoff contract

後続2計画は、次のexportが存在しfocused testsが通ったcommitから開始する。

```ts
export { Button, ButtonLink, InteractiveCard, Card, CardContent } from '@/components/ui';
export { LoadingState, EmptyState, ErrorState, Dialog, ConfirmDialog } from '@/components/ui';
export { Input, Textarea } from '@/components/ui';
```

Handoff gate:

```bash
cd frontend
npm test -- src/config/site.test.ts src/components/ui src/components/layout src/test/designSystem.test.ts
npm test -- --run
npx eslint src/App.tsx src/config/site.ts src/components/ui src/components/layout src/test
npm run build
```

Public Page Responsive UX と Development WebGL Showcase は、このgateが終了コード0になるまで開始しない。
