import AsyncStorage from '@react-native-async-storage/async-storage';
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
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"]
];

const getRandomWord = async () => {
  const API_URL = 'https://word-frog-dictionary-api.superjeffc.workers.dev/random';
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    const json = await response.json();
    return json.word.toUpperCase();
  } catch (error) {
    console.error("Error fetching random word:", error);
    // Fallback in case of server failure
    const fallbacks = ["FROG", "LEAP", "POND", "TOAD", "WATER", "GREEN", "JUMP", "CROAK"];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
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

export default function PracticeScreen() {
  const { width } = useWindowDimensions();

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
  const [hintCount, setHintCount] = useState(0);
  const [hintedLettersCount, setHintedLettersCount] = useState(0);
  const [savedName, setSavedName] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState("");

  // Load a random word on mount
  useEffect(() => {
    let isMounted = true;

    getRandomWord().then(async (word) => {
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
      setAppIsReady(true);
    });

    return () => { isMounted = false; };
  }, []);

  const AVAILABLE_WIDTH = width - 40;
  const TILE_SPACE = TARGET_WORD ? AVAILABLE_WIDTH / TARGET_WORD.length : 40;
  const DYNAMIC_TILE_SIZE = Math.min(43, TILE_SPACE);
  const BOX_SIZE = DYNAMIC_TILE_SIZE - 8;
  const DYNAMIC_FONT_SIZE = BOX_SIZE * 0.6;

  // --- WEB SEO & SCHEMA INJECTION ---
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = "Word Frog | Practice Mode";

      const metaData = [
        { name: 'description', content: 'Practice Word Frog with completely random words to improve your vocabulary!' },
        { property: 'og:title', content: 'Word Frog | Practice Mode' },
        { property: 'og:description', content: 'Practice Word Frog with completely random words to improve your vocabulary.' },
        { property: 'og:image', content: 'https://wordfrog.superjeffc.com/favicon.ico' },
        { property: 'og:url', content: 'https://wordfrog.superjeffc.com/practice' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Word Frog Practice' }
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
    let interval: ReturnType<typeof setInterval> | undefined;

    if (startTime && !isGameOver) {
      interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [startTime, isGameOver]);

  const handleNotYou = async () => {
    const proceed = async () => {
      await AsyncStorage.removeItem('last_frog_name');
      setSavedName("");
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
    setShowNameModal(false);
  };

  // Load saved name on mount
  useEffect(() => {
    const initNameAndRules = async () => {
      const saved = await AsyncStorage.getItem('last_frog_name');
      if (saved) {
        setSavedName(saved);
      } else {
        setShowRules(true);
      }
    };
    initNameAndRules();
  }, []);

  const frogX = useRef(new Animated.Value(0)).current;
  const frogY = useRef(new Animated.Value(0)).current;

  const jumpFrog = () => {
    frogY.setValue(0);
    Animated.sequence([
      Animated.timing(frogY, {
        toValue: -30,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(frogY, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

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
    if (!startTime) return "0 seconds";
    const startMs = startTime.getTime();
    const endMs = (isGameOver && endTime) ? endTime.getTime() : currentTime.getTime();
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
    const now = new Date();
    setShowRules(false);
    setStartTime(now);
    setCurrentTime(now);
  };

  const calculateScore = (finalTurnCount = turnCount, finalHintCount = hintCount, finalEndTime: Date | null = endTime) => {
    const start = startTime || new Date();
    const end = finalEndTime || endTime || new Date();
    const seconds = Math.max(0, (end.getTime() - start.getTime()) / 1000);
    const maxGuesses = TARGET_WORD.length || 1;

    const turnScore = Math.max(0, maxGuesses - finalTurnCount) * 100;
    const timeBonus = 10 / (1 + Math.log10(seconds + 1));
    let finalScore = turnScore + timeBonus;

    if (finalHintCount > 0) {
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
    const hintsUsedStr = hintCount > 0 ? `💡 Hints used: ${hintCount}\n` : '';
    return (
      `🐸 #WordFrog Practice\n` +
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

  const handlePlayAgain = async () => {
    setAppIsReady(false);
    setUserInput('');
    setUsedWords([]);
    setTurnCount(0);
    setEndTime(null);
    setIsGameOver(false);
    setStartTime(null);
    setHintCount(0);
    setHintedLettersCount(0);

    // Reset animated values
    frogX.setValue(0);
    frogY.setValue(0);

    const word = await getRandomWord();
    if (word) {
      setTargetWord(word);
      setRevealedPrefix(word[0]);
      setMessage(`"${word.length} letters. Starts with "${word[0]}"`);
      const now = new Date();
      setStartTime(now);
      setCurrentTime(now);
    }
    setAppIsReady(true);
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
      setRevealedPrefix(TARGET_WORD);
      setEndTime(now);
      setIsGameOver(true);
      setHintedLettersCount(0);

      setMessage("BULLSEYE! 🐸🏆\n\nYou solved the practice word!");
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
        <Text style={styles.loadingText}>Loading random word...</Text>
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
            {savedName.includes('#') && (
              <Text style={styles.welcomeTag}>#{savedName.split('#')[1]}</Text>
            )}
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
            <Text style={styles.title}>PRACTICE FROG</Text>
          </View>
          <Text style={styles.stats}>Turn: {isGameOver ? turnCount : turnCount + 1} | {getTimeElapsed()}</Text>
        </View>

        <View style={styles.gameArea}>
          <View style={{ width: TARGET_WORD.length * DYNAMIC_TILE_SIZE, position: 'relative' }}>
            <Animated.View
              style={[
                styles.frogContainer,
                {
                  width: DYNAMIC_TILE_SIZE,
                  left: 0,
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
                        marginHorizontal: 4
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

              <TouchableOpacity style={styles.playAgainBtn} onPress={handlePlayAgain}>
                <Text style={styles.buttonText}>PLAY AGAIN 🐸</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.definitionBtn} onPress={openDefinition}>
                <Text style={styles.definitionText}>📖 See Definition</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <Text style={styles.buttonText}>SHARE SCORE</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.customInputDisplay}>
                <Text style={styles.customInputText}>
                  {(userInput.startsWith(confirmedPrefix) ? userInput : (confirmedPrefix + userInput)) || "TAP LETTERS..."}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.hintBtn}
                onPress={handleGetHint}
                activeOpacity={0.7}
              >
                <Text style={styles.hintBtnText}>💡 GET HINT</Text>
              </TouchableOpacity>

              <View style={styles.keyboardContainer}>
                {KEYBOARD_ROWS.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.keyboardRow}>
                    {row.map((key) => {
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
            <Text style={styles.modalTitle}>Practice Mode
              <Image
                source={require('../../assets/images/froghead.webp')}
                style={styles.howtoplayFrog}
              />
            </Text>

            <View style={styles.ruleSection}>
              <Text style={styles.goalText}>
                Practice with completely <Text style={styles.bold}>Random Words</Text> of 4 to 8 letters!
              </Text>

              <Text style={styles.ruleItem}>
                <Text style={styles.bold}>1. Unlimited Play: </Text>
                Play as many times as you like. Great for training!
              </Text>

              <Text style={styles.ruleItem}>
                <Text style={styles.bold}>2. Normal Rules: </Text>
                Submit words starting with revealed letters to jump. Hit the target word to win.
              </Text>

              <Text style={[styles.ruleItem, { color: '#d32f2f', fontWeight: '600' }]}>
                ⚠️ Practice scores are not submitted to the leaderboard.
              </Text>

              <View style={styles.tipBox}>
                <Text style={styles.tipText}>
                  💡 <Text style={styles.bold}>Have Fun!</Text> Practice mode is the best place to try new strategies or expand your vocabulary.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={startLeapFrog}
            >
              <Text style={styles.buttonText}>{"START PRACTICING!"}</Text>
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
                Enter your name to personalize your app display.
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f8e9' },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20
  },
  header: {
    marginBottom: 60,
    alignItems: 'center'
  },
  title: { fontSize: 36, fontWeight: '900', color: '#2e7d32', letterSpacing: -1 },
  stats: { fontSize: 18, color: '#558b2f', fontWeight: '600' },
  revealedBox: { backgroundColor: '#4caf50', borderColor: '#1b5e20', marginBottom: 30 },
  letterText: {
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  inputArea: { width: '100%', alignItems: 'center' },
  messageText: { marginBottom: 15, fontSize: 17, fontWeight: '600', color: '#444', textAlign: 'center', minHeight: 25 },
  winMessage: { color: '#2e7d32', fontSize: 22 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  winBox: { alignItems: 'center', backgroundColor: '#fff', padding: 25, borderRadius: 24, borderWidth: 2, borderColor: '#4caf50', width: '90%' },
  finalStats: { fontSize: 18, fontWeight: '700', color: '#2e7d32', marginBottom: 20, textAlign: 'center' },
  shareBtn: { backgroundColor: '#ffa000', paddingVertical: 15, paddingHorizontal: 45, borderRadius: 30 },
  playAgainBtn: {
    backgroundColor: '#2e7d32',
    paddingVertical: 15,
    paddingHorizontal: 45,
    borderRadius: 30,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  howtoplayFrog: {
    width: 40,
    height: 40,
    marginLeft: 10,
    resizeMode: 'contain',
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
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
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
    minWidth: Platform.OS === 'android' ? 24 : 32,
    flex: 1,
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
    backgroundColor: '#e0e0e0',
    flex: 1.5,
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
});
