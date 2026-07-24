import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';

import { CURRENT_VERSION } from '../../constants/version';

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"]
];

const getWordOfTheDay = async () => {
  // Get the user's local date in YYYY-MM-DD format (e.g., "2026-01-17")
  const localDate = new Date().toLocaleDateString('en-CA');
  const API_URL = 'https://wordfrogwordoftheday.superjeffc.com'
  const endpoint = `/getword?date=${localDate}`

  try {
    const response = await fetch(`${API_URL}${endpoint}`);

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const json = await response.json();

    return json.word.toUpperCase();
  } catch (error) {
    console.error("Error fetching word of the day:", error);
  }
};

const generateAlphanumericSuffix = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const isValidSuffix = (suffix: string) => {
  return /^[A-Z0-9]{6}$/.test(suffix.trim().toUpperCase());
};

export default function App() {
  const { width } = useWindowDimensions();

  // 1. Create a state to hold the word (initially null or empty)
  const [TARGET_WORD, setTargetWord] = useState("");
  const [appIsReady, setAppIsReady] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [revealedPrefix, setRevealedPrefix] = useState("");
  const [userInput, setUserInput] = useState('');
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [message, setMessage] = useState("");
  const [isGameOver, setIsGameOver] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [leaderboardName, setLeaderboardName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [hintCount, setHintCount] = useState(0);
  const [hintedLettersCount, setHintedLettersCount] = useState(0);
  const [savedName, setSavedName] = useState("");
  const [alreadySolved, setAlreadySolved] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState("");

  // 2. Use useEffect to call your async function once on mount
  useEffect(() => {
    let isMounted = true;

    getWordOfTheDay().then(async (word) => {
      if (isMounted && word) {
        setTargetWord(word);
        setRevealedPrefix(word[0]);
        setMessage(`"${word.length} letters. Starts with "${word[0]}"`);
        
        // If the user already has a saved name, they won't see the rules modal.
        // Start the game timer immediately once the word is ready.
        const saved = await AsyncStorage.getItem('last_frog_name');
        if (saved) {
          const now = new Date();
          setStartTime(now);
          setCurrentTime(now);
        }
        
        setAppIsReady(true);
      }
    }).catch(err => {
      // Even if it fails, set ready to true so we can
      // show an error message instead of a spinner
      setAppIsReady(true);
    });

    return () => { isMounted = false; };
  }, []);

  // Calculate how much space is available for the whole row
  const AVAILABLE_WIDTH = width - 40; // Total screen width minus side padding
  const TILE_SPACE = AVAILABLE_WIDTH / TARGET_WORD.length;

  // Cap the tile space at 43px, then subtract the margins (4px each side) for the box width
  const DYNAMIC_TILE_SIZE = Math.min(43, TILE_SPACE);
  const BOX_SIZE = DYNAMIC_TILE_SIZE - 8; // Subtracting the 4px margin from both sides
  const DYNAMIC_FONT_SIZE = BOX_SIZE * 0.6;

  // --- WEB SEO & SCHEMA INJECTION ---
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = "Word Frog | Daily Word Guessing Game";

      // Meta Tags
      const metaData = [
        { name: 'description', content: 'A daily word guessing game that challenges your vocabulary.' },
        { property: 'og:title', content: 'Word Frog | Daily Word Game' },
        { property: 'og:description', content: 'A daily word guessing game that challenges your vocabulary.' },
        { property: 'og:image', content: 'https://wordfrog.superjeffc.com/favicon.ico' },
        { property: 'og:url', content: 'https://wordfrog.superjeffc.com' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Word Frog' }
      ];

      metaData.forEach(data => {
        let tag = document.querySelector(`meta[${data.name ? 'name' : 'property'}="${data.name || data.property}"]`);
        if (!tag) {
          tag = document.createElement('meta');
          if (data.name) tag.setAttribute('name', data.name);
          if (data.property) tag.setAttribute('property', data.property);
          document.head.appendChild(tag);
        }
        tag.setAttribute('content', data.content);
      });

      // Link Tags
      interface LinkTag {
        rel: string;
        href: string;
        type?: string;
        sizes?: string;
      }

      const linkTags: LinkTag[] = [
        { rel: 'icon', type: 'image/png', href: '/favicon-96x96.png', sizes: '96x96' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'shortcut icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' }
      ];

      linkTags.forEach(data => {
        const sizeSelector = data.sizes ? `[sizes="${data.sizes}"]` : '';
        const selector = `link[rel="${data.rel}"]${sizeSelector}`;

        let tag = document.querySelector(selector) as HTMLLinkElement | null;

        if (!tag) {
          tag = document.createElement('link');
          document.head.appendChild(tag);
        }

        (Object.keys(data) as Array<keyof LinkTag>).forEach(key => {
          const value = data[key];
          if (value) {
            tag?.setAttribute(key, value);
          }
        });
      });

      // JSON-LD Schema
      const schemaData = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Word Frog",
        "operatingSystem": "Web",
        "applicationCategory": "GameApplication",
        "genre": "Word Game",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "description": "A daily word guessing game that challenges your vocabulary."
      };

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schemaData);
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, []);

  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  useEffect(() => {
    async function prepare() {
      try {
        // Simulating a tiny delay for the dictionary setup
        setAppIsReady(true);
      } catch (e) {
        console.warn(e);
      }
    }

    async function versionCheck() {
      const VERSION_CHECK_URL = 'https://wordfrog.superjeffc.com/version.json';

      try {
        // Add a timestamp to the URL to bypass any ISP or CDN caching
        const response = await fetch(`${VERSION_CHECK_URL}?t=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
          },
        });

        const data = await response.json();

        if (data.version > CURRENT_VERSION) {
          notify("Update Available!", "Please download the latest version before continuing.");
        }
      } catch (error) {
        console.error("Version check failed:", error);
      }
    }

    versionCheck();
    prepare();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    // Only start the ticking clock if the game has begun AND isn't over
    if (startTime && !isGameOver) {
      interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [startTime, isGameOver]); // Added startTime as a dependency

  const checkIfAlreadySolved = async (nameToCheck: string) => {
    // 1. Check local storage first
    try {
      const localDate = new Date().toLocaleDateString('en-CA');
      const solvedDate = await AsyncStorage.getItem('last_solved_date');
      if (solvedDate === localDate) {
        setAlreadySolved(true);
        return;
      }
    } catch (e) {
      console.error("Error checking local solved status:", e);
    }

    if (!nameToCheck.trim()) {
      setAlreadySolved(false);
      return;
    }

    // 2. Fallback to server check
    try {
      const localDate = new Date().toLocaleDateString('en-CA');
      const response = await fetch(`https://wordfrogleaderboard.superjeffc.com/leaderboard?date=${localDate}&v=2`);
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      const json = await response.json();
      const players = json.players || (Array.isArray(json) ? json : []);

      const found = players.some(
        (player: any) => player.username && player.username.trim().toLowerCase() === nameToCheck.trim().toLowerCase()
      );

      if (found) {
        await AsyncStorage.setItem('last_solved_date', localDate);
      }

      setAlreadySolved(found);
    } catch (error) {
      console.error("Error checking solved status:", error);
      setAlreadySolved(false);
    }
  };

  const handleNotYou = async () => {
    const proceed = async () => {
      await AsyncStorage.removeItem('last_frog_name');
      setSavedName("");
      setLeaderboardName("");
      setAlreadySolved(false);
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to change your name? This will clear your saved name from this device.")) {
        await proceed();
      }
    } else {
      Alert.alert(
        "Change Name",
        "Are you sure you want to change your name? This will clear your saved name from this device.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Change", style: "destructive", onPress: proceed }
        ]
      );
    }
  };

  const handleSetupName = () => {
    const base = savedName ? savedName.split('#')[0] : "";
    setTempName(base);
    setShowNameModal(true);
  };

  const saveName = async () => {
    const trimmed = tempName.trim();
    if (!trimmed) {
      notify("Wait!", "Please enter a valid name.");
      return;
    }

    let baseName = trimmed;
    let suffix = '';

    if (trimmed.includes('#')) {
      const parts = trimmed.split('#');
      baseName = parts[0].trim();
      suffix = parts[1].trim();
    }

    if (!baseName) {
      notify("Wait!", "Please enter a valid name.");
      return;
    }

    if (baseName.length > 12) {
      baseName = baseName.slice(0, 12);
    }

    const previousSaved = await AsyncStorage.getItem('last_frog_name') || '';
    let previousBase = '';
    let previousSuffix = '';
    if (previousSaved.includes('#')) {
      const parts = previousSaved.split('#');
      previousBase = parts[0].trim();
      previousSuffix = parts[1].trim();
    }

    if (!suffix || !isValidSuffix(suffix)) {
      if (baseName.toLowerCase() === previousBase.toLowerCase() && previousSuffix && isValidSuffix(previousSuffix)) {
        suffix = previousSuffix.toUpperCase();
      } else {
        suffix = generateAlphanumericSuffix();
      }
    } else {
      suffix = suffix.toUpperCase();
    }

    const finalName = `${baseName}#${suffix}`;

    await AsyncStorage.setItem('last_frog_name', finalName);
    setSavedName(finalName);
    setLeaderboardName(finalName);
    setShowNameModal(false);
    await checkIfAlreadySolved(finalName);
  };

  // Load saved name and check if solved on mount
  useEffect(() => {
    const initNameAndRules = async () => {
      const saved = await AsyncStorage.getItem('last_frog_name');
      if (saved) {
        setSavedName(saved);
        setLeaderboardName(saved);
        await checkIfAlreadySolved(saved);
      } else {
        // Only show rules for first-time users (no saved name)
        setShowRules(true);
        await checkIfAlreadySolved("");
      }
    };
    initNameAndRules();
  }, []);

  // 1. Setup the Animation Value
  // We start at 0 (the first letter)
  const frogX = useRef(new Animated.Value(0)).current;
  const frogY = useRef(new Animated.Value(0)).current;

  const jumpFrog = () => {
    // Reset Y to 0 just in case
    frogY.setValue(0);

    Animated.sequence([
      // Upward motion
      Animated.timing(frogY, {
        toValue: -30, // How high to jump
        duration: 150,
        useNativeDriver: true,
      }),
      // Downward motion
      Animated.timing(frogY, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // 2. Animate the frog whenever the revealedPrefix changes
  useEffect(() => {
    if (revealedPrefix && revealedPrefix.length > 1) {
      const nextIndex = revealedPrefix.length - 1;
      Animated.spring(frogX, {
        toValue: nextIndex * DYNAMIC_TILE_SIZE,
        friction: 8,
        useNativeDriver: true,
      }).start();
      jumpFrog();
    }
  }, [revealedPrefix, DYNAMIC_TILE_SIZE]);

  const getTimeElapsed = () => {
    // If the game hasn't started yet, or start time isn't set, show 0
    if (!startTime) return "0 seconds";

    const startMs = startTime.getTime();
    const endMs = (isGameOver && endTime) ? endTime.getTime() : currentTime.getTime();

    // Math.max(0, ...) ensures we never show a negative number
    const diff = Math.max(0, Math.floor((endMs - startMs) / 1000));

    const mins = Math.floor(diff / 60);
    const secs = diff % 60;

    return mins === 0 ? `${secs} second(s)` : `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const confirmedPrefix = TARGET_WORD ? TARGET_WORD.slice(0, revealedPrefix.length + hintedLettersCount) : revealedPrefix;

  const handleKeyPress = (key: string) => {
    if (isGameOver) return;

    if (key === 'ENTER') {
      handleSubmit();
    } else if (key === '⌫') {
      setUserInput((prev) => {
        let current = prev.startsWith(confirmedPrefix) ? prev : confirmedPrefix + prev;
        if (current.length <= confirmedPrefix.length) {
          return current;
        }
        return current.slice(0, -1);
      });
    } else {
      setUserInput((prev) => {
        let current = prev.startsWith(confirmedPrefix) ? prev : confirmedPrefix + prev;
        if (current.length >= TARGET_WORD.length) {
          return current;
        }
        return current + key;
      });
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return;
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleKeyPress('ENTER');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeyPress('⌫');
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleKeyPress(e.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameOver, userInput, revealedPrefix, hintedLettersCount, TARGET_WORD]);

  const startLeapFrog = () => {
    const now = new Date(); // Create one single timestamp

    setShowRules(false);
    setStartTime(now);      // Set the start point
    setCurrentTime(now);    // Sync the current tick immediately
  };

  const autoSubmitWithSavedName = async (name: string, finalScore: string | number, id: string) => {
    setIsSubmitting(true);
    try {
      const localDate = new Date().toLocaleDateString('en-CA');
      let currentName = name;
      let response = await fetch("https://wordfrogleaderboard.superjeffc.com/submit", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentName,
          score: Number(finalScore),
          date: localDate,
          uuid: id
        }),
      });

      let result = await response.json();
      let attempts = 0;

      while ((response.status === 409 || (response.status === 400 && result.error === "Submission failed")) && attempts < 3) {
        attempts++;
        const parts = currentName.split('#');
        const baseName = parts[0];
        const newSuffix = generateAlphanumericSuffix();
        currentName = `${baseName}#${newSuffix}`;

        response = await fetch("https://wordfrogleaderboard.superjeffc.com/submit", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: currentName,
            score: Number(finalScore),
            date: localDate,
            uuid: id
          }),
        });
        result = await response.json();
      }

      if (response.status === 409 || (response.status === 400 && result.error === "Submission failed")) {
        notify("Name Taken", "Your saved name was already used today! Please enter a new one.");
        setHasSubmitted(false);
        setSavedName('');
        setLeaderboardName('');
        await AsyncStorage.removeItem('last_frog_name');
      } else if (response.ok) {
        setHasSubmitted(true);
        if (currentName !== name) {
          await AsyncStorage.setItem('last_frog_name', currentName);
          setSavedName(currentName);
          setLeaderboardName(currentName);
        }
      } else {
        throw new Error(result.error || "Submission failed");
      }
    } catch (error) {
      notify("Error", "Could not auto-submit your score to the leaderboard.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitToLeaderboard = async () => {
    const trimmed = leaderboardName.trim();
    if (!trimmed) {
      notify("Wait!", "Please enter a name for the board.");
      return;
    }

    let baseName = trimmed;
    let suffix = '';

    if (trimmed.includes('#')) {
      const parts = trimmed.split('#');
      baseName = parts[0].trim();
      suffix = parts[1].trim();
    }

    if (!baseName) {
      notify("Wait!", "Please enter a name for the board.");
      return;
    }

    if (baseName.length > 12) {
      baseName = baseName.slice(0, 12);
    }

    const previousSaved = await AsyncStorage.getItem('last_frog_name') || '';
    let previousBase = '';
    let previousSuffix = '';
    if (previousSaved.includes('#')) {
      const parts = previousSaved.split('#');
      previousBase = parts[0].trim();
      previousSuffix = parts[1].trim();
    }

    if (!suffix || !isValidSuffix(suffix)) {
      if (baseName.toLowerCase() === previousBase.toLowerCase() && previousSuffix && isValidSuffix(previousSuffix)) {
        suffix = previousSuffix.toUpperCase();
      } else {
        suffix = generateAlphanumericSuffix();
      }
    } else {
      suffix = suffix.toUpperCase();
    }

    let finalName = `${baseName}#${suffix}`;

    setIsSubmitting(true);
    try {
      const localDate = new Date().toLocaleDateString('en-CA');
      const finalScore = calculateScore();

      let attempts = 0;
      let response = await fetch("https://wordfrogleaderboard.superjeffc.com/submit", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: finalName,
          score: Number(finalScore),
          date: localDate,
          uuid: submissionId ?? null
        }),
      });

      let result = await response.json();

      while ((response.status === 409 || (response.status === 400 && result.error === "Submission failed")) && attempts < 3) {
        attempts++;
        suffix = generateAlphanumericSuffix();
        finalName = `${baseName}#${suffix}`;

        response = await fetch("https://wordfrogleaderboard.superjeffc.com/submit", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: finalName,
            score: Number(finalScore),
            date: localDate,
            uuid: submissionId ?? null
          }),
        });
        result = await response.json();
      }

      if (response.status === 409 || (response.status === 400 && result.error === "Submission failed")) {
        notify("Name Taken", "Someone already used that name today! Try another.");
      } else if (response.ok) {
        setHasSubmitted(true);
        // Save name for next time
        await AsyncStorage.setItem('last_frog_name', finalName);
        setSavedName(finalName);
        setLeaderboardName(finalName);
      } else {
        throw new Error(result.error || "Submission failed");
      }
    } catch (error) {
      notify("Error", "Could not connect to the leaderboard.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateScore = (finalTurnCount = turnCount, finalHintCount = hintCount, finalEndTime: Date | null = endTime) => {
    const start = startTime || new Date();
    const end = finalEndTime || endTime || new Date();
    const seconds = Math.max(0, (end.getTime() - start.getTime()) / 1000);
    const maxGuesses = TARGET_WORD.length || 1;

    // 1. Turn Score: Give a huge weight to fewer turns.
    const turnScore = Math.max(0, maxGuesses - finalTurnCount) * 100;

    // 2. Time Bonus: A decaying value that is ALWAYS smaller than a single turn's value.
    const timeBonus = 10 / (1 + Math.log10(seconds + 1));

    let finalScore = turnScore + timeBonus;

    // Apply hint penalty if hints were used
    if (finalHintCount > 0) {
      // Penalty ensures that even with 1 hint, the score is always lower than a no-hint user's minimum possible score (>0)
      const basePenalty = (maxGuesses * 100) + 100;
      const perHintPenalty = finalHintCount * 50;
      finalScore = finalScore - basePenalty - perHintPenalty;
    }

    return finalScore.toFixed(4);
  };

  const handleGetHint = () => {
    if (isGameOver) return;

    const nextIndex = revealedPrefix.length + hintedLettersCount;
    if (nextIndex >= TARGET_WORD.length) {
      notify("Already Completed", "All letters have been revealed!");
      return;
    }

    const nextLetter = TARGET_WORD[nextIndex];

    const performGetHint = () => {
      setHintCount(prev => prev + 1);
      setHintedLettersCount(prev => prev + 1);
      setUserInput('');
      setMessage(`💡 Hint: The next letter is "${nextLetter}"`);
    };

    if (Platform.OS === 'web') {
      const confirm = window.confirm(
        "Use a Hint?\n\nThis will reveal the next letter but will apply a final score penalty so that you'll rank below players who didn't use hints. Continue?"
      );
      if (confirm) {
        performGetHint();
      }
    } else {
      Alert.alert(
        "Use a Hint?",
        "This will reveal the next letter but will apply a final score penalty so that you'll rank below players who didn't use hints. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Yes, get hint", onPress: performGetHint }
        ]
      );
    }
  };

  const getStatsString = () => {
    let today = new Date().toLocaleDateString('en-CA');
    const hintsUsedStr = hintCount > 0 ? `💡 Hints used: ${hintCount}\n` : '';

    return (
      `🐸 #WordFrog on ${today}\n` +
      `🔄 Solved in ${turnCount} turns\n` +
      hintsUsedStr +
      `⏱️ Time: ${getTimeElapsed()}\n` +
      `🏆 Score: ${calculateScore()}\n\n` +
      `Play here: wordfrog.superjeffc.com`
    );
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(getStatsString());
    notify("Copied!", "Your score has been copied to the clipboard.");
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: getStatsString() });
    } catch (e) {
      copyToClipboard();
    }
  };

  const autoSubmitScore = async (finalScore: string | number, id: string) => {
    try {
      const localDate = new Date().toLocaleDateString('en-CA');
      await fetch("https://wordfrogleaderboard.superjeffc.com/submit", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: id,
          score: Number(finalScore),
          date: localDate,
          uuid: id
        }),
      });
    } catch (error) {
      console.error("Auto-submission failed", error);
    }
  };

  const handleSubmit = async () => {
    if (isGameOver || isValidating) return;
    const guess = userInput.trim().toUpperCase();

    if (!guess) {
      return;
    }

    if (usedWords.includes(guess)) {
      setMessage(`❌ You already used "${guess}"!`);
      setUserInput('');
      return;
    }

    if (!guess.startsWith(revealedPrefix)) {
      setMessage(`❌ Must start with "${revealedPrefix}"`);
      setUserInput('');
      return;
    }

    setIsValidating(true);
    if (guess !== TARGET_WORD) {
      try {
        const response = await fetch("https://word-frog-dictionary-api.superjeffc.workers.dev/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word: guess })
        });
        
        if (!response.ok) {
          throw new Error("Validation request failed");
        }
        
        const data = await response.json();
        if (!data.valid) {
          setMessage(`❌ "${guess}" isn't in our dictionary!`);
          setUserInput('');
          setIsValidating(false);
          return;
        }
      } catch (error) {
        console.error("Failed to validate word:", error);
        setMessage("⚠️ Connection error. Could not verify word.");
        setIsValidating(false);
        return;
      }
    }
    setIsValidating(false);

    setTurnCount(prev => prev + 1);
    setUsedWords(prev => [guess, ...prev]);

    if (guess === TARGET_WORD) {
      const now = new Date();
      const newId = Crypto.randomUUID(); // Generate unique ID
      setSubmissionId(newId); // Save to state for the final name entry

      setRevealedPrefix(TARGET_WORD);
      setEndTime(now);
      setIsGameOver(true);
      setHintedLettersCount(0);

      // Save solve date to local storage immediately
      const localDate = new Date().toLocaleDateString('en-CA');
      AsyncStorage.setItem('last_solved_date', localDate).catch(err => 
        console.error("Error saving solved date:", err)
      );

      // Calculate score immediately to send it
      const nowScore = calculateScore(turnCount + 1, hintCount, now);
      
      if (savedName) {
        autoSubmitWithSavedName(savedName, nowScore, newId);
      } else {
        autoSubmitScore(nowScore, newId);
      }

      setMessage("BULLSEYE! 🐸🏆\n\nCome back tomorrow for another word!");
      return;
    }

    if (revealedPrefix.length === TARGET_WORD.length - 1) {
      setMessage(`❌ "${guess}" is not the secret word!`);
      setUserInput('');
      return;
    }

    const nextIndex = revealedPrefix.length;
    const nextLetter = TARGET_WORD[nextIndex];
    const newPrefix = revealedPrefix + nextLetter;

    setRevealedPrefix(newPrefix);
    setUserInput('');
    setHintedLettersCount(prev => Math.max(0, prev - 1));

    setMessage(`✅ Nice! Next letter: ${nextLetter}`);
  };

  const openDefinition = () => {
    const url = `https://www.google.com/search?q=define+${TARGET_WORD.toLowerCase()}`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        notify("Error", "Could not open definition");
      }
    });
  };

  if (!appIsReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {savedName ? (
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>
            Hello, {savedName.split('#')[0]}
          </Text>
          <TouchableOpacity onPress={handleNotYou} style={styles.notYouBtn}>
            <Text style={styles.notYouText}>Not you?</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>No name set</Text>
          <TouchableOpacity onPress={handleSetupName} style={styles.notYouBtn}>
            <Text style={[styles.notYouText, { color: '#2e7d32' }]}>Setup Name</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>WORD FROG</Text>
          </View>
          <Text style={styles.stats}>Turn: {isGameOver ? turnCount : turnCount + 1} | {getTimeElapsed()}</Text>
        </View>

        {alreadySolved ? (
          <View style={styles.alreadySolvedContainer}>
            <Text style={styles.alreadySolvedEmoji}>🐸🎉</Text>
            <Text style={styles.alreadySolvedText}>{"You have already solved today's puzzle!"}</Text>
            <Text style={styles.alreadySolvedSubtext}>Come back tomorrow for another word.</Text>
            
            <View style={styles.continueSection}>
              <Text style={styles.continueText}>
                Want to keep playing? Practice with a random word!
              </Text>
              <TouchableOpacity
                style={styles.continueBtn}
                onPress={() => router.navigate('/practice')}
              >
                <Text style={styles.continueBtnText}>PLAY PRACTICE MODE 🐸</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.gameArea}>
              {/* This wrapper is exactly the width of the word grid */}
              <View style={{ width: TARGET_WORD.length * DYNAMIC_TILE_SIZE, position: 'relative' }}>

                <Animated.View
                  style={[
                    styles.frogContainer,
                    {
                      width: DYNAMIC_TILE_SIZE,
                      left: 0, // Now '0' is the exact start of the first box
                      transform: [
                        { translateX: frogX },
                        { translateY: frogY }
                      ]
                    }
                  ]}
                >
                  <Image
                    source={require('../../assets/images/frog.webp')}
                    style={{ width: BOX_SIZE, height: BOX_SIZE, resizeMode: 'contain' }}
                  />
                </Animated.View>

                <View style={styles.wordContainer}>
                  {TARGET_WORD.split('').map((letter, index) => {
                    const isRevealed = index < revealedPrefix.length;
                    const isHint = index >= revealedPrefix.length && index < revealedPrefix.length + hintedLettersCount;
                    const isConfirmed = isRevealed || isHint;

                    const effectiveInput = userInput.startsWith(confirmedPrefix) ? userInput : (confirmedPrefix + userInput);
                    const typedChar = effectiveInput[index]?.toUpperCase();
                    const isGuess = !isConfirmed && Boolean(typedChar);

                    const activeIndex = effectiveInput.length;
                    const isActiveCursor = !isConfirmed && index === activeIndex && !isGameOver;

                    const displayChar = isConfirmed ? letter : (typedChar || '');

                    return (
                      <View
                        key={index}
                        style={[
                          styles.letterBox,
                          {
                            width: BOX_SIZE,
                            height: BOX_SIZE * 1.3,
                            marginHorizontal: 4 // This creates the 8px total gap between tiles
                          },
                          isRevealed && styles.revealedBox,
                          isHint && styles.hintBox,
                          isGuess && styles.guessBox,
                          isActiveCursor && styles.activeCursorBox,
                        ]}
                      >
                        <Text style={[
                          styles.letterText,
                          { fontSize: DYNAMIC_FONT_SIZE },
                          isHint && styles.hintLetterText,
                          isGuess && styles.guessLetterText,
                        ]}>
                          {displayChar}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.inputArea}>
              <Text style={[styles.messageText, isGameOver && styles.winMessage]}>
                {message}
              </Text>

              {isGameOver ? (
                <View style={styles.winBox}>
                  <Text style={styles.finalStats}>
                    Your Score: {calculateScore()}
                  </Text>

                  {hintCount > 0 && (
                    <Text style={styles.hintPenaltyText}>
                      ⚠️ Score includes a penalty for using {hintCount} hint{hintCount > 1 ? 's' : ''}.
                    </Text>
                  )}

                  {!hasSubmitted ? (
                    <View style={{ width: '100%', alignItems: 'center' }}>
                      <TextInput
                        style={styles.leaderboardInput}
                        placeholder="Enter Name for Leaderboard"
                        value={leaderboardName}
                        onChangeText={setLeaderboardName}
                        maxLength={15}
                      />
                      <TouchableOpacity
                        style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                        onPress={submitToLeaderboard}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.buttonText}>SUBMIT SCORE 🐸</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.submittedText}>✓ Score Submitted!</Text>
                  )}

                  {/* --- DEFINITION BUTTON --- */}
                  <TouchableOpacity style={styles.definitionBtn} onPress={openDefinition}>
                    <Text style={styles.definitionText}>📖 See Definition</Text>
                  </TouchableOpacity>
                  {/* ------------------------- */}

                  <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                    <Text style={styles.buttonText}>SHARE SCORE</Text>
                  </TouchableOpacity>

                  {/* --- PRACTICE MODE BLURB & BUTTON --- */}
                  <View style={styles.practiceWinSection}>
                    <Text style={styles.practiceWinText}>
                      {"Solved today's word? Keep the fun going with a completely random word!"}
                    </Text>
                    <TouchableOpacity
                      style={styles.practiceWinBtn}
                      onPress={() => router.navigate('/practice')}
                    >
                      <Text style={styles.practiceWinBtnText}>PLAY RANDOM WORD 🐸</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>

                  {/* Custom Input Display */}
                  <View style={styles.customInputDisplay}>
                    <Text style={styles.customInputText}>
                      {(userInput.startsWith(confirmedPrefix) ? userInput : (confirmedPrefix + userInput)) || "TAP LETTERS..."}
                    </Text>
                  </View>

                  {/* Hint Button */}
                  <TouchableOpacity
                    style={styles.hintBtn}
                    onPress={handleGetHint}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.hintBtnText}>💡 GET HINT</Text>
                  </TouchableOpacity>

                  {/* On-Screen Keyboard */}
                  <View style={styles.keyboardContainer}>
                    {KEYBOARD_ROWS.map((row, rowIndex) => (
                      <View key={rowIndex} style={styles.keyboardRow}>
                        {row.map((key) => {
                          // Style tweak for special keys
                          const isSpecial = key === 'ENTER' || key === '⌫';
                          return (
                            <TouchableOpacity
                              key={key}
                              style={[
                                styles.keyButton,
                                isSpecial && styles.specialKey
                              ]}
                              onPress={() => handleKeyPress(key)}
                            >
                              <Text style={[
                                styles.keyText,
                                isSpecial && styles.specialKeyText
                              ]}>
                                {key}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>

            {!isGameOver && usedWords.length > 0 && (
              <View style={styles.historyContainer}>
                <Text style={styles.historyTitle}>Words Used:</Text>
                <Text style={styles.historyText}>{usedWords.join(', ')}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={showRules}
        onRequestClose={() => setShowRules(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* You can even add that frog image here! */}
            <Text style={styles.modalTitle}>How to Play
              <Image
                source={require('../../assets/images/froghead.webp')}
                style={styles.howtoplayFrog}
              />
            </Text>

            <View style={styles.ruleSection}>
              <Text style={styles.goalText}>
                Guess the <Text style={styles.bold}>Secret Word</Text> in as few turns as possible!
              </Text>

              <Text style={styles.ruleItem}>
                <Text style={styles.bold}>1. Start Small: </Text>
                You begin with only the first letter revealed.
              </Text>

              <Text style={styles.ruleItem}>
                <Text style={styles.bold}>2. Reveal Letters: </Text>
                Submit <Text style={styles.italic}>any</Text> valid word starting with the shown letters to reveal the <Text style={styles.bold}>next letter</Text>.
              </Text>

              {/* Separate line for the restriction */}
              <Text style={[styles.ruleItem, { color: '#d32f2f', fontWeight: '600' }]}>
                ⚠️ Previous guesses cannot be re-used!
              </Text>

              <Text style={styles.ruleItem}>
                <Text style={styles.bold}>3. Take the Leap: </Text>
                Think you know the Secret Word? Type it in at any time to <Text style={styles.bold}>win instantly</Text>!
              </Text>

              <Text style={styles.ruleItem}>
                <Text style={styles.bold}>4. Need a Hand?: </Text>
                Use the <Text style={styles.bold}>💡 Hint</Text> button to see the next letter without submitting a word. Beware: this comes with a <Text style={styles.bold}>final score penalty</Text>!
              </Text>

              <View style={styles.tipBox}>
                <Text style={styles.tipText}>
                  💡 <Text style={styles.bold}>Pro Tip:</Text> Every word you guess counts as a turn. Be strategic to keep your turns low!
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={startLeapFrog}
            >
              <Text style={styles.buttonText}>{"LET'S JUMP IN!"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={showNameModal}
        onRequestClose={() => setShowNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Your Name
              <Image
                source={require('../../assets/images/froghead.webp')}
                style={styles.howtoplayFrog}
              />
            </Text>

            <View style={styles.ruleSection}>
              <Text style={styles.setupDescription}>
                Enter your name to automatically submit and display your scores on the leaderboard.
              </Text>
              
              <TextInput
                style={styles.leaderboardInput}
                placeholder="Enter Name (max 15 chars)"
                placeholderTextColor="#999"
                value={tempName}
                onChangeText={setTempName}
                maxLength={15}
                autoFocus={true}
                onSubmitEditing={saveName}
              />
            </View>

            <View style={styles.setupButtonsRow}>
              <TouchableOpacity
                style={[styles.setupBtn, styles.cancelBtn]}
                onPress={() => setShowNameModal(false)}
              >
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.setupBtn, styles.saveBtn]}
                onPress={saveName}
              >
                <Text style={styles.saveBtnText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ... styles remain the same
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f8e9' },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    // CHANGE: 'flex-start' pulls content to the top
    justifyContent: 'flex-start',
    // ADD: Specific padding to control the distance from the top
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20
  },
  header: {
    // REDUCE: Lower the margin if it's currently high (e.g., from 60 to 20)
    marginBottom: 60,
    alignItems: 'center'
  },
  title: { fontSize: 42, fontWeight: '900', color: '#2e7d32', letterSpacing: -1 },
  stats: { fontSize: 18, color: '#558b2f', fontWeight: '600' },
  revealedBox: { backgroundColor: '#4caf50', borderColor: '#1b5e20', marginBottom: 30 },
  letterText: {
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    includeFontPadding: false, // Fixes vertical centering on Android
    textAlignVertical: 'center',
  },
  inputArea: { width: '100%', alignItems: 'center' },
  messageText: { marginBottom: 15, fontSize: 17, fontWeight: '600', color: '#444', textAlign: 'center', minHeight: 25 },
  winMessage: { color: '#2e7d32', fontSize: 22 },
  input: { width: '85%', height: 60, backgroundColor: '#fff', borderRadius: 15, paddingHorizontal: 20, fontSize: 22, borderWidth: 2, borderColor: '#81c784', marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
  button: { backgroundColor: '#2e7d32', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, elevation: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  winBox: { alignItems: 'center', backgroundColor: '#fff', padding: 25, borderRadius: 24, borderWidth: 2, borderColor: '#4caf50', width: '90%' },
  finalStats: { fontSize: 18, fontWeight: '700', color: '#2e7d32', marginBottom: 20, textAlign: 'center' },
  shareBtn: { backgroundColor: '#ffa000', paddingVertical: 15, paddingHorizontal: 45, borderRadius: 30 },
  copyLink: { marginTop: 15 },
  copyLinkText: { color: '#558b2f', textDecorationLine: 'underline', fontWeight: '600' },
  hintBtn: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    borderWidth: 2,
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginBottom: 20,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  hintBtnText: {
    color: '#d97706',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  hintBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    borderStyle: 'dashed',
    borderWidth: 2.5,
  },
  hintLetterText: {
    color: '#d97706',
  },
  guessBox: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
    borderWidth: 2.5,
  },
  guessLetterText: {
    color: '#0369a1',
  },
  activeCursorBox: {
    borderColor: '#2e7d32',
    borderWidth: 2.5,
    backgroundColor: '#f1f8e9',
  },
  hintPenaltyText: {
    fontSize: 14,
    color: '#d32f2f',
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  historyContainer: { marginTop: 30, alignItems: 'center', paddingHorizontal: 20 },
  historyTitle: { fontSize: 13, fontWeight: 'bold', color: '#558b2f', textTransform: 'uppercase', marginBottom: 4 },
  historyText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontSize: Platform.OS === 'android' ? 20 : 24,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 15,
  },
  closeButton: {
    backgroundColor: '#2e7d32',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 20,
  },
  frogImage: {
    width: 35,
    height: 35,
    resizeMode: 'contain',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerFrog: {
    width: 40,
    height: 40,
    marginLeft: 10,
    resizeMode: 'contain',
  },
  howtoplayFrog: {
    width: 40,
    height: 40,
    marginLeft: 10,
    resizeMode: 'contain',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  goalText: {
    fontSize: Platform.OS === 'android' ? 14 : 18,
    color: '#2e7d32',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  ruleSection: {
    width: '100%',
    paddingHorizontal: 5,
  },
  ruleItem: {
    fontSize: Platform.OS === 'android' ? 12 : 15,
    color: '#333',
    marginBottom: Platform.OS === 'android' ? 5 : 15,
    lineHeight: 22,
  },
  bold: { fontWeight: 'bold' },
  italic: { fontStyle: 'italic' },
  tipBox: {
    backgroundColor: '#f1f8e9',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
    marginTop: 5,
  },
  tipText: {
    fontSize: Platform.OS === 'android' ? 12 : 14,
    color: '#558b2f',
    lineHeight: 20,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#f1f8e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: '600',
    fontStyle: 'italic',
  },

  gameArea: {
    width: '100%',
    alignItems: 'center',    // This centers the gridWrapper automatically
    justifyContent: 'center',
    marginVertical: 20,
  },
  frogContainer: {
    position: 'absolute',
    top: -35,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  letterBox: {
    borderWidth: 2,
    borderColor: '#c8e6c9',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#fff',
  },

  definitionBtn: {
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#e8f5e9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#a5d6a7',
  },
  definitionText: {
    color: '#2e7d32',
    fontSize: 16,
    fontWeight: '600',
  },

  customInputDisplay: {
    width: '85%',
    height: 60,
    backgroundColor: '#fff',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#81c784',
    marginBottom: 20,
  },
  customInputText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 2,
  },

  // Keyboard Styles
  keyboardContainer: {
    width: '100%',
    paddingHorizontal: 5,
    marginBottom: 20,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  keyButton: {
    backgroundColor: '#fff',
    borderRadius: 6,
    marginHorizontal: 3,
    height: 50,
    // Use smaller width for Android to keep keyboard compact
    minWidth: Platform.OS === 'android' ? 24 : 32,
    flex: 1,      // Distributes space evenly
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  keyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  specialKey: {
    backgroundColor: '#e0e0e0', // Slightly darker for Enter/Backspace
    flex: 1.5, // Make them a bit wider than letters
  },
  specialKeyText: {
    fontSize: Platform.OS === 'android' ? 9 : 14,
    letterSpacing: Platform.OS === 'android' ? -1 : 0,
  },

  leaderboardInput: {
    width: '100%',
    height: 50,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1fae5',
    paddingHorizontal: 15,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: '#2e7d32',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  submittedText: {
    color: '#2e7d32',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 20,
  },
  welcomeContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 10,
    right: 12,
    alignItems: 'flex-end',
    zIndex: 100,
    backgroundColor: 'rgba(241, 248, 233, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  welcomeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  welcomeTag: {
    fontSize: 10,
    fontWeight: 'normal',
    color: '#777',
  },
  notYouBtn: {
    marginTop: 1,
  },
  notYouText: {
    fontSize: 9,
    color: '#d32f2f',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  alreadySolvedContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#4caf50',
    width: '90%',
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alreadySolvedEmoji: {
    fontSize: 48,
    marginBottom: 15,
  },
  alreadySolvedText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e7d32',
    textAlign: 'center',
    marginBottom: 10,
  },
  alreadySolvedSubtext: {
    fontSize: 15,
    color: '#558b2f',
    textAlign: 'center',
    fontWeight: '600',
  },
  setupDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  setupButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  setupBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#eceff1',
    borderWidth: 1,
    borderColor: '#cfd8dc',
  },
  cancelBtnText: {
    color: '#37474f',
    fontWeight: 'bold',
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: '#2e7d32',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  continueSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
    width: '100%',
  },
  continueText: {
    fontSize: 14,
    color: '#558b2f',
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  continueBtn: {
    backgroundColor: '#2e7d32',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  practiceWinSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e8f5e9',
    alignItems: 'center',
    width: '100%',
  },
  practiceWinText: {
    fontSize: 13,
    color: '#558b2f',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 18,
    fontWeight: '500',
  },
  practiceWinBtn: {
    backgroundColor: '#4caf50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#388e3c',
  },
  practiceWinBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});