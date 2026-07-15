import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    setDoc,
    where,
    Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sortWeeklyMathProblemsNewestFirst } from '@/lib/weeklyMathIdentity';

export interface WeeklyMathProblem {
    weekKey: string;
    title: string;
    problem: string;
    problemPublished?: boolean;
    periodMemo?: string;
    hint?: string;
    answer?: string;
    explanation?: string;
    solutionPublished?: boolean;
    updatedBy?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export const DEFAULT_WEEKLY_MATH_TEMPLATE_KEY = 'default-template';
export const PUBLIC_DEFAULT_WEEKLY_MATH_KEY = 'default';
const HOME_WEEKLY_MATH_SETTINGS_DOC = 'home-weekly-math';
let homeWeeklyMathCache: WeeklyMathProblem | null | undefined = undefined;
let homeWeeklyMathPromise: Promise<WeeklyMathProblem | null> | null = null;

const DEFAULT_WEEKLY_MATH_PROBLEM_BODY: Omit<WeeklyMathProblem, 'weekKey'> = {
    title: '経路の場合の数',
    problemPublished: true,
    problem: `+1, -1, ×1, ÷1 がそれぞれ書かれた4種類のカードが、それぞれ十分な枚数あります。

今、\\(a_0=1\\) として、毎回1枚のカードを引きます。  
\\(a_{n+1}\\) は、\\(a_n\\) に対してそのカードに書かれた操作をすることで定めます。  
ただし、\\(n\\) は非負整数です。

例えば、+1、+1、×1 の順でカードを引いた時、

- \\(a_0=1\\)
- \\(a_1=2\\)
- \\(a_2=3\\)
- \\(a_3=3\\)

となります。

\\(n\\)回の操作後、\\(a_n=1\\) となるようなカードの引き方の総数を求めてください。`,
    hint: `\\(+1\\) と \\(-1\\) は互いに打ち消し合い、\\(×1\\) と \\(÷1\\) は値を変えません。
「\\(+1\\) と \\(-1\\) の使用回数が同じ」である条件を使って数え上げます。`,
    answer: `$$
\\sum_{k=0}^{n}\\frac{(2n)!}{k!k!(2n-2k)!}\\,2^{2n-2k}
$$`,
    explanation: `\\(+1\\) を \\(k\\) 回、\\(-1\\) を \\(k\\) 回使うとすると、残り \\(2n-2k\\) 回は
\\(×1\\) または \\(÷1\\) を自由に選べるので \\(2^{2n-2k}\\) 通りです。

さらに \\(2n\\) 個の位置のうち、\\(+1\\) と \\(-1\\) の配置は
\\(\\dfrac{(2n)!}{k!k!(2n-2k)!}\\) 通り。

これを \\(k=0\\) から \\(n\\) まで合計して上式を得ます。`,
    solutionPublished: true,
};

export function getDefaultWeeklyMathProblem(): WeeklyMathProblem {
    return {
        ...DEFAULT_WEEKLY_MATH_PROBLEM_BODY,
        weekKey: getCurrentWeekKey(),
    };
}

function getIsoWeekParts(date: Date): { year: number; week: number } {
    const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { year: utc.getUTCFullYear(), week };
}

export function getCurrentWeekKey(date: Date = new Date()): string {
    const { year, week } = getIsoWeekParts(date);
    return `${year}-W${String(week).padStart(2, '0')}`;
}

export function getWeekDateRange(weekKey: string): { start: Date; end: Date } | null {
    const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
    if (!match) return null;

    const year = Number(match[1]);
    const week = Number(match[2]);
    if (!Number.isFinite(year) || !Number.isFinite(week) || week < 1 || week > 53) return null;

    // ISO week #1 is the week containing January 4th.
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7; // 1(Mon) ... 7(Sun)
    const week1Monday = new Date(jan4);
    week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));

    const start = new Date(week1Monday);
    start.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);

    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);

    return { start, end };
}

export async function getWeeklyMath(weekKey: string): Promise<WeeklyMathProblem | null> {
    const snap = await getDoc(doc(db, 'weeklyMath', weekKey));
    if (!snap.exists()) return null;
    return snap.data() as WeeklyMathProblem;
}

export function toPublicWeeklyMathKey(weekKey: string): string {
    return weekKey === DEFAULT_WEEKLY_MATH_TEMPLATE_KEY ? PUBLIC_DEFAULT_WEEKLY_MATH_KEY : weekKey;
}

export function fromPublicWeeklyMathKey(weekKey: string): string {
    return weekKey === PUBLIC_DEFAULT_WEEKLY_MATH_KEY ? DEFAULT_WEEKLY_MATH_TEMPLATE_KEY : weekKey;
}

export async function getCurrentWeeklyMath(): Promise<WeeklyMathProblem | null> {
    const currentWeekKey = getCurrentWeekKey();
    const current = await getWeeklyMath(currentWeekKey);
    if (current) return current;

    const q = query(
        collection(db, 'weeklyMath'),
        where('weekKey', '<=', currentWeekKey),
        orderBy('weekKey', 'desc'),
        limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
        const template = await getDefaultWeeklyMathTemplate();
        return template;
    }
    return snap.docs[0].data() as WeeklyMathProblem;
}

export async function getHomeWeeklyMathKey(): Promise<string | null> {
    const snap = await getDoc(doc(db, 'siteSettings', HOME_WEEKLY_MATH_SETTINGS_DOC));
    if (!snap.exists()) return null;
    const data = snap.data() as { weekKey?: unknown };
    return typeof data.weekKey === 'string' && data.weekKey.trim() ? data.weekKey.trim() : null;
}

export async function setHomeWeeklyMathKey(weekKey: string, updatedBy: string): Promise<void> {
    await setDoc(
        doc(db, 'siteSettings', HOME_WEEKLY_MATH_SETTINGS_DOC),
        {
            weekKey,
            updatedBy,
            updatedAt: Timestamp.now(),
        },
        { merge: true }
    );
    clearHomeWeeklyMathCache();
}

async function fetchHomeWeeklyMathUncached(): Promise<WeeklyMathProblem | null> {
    const configuredWeekKey = await getHomeWeeklyMathKey();
    if (configuredWeekKey) {
        const configured = await getWeeklyMath(configuredWeekKey);
        if (configured && (configured.problemPublished ?? true)) return configured;
    }

    const currentWeekKey = getCurrentWeekKey();
    const current = await getWeeklyMath(currentWeekKey);
    if (current && (current.problemPublished ?? true)) return current;

    const q = query(
        collection(db, 'weeklyMath'),
        where('weekKey', '<=', currentWeekKey),
        orderBy('weekKey', 'desc'),
        limit(50)
    );
    const snap = await getDocs(q);
    const latestPublished = snap.docs
        .map((d) => d.data() as WeeklyMathProblem)
        .find((item) => (item.problemPublished ?? true));
    if (latestPublished) return latestPublished;

    const template = await getDefaultWeeklyMathTemplate();
    if (template && (template.problemPublished ?? true)) return template;
    return null;
}

export function getCachedHomeWeeklyMath(): WeeklyMathProblem | null | undefined {
    return homeWeeklyMathCache;
}

export function clearHomeWeeklyMathCache(): void {
    homeWeeklyMathCache = undefined;
    homeWeeklyMathPromise = null;
}

export async function getHomeWeeklyMath(options?: { forceRefresh?: boolean }): Promise<WeeklyMathProblem | null> {
    if (options?.forceRefresh) clearHomeWeeklyMathCache();
    if (homeWeeklyMathCache !== undefined) return homeWeeklyMathCache;
    if (homeWeeklyMathPromise) return homeWeeklyMathPromise;

    homeWeeklyMathPromise = fetchHomeWeeklyMathUncached()
        .then((result) => {
            homeWeeklyMathCache = result;
            return result;
        })
        .finally(() => {
            homeWeeklyMathPromise = null;
        });
    return homeWeeklyMathPromise;
}

export async function getWeeklyMathList(maxItems: number = 50): Promise<WeeklyMathProblem[]> {
    const snap = await getDocs(collection(db, 'weeklyMath'));
    return sortWeeklyMathProblemsNewestFirst(
        snap.docs.map((d) => d.data() as WeeklyMathProblem)
    ).slice(0, maxItems);
}

export async function getDefaultWeeklyMathTemplate(): Promise<WeeklyMathProblem | null> {
    const snap = await getDoc(doc(db, 'weeklyMath', DEFAULT_WEEKLY_MATH_TEMPLATE_KEY));
    if (!snap.exists()) return null;
    return snap.data() as WeeklyMathProblem;
}

export async function upsertWeeklyMath(
    weekKey: string,
    input: Omit<WeeklyMathProblem, 'weekKey' | 'createdAt' | 'updatedAt'>,
    updatedBy: string
): Promise<void> {
    const ref = doc(db, 'weeklyMath', weekKey);
    const existing = await getDoc(ref);

    await setDoc(ref, {
        weekKey,
        ...input,
        updatedBy,
        createdAt: existing.exists() ? existing.data().createdAt : Timestamp.now(),
        updatedAt: Timestamp.now(),
    });
    clearHomeWeeklyMathCache();
}

export async function deleteWeeklyMath(weekKey: string): Promise<void> {
    await deleteDoc(doc(db, 'weeklyMath', weekKey));
    clearHomeWeeklyMathCache();
}

export async function upsertDefaultWeeklyMathTemplate(
    input: Omit<WeeklyMathProblem, 'weekKey' | 'createdAt' | 'updatedAt'>,
    updatedBy: string
): Promise<void> {
    const ref = doc(db, 'weeklyMath', DEFAULT_WEEKLY_MATH_TEMPLATE_KEY);
    const existing = await getDoc(ref);

    await setDoc(ref, {
        weekKey: DEFAULT_WEEKLY_MATH_TEMPLATE_KEY,
        ...input,
        updatedBy,
        createdAt: existing.exists() ? existing.data().createdAt : Timestamp.now(),
        updatedAt: Timestamp.now(),
    });
    clearHomeWeeklyMathCache();
}
