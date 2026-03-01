import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Send, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, Button, Input, Textarea } from '@/components/ui';
import { siteConfig } from '@/config/site';
import emailjs from '@emailjs/browser';

const contactSchema = z.object({
    name: z.string().min(1, 'お名前を入力してください').max(100, 'お名前は100文字以内で入力してください'),
    email: z.string().email('正しいメールアドレスを入力してください'),
    subject: z.string().min(1, '件名を入力してください').max(200, '件名は200文字以内で入力してください'),
    message: z.string().min(3, 'メッセージは3文字以上で入力してください').max(2000, 'メッセージは2000文字以内で入力してください'),
});

type ContactForm = z.infer<typeof contactSchema>;

type SubmitStatus = 'idle' | 'sending' | 'success' | 'error';

export function Contact() {
    const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ContactForm>({
        resolver: zodResolver(contactSchema),
    });

    const onSubmit = async (data: ContactForm) => {
        setSubmitStatus('sending');
        setErrorMessage(null);

        try {
            const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
            const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
            const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

            if (!serviceId || !templateId || !publicKey) {
                console.warn('EmailJS environment variables are not set. Check your .env setup.');
                throw new Error('Email service configuration missing');
            }

            const templateParams = {
                from_name: data.name,
                from_email: data.email,
                subject: data.subject,
                message: data.message,
                to_name: 'サークル運営', // Adjust depending on your EmailJS template mapping
            };

            await emailjs.send(serviceId, templateId, templateParams, publicKey);

            setSubmitStatus('success');
            reset();
        } catch (error) {
            console.error("EmailJS error:", error);
            setSubmitStatus('error');
            setErrorMessage('送信に失敗しました。しばらくしてからもう一度お試しください。');
        }
    };

    if (submitStatus === 'success') {
        return (
            <div className="animate-fade-in">
                <div className="max-w-2xl mx-auto px-4 py-24 text-center">
                    <div className="w-20 h-20 rounded-full gradient-bg flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-text-primary-light dark:text-text-primary-dark mb-4">
                        送信完了
                    </h1>
                    <p className="text-text-secondary-light dark:text-text-secondary-dark mb-8">
                        お問い合わせありがとうございます。
                        <br />
                        内容を確認の上、折り返しご連絡いたします。
                    </p>
                    <Button onClick={() => setSubmitStatus('idle')} variant="outline">
                        新しいお問い合わせ
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 gradient-bg-subtle opacity-30" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <h1 className="text-4xl font-bold text-text-primary-light dark:text-text-primary-dark mb-4">
                            Contact
                        </h1>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark">
                            ご質問やお問い合わせはこちらからお気軽にどうぞ
                        </p>
                    </div>
                </div>
            </section>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid md:grid-cols-3 gap-8">
                    {/* Contact Info */}
                    <div className="md:col-span-1 space-y-6">
                        <Card variant="glass" padding="md">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                                    <Mail className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-text-primary-light dark:text-text-primary-dark">
                                        メール
                                    </h3>
                                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                        {siteConfig.contactEmail}
                                    </p>
                                </div>
                            </div>
                        </Card>

                        <Card variant="default" padding="md">
                            <h3 className="font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
                                よくあるお問い合わせ
                            </h3>
                            <ul className="space-y-2 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                <li>• サークルへの入会について</li>
                                <li>• イベントへの参加申し込み</li>
                                <li>• 取材・講演のご依頼</li>
                                <li>• その他のお問い合わせ</li>
                            </ul>
                        </Card>
                    </div>

                    {/* Contact Form */}
                    <div className="md:col-span-2">
                        <Card variant="elevated" padding="lg">
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                {submitStatus === 'error' && errorMessage && (
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        <p className="text-sm">{errorMessage}</p>
                                    </div>
                                )}

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <Input
                                            label="お名前"
                                            placeholder="山田 太郎"
                                            error={errors.name?.message}
                                            {...register('name')}
                                        />
                                    </div>
                                    <div className="relative">
                                        <Input
                                            label="メールアドレス"
                                            type="email"
                                            placeholder="example@toyota-ti.ac.jp"
                                            error={errors.email?.message}
                                            {...register('email')}
                                        />
                                    </div>
                                </div>

                                <Input
                                    label="件名"
                                    placeholder="お問い合わせの件名"
                                    error={errors.subject?.message}
                                    {...register('subject')}
                                />

                                <Textarea
                                    label="メッセージ"
                                    placeholder="お問い合わせ内容を入力してください..."
                                    rows={6}
                                    error={errors.message?.message}
                                    {...register('message')}
                                />

                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        size="lg"
                                        isLoading={submitStatus === 'sending'}
                                        disabled={submitStatus === 'sending'}
                                    >
                                        <Send className="w-5 h-5" />
                                        {submitStatus === 'sending' ? '送信中...' : '送信する'}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
