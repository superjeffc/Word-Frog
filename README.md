# Word Frog

[![React Native](https://img.shields.io/badge/React_Native-0.81.5-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK_54-000000?logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-Edge-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Cloudflare D1](https://img.shields.io/badge/Cloudflare_D1-Serverless_SQL-F38020?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/d1/)
[![License: All Rights Reserved](https://img.shields.io/badge/License-All_Rights_Reserved-blue.svg)](#license)

A daily word-guessing puzzle game built with React Native (Expo), TypeScript, and serverless Cloudflare Workers. Guess the secret word in as few turns as possible, leap across letter tiles, and compete on the global daily leaderboard.

**Live Web App**: [wordfrog.superjeffc.com](https://wordfrog.superjeffc.com)

---

## Features

- **Daily Word Puzzle**: Synchronized daily word puzzles generated based on local timezone date (`YYYY-MM-DD`).
- **Unlimited Practice Mode**: Infinite replayability with random words pulled from an edge-hosted dictionary KV store.
- **Animated Mascot**: Smooth spring and jump animations (`react-native-reanimated` / `Animated API`) that track guess progression across letter tiles.
- **Strategic Hint System**: Reveal next letters on demand with automatic mathematical score penalization.
- **Global Leaderboards**: Real-time daily top 10 rankings and all-time completion statistics powered by Cloudflare D1 SQL.
- **Unique Handle Tags**: Discord-style player identifiers (`Username#TAG`) generated dynamically to prevent handle spoofing while keeping display names clean.
- **Dictionary Definition Integration**: In-app link to word definitions for vocabulary building.
- **Shareable Score Cards**: Copy and share formatted result summaries to social platforms.
- **Web SEO and PWA Support**: Full Open Graph meta tags, Twitter card support, and JSON-LD `SoftwareApplication` structured data injection.

---

## Architecture & Tech Stack

Word Frog is architected as a cross-platform client (Web, Android, iOS) backed by edge-rendered serverless microservices.

```
                  ┌─────────────────────────────────────────┐
                  │          React Native / Expo App        │
                  │   (Web SPA / Android App / iOS App)     │
                  └────────────────────┬────────────────────┘
                                       │
                     ┌─────────────────┴─────────────────┐
                     │                                   │
                     ▼                                   ▼
      ┌─────────────────────────────┐     ┌─────────────────────────────┐
      │  Dictionary Worker (Edge)   │     │  Leaderboard Worker (Edge)  │
      │  Cloudflare Workers API     │     │  Cloudflare Workers API     │
      └──────────────┬──────────────┘     └──────────────┬──────────────┘
                     │                                   │
                     ▼                                   ▼
      ┌─────────────────────────────┐     ┌─────────────────────────────┐
      │ Cloudflare Workers KV Store │     │   Cloudflare D1 Database    │
      │ (Dictionary Set Membership) │     │ (Serverless SQLite Storage) │
      └─────────────────────────────┘     └─────────────────────────────┘
```

### Stack Breakdown

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React Native `0.81`, Expo `SDK 54`, React Native Web, Expo Router `v6`, React Native Reanimated, TypeScript |
| **Backend / Edge** | Cloudflare Workers (`wrangler`), TypeScript |
| **Databases** | Cloudflare D1 (Serverless SQL Database), Cloudflare Workers KV (Key-Value Store) |
| **Client State / Storage** | `@react-native-async-storage/async-storage`, `expo-crypto` |
| **Deployment** | GitHub Pages (Web), Cloudflare Workers (APIs), Expo Application Services (EAS Build for Android) |

---

## Gameplay Rules & Scoring Mechanics

### Rules
1. **Initial Reveal**: You begin with word length indicator tiles and only the **first letter** revealed.
2. **Matching Prefix**: Every word submission **must start with all currently revealed letters** (the prefix).
3. **Turn Progression**: If a valid dictionary guess is not the secret word, the **next letter** is revealed, and the mascot leaps to the new tile position.
4. **No Repeat Guesses**: Previous guesses cannot be re-used within the same round.
5. **Instant Win**: Typing the exact Secret Word at any time wins the game immediately.

### Mathematical Scoring Algorithm
Scores are computed using turn efficiency, completion time, and hint penalties:

$$\text{Turn Score} = \max(0, \text{Word Length} - \text{Turn Count}) \times 100$$

$$\text{Time Bonus} = \frac{10}{1 + \log_{10}(\text{Seconds} + 1)}$$

$$\text{Base Score} = \text{Turn Score} + \text{Time Bonus}$$

$$\text{Final Score (with Hints)} = \text{Base Score} - \left((\text{Word Length} \times 100) + 100\right) - (\text{Hint Count} \times 50)$$

> **Design Choice**: Turn score is weighted exponentially higher than speed ($100$ pts per turn margin). Time bonus acts purely as a logarithmic tie-breaker. Using hints guarantees placement below all no-hint solvers.

---

## Database Schemas

### 1. Leaderboard Database (Cloudflare D1 SQL)
Stores daily scores and user stats in a `leaderboard` SQLite table:

```sql
CREATE TABLE leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  score REAL NOT NULL,
  game_date TEXT NOT NULL,
  uuid TEXT UNIQUE
);
```

- **Conflict Resolution**: `UPSERT` on `uuid` allows updating anonymous solves when a player sets their name.
- **Privacy Masking**: UUID handles are dynamically replaced with `"Anonymous Frog"` on API fetches.

### 2. Dictionary KV Store (Cloudflare Workers KV)
Stores ~10,000+ uppercase valid dictionary words:
- **Key**: Word string (e.g. `"FROG"`, `"APPLE"`)
- **Value**: `"1"`
- **Performance**: $O(1)$ set membership verification via edge worker.

---

## Directory Structure

```text
Word-Frog/
├── app/                        # Expo Router file-based navigation screens
│   ├── (tabs)/                 # Main tab screen group
│   │   ├── index.tsx           # Daily Game Screen & Web SEO Injection
│   │   ├── practice.tsx        # Unlimited Practice Mode Screen
│   │   ├── leaderboard.tsx     # Global Daily & All-Time Leaderboard
│   │   ├── about.tsx           # About & Developer Info Screen
│   │   └── _layout.tsx         # Bottom Tab Bar Configuration
│   ├── _layout.tsx             # Root Layout & Theme Provider
│   └── modal.tsx               # Modal Router Overlay
├── assets/                     # Images, icons, and frog webp assets
├── components/                 # Reusable UI components & themed controls
├── constants/                  # Color themes, versioning, fallback dictionary
├── dictionary-worker/          # Cloudflare Worker for Dictionary API & KV Bulk Upload
│   ├── scripts/upload.js       # Script to bulk-populate Cloudflare KV
│   └── src/index.ts            # Dictionary validation & random word endpoints
├── leaderboard-worker/         # Cloudflare Worker for D1 Leaderboard API
│   └── src/index.ts            # GET /leaderboard, POST /submit, GET /total-completed
├── public/                     # Web static assets (PWA manifests, sitemap, robots.txt)
├── package.json
└── tsconfig.json
```

---

## Getting Started & Local Setup

### Prerequisites
- **Node.js**: `v22.16` (managed via `.nvmrc`)
- **npm**: `v10+`

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/superjeffc/Word-Frog.git
   cd Word-Frog
   ```

2. **Use Recommended Node Version & Install Dependencies**:
   ```bash
   nvm use
   npm install
   ```

3. **Start Development Server**:
   ```bash
   npm run start
   ```
   Press `w` to open in browser, `a` for Android, or `i` for iOS.

---

## Maintenance & Dependency Management

- **Update Expo Dependencies**:
  ```bash
  nvm use
  npx expo install --fix
  ```

---

## Deployment Commands

- **Deploy Web Application to GitHub Pages**:
  ```bash
  npm run predeploy && npm run deploy
  ```
- **Deploy Cloudflare Leaderboard Worker**:
  ```bash
  npm run deploy:leaderboard
  ```
- **Deploy Cloudflare Dictionary Worker**:
  ```bash
  npm run deploy:dictionary
  ```
- **Build Production Android Binary (EAS)**:
  ```bash
  npm run ship-android
  ```

---

## Author

Developed by **Jeff Chan**
- Website: [superjeffc.com](https://superjeffc.com)
- Game Link: [wordfrog.superjeffc.com](https://wordfrog.superjeffc.com)

---

## License & Terms of Use

Copyright (c) 2026 Jeff Chan. All rights reserved.

This repository is published strictly for portfolio, code demonstration, and evaluation purposes. The source code, assets, and design may not be copied, modified, redistributed, or used for commercial purposes without explicit written permission from the author.