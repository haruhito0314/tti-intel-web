import { useEffect } from 'react';

type PageSeoProps = {
    title: string;
    description: string;
};

export function PageSeo({ title, description }: PageSeoProps) {
    useEffect(() => {
        document.title = title;
        let descriptionMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (!descriptionMeta) {
            descriptionMeta = document.createElement('meta');
            descriptionMeta.name = 'description';
            document.head.appendChild(descriptionMeta);
        }
        descriptionMeta.content = description;
    }, [title, description]);

    return (
        <>
            <title>{title}</title>
            <meta name="description" content={description} />
        </>
    );
}
