import type { SimpleIcon } from 'simple-icons';
import {
    siAnthropic,
    siCss,
    siCursor,
    siFirebase,
    siGithub,
    siGoogle,
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
    google: siGoogle,
    modelcontextprotocol: siModelcontextprotocol,
    cursor: siCursor,
    iterm2: siIterm2,
    googlegemini: siGooglegemini,
    github: siGithub,
} as const satisfies Record<string, IconData>;

export type TechBrandSlug = keyof typeof ICONS;

const LIGHT_ON_DARK = '#F5F5F7';

function hexLuminance(hex: string): number {
    const normalized = hex.replace('#', '');
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function getIconFill(hex: string): string {
    const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
    if (hexLuminance(normalized) < 0.42) {
        return LIGHT_ON_DARK;
    }
    return `#${normalized}`;
}

type TechBrandIconProps = {
    slug: TechBrandSlug;
    className?: string;
};

export function TechBrandIcon({ slug, className }: TechBrandIconProps) {
    const icon = ICONS[slug];
    const fill = getIconFill(icon.hex);

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
