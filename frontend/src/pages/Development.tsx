import { PageSeo } from '@/components/PageSeo';
import { DevHero } from '@/components/development/DevHero';

export function Development() {
    return (
        <div className="dev-page animate-fade-in">
            <PageSeo
                title="開発について | TTI Intelligence"
                description="TTI Intelligenceの開発活動を紹介。最新のAIコーディングツールとMCPを活用したWeb・アプリ開発の裏側をお見せします。"
            />

            <DevHero />
        </div>
    );
}
