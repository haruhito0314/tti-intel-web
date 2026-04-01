import {
    collection,
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

export interface WeeklyMathProblem {
    weekKey: string;
    title: string;
    problem: string;
    hint?: string;
    answer?: string;
    explanation?: string;
    updatedBy?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export const DEFAULT_WEEKLY_MATH_PROBLEM: WeeklyMathProblem = {
    weekKey: getCurrentWeekKey(),
    title: '経路の場合の数',
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

\\(2n\\) 回の操作後、\\(a_{2n}=1\\) となるようなカードの引き方の総数を求めてください。`,
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
};

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

export async function getWeeklyMath(weekKey: string): Promise<WeeklyMathProblem | null> {
    const snap = await getDoc(doc(db, 'weeklyMath', weekKey));
    if (!snap.exists()) return null;
    return snap.data() as WeeklyMathProblem;
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
    if (snap.empty) return null;
    return snap.docs[0].data() as WeeklyMathProblem;
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
}
