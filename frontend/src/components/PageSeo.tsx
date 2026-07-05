import { useEffect } from 'react';
import { siteConfig } from '@/config/site';

type PageSeoProps = {
    title: string;
    description: string;
};

const DEFAULT_DESCRIPTION = siteConfig.description;

export function PageSeo({ title, description }: PageSeoProps) {
    useEffect(() => {
        const previousTitle = document.title;
        const descriptionMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        const previousDescription = descriptionMeta?.content ?? DEFAULT_DESCRIPTION;
        const createdMeta = !descriptionMeta;

        document.title = title;

        let meta = descriptionMeta;
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'description';
            document.head.appendChild(meta);
        }
        meta.content = description;

        return () => {
            document.title = previousTitle;
            if (createdMeta && meta?.parentNode) {
                meta.parentNode.removeChild(meta);
                return;
            }
            if (meta) {
                meta.content = previousDescription;
            }
        };
    }, [title, description]);

    return null;
}
