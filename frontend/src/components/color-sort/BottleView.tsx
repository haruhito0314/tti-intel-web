import type { CSSProperties } from 'react';
import { COLOR_META } from './config';
import type { Bottle } from './types';

interface Props {
    bottle: Bottle;
    index: number;
    capacity: number;
    selected: boolean;
    legalTarget: boolean;
    completed: boolean;
    disabled: boolean;
    onClick: () => void;
}

function describeContents(bottle: Bottle): string {
    if (bottle.length === 0) return '空';

    const groups: { color: Bottle[number]; count: number }[] = [];
    for (const color of [...bottle].reverse()) {
        const last = groups.at(-1);
        if (last?.color === color) {
            last.count += 1;
        } else {
            groups.push({ color, count: 1 });
        }
    }

    return `上から${groups
        .map(({ color, count }) => `${COLOR_META[color].label}${count}層`)
        .join('、')}`;
}

export function BottleView({
    bottle,
    index,
    capacity,
    selected,
    legalTarget,
    completed,
    disabled,
    onClick,
}: Props) {
    const state = [selected && '選択中', legalTarget && '注げます', completed && '完成']
        .filter(Boolean)
        .join('、');
    const label = `ボトル ${index + 1}、${bottle.length}/${capacity}、${describeContents(bottle)}${state ? `、${state}` : ''}`;

    return (
        <button
            type="button"
            aria-label={label}
            aria-pressed={selected}
            disabled={disabled || completed}
            onClick={onClick}
            style={{ '--slot-count': capacity } as CSSProperties}
            className={`relative min-h-11 min-w-11 [width:clamp(52px,18vw,68px)] [height:clamp(136px,28svh,190px)] overflow-hidden rounded-b-[24px] rounded-t-[16px] border bg-white/55 backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-200 motion-reduce:transform-none motion-reduce:transition-none ${selected ? '-translate-y-2 border-[#0071E3] shadow-[0_16px_36px_rgba(0,113,227,0.22)]' : legalTarget ? 'border-[#30D158] shadow-[0_12px_28px_rgba(48,209,88,0.2)]' : 'border-black/10 dark:border-white/15'}`}
        >
            <span
                aria-hidden="true"
                className="absolute inset-x-2 bottom-2 top-5 flex flex-col-reverse overflow-hidden rounded-b-[18px] rounded-t-[8px]"
            >
                {Array.from({ length: capacity }, (_, layerIndex) => {
                    const color = bottle[layerIndex];
                    return (
                        <span
                            key={layerIndex}
                            data-layer-slot=""
                            style={{ height: 'calc(100% / var(--slot-count))' }}
                            className={
                                color
                                    ? `border-t border-white/45 bg-gradient-to-br ${COLOR_META[color].gradient}`
                                    : 'border-t border-white/20 bg-white/20 dark:bg-white/[0.03]'
                            }
                        />
                    );
                })}
            </span>

            {legalTarget && (
                <span
                    aria-hidden="true"
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-[#30D158] text-sm font-bold text-white"
                >
                    ✓
                </span>
            )}
            {completed && (
                <span
                    aria-hidden="true"
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-[#0071E3] text-sm font-bold text-white"
                >
                    ✓
                </span>
            )}
            {selected && (
                <span
                    aria-hidden="true"
                    className="absolute inset-x-1 top-1 text-[10px] font-semibold text-[#0071E3]"
                >
                    選択中
                </span>
            )}
        </button>
    );
}
