import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';

type ErrorBoundaryProps = {
    children: ReactNode;
    fallbackTitle?: string;
};

type ErrorBoundaryState = {
    hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error('UI render error:', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-[60vh] flex items-center justify-center p-4">
                    <div className="text-center max-w-md">
                        <h1 className="apple-section text-[#1D1D1F] dark:text-[#F5F5F7] mb-3">
                            {this.props.fallbackTitle ?? '表示エラー'}
                        </h1>
                        <p className="apple-body text-[#6E6E73] dark:text-[rgba(235,235,245,0.6)] mb-8">
                            ページの読み込み中に問題が発生しました。再読み込みするか、ホームからやり直してください。
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button onClick={() => window.location.reload()} className="rounded-full">
                                再読み込み
                            </Button>
                            <Link to="/">
                                <Button variant="outline" className="rounded-full w-full">
                                    ホームに戻る
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
