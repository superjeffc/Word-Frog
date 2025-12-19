import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView, Platform,
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
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const index = seed % TARGET_WORDS.length;
  return TARGET_WORDS[index].toUpperCase();
};

const TARGET_WORD = getWordOfTheDay();
const DICTIONARY_SET = new Set(DICTIONARY);

export default function App() {
  const [revealedPrefix, setRevealedPrefix] = useState(TARGET_WORD[0]);
  const [userInput, setUserInput] = useState('');
  const [usedWords, setUsedWords] = useState([]);
  const [turnCount, setTurnCount] = useState(0);
  const [startTime] = useState(new Date());
  const [endTime, setEndTime] = useState(null);
  const [message, setMessage] = useState(`Starts with "${TARGET_WORD[0]}"`);
  const [isGameOver, setIsGameOver] = useState(false);

  const inputRef = useRef(null);

  const getTimeElapsed = () => {
    const end = endTime || new Date();
    const diff = Math.floor((end - startTime) / 1000);
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return mins === 0 ? `${secs} seconds` : `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const getStatsString = () => {
    return (
      `Word Frog 🐸\n` +
      `🏆 Solved in ${turnCount} turns\n` +
      `⏱️ Time: ${getTimeElapsed()}\n\n` +
      `Play here: https://wordfrog.superjeffc.com`
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
      setMessage("BULLSEYE! 🐸🏆");
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
          <Text style={styles.title}>WORD FROG 🐸</Text>
          <Text style={styles.stats}>Turns: {turnCount}  |  {getTimeElapsed()}</Text>
        </View>

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
    </KeyboardAvoidingView>
  );
}

// ... styles remain the same
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f8e9' },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  header: { marginBottom: 30, alignItems: 'center' },
  title: { fontSize: 42, fontWeight: '900', color: '#2e7d32', letterSpacing: -1 },
  stats: { fontSize: 18, color: '#558b2f', fontWeight: '600' },
  wordContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 30 },
  letterBox: { width: 36, height: 46, borderWidth: 2, borderColor: '#c8e6c9', margin: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#fff' },
  revealedBox: { backgroundColor: '#4caf50', borderColor: '#1b5e20' },
  letterText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  inputArea: { width: '100%', alignItems: 'center' },
  messageText: { marginBottom: 15, fontSize: 17, fontWeight: '600', color: '#444', textAlign: 'center', minHeight: 25 },
  winMessage: { color: '#2e7d32', fontSize: 22 },
  input: { width: '85%', height: 60, backgroundColor: '#fff', borderRadius: 15, paddingHorizontal: 20, fontSize: 22, borderWidth: 2, borderColor: '#81c784', marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
  button: { backgroundColor: '#2e7d32', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, elevation: 4 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  winBox: { alignItems: 'center', backgroundColor: '#fff', padding: 25, borderRadius: 24, borderWidth: 2, borderColor: '#4caf50', width: '90%' },
  finalStats: { fontSize: 18, fontWeight: '700', color: '#2e7d32', marginBottom: 20, textAlign: 'center' },
  shareBtn: { backgroundColor: '#ffa000', paddingVertical: 15, paddingHorizontal: 45, borderRadius: 30 },
  copyLink: { marginTop: 15 },
  copyLinkText: { color: '#558b2f', textDecorationLine: 'underline', fontWeight: '600' },
  historyContainer: { marginTop: 30, alignItems: 'center', paddingHorizontal: 20 },
  historyTitle: { fontSize: 13, fontWeight: 'bold', color: '#558b2f', textTransform: 'uppercase', marginBottom: 4 },
  historyText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
});