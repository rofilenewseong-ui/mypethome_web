import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://petholo.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing', '/faq', '/about', '/terms', '/privacy', '/contact'],
        disallow: [
          '/home',
          '/entry',
          '/pets/',
          '/profiles/',
          '/store',
          '/settings',
          '/trash',
          '/messenger',
          '/admin/',
          '/cafe24/',
          '/player/',
          '/api/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
