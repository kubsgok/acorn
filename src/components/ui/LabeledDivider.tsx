import { StyleSheet, Text, View } from 'react-native'
import { colors, typography } from '@/theme'

export function LabeledDivider({ label }: { label: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  label: { ...typography.caption, color: colors.textMuted },
})
