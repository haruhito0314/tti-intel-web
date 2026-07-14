import { BottleView } from './BottleView';
import { isCompletedBottle } from './game';
import type { Puzzle, PuzzleModeConfig } from './types';

interface Props {
    puzzle: Puzzle;
    config: PuzzleModeConfig;
    selectedIndex: number | null;
    legalTargets: number[];
    status: string;
    disabled: boolean;
    onBottleClick: (index: number) => void;
}

export function ColorSortBoard({
    puzzle,
    config,
    selectedIndex,
    legalTargets,
    status,
    disabled,
    onBottleClick,
}: Props) {
    return (
        <section
            aria-label="カラーボトル盤面"
            className="w-full min-w-0 overflow-x-clip rounded-[24px] bg-[#F5F5F7] p-3 dark:bg-black/30 sm:p-5"
        >
            <p
                role="status"
                aria-live="polite"
                className="mb-3 min-h-6 text-center text-sm text-[#6E6E73] dark:text-[rgba(235,235,245,0.7)]"
            >
                {status || 'ボトルを選んでください。'}
            </p>
            <div
                data-testid="color-sort-board"
                className="grid min-w-0 grid-cols-3 grid-rows-2 place-items-end gap-x-3 gap-y-4 sm:gap-x-6 sm:gap-y-6 lg:grid-cols-6 lg:grid-rows-1"
            >
                {puzzle.map((bottle, index) => (
                    <BottleView
                        key={index}
                        bottle={bottle}
                        index={index}
                        capacity={config.capacity}
                        selected={selectedIndex === index}
                        legalTarget={legalTargets.includes(index)}
                        completed={isCompletedBottle(bottle, config.capacity)}
                        disabled={disabled}
                        onClick={() => onBottleClick(index)}
                    />
                ))}
            </div>
        </section>
    );
}
