import * as Clipboard from 'expo-clipboard';
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
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';

import { DICTIONARY, TARGET_WORDS } from '../../constants/words';

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"]
];

const getWordOfTheDay = () => {
  const now = new Date();

  // 1. Create a stable seed for the day (e.g., 20251219)
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();

  // 2. Use an LCG formula to scramble the seed
  const scrambled = (seed * 1664525 + 1013904223) % 4294967296;

  // 3. Map that large scrambled number to the array length
  const index = scrambled % TARGET_WORDS.length;

  return TARGET_WORDS[index].toUpperCase();
};

export default function App() {
  const { width } = useWindowDimensions();

  // Calculate how much space is available for the whole row
  const TARGET_WORD = React.useMemo(() => getWordOfTheDay(), []);
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

      // 1. Meta Tags
      const metaData = [
        { name: 'description', content: 'A daily word guessing game that challenges your vocabulary.' },
        { property: 'og:title', content: 'Word Frog | Daily Word Game' },
        { property: 'og:description', content: 'A daily word guessing game that challenges your vocabulary.' },
        { property: 'og:image', content: 'https://wordfrog.superjeffc.com/favicon.ico' },
        { property: 'og:url', content: 'https://wordfrog.superjeffc.com' },
        { name: 'twitter:card', content: 'summary_large_image' }
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

      // 2. JSON-LD Schema
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
  // ----------------------------------

  const DICTIONARY_SET = React.useMemo(() => new Set(DICTIONARY), []);
  const [appIsReady, setAppIsReady] = useState(false);
  const [revealedPrefix, setRevealedPrefix] = useState(TARGET_WORD[0]);
  const [userInput, setUserInput] = useState('');
  const [usedWords, setUsedWords] = useState([]);
  const [turnCount, setTurnCount] = useState(0);
  const [endTime, setEndTime] = useState(null);
  const [message, setMessage] = useState(`"${TARGET_WORD.length} letters. Starts with "${TARGET_WORD[0]}"`);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    async function prepare() {
      try {
        // Simulating a tiny delay for the dictionary setup
        setAppIsReady(true);
      } catch (e) {
        console.warn(e);
      }
    }
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
    if (revealedPrefix.length > 1) {
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

  const calculateScore = () =>  {
    let seconds = Math.max(0, (endTime - startTime) / 1000);
    let maxGuesses = TARGET_WORD.length;

    // 1. Accuracy Base (0 to 100)
    const incorrectGuesses = Math.max(0, turnCount - 1);
    const accuracyMultiplier = Math.max(0, (maxGuesses - incorrectGuesses) / maxGuesses);
    const baseScore = accuracyMultiplier * 100;

    // 2. Logarithmic Decay
    const timeDivider = Math.log10(seconds + 10);

    const finalScore = baseScore / timeDivider;

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
    if (Platform.OS === 'web') {
      alert("Score copied to clipboard!");
    } else {
      Alert.alert("Copied!", "Your score has been copied to the clipboard.");
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: getStatsString() });
    } catch (e) {
      copyToClipboard();
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

    if (guess === TARGET_WORD) {
      setRevealedPrefix(TARGET_WORD);
      setEndTime(new Date());
      setIsGameOver(true);
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
        Alert.alert("Error", "Could not open definition");
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
                  💡 <Text style={styles.bold}>Pro Tip:</Text> Every word you guess counts as a turn. Be strategic to keep your score low!
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
    fontSize: 24,
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
    fontSize: 18,
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
    fontSize: 15,
    color: '#333',
    marginBottom: 15,
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
    fontSize: 14,
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
    minWidth: 32, // Ensures thin letters like I are easy to hit
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
    fontSize: 14,
  }
});