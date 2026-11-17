import {
  OG_IMAGE_ALT,
  OG_IMAGE_URL,
  SITE_URL,
  getSeoForPathname,
} from '@/constants/seo';
import {
  ScrollViewStyleReset,
  useServerDocumentContext,
} from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': ['VideoGame', 'WebApplication'],
  name: 'Word Frog',
  alternateName: 'Word Frog — Daily Word Guessing Game',
  url: `${SITE_URL}/`,
  image: OG_IMAGE_URL,
  screenshot: OG_IMAGE_URL,
  description:
    'Guess the daily secret word in as few turns as possible! Start with the first letter, submit valid prefix words to reveal new tiles, train in unlimited practice mode, and compete on global daily leaderboards.',
  applicationCategory: 'GameApplication',
  applicationSubCategory: 'Word Game',
  genre: ['Word Game', 'Puzzle', 'Vocabulary Game'],
  gamePlatform: ['Web Browser', 'Android', 'iOS'],
  operatingSystem: 'Any (Web Browser, Android, iOS)',
  playMode: 'SinglePlayer',
  inLanguage: 'en',
  isAccessibleForFree: true,
  softwareVersion: '1.0.9',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  author: {
    '@type': 'Person',
    name: 'Jeff Chan',
    url: 'https://superjeffc.com',
  },
  creator: {
    '@type': 'Person',
    name: 'Jeff Chan',
    url: 'https://superjeffc.com',
  },
  featureList: [
    'Synchronized daily word-guessing puzzle',
    'Strategic prefix-reveal word mechanics with animated frog mascot',
    'Unlimited 4-to-8 letter random word Practice Mode',
    'Real-time global daily top 10 & all-time completion leaderboards',
    'Optional letter hints and dictionary definition lookup',
    'Free browser and mobile gameplay with zero data collection',
  ],
  sameAs: [
    'https://play.google.com/store/apps/details?id=com.jeffreychan.wordfrog',
  ],
};

type RootProps = PropsWithChildren<{
  pathname?: string;
}>;

export default function Root({ children, pathname }: RootProps) {
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } =
    useServerDocumentContext();
  const seo = getSeoForPathname(pathname);

  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {/* Static + Route-aware Title, Description, Robots & Canonical (adopted on client by expo-router/head via data-rh="true") */}
        <title data-rh="true">{seo.title}</title>
        <meta data-rh="true" name="description" content={seo.description} />
        <meta data-rh="true" name="robots" content={seo.robots} />
        <link data-rh="true" rel="canonical" href={seo.canonicalUrl} />

        {/* Site-wide Discovery & App Metadata */}
        <meta
          name="keywords"
          content="Word Frog, daily word game, word guessing game, prefix word puzzle, vocabulary game, daily puzzle, practice word game, global word leaderboard, free browser word game, Jeff Chan"
        />
        <meta name="author" content="Jeff Chan" />
        <meta name="theme-color" content="#537c38" />
        <meta name="application-name" content="Word Frog" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Word Frog" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="google-play-app"
          content="app-id=com.jeffreychan.wordfrog"
        />

        {/* Favicons & Web App Manifest */}
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link
          rel="icon"
          type="image/png"
          href="/favicon-96x96.png"
          sizes="96x96"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Open Graph Metadata */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Word Frog" />
        <meta property="og:locale" content="en_US" />
        <meta data-rh="true" property="og:url" content={seo.canonicalUrl} />
        <meta data-rh="true" property="og:title" content={seo.title} />
        <meta
          data-rh="true"
          property="og:description"
          content={seo.description}
        />
        <meta property="og:image" content={OG_IMAGE_URL} />
        <meta property="og:image:secure_url" content={OG_IMAGE_URL} />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={OG_IMAGE_ALT} />

        {/* Twitter Card Metadata */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta data-rh="true" name="twitter:title" content={seo.title} />
        <meta
          data-rh="true"
          name="twitter:description"
          content={seo.description}
        />
        <meta name="twitter:image" content={OG_IMAGE_URL} />
        <meta name="twitter:image:alt" content={OG_IMAGE_ALT} />

        {/* Schema.org JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />

        {/* Preserve exact React Native Web full-height flex layout & SSR styles */}
        <ScrollViewStyleReset />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        <noscript>
          <main
            style={{
              padding: '24px',
              fontFamily: 'system-ui, sans-serif',
              maxWidth: '680px',
              margin: '0 auto',
            }}>
            <h1>Word Frog — Free Daily Word Guessing &amp; Prefix Puzzle Game</h1>
            <p>
              Guess the daily secret word in as few turns as possible! Start with
              only the first letter revealed, submit valid dictionary words
              matching the current prefix to leap across letter tiles, or type
              the exact secret word at any time for an instant win.
            </p>
            <ul>
              <li>
                <a href="/">Daily Word Puzzle</a> — One synchronized secret word
                every day.
              </li>
              <li>
                <a href="/practice">Unlimited Practice Mode</a> — Train anytime
                with random 4-to-8 letter words.
              </li>
              <li>
                <a href="/leaderboard">Global Daily Leaderboard</a> — Compete for
                the top daily efficiency and speed scores.
              </li>
              <li>
                <a href="/about">About Word Frog</a> — Created by{' '}
                <a href="https://superjeffc.com">Jeff Chan</a> with zero data
                tracking.
              </li>
            </ul>
            <p>Please enable JavaScript in your browser to play Word Frog.</p>
          </main>
        </noscript>
        {bodyNodes}
      </body>
    </html>
  );
}
