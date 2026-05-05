import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';

interface StatsScreenProps {
  onShowStats: () => Promise<string>;
  onRemoveData: () => Promise<void>;
  onBackPress?: () => void;
}

export function StatsScreen({
  onShowStats,
  onRemoveData,
  onBackPress,
}: StatsScreenProps) {
  const [statsData, setStatsData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleShowStats = async () => {
    try {
      setLoading(true);
      const data = await onShowStats();
      setStatsData(data);
    } catch (error) {
      Alert.alert('Error', `Failed to load stats: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveData = () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to remove all data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await onRemoveData();
              setStatsData(null);
              Alert.alert('Success', 'All data has been removed');
            } catch (error) {
              Alert.alert('Error', `Failed to remove data: ${error}`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 STATS</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.statsButton]}
          onPress={handleShowStats}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>📈 Show Match Stats</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleRemoveData}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>🗑️ Remove Data</Text>
          )}
        </TouchableOpacity>

        {onBackPress && (
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={onBackPress}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>← Back</Text>
          </TouchableOpacity>
        )}
      </View>

      {statsData && (
        <ScrollView style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Match Statistics</Text>
          <Text style={styles.statsText}>{statsData}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  backButton: {
    backgroundColor: '#555',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  statsContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 12,
    backgroundColor: '#252525',
    borderRadius: 8,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  statsText: {
    fontSize: 11,
    color: '#ccc',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});
