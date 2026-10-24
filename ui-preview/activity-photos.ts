export const activityPhotos = [
  {
    key: 'video',
    title: '解説動画',
    altBefore: '動画編集用のモニター、マイク、キーボード',
    alt: 'モニターの編集画面を見ながら動画を制作する人の後ろ姿',
    image: 'https://cdn.pixabay.com/photo/2022/07/13/21/57/editing-7320124_1280.jpg',
    source: 'https://pixabay.com/photos/editing-video-computer-7320124/',
    photographer: 'terydanphiri / Pixabay',
  },
  {
    key: 'development',
    title: '開発',
    altBefore: 'コードエディタを表示したノートPC',
    alt: '白い机の上でコードエディタを表示したノートPC',
    image: 'https://images.unsplash.com/photo-1621361365424-06f0e1eb5c49?auto=format&fit=crop&w=1280&q=85',
    source: 'https://unsplash.com/photos/macbook-pro-on-white-table-FoTs3ntRoIs',
    photographer: 'AltumCode / Unsplash',
  },
  {
    key: 'game',
    title: 'ゲーム交流',
    altBefore: 'ゲームコントローラーとヘッドセット',
    alt: 'コントローラーを持って友人同士でゲームを楽しむ様子',
    image: 'https://images.pexels.com/photos/9069362/pexels-photo-9069362.jpeg?auto=compress&w=1280',
    source: 'https://www.pexels.com/photo/friends-playing-computer-game-9069362/',
    photographer: 'Yan Krukau / Pexels',
  },
  {
    key: 'math',
    title: '今週の数学',
    altBefore: '数学の図形が表示されたタブレットとペン',
    alt: '数学の図形や数式をノートに書き込む手元',
    image: 'https://images.pexels.com/photos/5212341/pexels-photo-5212341.jpeg?auto=compress&w=1280',
    source: 'https://www.pexels.com/photo/a-person-writing-on-the-notebook-5212341/',
    photographer: 'Max Fischer / Pexels',
  },
] as const;

// Apply only to the About page at build time; its copy, FAQ and links stay shared.
export function replaceActivityPhotos(code: string): string {
  let result = code;
  for (const photo of activityPhotos) {
    for (const theme of ['light', 'dark']) {
      const original = `/images/about/activity-${photo.key}-${theme}.webp`;
      if (!result.includes(original)) {
        throw new Error(`紹介ページの画像が変更されています。プレビューの対応を更新してください: ${original}`);
      }
      result = result.replaceAll(original, photo.image);
    }
    if (!result.includes(photo.altBefore)) {
      throw new Error(`紹介ページの画像説明が変更されています: ${photo.key}`);
    }
    result = result.replaceAll(photo.altBefore, photo.alt);
  }
  return result;
}
