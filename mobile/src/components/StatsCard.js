import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { styles } from '../theme';
import { SERVER_PORT } from '../utils/constants';

export default function StatsCard({ savedIp }) {
  const [stats, setStats] = useState({ streak: 0, totalSessions: 0, avgDuration: 0 });

  useEffect(() => {
    if (!savedIp) return;
    const fetchStats = async () => {
      try {
        const res = await fetch(`http://${savedIp}:${SERVER_PORT}/api/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.log('Failed to fetch stats', err);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [savedIp]);

  if (!savedIp || stats.totalSessions === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: '#17211b' }]}>
      <Text style={[styles.label, { color: '#d4ef63' }]}>YOUR PROGRESS</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#fffdf5', fontSize: 24, fontWeight: '800' }}>{stats.streak}</Text>
          <Text style={{ color: '#687169', fontSize: 12, marginTop: 4 }}>Day Streak</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#fffdf5', fontSize: 24, fontWeight: '800' }}>{stats.totalSessions}</Text>
          <Text style={{ color: '#687169', fontSize: 12, marginTop: 4 }}>Sessions</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#fffdf5', fontSize: 24, fontWeight: '800' }}>{Math.round(stats.avgDuration)}m</Text>
          <Text style={{ color: '#687169', fontSize: 12, marginTop: 4 }}>Avg Time</Text>
        </View>
      </View>
    </View>
  );
}
