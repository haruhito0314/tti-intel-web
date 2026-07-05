import { AI_TOOLS } from './sceneUtils';
import { DevStackGridScene } from './DevStackGridScene';

type DevHeroScene5Props = {
    progress: number;
    opacity: number;
    staticMode?: boolean;
    copyIndex?: number;
};

const TOOL_ACCENTS = [
    '#10A37F',
    '#CC785C',
    '#4285F4',
    '#818CF8',
    '#EDECEC',
    '#9CF000',
    '#886BF9',
    '#A8B1C4',
] as const;

export function DevHeroScene5({ progress, opacity, staticMode = false, copyIndex }: DevHeroScene5Props) {
    return (
        <DevStackGridScene
            sceneIndex={4}
            sceneClassName="dev-hero-scene--5"
            layers={AI_TOOLS}
            accents={TOOL_ACCENTS}
            progress={progress}
            opacity={opacity}
            staticMode={staticMode}
            copyIndex={copyIndex}
        />
    );
}
