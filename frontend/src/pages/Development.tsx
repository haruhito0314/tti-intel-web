import { PageSeo } from '@/components/PageSeo';
import { DevelopmentExperience } from '@/components/development/DevelopmentExperience';

export function Development() {
    return (
        <div className="animate-fade-in">
            <PageSeo
                title="開発について | TTI Intelligence"
                description="TTI IntelligenceのAIを使った開発を、構想・調査・実装・検証の流れと実例から紹介します。"
            />

            <DevelopmentExperience />
        </div>
    );
}
