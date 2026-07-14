import { RotateCcw, Share2, Sparkles, Star, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui';
import type { PuzzlePhase } from './types';

interface Props {
    phase: PuzzlePhase;
    moveCount: number;
    starMode: boolean;
    onUndo: () => void;
    onReset: () => void;
    onNewPuzzle: () => void;
    onToggleStar: () => void;
    onShare: () => void;
}

export function ColorSortControls({
    phase,
    moveCount,
    starMode,
    onUndo,
    onReset,
    onNewPuzzle,
    onToggleStar,
    onShare,
}: Props) {
    const generating = phase === 'generating';

    return (
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-5">
            <Button
                type="button"
                variant="secondary"
                onClick={onUndo}
                disabled={generating || moveCount === 0}
            >
                <Undo2 className="h-4 w-4" />
                戻す
            </Button>
            <Button type="button" variant="secondary" onClick={onReset} disabled={generating}>
                <RotateCcw className="h-4 w-4" />
                リセット
            </Button>
            <Button type="button" onClick={onNewPuzzle} disabled={generating}>
                <Sparkles className="h-4 w-4" />
                新しい問題
            </Button>
            <Button
                type="button"
                variant={starMode ? 'primary' : 'secondary'}
                onClick={onToggleStar}
                disabled={generating}
            >
                <Star className="h-4 w-4" />
                星
            </Button>
            <Button type="button" variant="secondary" onClick={onShare} disabled={phase !== 'solved'}>
                <Share2 className="h-4 w-4" />
                シェア
            </Button>
        </div>
    );
}
