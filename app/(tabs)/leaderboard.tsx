import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';

const API_URL = "https://wordfrogleaderboard.superjeffc.com";

const LeaderboardScreen = () => {
  const [data, setData] = useState({ players: [], stats: { total_today: 0, total_all_time: 0 } });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savedName, setSavedName] = useState('');

  const fetchLeaderboard = useCallback(async () => {
    try {
      if (data.players.length === 0) setLoading(true);

      const localDate = new Date().toLocaleDateString('en-CA');
      const endpoint = `/leaderboard?date=${localDate}&v=2`;

      const response = await fetch(`${API_URL}${endpoint}`);

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const json = await response.json();

      if (json.players) {
        setData(json);
      } else {
        setData({ players: json, stats: { total_today: 0, total_all_time: 0 } });
      }

    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data.players.length]);

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
  }, [fetchLeaderboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isMe = item.username === savedName;

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
          {displayScore}
        </Text>
      </View>
    );
  };

  const renderStatsHeader = () => {
    return (
      <View style={styles.statsHeader}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{data.stats?.total_today || 0}</Text>
          <Text style={styles.statLabel}>Solves Today</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{data.stats?.total_all_time || 0}</Text>
          <Text style={styles.statLabel}>All Time Solves</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏆 Leaderboard</Text>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#2d5a27" style={styles.loader} />
      ) : (
        <FlatList
          data={data.players}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderStatsHeader}
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
  title: { fontSize: Platform.OS === 'android' ? 20 : 24, fontWeight: '900', color: '#166534' },
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

  statsHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#d1fae5',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statBox: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 22, fontWeight: '900', color: '#166534' },
  statLabel: { fontSize: 10, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' },
  statDivider: { width: 1, height: '70%', backgroundColor: '#d1fae5' },
});

export default LeaderboardScreen;