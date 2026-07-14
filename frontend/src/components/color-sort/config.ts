import type { ColorToken, PuzzleMode, PuzzleModeConfig } from './types';

export const COLOR_META: Record<ColorToken, { label: string; gradient: string; canvas: string }> = {
    sky: { label: '青', gradient: 'from-[#5AC8FA] to-[#007AFF]', canvas: '#0A84FF' },
    mint: { label: '緑', gradient: 'from-[#63E6BE] to-[#30D158]', canvas: '#30D158' },
    coral: { label: '赤', gradient: 'from-[#FF9F0A] to-[#FF453A]', canvas: '#FF453A' },
    sun: { label: '黄', gradient: 'from-[#FFE066] to-[#FFD60A]', canvas: '#FFD60A' },
    violet: { label: '紫', gradient: 'from-[#BF5AF2] to-[#7D7AFF]', canvas: '#7D7AFF' },
    rose: { label: '桃', gradient: 'from-[#FF8AC5] to-[#FF375F]', canvas: '#FF375F' },
};

export const PUZZLE_MODE_CONFIGS: Record<PuzzleMode, PuzzleModeConfig> = {
    normal: {
        mode: 'normal',
        label: '通常モード',
        capacity: 8,
        bottleCount: 6,
        colors: ['sky', 'mint', 'coral', 'sun'],
        emptyBottleCount: 2,
        generation: {
            attempts: 120,
            scrambleSteps: 180,
            solverDepth: 80,
            solverStates: 18000,
            minPartialBottleCount: 4,
            maxLongestRun: 5,
            requireNoSolvedBottle: false,
        },
    },
    star: {
        mode: 'star',
        label: '星モード',
        capacity: 10,
        bottleCount: 6,
        colors: ['sky', 'mint', 'coral', 'sun', 'violet'],
        emptyBottleCount: 1,
        generation: {
            attempts: 240,
            scrambleSteps: 320,
            solverDepth: 200,
            solverStates: 100000,
            minPartialBottleCount: 5,
            maxLongestRun: 4,
            requireNoSolvedBottle: true,
        },
    },
};
