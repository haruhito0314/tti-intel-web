import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileDown, Shuffle, Trash2 } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';

type PlayerSlot = number | null;
type TableMatch = [PlayerSlot, PlayerSlot, PlayerSlot, PlayerSlot];

type HistoryEntry = {
    id: string;
    createdAt: string;
    numPlayers?: number;
    numRounds: number;
    rotateTables: boolean;
    playerOrder: number[];
};

const HISTORY_KEY = 'table-tennis-history-v1';

class TableTennisMatchMaker {
    numTables: number;
    tables: TableMatch[];

    constructor(players: number[]) {
        this.numTables = Math.ceil(players.length / 4);
        this.tables = this.initializeTables(players);
    }

    initializeTables(players: number[]): TableMatch[] {
        return Array.from({ length: this.numTables }, (_, i) => [
            players[4 * i] ?? null,
            players[4 * i + 1] ?? null,
            players[4 * i + 2] ?? null,
            players[4 * i + 3] ?? null,
        ]);
    }

    generateRounds(numRounds: number, rotateTables = true): TableMatch[][] {
        const allRounds: TableMatch[][] = [];

        for (let roundIndex = 0; roundIndex < numRounds; roundIndex += 1) {
            const currentMatches = this.tables.map((table) => [...table] as TableMatch);

            if (rotateTables) {
                allRounds.push(currentMatches);
            } else {
                const shift = roundIndex % this.numTables;
                if (shift === 0) {
                    allRounds.push(currentMatches);
                } else {
                    allRounds.push([...currentMatches.slice(-shift), ...currentMatches.slice(0, -shift)]);
                }
            }

            this.movePlayers();
        }

        return allRounds;
    }

    movePlayers(): void {
        const nextTables: TableMatch[] = Array.from({ length: this.numTables }, () => [0, 0, 0, 0]);

        for (let i = 0; i < this.numTables; i += 1) {
            const prevTableIndex = (i - 1 + this.numTables) % this.numTables;
            nextTables[prevTableIndex][3] = this.tables[i][0];
            nextTables[prevTableIndex][1] = this.tables[i][1];
            nextTables[i][2] = this.tables[i][2];
            nextTables[i][0] = this.tables[i][3];
        }

        this.tables = nextTables;
    }
}

function shufflePlayers(values: number[]): number[] {
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
    return value === null ? '休み' : String(value);
}

function formatMatch(table: TableMatch): string {
    return `(${formatPlayerSlot(table[0])}, ${formatPlayerSlot(table[1])}) vs (${formatPlayerSlot(table[2])}, ${formatPlayerSlot(table[3])})`;
}

function buildPdfHtml(rounds: TableMatch[][], createdAt: string, numPlayers: number, numRounds: number, rotateTables: boolean): string {
    const sections = rounds
        .map(
            (round, roundIndex) => `
            <section style="margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid; border: 1px solid #ddd; border-radius: 8px; padding: 10px;">
                <h2 style="font-size: 16px; margin: 0 0 8px;">${roundIndex + 1}クール目</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #ccc; text-align: left; padding: 6px; width: 72px;">台</th>
                            <th style="border: 1px solid #ccc; text-align: left; padding: 6px;">組み合わせ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${round
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
        <p style="margin: 0 0 18px; font-size: 12px;">人数: ${numPlayers} / クール数: ${numRounds} / 台ローテーション: ${rotateTables ? '有効' : '無効'}</p>
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
    const [rotateTables, setRotateTables] = useState(true);
    const [activeRoundIndex, setActiveRoundIndex] = useState(0);
    const [playerOrder, setPlayerOrder] = useState<number[]>(
        Array.from({ length: 40 }, (_, index) => index + 1),
    );
    const [createdAt, setCreatedAt] = useState(new Date().toISOString());
    const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

    const tableTennisRounds = useMemo(
        () => new TableTennisMatchMaker(playerOrder).generateRounds(numRounds, rotateTables),
        [numRounds, playerOrder, rotateTables],
    );
    const activeRound = tableTennisRounds[activeRoundIndex] ?? [];

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

    const handleShuffle = () => {
        const shuffled = shufflePlayers(playerOrder);
        const now = new Date().toISOString();
        setPlayerOrder(shuffled);
        setCreatedAt(now);
        setActiveRoundIndex(0);
        saveCurrentToHistory(now, shuffled);
    };

    const handleExportPdf = () => {
        const html = buildPdfHtml(tableTennisRounds, createdAt, numPlayers, numRounds, rotateTables);
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
                                <Button size="sm" variant="outline" onClick={handleShuffle}>
                                    <Shuffle className="w-4 h-4" />
                                    番号をシャッフル
                                </Button>
                            </div>
                        </div>
                        <p className="apple-footnote text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-2">
                            人数とクール数を指定して、{Math.ceil(numPlayers / 4)}台分の対戦を自動生成します。4人に満たない台は休み枠として表示します。
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

                            <label className="inline-flex items-center gap-2 text-[14px] text-[#515154] dark:text-[rgba(235,235,245,0.72)]">
                                <input
                                    type="checkbox"
                                    checked={rotateTables}
                                    onChange={(event) => setRotateTables(event.target.checked)}
                                    className="h-4 w-4"
                                />
                                台ローテーションを有効化
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

                        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
                            {activeRound.map((table, tableIndex) => (
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
                                                {formatDateTime(entry.createdAt)} / {entry.numPlayers ?? entry.playerOrder.length}人 / {entry.numRounds}クール / 台ローテーション:{' '}
                                                {entry.rotateTables ? '有効' : '無効'}
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
