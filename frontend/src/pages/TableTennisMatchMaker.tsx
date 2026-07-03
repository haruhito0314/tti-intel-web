import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileDown, Trash2 } from 'lucide-react';
import { PageSeo } from '@/components/PageSeo';
import { Button, Card, CardContent } from '@/components/ui';

type PlayerSlot = number | string | null;
type TableMatch = [PlayerSlot, PlayerSlot, PlayerSlot, PlayerSlot];
type OptimizedRound = {
    activeTables: number;
    matches: TableMatch[];
    penaltyScore: number;
};

type HistoryEntry = {
    id: string;
    createdAt: string;
    numPlayers?: number;
    numRounds: number;
    rotateTables: boolean;
    playerOrder: number[];
};

const HISTORY_KEY = 'table-tennis-history-v1';

class OptimizedTableTennisMatchMaker {
    players: PlayerSlot[];
    maxTables: number;

    constructor(players: number[], maxTables = 10) {
        this.maxTables = maxTables;
        this.players = this.buildPlayers(players);
    }

    buildPlayers(players: number[]): PlayerSlot[] {
        const activeTables = Math.min(this.maxTables, Math.ceil(players.length / 4));
        const slotsPerRound = activeTables * 4;
        const allPlayers: PlayerSlot[] = [...players];

        if (players.length < slotsPerRound) {
            allPlayers.push(...Array.from({ length: slotsPerRound - players.length }, (_, index) => `架空${index + 1}`));
        }

        return allPlayers;
    }

    generateRounds(numRounds: number): OptimizedRound[] {
        const activeTables = Math.min(this.maxTables, Math.ceil(this.players.length / 4));
        const slotsPerRound = activeTables * 4;
        const encounterHistory = new Map<string, Map<string, number>>();
        let rotationQueue = [...this.players];

        this.players.forEach((player) => {
            encounterHistory.set(this.playerKey(player), new Map(this.players.map((other) => [this.playerKey(other), 0])));
        });

        return Array.from({ length: numRounds }, () => {
            const currentPlayers = this.players.length <= slotsPerRound
                ? [...this.players]
                : rotationQueue.slice(0, slotsPerRound);

            if (this.players.length > slotsPerRound) {
                rotationQueue = [...rotationQueue.slice(slotsPerRound), ...currentPlayers];
            }

            let bestMatches: TableMatch[] = [];
            let bestPenalty = Number.POSITIVE_INFINITY;

            for (let attempt = 0; attempt < 100; attempt += 1) {
                const candidatePlayers = shufflePlayers(currentPlayers);
                const candidateMatches: TableMatch[] = [];
                let penalty = 0;

                for (let tableIndex = 0; tableIndex < activeTables; tableIndex += 1) {
                    const tablePlayers = candidatePlayers.slice(tableIndex * 4, tableIndex * 4 + 4) as TableMatch;

                    for (let i = 0; i < tablePlayers.length; i += 1) {
                        for (let j = i + 1; j < tablePlayers.length; j += 1) {
                            penalty += this.getEncounterCount(encounterHistory, tablePlayers[i], tablePlayers[j]);
                        }
                    }

                    candidateMatches.push(tablePlayers);
                }

                if (penalty < bestPenalty) {
                    bestPenalty = penalty;
                    bestMatches = candidateMatches;

                    if (bestPenalty === 0) break;
                }
            }

            bestMatches.forEach((match) => {
                for (let i = 0; i < match.length; i += 1) {
                    for (let j = i + 1; j < match.length; j += 1) {
                        this.incrementEncounter(encounterHistory, match[i], match[j]);
                        this.incrementEncounter(encounterHistory, match[j], match[i]);
                    }
                }
            });

            return {
                activeTables,
                matches: bestMatches,
                penaltyScore: bestPenalty,
            };
        });
    }

    playerKey(player: PlayerSlot): string {
        return player === null ? 'rest' : String(player);
    }

    getEncounterCount(history: Map<string, Map<string, number>>, player: PlayerSlot, other: PlayerSlot): number {
        return history.get(this.playerKey(player))?.get(this.playerKey(other)) ?? 0;
    }

    incrementEncounter(history: Map<string, Map<string, number>>, player: PlayerSlot, other: PlayerSlot): void {
        const playerHistory = history.get(this.playerKey(player));
        if (!playerHistory) return;
        playerHistory.set(this.playerKey(other), this.getEncounterCount(history, player, other) + 1);
    }
}

function shufflePlayers<T>(values: T[]): T[] {
    const arr = [...values];
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('ja-JP');
}

function formatPlayerSlot(value: PlayerSlot): string {
    if (value === null) return '休み';
    if (typeof value === 'string' && value.startsWith('架空')) return '休み';
    return String(value);
}

function formatMatch(table: TableMatch): string {
    return `(${formatPlayerSlot(table[0])}, ${formatPlayerSlot(table[1])}) vs (${formatPlayerSlot(table[2])}, ${formatPlayerSlot(table[3])})`;
}

function buildPdfHtml(rounds: OptimizedRound[], createdAt: string, numPlayers: number, numRounds: number): string {
    const sections = rounds
        .map(
            (round, roundIndex) => `
            <section style="margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid; border: 1px solid #ddd; border-radius: 8px; padding: 10px;">
                <h2 style="font-size: 16px; margin: 0 0 8px;">${roundIndex + 1}クール目（稼働${round.activeTables}台 / 重複組合せ ${round.penaltyScore}）</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #ccc; text-align: left; padding: 6px; width: 72px;">台</th>
                            <th style="border: 1px solid #ccc; text-align: left; padding: 6px;">組み合わせ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${round.matches
                            .map(
                                (table, tableIndex) => `
                                <tr>
                                    <td style="border: 1px solid #ccc; padding: 6px;">台${tableIndex + 1}</td>
                                    <td style="border: 1px solid #ccc; padding: 6px;">${formatMatch(table)}</td>
                                </tr>
                            `,
                            )
                            .join('')}
                    </tbody>
                </table>
            </section>
        `,
        )
        .join('');

    return `
    <!doctype html>
    <html lang="ja">
    <head>
        <meta charset="utf-8" />
        <title>卓球組み合わせ表</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; color: #111;">
        <h1 style="font-size: 22px; margin: 0 0 8px;">卓球組み合わせ表（${numPlayers}人）</h1>
        <p style="margin: 0 0 4px; font-size: 12px;">作成日時: ${formatDateTime(createdAt)}</p>
        <p style="margin: 0 0 18px; font-size: 12px;">人数: ${numPlayers} / クール数: ${numRounds} / 最大10台 / 重複が少ない組み合わせを自動採用</p>
        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-items: start;">
            ${sections}
        </div>
    </body>
    </html>
    `;
}

function loadHistory(): HistoryEntry[] {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed as HistoryEntry[] : [];
    } catch (error) {
        console.error('Failed to load history:', error);
        return [];
    }
}

export function TableTennisMatchMakerPage() {
    const [numPlayers, setNumPlayers] = useState(40);
    const [numPlayersInput, setNumPlayersInput] = useState('40');
    const [numRounds, setNumRounds] = useState(10);
    const [numRoundsInput, setNumRoundsInput] = useState('10');
    const [rotateTables, setRotateTables] = useState(false);
    const [activeRoundIndex, setActiveRoundIndex] = useState(0);
    const [playerOrder, setPlayerOrder] = useState<number[]>(
        Array.from({ length: 40 }, (_, index) => index + 1),
    );
    const [createdAt, setCreatedAt] = useState(new Date().toISOString());
    const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

    const tableTennisRounds = useMemo(
        () => new OptimizedTableTennisMatchMaker(playerOrder).generateRounds(numRounds),
        [numRounds, playerOrder],
    );
    const activeRound = tableTennisRounds[activeRoundIndex];

    const applyNumRounds = (rawValue: string) => {
        const parsed = Number(rawValue);
        const next = Number.isNaN(parsed) ? 10 : Math.min(30, Math.max(1, Math.floor(parsed)));
        setNumRounds(next);
        setNumRoundsInput(String(next));
        setActiveRoundIndex((prev) => Math.min(prev, next - 1));
    };

    const applyNumPlayers = (rawValue: string) => {
        const parsed = Number(rawValue);
        const next = Number.isNaN(parsed) ? 40 : Math.min(80, Math.max(4, Math.floor(parsed)));
        setNumPlayers(next);
        setNumPlayersInput(String(next));
        setPlayerOrder(Array.from({ length: next }, (_, index) => index + 1));
        setCreatedAt(new Date().toISOString());
        setActiveRoundIndex(0);
    };

    const persistHistory = (entries: HistoryEntry[]) => {
        setHistory(entries);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
    };
    const deleteHistoryItem = (id: string) => {
        const updated = history.filter((item) => item.id !== id);
        persistHistory(updated);
    };

    const saveCurrentToHistory = (nextCreatedAt?: string, nextOrder?: number[]) => {
        const snapshotCreatedAt = nextCreatedAt ?? createdAt;
        const snapshotOrder = nextOrder ?? playerOrder;

        const entry: HistoryEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            createdAt: snapshotCreatedAt,
            numPlayers,
            numRounds,
            rotateTables,
            playerOrder: snapshotOrder,
        };

        const updated = [entry, ...history].slice(0, 20);
        persistHistory(updated);
    };

    const handleExportPdf = () => {
        const html = buildPdfHtml(tableTennisRounds, createdAt, numPlayers, numRounds);
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            window.alert('ポップアップがブロックされました。許可してから再度お試しください。');
            return;
        }
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    return (
        <div className="min-h-screen about-band-white">
            <PageSeo
                title="卓球組み合わせ表ジェネレーター | TTI Intelligence"
                description="人数とクール数から卓球の組み合わせ表を自動生成するアプリです。"
            />
            <div className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                <Link
                    to="/app"
                    className="inline-flex items-center gap-2 text-sm text-[#0066CC] dark:text-[#2997FF] hover:underline mb-5"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Appsへ戻る
                </Link>

                <Card variant="elevated" className="accent-card-soft rounded-[24px] border border-black/5 dark:border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.07)]">
                    <CardContent className="p-6 sm:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                            <h1 className="apple-headline text-[#1D1D1F] dark:text-[#F5F5F7]">
                                卓球組み合わせ表ジェネレーター（{numPlayers}人）
                            </h1>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={handleExportPdf}>
                                    <FileDown className="w-4 h-4" />
                                    PDF出力
                                </Button>
                            </div>
                        </div>
                        <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-2">
                            人数とクール数を指定して、最大10台までの対戦を自動生成します。各クールで過去に同じ台になった人がなるべく重ならない組み合わせを選びます。
                        </p>
                        <p className="text-xs text-[#8A8A8E] dark:text-[rgba(235,235,245,0.45)] mb-5">
                            作成日時: {formatDateTime(createdAt)}
                        </p>

                        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-5">
                            <label className="flex flex-col gap-2 text-[14px] text-[#515154] dark:text-[rgba(235,235,245,0.72)]">
                                人数
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={numPlayersInput}
                                    onChange={(event) => {
                                        const digitsOnly = event.target.value.replace(/[^0-9]/g, '');
                                        setNumPlayersInput(digitsOnly);
                                    }}
                                    onBlur={() => applyNumPlayers(numPlayersInput)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            applyNumPlayers(numPlayersInput);
                                            (event.currentTarget as HTMLInputElement).blur();
                                        }
                                    }}
                                    className="w-28 rounded-lg border border-black/10 dark:border-white/20 bg-white dark:bg-[#1C1C1E] px-3 py-2 text-[15px] text-[#1D1D1F] dark:text-[#F5F5F7]"
                                />
                            </label>

                            <label className="flex flex-col gap-2 text-[14px] text-[#515154] dark:text-[rgba(235,235,245,0.72)]">
                                クール数
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={numRoundsInput}
                                    onChange={(event) => {
                                        const digitsOnly = event.target.value.replace(/[^0-9]/g, '');
                                        setNumRoundsInput(digitsOnly);
                                    }}
                                    onBlur={() => applyNumRounds(numRoundsInput)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            applyNumRounds(numRoundsInput);
                                            (event.currentTarget as HTMLInputElement).blur();
                                        }
                                    }}
                                    className="w-28 rounded-lg border border-black/10 dark:border-white/20 bg-white dark:bg-[#1C1C1E] px-3 py-2 text-[15px] text-[#1D1D1F] dark:text-[#F5F5F7]"
                                />
                            </label>

                            <Button size="sm" variant="outline" onClick={() => saveCurrentToHistory()}>
                                現在の設定を履歴保存
                            </Button>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                            {tableTennisRounds.map((_, index) => (
                                <button
                                    key={`round-${index + 1}`}
                                    type="button"
                                    onClick={() => setActiveRoundIndex(index)}
                                    className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                                        activeRoundIndex === index
                                            ? 'bg-[#0071E3] text-white'
                                            : 'bg-[#E8E8ED] text-[#3A3A3C] dark:bg-[#2C2C2E] dark:text-[#D1D1D6]'
                                    }`}
                                >
                                    {index + 1}クール目
                                </button>
                            ))}
                        </div>

                        {activeRound && (
                            <p className="text-xs text-[#8A8A8E] dark:text-[rgba(235,235,245,0.45)] mb-3">
                                稼働台数: {activeRound.activeTables}台 / 重複組合せ: {activeRound.penaltyScore}
                            </p>
                        )}

                        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
                            {activeRound?.matches.map((table, tableIndex) => (
                                <div
                                    key={`table-${tableIndex + 1}`}
                                    className="rounded-xl border border-black/10 dark:border-white/15 bg-[#FAFAFC] dark:bg-[#1A1A1C] p-4"
                                >
                                    <p className="text-[13px] font-semibold text-[#0071E3] dark:text-[#5CABFF] mb-1">台{tableIndex + 1}</p>
                                    <p className="text-[15px] text-[#1D1D1F] dark:text-[#F5F5F7] tracking-[-0.01em]">
                                        {formatMatch(table)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-black/10 dark:border-white/10">
                            <h2 className="text-[18px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-3">作成履歴</h2>
                            {history.length === 0 ? (
                                <p className="text-sm text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)]">まだ履歴はありません。</p>
                            ) : (
                                <div className="space-y-2">
                                    {history.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-black/10 dark:border-white/10 px-3 py-2"
                                        >
                                            <p className="text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">
                                                {formatDateTime(entry.createdAt)} / {entry.numPlayers ?? entry.playerOrder.length}人 / {entry.numRounds}クール / 最適化生成
                                            </p>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    const restoredNumPlayers = entry.numPlayers ?? entry.playerOrder.length;
                                                    setNumPlayers(restoredNumPlayers);
                                                    setNumPlayersInput(String(restoredNumPlayers));
                                                    setPlayerOrder(entry.playerOrder);
                                                    setNumRounds(entry.numRounds);
                                                    setNumRoundsInput(String(entry.numRounds));
                                                    setRotateTables(entry.rotateTables);
                                                    setCreatedAt(entry.createdAt);
                                                    setActiveRoundIndex(0);
                                                }}
                                            >
                                                この履歴を読み込む
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => deleteHistoryItem(entry.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                削除
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
