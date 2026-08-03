import { useRef } from 'react';
import {
    ArrowLeft,
    MessageSquarePlus,
    RotateCcw,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageSeo } from '@/components/PageSeo';
import { AssistantConversation } from '@/features/assistant/AssistantConversation';
import { useAssistant } from '@/features/assistant/useAssistant';
import './AiAssistantProduct.css';

const SUGGESTED_QUESTIONS = [
    '豊田工業大学にはどんなサークルがありますか？',
    'CodexとMCPの関係を教えて',
    'Color Sortはどんなアプリ？',
    '光合成を簡単に説明して',
] as const;

export function AiAssistantProductPage() {
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const {
        messages,
        isSending,
        errorMessage,
        sendMessage,
        clearError,
        clearConversation,
    } = useAssistant();

    const startNewConversation = () => {
        clearConversation();
        window.requestAnimationFrame(() => inputRef.current?.focus());
    };

    const ask = (question: string) => {
        if (!isSending) void sendMessage(question);
    };

    return (
        <div className="assistant-app-page">
            <PageSeo
                title="AI Assistant | TTI Intelligence"
                description="TTI Intelligenceのサイト・大学資料とLunaの安定した一般知識を使うAI Assistantです。リアルタイムのWeb検索は行いません。"
            />

            <aside className="assistant-app-sidebar">
                <div className="assistant-app-brand">
                    <span><Sparkles /></span>
                    <div>
                        <strong>TTI Assistant</strong>
                        <small>PUBLIC BETA</small>
                    </div>
                </div>

                <button
                    type="button"
                    className="assistant-app-new"
                    onClick={startNewConversation}
                    disabled={isSending}
                >
                    <MessageSquarePlus />
                    新しい会話
                </button>

                <nav className="assistant-app-prompts" aria-label="質問例">
                    <span>質問例</span>
                    {SUGGESTED_QUESTIONS.map((question) => (
                        <button
                            key={question}
                            type="button"
                            disabled={isSending}
                            onClick={() => ask(question)}
                        >
                            {question}
                        </button>
                    ))}
                </nav>

                <div className="assistant-app-sidebar-footer">
                    <ShieldCheck />
                    <p>TTI Intelligenceのサイトと豊田工業大学の資料、Lunaの安定した一般知識を使って回答します。リアルタイムのWeb検索は行いません。</p>
                </div>
            </aside>

            <main className="assistant-app-main">
                <header className="assistant-app-header">
                    <Link to="/app" aria-label="アプリケーション一覧に戻る">
                        <ArrowLeft />
                    </Link>
                    <div>
                        <h1>AI Assistant</h1>
                        <span><i /> Online</span>
                    </div>
                    <button
                        type="button"
                        onClick={startNewConversation}
                        disabled={isSending || messages.length === 0}
                        aria-label="会話を最初からやり直す"
                    >
                        <RotateCcw />
                    </button>
                </header>

                <div className="assistant-app-mobile-prompts" aria-label="質問例">
                    {SUGGESTED_QUESTIONS.map((question) => (
                        <button
                            key={question}
                            type="button"
                            disabled={isSending}
                            onClick={() => ask(question)}
                        >
                            {question}
                        </button>
                    ))}
                </div>

                <section className="assistant-app-chat" aria-label="AI Assistant">
                    <AssistantConversation
                        messages={messages}
                        isSending={isSending}
                        errorMessage={errorMessage}
                        inputRef={inputRef}
                        onSubmit={sendMessage}
                        onClearError={clearError}
                    />
                    <p className="assistant-app-notice">
                        AIの回答には誤りが含まれる場合があります。現在の情報や重要な情報は公式情報源でも確認してください。
                    </p>
                </section>
            </main>
        </div>
    );
}
