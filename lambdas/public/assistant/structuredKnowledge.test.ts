import { describe, expect, it } from 'vitest';

import {
  createVerifiedOfficialLinks,
  OFFICIAL_SOURCE_LINKS,
} from './runtimeCatalog.js';

describe('createVerifiedOfficialLinks', () => {
  it('returns only deduplicated catalog entries for requested official source IDs', () => {
    expect(createVerifiedOfficialLinks([
      'tti-overview',
      'unknown-source',
      'discord',
      'tti-overview',
      'youtube',
    ])).toEqual([
      {
        pageId: 'tti-overview',
        title: '豊田工業大学 大学案内',
        href: 'https://www.toyota-ti.ac.jp/about/index.html',
      },
      {
        pageId: 'discord',
        title: 'TTI Intelligence Discord',
        href: 'https://discord.gg/DFWs8GrHxF',
      },
      {
        pageId: 'youtube',
        title: 'TTI Intelligence YouTube',
        href: 'https://www.youtube.com/@ttiintelligence',
      },
    ]);
  });

  it('keeps every official URL pinned to an exact reviewed catalog entry', () => {
    const expectedCatalog = {
      discord: { title: 'TTI Intelligence Discord', href: 'https://discord.gg/DFWs8GrHxF' },
      youtube: { title: 'TTI Intelligence YouTube', href: 'https://www.youtube.com/@ttiintelligence' },
      'tti-overview': { title: '豊田工業大学 大学案内', href: 'https://www.toyota-ti.ac.jp/about/index.html' },
      'tti-features': { title: '豊田工業大学 本学の特色', href: 'https://www.toyota-ti.ac.jp/about/profile/tokushoku.html' },
      'tti-academics': { title: '豊田工業大学 学部・大学院教育', href: 'https://www.toyota-ti.ac.jp/academics/index.html' },
      'tti-program': { title: '豊田工業大学 学びの特色', href: 'https://www.toyota-ti.ac.jp/academics/program/feature.html' },
      'tti-student-activity': { title: '豊田工業大学 課外活動', href: 'https://www.toyota-ti.ac.jp/student/activity/index.html' },
      'tti-clubs': { title: '豊田工業大学 課外団体一覧', href: 'https://www.toyota-ti.ac.jp/student/activity/club.html' },
      'tti-access': { title: '豊田工業大学 交通アクセス', href: 'https://www.toyota-ti.ac.jp/access/index.html' },
    };

    expect(OFFICIAL_SOURCE_LINKS).toEqual(expectedCatalog);
    expect(createVerifiedOfficialLinks([
      'discord',
      'youtube',
      'tti-overview',
      'tti-features',
      'tti-academics',
      'tti-program',
      'tti-student-activity',
      'tti-clubs',
      'tti-access',
    ]).map(({ href }) => href)).toEqual(Object.values(expectedCatalog).map(({ href }) => href));
  });
});
