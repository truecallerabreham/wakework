import { StyleSheet } from 'react-native';
import { colors } from './utils/constants';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  scroll: { padding: 24, paddingTop: 64, paddingBottom: 48 },
  eyebrow: { fontSize: 11, letterSpacing: 2, color: colors.orange, fontWeight: '600' },
  title: { fontSize: 64, fontWeight: '800', letterSpacing: -3, color: colors.dark, marginVertical: 8 },
  muted: { color: colors.muted, lineHeight: 22, fontSize: 15 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 20,
    marginTop: 24,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3
  },
  connectionCard: { backgroundColor: colors.cardConnection },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 11, letterSpacing: 2, color: colors.dark, fontWeight: '700', marginBottom: 10 },
  input: {
    borderBottomWidth: 2,
    borderBottomColor: colors.dark,
    fontSize: 22,
    paddingVertical: 10,
    color: colors.dark,
    marginBottom: 8
  },
  hint: { fontSize: 12, color: colors.muted, marginTop: 6, lineHeight: 18 },
  on: { color: colors.on, fontWeight: '700' },
  off: { color: colors.orange, fontWeight: '700' },
  button: { backgroundColor: colors.dark, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 22, marginTop: 16, alignSelf: 'flex-start' },
  lime: { backgroundColor: colors.lime },
  quiet: { backgroundColor: 'transparent', alignSelf: 'flex-start', marginTop: 8 },
  buttonText: { color: colors.white, fontWeight: '700' },
  buttonTextDark: { color: colors.dark, fontWeight: '700' },
  quietText: { color: colors.muted, fontWeight: '600' },
  state: { color: colors.orange, fontWeight: '700', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 },
  mode: { color: colors.muted, fontWeight: '600', fontSize: 12 },
  headline: { fontSize: 28, fontWeight: '800', letterSpacing: -1, color: colors.dark, marginTop: 12 },
  progress: { height: 12, backgroundColor: colors.progressBg, borderRadius: 10, marginTop: 20, overflow: 'hidden' },
  progressFill: { height: 12, backgroundColor: colors.lime, borderRadius: 10 },
  minutes: { fontSize: 12, marginTop: 8, color: colors.dark, fontWeight: '700' },
  ring: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28
  },
  ringEyebrow: { fontSize: 13, letterSpacing: 3, fontWeight: '700', color: colors.dark },
  ringTitle: { fontSize: 58, fontWeight: '900', letterSpacing: -3, color: colors.dark, marginVertical: 10 },
  ringTarget: { fontSize: 17, color: colors.dark, textAlign: 'center' },
  bigButton: { backgroundColor: colors.dark, borderRadius: 999, paddingVertical: 18, paddingHorizontal: 26, marginTop: 30 },
  bigButtonText: { color: colors.white, fontWeight: '800', fontSize: 17 },
  snoozeRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, gap: 10 },
  snoozeButton: { backgroundColor: 'rgba(0,0,0,0.1)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999 },
  snoozeText: { color: colors.dark, fontWeight: '600', fontSize: 14 }
});
