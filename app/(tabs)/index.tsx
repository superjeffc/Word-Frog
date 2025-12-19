import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { DICTIONARY, TARGET_WORDS } from '../../constants/words';

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

const TARGET_WORD = getWordOfTheDay();
const DICTIONARY_SET = React.useMemo(() => new Set(DICTIONARY), []);

// Measure the screen to help with positioning
const { width } = Dimensions.get('window');
const TILE_SIZE = 43; // 35 (width) + 8 (margin)

export default function App() {
  const [revealedPrefix, setRevealedPrefix] = useState(TARGET_WORD[0]);
  const [userInput, setUserInput] = useState('');
  const [usedWords, setUsedWords] = useState([]);
  const [turnCount, setTurnCount] = useState(0);
  const [endTime, setEndTime] = useState(null);
  const [message, setMessage] = useState(`Starts with "${TARGET_WORD[0]}"`);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

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
    // Don't jump on the very first letter when app loads
    if (revealedPrefix.length > 1) {
      const nextIndex = revealedPrefix.length - 1;

      // Slide horizontally
      Animated.spring(frogX, {
        toValue: nextIndex * TILE_SIZE,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // TRIGGER THE JUMP HERE
      jumpFrog();
    }
  }, [revealedPrefix]);

  const inputRef = useRef(null);

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

  const startLeapFrog = () => {
    const now = new Date(); // Create one single timestamp

    setShowRules(false);
    setStartTime(now);      // Set the start point
    setCurrentTime(now);    // Sync the current tick immediately

    // Delay focus slightly to ensure the keyboard doesn't clash with the modal closing
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const getStatsString = () => {
    return (
      `#WordFrog 🐸\n` +
      `🏆 Solved in ${turnCount} turns\n` +
      `⏱️ Time: ${getTimeElapsed()}\n\n` +
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
      const result = await Share.share({ message: getStatsString() });
      if (result.action === Share.dismissedAction) {
        copyToClipboard();
      }
    } catch (error) {
      copyToClipboard();
    }
  };

  const handleSubmit = () => {
    if (isGameOver) return;
    const guess = userInput.trim().toUpperCase();

    if (!guess) {
      inputRef.current?.focus();
      return;
    }

    if (usedWords.includes(guess)) {
      setMessage(`❌ You already used "${guess}"!`);
      setUserInput('');
      inputRef.current?.focus();
      return;
    }

    if (!guess.startsWith(revealedPrefix)) {
      setMessage(`❌ Must start with "${revealedPrefix}"`);
      setUserInput('');
      inputRef.current?.focus();
      return;
    }

    if (!DICTIONARY_SET.has(guess) && guess !== TARGET_WORD) {
      setMessage(`❌ "${guess}" isn't in our dictionary!`);
      setUserInput('');
      inputRef.current?.focus();
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
      // Keep focus on submit
      inputRef.current?.focus();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>WORD FROG</Text>
            <Image
              source={require('../../assets/images/froghead.png')}
              style={styles.headerFrog}
            />
          </View>
          <Text style={styles.stats}>Turn: {turnCount + 1} | {getTimeElapsed()}</Text>
        </View>

        <View style={styles.gameArea}>
          <Animated.View
            style={[
              styles.frogContainer,
              {
                transform: [
                  { translateX: frogX }, // The slide
                  { translateY: frogY }  // The jump
                ]
              }
            ]}
          >
            <Image source={require('../../assets/images/frog.png')} style={styles.frogImage} />
          </Animated.View>

          <View style={styles.wordContainer}>
            {TARGET_WORD.split('').map((letter, index) => (
              <View
                key={index}
                style={[
                  styles.letterBox,
                  index < revealedPrefix.length && styles.revealedBox
                ]}
              >
                <Text style={styles.letterText}>
                  {index < revealedPrefix.length ? letter : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.inputArea}>
          <Text style={[styles.messageText, isGameOver && styles.winMessage]}>
            {message}
          </Text>

          {isGameOver ? (
            <View style={styles.winBox}>
              <Text style={styles.finalStats}>
                Solved in {turnCount} turns and {getTimeElapsed()}!
              </Text>

              <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <Text style={styles.buttonText}>SHARE SCORE</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={copyToClipboard} style={styles.copyLink}>
                <Text style={styles.copyLinkText}>Copy to clipboard</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={userInput}
                onChangeText={setUserInput}
                placeholder="Type a word..."
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus={false} // CHANGED: Set to false to prevent initial keyboard popup
                blurOnSubmit={false} // This ensures the keyboard stays up AFTER submitting
                onSubmitEditing={handleSubmit}
                placeholderTextColor="#999"
              />
              <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                <Text style={styles.buttonText}>SUBMIT GUESS</Text>
              </TouchableOpacity>
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
                source={require('../../assets/images/froghead.png')}
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
    </KeyboardAvoidingView>
  );
}

// ... styles remain the same
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f8e9' },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  header: { marginBottom: 60, alignItems: 'center' },
  title: { fontSize: 42, fontWeight: '900', color: '#2e7d32', letterSpacing: -1 },
  stats: { fontSize: 18, color: '#558b2f', fontWeight: '600' },
  revealedBox: { backgroundColor: '#4caf50', borderColor: '#1b5e20' },
  letterText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
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

  gameArea: {
    alignItems: 'flex-start', // Align start so the frog starts at index 0
    justifyContent: 'center',
    width: '100%',
    paddingLeft: (width - (TARGET_WORD.length * TILE_SIZE)) / 2, // Centers the whole row
  },
  frogContainer: {
    position: 'absolute',
    top: -35, // Positioned right above the letter boxes
    width: 35,
    paddingLeft: 6,
    height: 35,
    zIndex: 10,
    alignItems: 'center',
  },
  frogImage: {
    width: 35,
    height: 35,
    resizeMode: 'contain',
  },
  wordContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  letterBox: {
    width: 35,
    height: 45,
    borderWidth: 2,
    borderColor: '#c8e6c9',
    margin: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#fff',
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
});