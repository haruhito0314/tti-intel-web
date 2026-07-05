import type { SimpleIcon } from 'simple-icons';
import {
    siAnthropic,
    siClaude,
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
    claude: siClaude,
    modelcontextprotocol: siModelcontextprotocol,
    cursor: siCursor,
    iterm2: siIterm2,
    googlegemini: siGooglegemini,
    github: siGithub,
} as const satisfies Record<string, IconData>;

/** Brand colors tuned for dark dev-page surfaces (section 5 tool grid) */
const BRAND_ICON_COLORS: Partial<Record<keyof typeof ICONS, string>> = {
    openai: '10A37F',
    claude: 'CC785C',
    googlegemini: '886BF9',
};

const DEFAULT_ICON_COLORS: Partial<Record<keyof typeof ICONS, string>> = {
    openai: '000000',
    googlegemini: '886BF9',
};

/** iTerm2 logo: dark frame + lime prompt/text (split from simple-icons path) */
const ITERM2_FRAME_PATH =
    'M24 5.359v13.282A5.36 5.36 0 0 1 18.641 24H5.359A5.36 5.36 0 0 1 0 18.641V5.359A5.36 5.36 0 0 1 5.359 0h13.282A5.36 5.36 0 0 1 24 5.359m-.932-.233A4.196 4.196 0 0 0 18.874.932H5.126A4.196 4.196 0 0 0 .932 5.126v13.748a4.196 4.196 0 0 0 4.194 4.194h13.748a4.196 4.196 0 0 0 4.194-4.194zm-.816.233v13.282a3.613 3.613 0 0 1-3.611 3.611H5.359a3.613 3.613 0 0 1-3.611-3.611V5.359a3.613 3.613 0 0 1 3.611-3.611h13.282a3.613 3.613 0 0 1 3.611 3.611';
const ITERM2_MARK_PATH =
    'M8.854 4.194v6.495h.962V4.194zM5.483 9.493v1.085h.597V9.48q.283-.037.508-.133.373-.165.575-.448.208-.284.208-.649a.9.9 0 0 0-.171-.568 1.4 1.4 0 0 0-.426-.388 3 3 0 0 0-.544-.261 32 32 0 0 0-.545-.209 1.8 1.8 0 0 1-.426-.216q-.164-.12-.164-.284 0-.223.179-.351.18-.126.485-.127.344 0 .575.105.239.105.5.298l.433-.5a2.3 2.3 0 0 0-.605-.433 1.6 1.6 0 0 0-.582-.159v-.968h-.597v.978a2 2 0 0 0-.477.127 1.2 1.2 0 0 0-.545.411q-.194.268-.194.634 0 .335.164.56.164.224.418.38a4 4 0 0 0 .552.262q.291.104.545.209.261.104.425.238a.39.39 0 0 1 .165.321q0 .225-.187.359-.18.134-.537.134-.381 0-.717-.134a4.4 4.4 0 0 1-.649-.351l-.388.589q.209.173.477.306.276.135.575.217.191.046.373.064';
const ITERM2_MARK_COLOR = '9CF000';

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
    /** Section 5 tool grid uses full brand colors; elsewhere Codex stays black */
    variant?: 'default' | 'brand';
};

export function TechBrandIcon({ slug, className, variant = 'default' }: TechBrandIconProps) {
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

    if (slug === 'iterm2') {
        return (
            <svg
                role="img"
                viewBox="0 0 24 24"
                className={className}
                aria-hidden="true"
            >
                <title>{icon.title}</title>
                <path fill="#000000" d={ITERM2_FRAME_PATH} />
                <path fill={getIconFill(ITERM2_MARK_COLOR)} d={ITERM2_MARK_PATH} />
            </svg>
        );
    }

    if (slug === 'claude') {
        const claudeIcon = variant === 'brand' ? siClaude : siAnthropic;
        const fill =
            variant === 'brand'
                ? getIconFill(BRAND_ICON_COLORS.claude ?? siClaude.hex)
                : getIconFill(siAnthropic.hex);

        return (
            <svg
                role="img"
                viewBox="0 0 24 24"
                className={className}
                aria-hidden="true"
            >
                <title>{claudeIcon.title}</title>
                <path fill={fill} d={claudeIcon.path} />
            </svg>
        );
    }

    const palette = variant === 'brand' ? BRAND_ICON_COLORS : DEFAULT_ICON_COLORS;
    const fill = getIconFill(palette[slug as keyof typeof ICONS] ?? icon.hex);

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
