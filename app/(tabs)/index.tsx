import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
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

import { DICTIONARY } from '../../constants/dictionary';
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

export default function App() {
  const { width } = useWindowDimensions();

  // 1. Create a state to hold the word (initially null or empty)
  const [TARGET_WORD, setTargetWord] = useState("");
  const [appIsReady, setAppIsReady] = useState(false);
  const DICTIONARY_SET = React.useMemo(() => new Set(DICTIONARY), []);
  const [revealedPrefix, setRevealedPrefix] = useState("");
  const [userInput, setUserInput] = useState('');
  const [usedWords, setUsedWords] = useState([]);
  const [turnCount, setTurnCount] = useState(0);
  const [endTime, setEndTime] = useState(null);
  const [message, setMessage] = useState("");
  const [isGameOver, setIsGameOver] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [leaderboardName, setLeaderboardName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState(null);

  // 2. Use useEffect to call your async function once on mount
  useEffect(() => {
    let isMounted = true;

    getWordOfTheDay().then(word => {
      if (isMounted && word) {
        setTargetWord(word);
        setRevealedPrefix(word[0]);
        setMessage(`"${word.length} letters. Starts with "${word[0]}"`);
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
    let interval;

    // Only start the ticking clock if the game has begun AND isn't over
    if (startTime && !isGameOver) {
      interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [startTime, isGameOver]); // Added startTime as a dependency

  // Use useEffect to show rules automatically for first-time users (optional)
  useEffect(() => {
    // Logic to check if user has seen rules can go here
    setShowRules(true);
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

    const end = isGameOver ? endTime : currentTime;

    // Math.max(0, ...) ensures we never show a negative number
    const diff = Math.max(0, Math.floor((end - startTime) / 1000));

    const mins = Math.floor(diff / 60);
    const secs = diff % 60;

    return mins === 0 ? `${secs} second(s)` : `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const handleKeyPress = (key) => {
    if (isGameOver) return;

    if (key === 'ENTER') {
      handleSubmit();
    } else if (key === '⌫') {
      setUserInput((prev) => prev.slice(0, -1));
    } else {
      setUserInput((prev) => prev + key);
    }
  };

  const startLeapFrog = () => {
    const now = new Date(); // Create one single timestamp

    setShowRules(false);
    setStartTime(now);      // Set the start point
    setCurrentTime(now);    // Sync the current tick immediately
  };

  const submitToLeaderboard = async () => {
    // 1. Validate that the user actually entered a name
    if (!leaderboardName.trim()) {
      notify("Wait!", "Please enter a name for the board.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 2. Generate the local date in YYYY-MM-DD format (e.g., "2026-01-17")
      // This ensures the score is filed under the user's current calendar day
      const localDate = new Date().toLocaleDateString('en-CA');
      const finalScore = calculateScore();

      // 4. Send the POST request
      const response = await fetch("https://wordfrogleaderboard.superjeffc.com/submit", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: leaderboardName,
          score: Number(finalScore),      // Send as a float/number
          date: localDate,                // Send the local date string
          uuid: submissionId ?? null      // Send the same UUID generated earlier
        }),
      });

      const result = await response.json();

      if (response.status === 409) {
        notify("Name Taken", "Someone already used that name today! Try another.");
      } else if (response.ok) {
        setHasSubmitted(true);
        // Save name for next time
        await AsyncStorage.setItem('last_frog_name', leaderboardName);
        notify("Success!", "You're on the board.");
      } else {
        // Handle other server errors (400, 500, etc.)
        throw new Error(result.error || "Submission failed");
      }
    } catch (error) {
      notify("Error", "Could not connect to the leaderboard.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Also add a useEffect to pre-fill the name from AsyncStorage
  useEffect(() => {
    const loadSavedName = async () => {
      const saved = await AsyncStorage.getItem('last_frog_name');
      if (saved) setLeaderboardName(saved);
    };
    loadSavedName();
  }, []);

  const calculateScore = () => {
    const seconds = Math.max(0, (endTime - startTime) / 1000);
    const maxGuesses = TARGET_WORD.length;

    // 1. Turn Score: Give a huge weight to fewer turns.
    const turnScore = Math.max(0, maxGuesses - turnCount) * 100;

    // 2. Time Bonus: A decaying value that is ALWAYS smaller than a single turn's value.
    const timeBonus = 10 / (1 + Math.log10(seconds + 1));

    const finalScore = turnScore + timeBonus;
    return finalScore.toFixed(2);
  }

  const getStatsString = () => {
    let today = new Date().toLocaleDateString('en-CA');

    return (
      `🐸 #WordFrog on ${today}\n` +
      `🔄 Solved in ${turnCount} turns\n` +
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

  const autoSubmitScore = async (finalScore, id) => {
    try {
      const localDate = new Date().toLocaleDateString('en-CA');
      await fetch("https://wordfrogleaderboard.superjeffc.com/submit", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: "Anonymous Frog",
          score: Number(finalScore),
          date: localDate,
          uuid: id
        }),
      });
    } catch (error) {
      console.error("Auto-submission failed", error);
    }
  };

  const handleSubmit = () => {
    if (isGameOver) return;
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

    if (!DICTIONARY_SET.has(guess) && guess !== TARGET_WORD) {
      setMessage(`❌ "${guess}" isn't in our dictionary!`);
      setUserInput('');
      return;
    }

    setTurnCount(prev => prev + 1);
    setUsedWords(prev => [guess, ...prev]);

    if (guess === TARGET_WORD || (revealedPrefix + TARGET_WORD[revealedPrefix.length]) === TARGET_WORD) {
      const now = new Date();
      const newId = Crypto.randomUUID(); // Generate unique ID
      setSubmissionId(newId); // Save to state for the final name entry

      setRevealedPrefix(TARGET_WORD);
      setEndTime(now);
      setIsGameOver(true);

      // Calculate score immediately to send it
      const seconds = Math.max(0, (now - startTime) / 1000);
      const turnScore = Math.max(0, TARGET_WORD.length - (turnCount + 1)) * 100;
      const timeBonus = 10 / (1 + Math.log10(seconds + 1));
      const nowScore = (turnScore + timeBonus).toFixed(2);
      autoSubmitScore(nowScore, newId);

      setMessage("BULLSEYE! 🐸🏆\n\nCome back tomorrow for another word!");
      return;
    }

    const nextIndex = revealedPrefix.length;
    const nextLetter = TARGET_WORD[nextIndex];
    const newPrefix = revealedPrefix + nextLetter;

    setRevealedPrefix(newPrefix);
    setUserInput('');

    if (newPrefix === TARGET_WORD) {
      setEndTime(new Date());
      setIsGameOver(true);
      setMessage("Word Complete!");
    } else {
      setMessage(`✅ Nice! Next letter: ${nextLetter}`);
    }
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>WORD FROG</Text>
            <Image
              source={require('../../assets/images/froghead.webp')}
              style={styles.headerFrog}
            />
          </View>
          <Text style={styles.stats}>Turn: {isGameOver ? turnCount : turnCount + 1} | {getTimeElapsed()}</Text>
        </View>

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
              {TARGET_WORD.split('').map((letter, index) => (
                <View
                  key={index}
                  style={[
                    styles.letterBox,
                    {
                      width: BOX_SIZE,
                      height: BOX_SIZE * 1.3,
                      marginHorizontal: 4 // This creates the 8px total gap between tiles
                    },
                    index < revealedPrefix.length && styles.revealedBox
                  ]}
                >
                  <Text style={[styles.letterText, { fontSize: DYNAMIC_FONT_SIZE }]}>
                    {index < revealedPrefix.length ? letter : ''}
                  </Text>
                </View>
              ))}
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
            </View>
          ) : (
            <>

              {/* Custom Input Display */}
              <View style={styles.customInputDisplay}>
                <Text style={styles.customInputText}>
                  {userInput || "TAP LETTERS..."}
                </Text>
              </View>

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
              <Text style={styles.buttonText}>LET'S JUMP IN!</Text>
            </TouchableOpacity>
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
});