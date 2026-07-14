export type ColorToken = 'sky' | 'mint' | 'coral' | 'sun' | 'violet' | 'rose';
export type Bottle = ColorToken[];
export type Puzzle = Bottle[];
export type PuzzleMode = 'normal' | 'star';
export type PuzzlePhase = 'generating' | 'playing' | 'solved';

export interface GenerationLimits {
    attempts: number;
    scrambleSteps: number;
    solverDepth: number;
    solverStates: number;
    minPartialBottleCount: number;
    maxLongestRun: number;
    requireNoSolvedBottle: boolean;
}

export interface PuzzleModeConfig {
    mode: PuzzleMode;
    label: string;
    capacity: number;
    bottleCount: number;
    colors: readonly ColorToken[];
    emptyBottleCount: number;
    generation: GenerationLimits;
}

export interface PuzzleGenerationRequest {
    requestId: number;
    mode: PuzzleMode;
    seed: number;
}

export type PuzzleGenerationResult =
    | { requestId: number; mode: PuzzleMode; ok: true; puzzle: Puzzle }
    | { requestId: number; mode: PuzzleMode; ok: false; error: string };
