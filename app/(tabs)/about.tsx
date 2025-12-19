import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function AboutScreen() {

  const openPayPalLink = () => {
    Linking.openURL('https://paypal.me/superjeffc');
  };
  const openVenmoLink = () => {
    Linking.openURL('https://venmo.com/superjeffc');
  };

  const openPortfolio = () => {
    Linking.openURL('https://superjeffc.com');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={styles.title}>Word Frog</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>

      {/* Developer Info */}
      <View style={styles.card}>
        <Text style={styles.label}>Created by</Text>
        <Text style={styles.developerName}>Jeffrey Chan</Text>
        <TouchableOpacity style={styles.profileButton} onPress={openPortfolio}>
          <Ionicons name="link" size={24} color="white" style={{ marginRight: 10 }} />
          <Text style={styles.donateText}>Visit my Website</Text>
        </TouchableOpacity>
      </View>

      {/* Privacy Policy Info */}
      <View style={styles.card}>
        <Text style={styles.label}>Privacy Policy</Text>
        <Text style={styles.description}>
          I do not collect any data!
        </Text>
      </View>

      {/* Donation Section */}
      {Platform.OS === 'web' && (
        <View style={styles.card}>
          <Text style={styles.label}>Support the App</Text>
          <Text style={styles.description}>
            If you enjoy playing Word Frog, consider buying me a coffee to keep the updates coming!
          </Text>

          <TouchableOpacity style={styles.donateButton} onPress={openPayPalLink}>
            <Ionicons name="heart" size={24} color="white" style={{ marginRight: 10 }} />
            <Text style={styles.donateText}>Paypal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.donateButton} onPress={openVenmoLink}>
            <Ionicons name="heart" size={24} color="white" style={{ marginRight: 10 }} />
            <Text style={styles.donateText}>Venmo</Text>
          </TouchableOpacity>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f3f4f6',
    padding: 20,
    alignItems: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  version: {
    fontSize: 16,
    color: '#888',
    marginTop: 5,
  },
  card: {
    backgroundColor: 'white',
    width: '100%',
    padding: 10,
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3b82f6',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 1,
  },
  developerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  donateButton: {
    backgroundColor: '#ff5555', // Red color for attention
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    margin: 10,
  },
  profileButton: {
    backgroundColor: '#179ee7ff', // Red color for attention
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    margin: 10,
  },
  donateText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});