import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const API_URL = "https://wordfrogleaderboard.superjeffc.com";

const LeaderboardScreen = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savedName, setSavedName] = useState('');
  const [view, setView] = useState('today'); // 'today' or 'allTime'

  const fetchLeaderboard = async () => {
    try {
      // Only show the full-screen loader if we don't have data yet
      // This prevents the "blank screen" flash on the 2nd click
      if (data.length === 0) {
        setLoading(true);
      }

      const endpoint = view === 'today' ? '/leaderboard' : '/total-completed';
      const response = await fetch(`${API_URL}${endpoint}`);

      if (!response.ok) throw new Error("Network response was not ok");

      const json = await response.json();

      // Update the data only when we have the result
      setData(json);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      // Optional: Alert the user if it fails
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStoredName = async () => {
    try {
      const name = await AsyncStorage.getItem('last_frog_name');
      if (name) setSavedName(name);
    } catch (e) {
      console.error("Failed to load name", e);
    }
  };

  useEffect(() => {
    loadStoredName();
    fetchLeaderboard();
  }, [view]); // Re-fetch when view changes

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaderboard();
  }, [view]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const renderItem = ({ item, index }) => {
    const isMe = item.username === savedName;

    // Handle the case where score might be missing or 0
    const displayScore = (item.score !== undefined && item.score !== null)
      ? item.score.toFixed(2)
      : "0.00";

    return (
      <View style={[styles.row, isMe && styles.myRow]}>
        <View style={styles.rankContainer}>
          <Text style={[styles.rankText, index < 3 && styles.topThree]}>
            {index + 1}
          </Text>
        </View>

        <Text style={[styles.username, isMe && styles.myText]}>
          {item.username} {isMe ? "🐸" : ""}
        </Text>

        <Text style={styles.scoreText}>
          {view === 'today' ? displayScore : `${item.total_days || 0} days`}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏆 Leaderboards</Text>

        {/* Toggle Switch */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, view === 'today' && styles.toggleActive]}
            onPress={() => setView('today')}
          >
            <Text style={[styles.toggleLabel, view === 'today' && styles.toggleLabelActive]}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, view === 'allTime' && styles.toggleActive]}
            onPress={() => setView('allTime')}
          >
            <Text style={[styles.toggleLabel, view === 'allTime' && styles.toggleLabelActive]}>Puzzles Completed</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#2d5a27" style={styles.loader} />
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2d5a27" />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No data yet!</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  header: { padding: 20, alignItems: 'center', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#d1fae5' },
  title: { fontSize: 24, fontWeight: '900', color: '#166534', marginBottom: 15 },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 25, padding: 4, width: '80%' },
  toggleButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 21 },
  toggleActive: { backgroundColor: '#2d5a27' },
  toggleLabel: { fontSize: 14, fontWeight: 'bold', color: '#64748b' },
  toggleLabelActive: { color: 'white' },
  listContent: { padding: 15 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  myRow: { backgroundColor: '#dcfce7', borderColor: '#22c55e', borderWidth: 1 },
  rankContainer: { width: 50 },
  rankText: { fontSize: 18, fontWeight: 'bold', color: '#6b7280' },
  topThree: { color: '#166534', fontSize: 22 },
  username: { marginLeft: 15, flex: 1, fontSize: 17, color: '#374151', fontWeight: '500' },
  myText: { fontWeight: '900', color: '#166534' },
  scoreText: { fontSize: 16, fontWeight: 'bold', color: '#2d5a27' },
  loader: { flex: 1, justifyContent: 'center' },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 16, color: '#9ca3af' },
});

export default LeaderboardScreen;