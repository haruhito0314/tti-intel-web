import { AI_TOOLS } from './sceneUtils';
import { DevStackGridScene } from './DevStackGridScene';

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

type DevHeroScene5Props =
    | { copyIndex: number; chapterIndex?: never; progress?: never }
    | { chapterIndex: number; progress: number; copyIndex?: never };

export function DevHeroScene5(props: DevHeroScene5Props) {
    return (
        <DevStackGridScene
            sceneClassName="dev-hero-scene--5"
            layers={AI_TOOLS}
            accents={TOOL_ACCENTS}
            copyIndex={props.copyIndex}
            chapterIndex={props.chapterIndex}
            progress={props.progress}
            iconVariant="brand"
        />
    );
}
