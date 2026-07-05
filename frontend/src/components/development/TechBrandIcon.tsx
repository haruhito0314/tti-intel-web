import type { SimpleIcon } from 'simple-icons';
import {
    siAnthropic,
    siCss,
    siCursor,
    siFirebase,
    siGithub,
    siGooglegemini,
    siHtml5,
    siIterm2,
    siModelcontextprotocol,
    siNextdotjs,
    siNodedotjs,
    siOpenai,
    siPython,
    siReact,
    siSwift,
    siTailwindcss,
    siTypescript,
    siVite,
    siZod,
} from 'simple-icons';

type IconData = Pick<SimpleIcon, 'title' | 'hex' | 'path'>;

const ICONS = {
    html5: siHtml5,
    css3: siCss,
    typescript: siTypescript,
    react: siReact,
    nextdotjs: siNextdotjs,
    nodedotjs: siNodedotjs,
    tailwindcss: siTailwindcss,
    vite: siVite,
    firebase: siFirebase,
    python: siPython,
    zod: siZod,
    swift: siSwift,
    openai: siOpenai,
    anthropic: siAnthropic,
    modelcontextprotocol: siModelcontextprotocol,
    cursor: siCursor,
    iterm2: siIterm2,
    googlegemini: siGooglegemini,
    github: siGithub,
} as const satisfies Record<string, IconData>;

/** Brand colors tuned for dark dev-page surfaces */
const ICON_COLOR_OVERRIDES: Partial<Record<keyof typeof ICONS, string>> = {
    openai: '10A37F',
    googlegemini: '886BF9',
};

const IMAGE_ICONS = {
    googleantigravity: {
        title: 'Google Antigravity',
        src: '/images/development/google-antigravity.svg',
    },
} as const;

export type TechBrandSlug = keyof typeof ICONS | keyof typeof IMAGE_ICONS;

function getIconFill(hex: string): string {
    const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
    return `#${normalized}`;
}

type TechBrandIconProps = {
    slug: TechBrandSlug;
    className?: string;
};

export function TechBrandIcon({ slug, className }: TechBrandIconProps) {
    const imageIcon = IMAGE_ICONS[slug as keyof typeof IMAGE_ICONS];
    if (imageIcon) {
        return (
            <img
                src={imageIcon.src}
                alt=""
                className={className}
                aria-hidden="true"
                draggable={false}
                style={{ objectFit: 'contain' }}
            />
        );
    }

    const icon = ICONS[slug as keyof typeof ICONS];
    const fill = getIconFill(ICON_COLOR_OVERRIDES[slug as keyof typeof ICONS] ?? icon.hex);

    return (
        <svg
            role="img"
            viewBox="0 0 24 24"
            className={className}
            aria-hidden="true"
        >
            <title>{icon.title}</title>
            <path fill={fill} d={icon.path} />
        </svg>
    );
}
