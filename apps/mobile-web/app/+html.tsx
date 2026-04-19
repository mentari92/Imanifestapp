import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Customizes the root HTML for Expo web builds.
 * Injects Google Fonts (Newsreader, Noto Serif, Plus Jakarta Sans)
 * to match the Stitch Celestial Ether design system.
 */
export default function Root({ children }: PropsWithChildren) {
  const siteTitle = 'Imanifest';
  const siteDescription = 'Spiritual mindfulness, daily intentions, and tranquil audio for a peaceful heart and focused faith.';
  const siteUrl = 'https://imanifestapp.com';
  const ogImageUrl = `${siteUrl}/og/imanifest-og.png?v=9506731`;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>{siteTitle}</title>
        <meta name="description" content={siteDescription} />
        <meta name="theme-color" content="#f9f9fd" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={siteTitle} />
        <meta property="og:title" content={siteTitle} />
        <meta property="og:description" content={siteDescription} />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:secure_url" content={ogImageUrl} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Imanifest spiritual mindfulness social preview card" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={siteTitle} />
        <meta name="twitter:description" content={siteDescription} />
        <meta name="twitter:image" content={ogImageUrl} />
        <meta name="twitter:image:alt" content="Imanifest spiritual mindfulness social preview card" />
        <link rel="canonical" href={siteUrl} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,600;1,6..72,700&family=Noto+Serif:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <ScrollViewStyleReset />
        <style>{`
          html, body, #root { height: 100%; }
          body { margin: 0; background-color: #f9f9fd; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
