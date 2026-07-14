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
            className={`relative min-h-11 min-w-11 [width:clamp(52px,18vw,68px)] [height:clamp(136px,28svh,190px)] lg:[width:clamp(80px,9vw,96px)] lg:[height:clamp(210px,32svh,250px)] overflow-hidden rounded-b-[24px] rounded-t-[16px] border bg-white/55 backdrop-blur-xl transition-[translate,box-shadow,border-color] duration-200 motion-reduce:translate-y-0 motion-reduce:transition-none ${selected ? '-translate-y-2 border-[#0071E3] shadow-[0_16px_36px_rgba(0,113,227,0.22)]' : legalTarget ? 'border-[#176B34] shadow-[0_12px_28px_rgba(23,107,52,0.25)]' : completed ? 'border-[#0057A8] shadow-[0_12px_28px_rgba(0,87,168,0.22)]' : 'border-black/10 dark:border-white/15'}`}
        >
            <span
                aria-hidden="true"
                data-layer-stack=""
                className="absolute inset-x-2 bottom-2 top-5 flex flex-col-reverse overflow-hidden rounded-b-[18px] rounded-t-[8px]"
            >
                {Array.from({ length: capacity }, (_, layerIndex) => {
                    const color = bottle[layerIndex];
                    return (
                        <span
                            key={layerIndex}
                            data-layer-slot=""
                            data-layer-index={layerIndex}
                            data-color-token={color}
                            style={{ height: 'calc(100% / var(--slot-count))' }}
                            className={
                                color
                                    ? `relative border-t border-white/45 bg-gradient-to-br ${COLOR_META[color].gradient}`
                                    : 'relative border-t border-white/20 bg-white/20 dark:bg-white/[0.03]'
                            }
                        >
                        </span>
                    );
                })}
            </span>

            {legalTarget && (
                <span
                    aria-hidden="true"
                    data-state-marker="legal"
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-[#176B34] text-base font-bold leading-none text-white"
                >
                    ↓
                </span>
            )}
            {completed && (
                <span
                    aria-hidden="true"
                    data-state-marker="completed"
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-[#0057A8] text-sm font-bold text-white"
                >
                    ✓
                </span>
            )}
            {selected && (
                <span
                    aria-hidden="true"
                    data-state-marker="selected"
                    className="absolute inset-x-1 top-1 rounded-full bg-[#0057A8] px-1 py-0.5 text-[10px] font-semibold leading-none text-white shadow-sm"
                >
                    選択中
                </span>
            )}
        </button>
    );
}
