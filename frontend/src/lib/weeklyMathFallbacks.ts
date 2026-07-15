export const ROUTE_COUNTING_ANSWER = String.raw`$$
\binom{2n}{n}
$$`;

export const ROUTE_COUNTING_EXPLANATION = String.raw`各カードに、次のような重みを対応させます。

- \(+1\) のカード：\(x^2\)
- \(\times1,\div1\) のカード：それぞれ \(x\)
- \(-1\) のカード：\(1\)

カードを \(n\) 回引く操作全体は、次の多項式の展開に対応します。

$$
f(x)=(x^2+2x+1)^n
$$

これを

$$
f(x)=\sum_{j=0}^{2n}A_jx^j
$$

とおきます。

ある引き方で \(+1\) のカードと \(-1\) のカードをそれぞれ \(k\) 回引いたとします。残りの \(n-2k\) 回は \(\times1\) または \(\div1\) なので、その引き方に対応する項の次数は

$$
2k+(n-2k)=n
$$

となります。逆に、対応する項の次数が \(n\) なら、\(+1\) と \(-1\) の回数は等しくなります。

したがって、\(n\) 回の操作後に \(a_n=1\) となる引き方の総数は、\(f(x)\) における \(x^n\) の係数 \(A_n\) です。

ここで

$$
f(x)=(1+x)^{2n}
$$

であるため、二項定理より

$$
A_n=\binom{2n}{n}
$$

となります。`;

interface WeeklyMathSolutionSource {
    title?: string;
    answer?: string;
    explanation?: string;
}

export function resolveWeeklyMathSolutionContent(source: WeeklyMathSolutionSource | null | undefined): {
    answerMarkdown: string;
    explanationMarkdown: string;
} {
    if (source?.title?.trim() === '経路の場合の数') {
        return {
            answerMarkdown: ROUTE_COUNTING_ANSWER,
            explanationMarkdown: ROUTE_COUNTING_EXPLANATION,
        };
    }

    return {
        answerMarkdown: source?.answer?.trim() || '',
        explanationMarkdown: source?.explanation?.trim() || '',
    };
}
