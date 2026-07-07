export function wrapHtmlForPreview(content: string): string {
    if (/<html[\s>]/i.test(content)) return content;
    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 2rem 1.5rem;
      color: #1d1d1f;
      background: #fff;
    }
    h1 { font-size: 1.75rem; margin: 0 0 0.75rem; }
    p { margin: 0; color: #6e6e73; }
  </style>
</head>
<body>${content}</body>
</html>`;
}

export function isHtmlFile(path: string): boolean {
    return /\.html?$/i.test(path);
}
