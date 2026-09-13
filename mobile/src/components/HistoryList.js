import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { styles } from '../theme';
import { SERVER_PORT } from '../utils/constants';

export default function HistoryList({ savedIp }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!savedIp) return;
    const fetchHistory = async () => {
      try {
        const res = await fetch(`http://${savedIp}:${SERVER_PORT}/api/history`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data.slice(0, 7)); // Last 7 sessions
        }
      } catch (err) {
        console.log('Failed to fetch history', err);
      }
    };
    fetchHistory();
    const interval = setInterval(fetchHistory, 15000);
    return () => clearInterval(interval);
  }, [savedIp]);

  if (!savedIp || history.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>RECENT SESSIONS</Text>
      {history.map((item, idx) => (
        <View key={idx} style={{ paddingVertical: 10, borderBottomWidth: idx === history.length - 1 ? 0 : 1, borderBottomColor: '#f3f0e8' }}>
          <View style={styles.row}>
            <Text style={{ fontWeight: '600', color: '#17211b' }}>{new Date(item.date).toLocaleDateString()}</Text>
            <Text style={styles.mode}>{item.mode}</Text>
          </View>
          <Text style={{ color: '#17211b', marginTop: 4 }}>{item.target}</Text>
          <Text style={styles.hint}>{item.duration} minutes</Text>
        </View>
      ))}
    </View>
  );
}
