import { STACK_LAYERS } from './sceneUtils';
import { DevStackCircleStage } from './DevStackCircleStage';
import { DevStackGridScene } from './DevStackGridScene';
import { useDevMobileLayout } from './useDevMobileLayout';

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

type DevHeroScene2Props =
    | { copyIndex: number; chapterIndex?: never; progress?: never }
    | { chapterIndex: number; progress: number; copyIndex?: never };

export function DevHeroScene2(props: DevHeroScene2Props) {
    const mobileLayout = useDevMobileLayout();

    if (props.chapterIndex !== undefined && props.progress !== undefined) {
        if (mobileLayout) {
            return (
                <DevStackGridScene
                    sceneClassName="dev-hero-scene--2"
                    layers={STACK_LAYERS}
                    accents={LAYER_ACCENTS}
                    chapterIndex={props.chapterIndex}
                    progress={props.progress}
                />
            );
        }

        return (
            <DevStackCircleStage
                sceneClassName="dev-hero-scene--2"
                layers={STACK_LAYERS}
                accents={LAYER_ACCENTS}
                chapterIndex={props.chapterIndex}
                progress={props.progress}
            />
        );
    }

    return (
        <DevStackGridScene
            sceneClassName="dev-hero-scene--2"
            layers={STACK_LAYERS}
            accents={LAYER_ACCENTS}
            copyIndex={props.copyIndex}
        />
    );
}
