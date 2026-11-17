export const SITE_URL = 'https://wordfrog.superjeffc.com';
export const OG_IMAGE_URL = `${SITE_URL}/og-image.jpg`;
export const OG_IMAGE_ALT =
  'Word Frog — Cute green frog sitting beside wooden letter blocks spelling FROG';
export const DEFAULT_ROBOTS =
  'index, follow, max-image-preview:large, max-snippet:-1';

export interface RouteSeoConfig {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string;
}

export const ROUTE_SEO = {
  home: {
    title: 'Word Frog — Daily Word Guessing & Prefix Puzzle Game',
    description:
      'Play Word Frog, the free daily word guessing game! Reveal letters with strategic prefix guesses, leap across tiles, and compete on the global daily leaderboard.',
    canonicalUrl: `${SITE_URL}/`,
    robots: DEFAULT_ROBOTS,
  },
  practice: {
    title: 'Practice Mode — Unlimited Word Puzzles | Word Frog',
    description:
      'Sharpen your vocabulary in Word Frog Practice Mode! Play unlimited 4-to-8 letter random word puzzles, test prefix strategies, and master your turn efficiency.',
    canonicalUrl: `${SITE_URL}/practice`,
    robots: DEFAULT_ROBOTS,
  },
  leaderboard: {
    title: 'Daily Leaderboard — Global Top Scores | Word Frog',
    description:
      "Check today's global Word Frog leaderboard! See top daily puzzle scores, turn efficiency rankings, daily completion counts, and all-time words solved worldwide.",
    canonicalUrl: `${SITE_URL}/leaderboard`,
    robots: DEFAULT_ROBOTS,
  },
  about: {
    title: 'About Word Frog — Daily Word Game by Jeff Chan',
    description:
      'Learn about Word Frog, the privacy-first daily word game created by Jeff Chan with zero data tracking. View version info, developer links, and support options.',
    canonicalUrl: `${SITE_URL}/about`,
    robots: DEFAULT_ROBOTS,
  },
  modal: {
    title: 'Word Frog — Daily Word Guessing & Prefix Puzzle Game',
    description:
      'Play Word Frog, the free daily word guessing game! Reveal letters with strategic prefix guesses, leap across tiles, and compete on the global daily leaderboard.',
    canonicalUrl: `${SITE_URL}/`,
    robots: 'noindex, follow',
  },
  fallback: {
    title: 'Word Frog — Daily Word Guessing & Prefix Puzzle Game',
    description:
      'Play Word Frog, the free daily word guessing game! Reveal letters with strategic prefix guesses, leap across tiles, and compete on the global daily leaderboard.',
    canonicalUrl: `${SITE_URL}/`,
    robots: 'noindex, follow',
  },
} as const satisfies Record<string, RouteSeoConfig>;

export function getSeoForPathname(pathname?: string): RouteSeoConfig {
  const normalized = (pathname || '/').replace(/^\/\(tabs\)/, '') || '/';
  switch (normalized) {
    case '/':
    case '/index':
      return ROUTE_SEO.home;
    case '/practice':
      return ROUTE_SEO.practice;
    case '/leaderboard':
      return ROUTE_SEO.leaderboard;
    case '/about':
      return ROUTE_SEO.about;
    case '/modal':
      return ROUTE_SEO.modal;
    default:
      return ROUTE_SEO.fallback;
  }
}
