import { APIGatewayProxyHandler } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({});

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json',
};

interface ContactInput {
    name: string;
    email: string;
    subject: string;
    message: string;
}

function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Request body is required' }),
            };
        }

        const input: ContactInput = JSON.parse(event.body);

        // Validate input
        if (!input.name || input.name.trim().length === 0) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Name is required' }),
            };
        }

        if (input.name.length > 100) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Name must be 100 characters or less' }),
            };
        }

        if (!input.email || !validateEmail(input.email)) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Valid email is required' }),
            };
        }

        if (!input.subject || input.subject.trim().length === 0) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Subject is required' }),
            };
        }

        if (input.subject.length > 200) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Subject must be 200 characters or less' }),
            };
        }

        if (!input.message || input.message.trim().length < 10) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Message must be at least 10 characters' }),
            };
        }

        if (input.message.length > 2000) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Message must be 2000 characters or less' }),
            };
        }

        const fromEmail = process.env.SES_FROM_EMAIL!;
        const toEmail = process.env.SES_TO_EMAIL!;

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>お問い合わせ</title>
</head>
<body style="font-family: sans-serif; padding: 20px;">
  <h2>TTI Intelligence - お問い合わせ</h2>
  <p><strong>お名前:</strong> ${escapeHtml(input.name)}</p>
  <p><strong>メールアドレス:</strong> ${escapeHtml(input.email)}</p>
  <p><strong>件名:</strong> ${escapeHtml(input.subject)}</p>
  <hr>
  <p><strong>メッセージ:</strong></p>
  <p style="white-space: pre-wrap;">${escapeHtml(input.message)}</p>
  <hr>
  <p style="color: #666; font-size: 12px;">
    このメールはTTI Intelligence公式Webサイトのお問い合わせフォームから送信されました。
  </p>
</body>
</html>
    `.trim();

        const command = new SendEmailCommand({
            Source: fromEmail,
            Destination: {
                ToAddresses: [toEmail],
            },
            ReplyToAddresses: [input.email],
            Message: {
                Subject: {
                    Data: `[TTI AI Club] ${input.subject}`,
                    Charset: 'UTF-8',
                },
                Body: {
                    Html: {
                        Data: emailHtml,
                        Charset: 'UTF-8',
                    },
                    Text: {
                        Data: `お名前: ${input.name}\nメールアドレス: ${input.email}\n件名: ${input.subject}\n\nメッセージ:\n${input.message}`,
                        Charset: 'UTF-8',
                    },
                },
            },
        });

        await sesClient.send(command);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ success: true, message: 'Message sent successfully' }),
        };
    } catch (error) {
        console.error('Error sending contact email:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to send message' }),
        };
    }
};

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
