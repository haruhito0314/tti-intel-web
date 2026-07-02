import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Share2, Sparkles, Star, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui';

type ColorToken = 'sky' | 'mint' | 'coral' | 'sun' | 'violet' | 'rose';
type Bottle = ColorToken[];

const BOTTLE_SIZE = 8;
const PUZZLE_COLORS: ColorToken[] = ['sky', 'mint', 'coral', 'sun'];
const HARD_PUZZLE_COLORS: ColorToken[] = ['sky', 'mint', 'coral', 'sun', 'violet'];
const NORMAL_BOTTLE_COUNT = 6;
const PUZZLE_COUNT = 8;
const HARD_PUZZLE_COUNT = 10;
const GENERATION_ATTEMPTS = 120;
const HARD_GENERATION_ATTEMPTS = 180;
const MAX_LONGEST_RUN = 5;
const NORMAL_SOLVER_DEPTH = 80;
const HARD_SOLVER_DEPTH = 140;
const NORMAL_SOLVER_STATES = 18000;
const HARD_SOLVER_STATES = 50000;

const colorStyles: Record<ColorToken, string> = {
    sky: 'from-[#5AC8FA] to-[#007AFF]',
    mint: 'from-[#63E6BE] to-[#30D158]',
    coral: 'from-[#FF9F0A] to-[#FF453A]',
    sun: 'from-[#FFE066] to-[#FFD60A]',
    violet: 'from-[#BF5AF2] to-[#7D7AFF]',
    rose: 'from-[#FF8AC5] to-[#FF375F]',
};

const canvasColors: Record<ColorToken, string> = {
    sky: '#0A84FF',
    mint: '#30D158',
    coral: '#FF453A',
    sun: '#FFD60A',
    violet: '#7D7AFF',
    rose: '#FF375F',
};

function clonePuzzle(puzzle: Bottle[]): Bottle[] {
    return puzzle.map((bottle) => [...bottle]);
}

function createSeededRandom(seed: number): () => number {
    let value = seed;
    return () => {
        value = (value * 1664525 + 1013904223) % 4294967296;
        return value / 4294967296;
    };
}

function shuffleWithSeed<T>(values: T[], random: () => number): T[] {
    const next = [...values];
    for (let index = next.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
}

function getLongestRun(bottle: Bottle): number {
    let longest = 0;
    let current = 0;
    let previous: ColorToken | null = null;

    bottle.forEach((color) => {
        current = color === previous ? current + 1 : 1;
        previous = color;
        longest = Math.max(longest, current);
    });

    return longest;
}

function getTopGroup(bottle: Bottle): { color: ColorToken; count: number } | null {
    const color = bottle.at(-1);
    if (!color) return null;

    let count = 0;
    for (let index = bottle.length - 1; index >= 0; index -= 1) {
        if (bottle[index] !== color) break;
        count += 1;
    }

    return { color, count };
}

function canPour(puzzle: Bottle[], fromIndex: number, toIndex: number): boolean {
    if (fromIndex === toIndex) return false;

    const from = puzzle[fromIndex];
    const to = puzzle[toIndex];
    const topGroup = getTopGroup(from);
    if (!topGroup || to.length >= BOTTLE_SIZE) return false;

    const targetTop = to.at(-1);
    return !targetTop || targetTop === topGroup.color;
}

function pourBottle(puzzle: Bottle[], fromIndex: number, toIndex: number): Bottle[] {
    const next = clonePuzzle(puzzle);
    const from = next[fromIndex];
    const to = next[toIndex];
    const topGroup = getTopGroup(from);

    if (!topGroup || !canPour(puzzle, fromIndex, toIndex)) return next;

    const pourCount = Math.min(topGroup.count, BOTTLE_SIZE - to.length);
    for (let count = 0; count < pourCount; count += 1) {
        const color = from.pop();
        if (color) to.push(color);
    }

    return next;
}

function isUniformBottle(bottle: Bottle): boolean {
    return bottle.length > 0 && bottle.every((color) => color === bottle[0]);
}

function serializePuzzle(puzzle: Bottle[]): string {
    return puzzle
        .map((bottle) => bottle.join(','))
        .sort()
        .join('|');
}

function getLegalMoves(puzzle: Bottle[]): { from: number; to: number }[] {
    const moves: { from: number; to: number }[] = [];

    for (let from = 0; from < puzzle.length; from += 1) {
        const source = puzzle[from];
        if (source.length === 0) continue;
        if (source.length === BOTTLE_SIZE && isUniformBottle(source)) continue;

        for (let to = 0; to < puzzle.length; to += 1) {
            if (!canPour(puzzle, from, to)) continue;

            const target = puzzle[to];
            if (target.length === 0 && isUniformBottle(source)) continue;
            moves.push({ from, to });
        }
    }

    return moves.sort((a, b) => {
        const aTargetEmpty = puzzle[a.to].length === 0 ? 1 : 0;
        const bTargetEmpty = puzzle[b.to].length === 0 ? 1 : 0;
        return aTargetEmpty - bTargetEmpty;
    });
}

function canSolvePuzzle(puzzle: Bottle[], maxDepth: number, maxStates: number): boolean {
    const seen = new Map<string, number>();
    const stack: { puzzle: Bottle[]; depth: number }[] = [{ puzzle: clonePuzzle(puzzle), depth: 0 }];
    let exploredStates = 0;

    while (stack.length > 0 && exploredStates < maxStates) {
        const current = stack.pop();
        if (!current) break;

        const key = serializePuzzle(current.puzzle);
        const seenDepth = seen.get(key);
        if (seenDepth !== undefined && seenDepth <= current.depth) continue;

        seen.set(key, current.depth);
        exploredStates += 1;

        if (isSolved(current.puzzle)) return true;
        if (current.depth >= maxDepth) continue;

        const moves = getLegalMoves(current.puzzle);
        for (let index = moves.length - 1; index >= 0; index -= 1) {
            const move = moves[index];
            stack.push({
                puzzle: pourBottle(current.puzzle, move.from, move.to),
                depth: current.depth + 1,
            });
        }
    }

    return false;
}

function buildFallbackPuzzle(): Bottle[] {
    const colors = PUZZLE_COLORS.flatMap((color) => Array.from({ length: BOTTLE_SIZE }, () => color));
    return Array.from({ length: NORMAL_BOTTLE_COUNT }, (_, index) => (
        colors.slice(index * BOTTLE_SIZE, (index + 1) * BOTTLE_SIZE)
    ));
}

function buildSolvedPuzzle(colors: ColorToken[], emptyBottleCount: number): Bottle[] {
    return [
        ...colors.map((color) => Array.from({ length: BOTTLE_SIZE }, () => color)),
        ...Array.from({ length: emptyBottleCount }, () => [] as Bottle),
    ];
}

function moveSingleLayer(puzzle: Bottle[], fromIndex: number, toIndex: number): Bottle[] {
    const next = clonePuzzle(puzzle);
    const color = next[fromIndex].pop();
    if (color) next[toIndex].push(color);
    return next;
}

function scoreRandomness(puzzle: Bottle[]): number {
    const filledBottles = puzzle.filter((bottle) => bottle.length > 0);
    const longestRunPenalty = filledBottles.reduce((score, bottle) => score + Math.max(0, getLongestRun(bottle) - 3), 0);
    const fullSameColorPenalty = filledBottles.filter((bottle) => (
        bottle.length === BOTTLE_SIZE && bottle.every((color) => color === bottle[0])
    )).length * 4;
    const partialBottleBonus = filledBottles.filter((bottle) => bottle.length > 0 && bottle.length < BOTTLE_SIZE).length;
    const topColorVariety = new Set(filledBottles.map((bottle) => bottle.at(-1))).size;

    return partialBottleBonus * 3 + topColorVariety - longestRunPenalty * 2 - fullSameColorPenalty;
}

function buildRandomDistributionPreset(seed: number): Bottle[] {
    const colors = PUZZLE_COLORS.flatMap((color) => Array.from({ length: BOTTLE_SIZE }, () => color));
    let bestSolvablePuzzle: Bottle[] | null = null;
    let bestSolvableScore = Number.NEGATIVE_INFINITY;

    for (let attempt = 0; attempt < GENERATION_ATTEMPTS; attempt += 1) {
        const random = createSeededRandom(seed + attempt * 9973);
        const shuffled = shuffleWithSeed(colors, random);
        const bottleSizes = buildRandomBottleSizes(shuffled.length, NORMAL_BOTTLE_COUNT, random);
        const puzzle = bottleSizes.reduce<Bottle[]>((bottles, size) => {
            const used = bottles.reduce((count, bottle) => count + bottle.length, 0);
            bottles.push(shuffled.slice(used, used + size));
            return bottles;
        }, []);
        const score = scoreRandomness(puzzle);

        const hasLargeBlock = puzzle.some((bottle) => getLongestRun(bottle) > MAX_LONGEST_RUN);
        const hasSolvedBottle = puzzle.some((bottle) => bottle.length === BOTTLE_SIZE && bottle.every((color) => color === bottle[0]));
        const emptyBottleCount = puzzle.filter((bottle) => bottle.length === 0).length;
        const solvable = canSolvePuzzle(puzzle, NORMAL_SOLVER_DEPTH, NORMAL_SOLVER_STATES);

        if (solvable && score > bestSolvableScore) {
            bestSolvablePuzzle = puzzle;
            bestSolvableScore = score;
        }

        if (solvable && !hasLargeBlock && !hasSolvedBottle && emptyBottleCount <= 1) {
            return puzzle;
        }
    }

    return bestSolvablePuzzle ?? buildFallbackPuzzle();
}

function buildRandomBottleSizes(totalLayers: number, bottleCount: number, random: () => number): number[] {
    const sizes = Array.from({ length: bottleCount }, () => 0);

    for (let layer = 0; layer < totalLayers; layer += 1) {
        const availableIndexes = sizes
            .map((size, index) => ({ size, index }))
            .filter(({ size }) => size < BOTTLE_SIZE)
            .map(({ index }) => index);
        const index = availableIndexes[Math.floor(random() * availableIndexes.length)];
        sizes[index] += 1;
    }

    return sizes;
}

function scoreHardness(puzzle: Bottle[]): number {
    const filledBottles = puzzle.filter((bottle) => bottle.length > 0);
    const partialBottleCount = filledBottles.filter((bottle) => bottle.length < BOTTLE_SIZE).length;
    const topColorVariety = new Set(filledBottles.map((bottle) => bottle.at(-1))).size;
    const solvedBottlePenalty = filledBottles.filter((bottle) => (
        bottle.length === BOTTLE_SIZE && bottle.every((color) => color === bottle[0])
    )).length * 8;
    const longRunPenalty = filledBottles.reduce((score, bottle) => score + Math.max(0, getLongestRun(bottle) - 3), 0) * 3;

    return partialBottleCount * 4 + topColorVariety - solvedBottlePenalty - longRunPenalty;
}

function buildHardPuzzlePreset(seed: number): Bottle[] {
    let bestSolvablePuzzle: Bottle[] | null = null;
    let bestSolvableScore = Number.NEGATIVE_INFINITY;

    for (let attempt = 0; attempt < HARD_GENERATION_ATTEMPTS; attempt += 1) {
        const random = createSeededRandom(seed + attempt * 12007);
        let puzzle = buildSolvedPuzzle(HARD_PUZZLE_COLORS, 1);
        let previousMove: { from: number; to: number } | null = null;

        for (let step = 0; step < 260; step += 1) {
            const moves: { from: number; to: number }[] = [];

            for (let from = 0; from < puzzle.length; from += 1) {
                if (puzzle[from].length === 0) continue;

                for (let to = 0; to < puzzle.length; to += 1) {
                    if (from === to || puzzle[to].length >= BOTTLE_SIZE) continue;
                    if (previousMove?.from === to && previousMove.to === from) continue;
                    moves.push({ from, to });
                }
            }

            if (moves.length === 0) break;

            const move = moves[Math.floor(random() * moves.length)];
            puzzle = moveSingleLayer(puzzle, move.from, move.to);
            previousMove = move;
        }

        const score = scoreHardness(puzzle);
        const solvedBottleCount = puzzle.filter((bottle) => (
            bottle.length === BOTTLE_SIZE && bottle.every((color) => color === bottle[0])
        )).length;
        const partialBottleCount = puzzle.filter((bottle) => bottle.length > 0 && bottle.length < BOTTLE_SIZE).length;
        const hasLargeBlock = puzzle.some((bottle) => getLongestRun(bottle) > 4);
        const solvable = canSolvePuzzle(puzzle, HARD_SOLVER_DEPTH, HARD_SOLVER_STATES);

        if (solvable && score > bestSolvableScore) {
            bestSolvablePuzzle = puzzle;
            bestSolvableScore = score;
        }

        if (solvable && solvedBottleCount === 0 && partialBottleCount >= 5 && !hasLargeBlock) {
            return puzzle;
        }
    }

    return bestSolvablePuzzle ?? buildSolvedPuzzle(HARD_PUZZLE_COLORS, 1);
}

const puzzlePresets = Array.from({ length: PUZZLE_COUNT }, (_, index) => (
    buildRandomDistributionPreset(209759 + index * 8191)
));
const hardPuzzlePresets = Array.from({ length: HARD_PUZZLE_COUNT }, (_, index) => (
    buildHardPuzzlePreset(314159 + index * 8191)
));

function isSolved(puzzle: Bottle[]): boolean {
    return puzzle.every((bottle) => {
        if (bottle.length === 0) return true;
        if (bottle.length !== BOTTLE_SIZE) return false;
        return bottle.every((color) => color === bottle[0]);
    });
}

function createShareText(moves: number): string {
    return `カラーソートパズルを${moves}手で解けました！`;
}

function getShareUrl(): string {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/app/color-sort`;
}

async function createShareImage(puzzle: Bottle[], moves: number): Promise<File | null> {
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    const width = 1200;
    const height = 675;
    const scale = window.devicePixelRatio || 1;
    canvas.width = width * scale;
    canvas.height = height * scale;

    const context = canvas.getContext('2d');
    if (!context) return null;

    context.scale(scale, scale);
    context.fillStyle = '#F5F5F7';
    context.fillRect(0, 0, width, height);

    context.fillStyle = '#FFFFFF';
    context.shadowColor = 'rgba(0, 0, 0, 0.12)';
    context.shadowBlur = 34;
    context.shadowOffsetY = 18;
    roundRect(context, 96, 76, width - 192, height - 152, 36);
    context.fill();
    context.shadowColor = 'transparent';

    context.fillStyle = '#1D1D1F';
    context.font = '700 54px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    context.fillText('Color Sort Puzzle', 152, 164);

    context.fillStyle = '#6E6E73';
    context.font = '500 30px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    context.fillText(`${moves} moves cleared`, 152, 210);

    const bottleWidth = 82;
    const bottleHeight = 310;
    const gap = 28;
    const totalWidth = puzzle.length * bottleWidth + (puzzle.length - 1) * gap;
    const startX = (width - totalWidth) / 2;
    const startY = 268;

    puzzle.forEach((bottle, index) => {
        const x = startX + index * (bottleWidth + gap);
        drawShareBottle(context, bottle, x, startY, bottleWidth, bottleHeight);
    });

    context.fillStyle = '#86868B';
    context.font = '500 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    context.fillText(getShareUrl(), 152, 590);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    return blob ? new File([blob], 'color-sort-result.png', { type: 'image/png' }) : null;
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
}

function drawShareBottle(
    context: CanvasRenderingContext2D,
    bottle: Bottle,
    x: number,
    y: number,
    width: number,
    height: number,
) {
    context.save();
    roundRect(context, x, y, width, height, 28);
    context.fillStyle = 'rgba(255, 255, 255, 0.58)';
    context.fill();
    context.strokeStyle = 'rgba(0, 0, 0, 0.14)';
    context.lineWidth = 2;
    context.stroke();
    context.clip();

    const padding = 10;
    const liquidWidth = width - padding * 2;
    const liquidHeight = height - 28;
    const layerHeight = liquidHeight / BOTTLE_SIZE;
    bottle.forEach((color, layerIndex) => {
        context.fillStyle = canvasColors[color];
        context.fillRect(
            x + padding,
            y + height - 12 - (layerIndex + 1) * layerHeight,
            liquidWidth,
            layerHeight + 1,
        );
    });

    const highlight = context.createLinearGradient(x, y, x + width, y);
    highlight.addColorStop(0, 'rgba(255,255,255,0.56)');
    highlight.addColorStop(0.45, 'rgba(255,255,255,0.08)');
    highlight.addColorStop(1, 'rgba(0,0,0,0.04)');
    context.fillStyle = highlight;
    context.fillRect(x, y, width, height);
    context.restore();
}

function BottleView({
    bottle,
    index,
    isSelected,
    isPourTarget,
    onClick,
}: {
    bottle: Bottle;
    index: number;
    isSelected: boolean;
    isPourTarget: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`ボトル ${index + 1}`}
            className={`group relative h-[300px] w-[68px] sm:h-[360px] sm:w-[86px] rounded-b-[28px] rounded-t-[18px] border transition-all duration-300 ${
                isSelected
                    ? 'border-[#0071E3] shadow-[0_22px_50px_rgba(0,113,227,0.22)] -translate-y-3'
                    : isPourTarget
                      ? 'border-[#30D158] shadow-[0_22px_50px_rgba(48,209,88,0.2)] -translate-y-1'
                    : 'border-black/10 dark:border-white/14 shadow-[0_18px_45px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(0,0,0,0.12)]'
            } bg-white/55 dark:bg-white/[0.06] backdrop-blur-xl overflow-hidden`}
        >
            <span className="absolute inset-x-3 top-2 h-3 rounded-full bg-white/70 dark:bg-white/20" />
            <span className="absolute inset-0 rounded-b-[28px] rounded-t-[18px] bg-gradient-to-r from-white/45 via-transparent to-black/[0.03] pointer-events-none" />
            <span className="absolute inset-x-[10px] bottom-[10px] flex h-[calc(100%-30px)] flex-col-reverse overflow-hidden rounded-b-[22px] rounded-t-[10px]">
                {Array.from({ length: BOTTLE_SIZE }, (_, layerIndex) => {
                    const color = bottle[layerIndex];
                    return (
                        <span
                            key={layerIndex}
                            className={`h-[12.5%] border-t border-white/45 transition-all duration-300 ${
                                color ? `bg-gradient-to-br ${colorStyles[color]}` : 'bg-white/20 dark:bg-white/[0.03]'
                            }`}
                        />
                    );
                })}
            </span>
        </button>
    );
}

export function ColorSortPuzzlePage() {
    const [presetIndex, setPresetIndex] = useState(0);
    const [hardPresetIndex, setHardPresetIndex] = useState(0);
    const [isHardPuzzle, setIsHardPuzzle] = useState(false);
    const [initialPuzzle, setInitialPuzzle] = useState<Bottle[]>(() => clonePuzzle(puzzlePresets[0]));
    const [puzzle, setPuzzle] = useState<Bottle[]>(() => clonePuzzle(puzzlePresets[0]));
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [history, setHistory] = useState<Bottle[][]>([]);
    const [moveHint, setMoveHint] = useState('');

    const solved = useMemo(() => isSolved(puzzle), [puzzle]);
    const filledBottleCount = puzzle.filter((bottle) => bottle.length === BOTTLE_SIZE).length;
    const pourTargetIndexes = useMemo(() => (
        selectedIndex === null
            ? []
            : puzzle.map((_, index) => index).filter((index) => canPour(puzzle, selectedIndex, index))
    ), [puzzle, selectedIndex]);

    const loadPreset = (nextIndex: number) => {
        const normalizedIndex = nextIndex % puzzlePresets.length;
        const nextPuzzleState = clonePuzzle(puzzlePresets[normalizedIndex]);
        setPresetIndex(normalizedIndex);
        setIsHardPuzzle(false);
        setInitialPuzzle(clonePuzzle(nextPuzzleState));
        setPuzzle(nextPuzzleState);
        setSelectedIndex(null);
        setHistory([]);
        setMoveHint('');
    };

    const toggleHardPreset = () => {
        if (isHardPuzzle) {
            loadPreset(presetIndex);
            return;
        }

        const normalizedIndex = hardPresetIndex % hardPuzzlePresets.length;
        const nextPuzzleState = clonePuzzle(hardPuzzlePresets[normalizedIndex]);
        setHardPresetIndex((prev) => (prev + 1) % hardPuzzlePresets.length);
        setIsHardPuzzle(true);
        setInitialPuzzle(clonePuzzle(nextPuzzleState));
        setPuzzle(nextPuzzleState);
        setSelectedIndex(null);
        setHistory([]);
        setMoveHint('星モードです。');
    };

    const reset = () => {
        setPuzzle(clonePuzzle(initialPuzzle));
        setSelectedIndex(null);
        setHistory([]);
        setMoveHint('');
    };

    const handleBottleClick = (index: number) => {
        if (solved) return;

        if (selectedIndex === null) {
            if (puzzle[index].length > 0) {
                setSelectedIndex(index);
                setMoveHint('光っているボトルに注げます。');
            }
            return;
        }

        if (selectedIndex === index) {
            setSelectedIndex(null);
            setMoveHint('');
            return;
        }

        if (!canPour(puzzle, selectedIndex, index)) {
            if (puzzle[index].length >= BOTTLE_SIZE) {
                setMoveHint('満タンのボトルには注げません。空きのあるボトルを選んでください。');
                return;
            }

            if (puzzle[index].length > 0) {
                setSelectedIndex(index);
                setMoveHint('移動元を切り替えました。光っているボトルに注げます。');
                return;
            }

            setMoveHint('同じ色の上、または空のボトルにだけ注げます。');
            return;
        }

        setHistory((entries) => [...entries, clonePuzzle(puzzle)]);
        setPuzzle((current) => pourBottle(current, selectedIndex, index));
        setSelectedIndex(null);
        setMoveHint('');
    };

    const undo = () => {
        setHistory((entries) => {
            const previous = entries.at(-1);
            if (!previous) return entries;
            setPuzzle(clonePuzzle(previous));
            setSelectedIndex(null);
            setMoveHint('');
            return entries.slice(0, -1);
        });
    };

    const nextPuzzle = () => loadPreset(presetIndex + 1);
    const shareResult = async () => {
        const text = createShareText(history.length);
        const url = getShareUrl();

        try {
            const image = await createShareImage(puzzle, history.length);

            if (
                image &&
                navigator.canShare?.({ files: [image] }) &&
                navigator.share
            ) {
                await navigator.share({
                    title: 'カラーソートパズル',
                    text,
                    url,
                    files: [image],
                });
                return;
            }
        } catch (error) {
            console.warn('Image share failed. Falling back to X intent.', error);
        }

        const intentUrl = new URL('https://twitter.com/intent/tweet');
        intentUrl.searchParams.set('text', text);
        intentUrl.searchParams.set('url', url);
        window.open(intentUrl.toString(), '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] dark:bg-[#000] dark:text-[#F5F5F7]">
            <section className="relative overflow-hidden border-b border-black/5 dark:border-white/10 bg-white dark:bg-[#050505]">
                <div className="mx-auto max-w-[1120px] px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
                    <Link
                        to="/app"
                        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#0066CC] dark:text-[#2997FF] hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        アプリに戻る
                    </Link>

                    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.58fr)] lg:items-end">
                        <div>
                            <p className="mb-3 text-sm font-semibold text-[#86868B] dark:text-[rgba(235,235,245,0.55)]">
                                Color Sort Puzzle
                            </p>
                            <h1 className="apple-hero mb-5 max-w-3xl">
                                カラーソートパズル
                            </h1>
                            <p className="apple-body max-w-2xl leading-relaxed text-[#6E6E73] dark:text-[rgba(235,235,245,0.68)]">
                                ボトルを選んで、同じ色だけを静かに注ぎ分けるパズルです。すべての色が美しく揃ったらクリア。
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 rounded-[28px] border border-black/5 bg-[#F5F5F7] p-3 dark:border-white/10 dark:bg-white/[0.04]">
                            <div className="rounded-[20px] bg-white px-4 py-4 text-center shadow-sm dark:bg-white/[0.06]">
                                <p className="text-xs text-[#86868B]">Moves</p>
                                <p className="mt-1 text-2xl font-semibold">{history.length}</p>
                            </div>
                            <div className="rounded-[20px] bg-white px-4 py-4 text-center shadow-sm dark:bg-white/[0.06]">
                                <p className="text-xs text-[#86868B]">Puzzle</p>
                                <p className="mt-1 text-2xl font-semibold">{isHardPuzzle ? '★' : presetIndex + 1}</p>
                            </div>
                            <div className="rounded-[20px] bg-white px-4 py-4 text-center shadow-sm dark:bg-white/[0.06]">
                                <p className="text-xs text-[#86868B]">Full</p>
                                <p className="mt-1 text-2xl font-semibold">{filledBottleCount}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-[1120px] px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
                <div className="rounded-[32px] border border-black/5 bg-white/82 p-5 shadow-[0_28px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055] sm:p-8">
                    <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                        <div className="h-[58px] overflow-hidden">
                            <h2 className="flex h-7 items-center gap-2 overflow-hidden text-xl font-semibold tracking-normal">
                                <span>{solved ? '完成しました' : selectedIndex === null ? 'ボトルを選択' : '注ぎ先を選択'}</span>
                                {isHardPuzzle && (
                                    <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-[#FFD60A]/20 px-3 text-xs font-semibold text-[#7A5A00] dark:bg-[#FFD60A]/18 dark:text-[#FFD60A]">
                                        <Star className="h-3.5 w-3.5" />
                                        星モード
                                    </span>
                                )}
                            </h2>
                            <p className="mt-1 h-5 truncate text-sm text-[#6E6E73] dark:text-[rgba(235,235,245,0.62)]">
                                {solved ? '整った色面が、なかなか気持ちいい。' : moveHint || '同じ色の上、または空のボトルにだけ注げます。'}
                            </p>
                        </div>

                        <div className="flex w-full flex-col gap-2 lg:w-auto lg:items-end">
                            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-5">
                                <Button type="button" variant="secondary" onClick={undo} disabled={history.length === 0}>
                                    <Undo2 className="h-4 w-4" />
                                    戻す
                                </Button>
                                <Button type="button" variant="secondary" onClick={reset}>
                                    <RotateCcw className="h-4 w-4" />
                                    リセット
                                </Button>
                                <Button type="button" onClick={nextPuzzle}>
                                    <Sparkles className="h-4 w-4" />
                                    新しい問題
                                </Button>
                                <Button type="button" variant={isHardPuzzle ? 'primary' : 'secondary'} onClick={toggleHardPreset}>
                                    <Star className="h-4 w-4" />
                                    星
                                </Button>
                                <Button type="button" variant="secondary" onClick={shareResult} disabled={!solved}>
                                    <Share2 className="h-4 w-4" />
                                    シェア
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex min-h-[360px] flex-wrap items-end justify-center gap-4 rounded-[24px] bg-[#F5F5F7] px-4 py-8 dark:bg-black/30 sm:min-h-[430px] sm:gap-7 sm:px-8">
                        {puzzle.map((bottle, index) => (
                            <BottleView
                                key={index}
                                bottle={bottle}
                                index={index}
                                isSelected={selectedIndex === index}
                                isPourTarget={pourTargetIndexes.includes(index)}
                                onClick={() => handleBottleClick(index)}
                            />
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
