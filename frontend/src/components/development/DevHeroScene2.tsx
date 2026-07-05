import { STACK_LAYERS } from './sceneUtils';
import { DevStackGridScene } from './DevStackGridScene';

type DevHeroScene2Props = {
    progress: number;
    opacity: number;
    staticMode?: boolean;
    copyIndex?: number;
};

const LAYER_ACCENTS = [
    '#E44D26',
    '#1572B6',
    '#3178C6',
    '#61DAFB',
    '#FFFFFF',
    '#339933',
    '#06B6D4',
    '#646CFF',
    '#FFCA28',
    '#3776AB',
    '#3068B7',
    '#F05138',
] as const;

export function DevHeroScene2({ progress, opacity, staticMode = false, copyIndex }: DevHeroScene2Props) {
    return (
        <DevStackGridScene
            sceneIndex={1}
            sceneClassName="dev-hero-scene--2"
            layers={STACK_LAYERS}
            accents={LAYER_ACCENTS}
            progress={progress}
            opacity={opacity}
            staticMode={staticMode}
            copyIndex={copyIndex}
        />
    );
}
