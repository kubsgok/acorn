import type { ComponentRef, ReactNode, Ref } from 'react'
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { colors, controlHeight, radius, spacing, typography } from '@/theme'

/** Instance type of the native text input (for `.focus()` etc.). */
export type TextInputHandle = ComponentRef<typeof TextInput>

export type TextFieldProps = Omit<TextInputProps, 'style' | 'ref'> & {
  label: string
  /** Validation message shown under the field; also marks the field invalid. */
  error?: string
  /** Optional element rendered inside the field, at the right edge (e.g. a toggle). */
  trailing?: ReactNode
  inputRef?: Ref<TextInputHandle>
}

export function TextField({ label, error, trailing, inputRef, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, error ? styles.fieldInvalid : null]}>
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          aria-invalid={Boolean(error)}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          {...inputProps}
        />
        {trailing}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 9 },
  label: { ...typography.label, color: colors.textBody },
  field: {
    height: controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.field,
  },
  fieldInvalid: { borderColor: colors.error },
  input: { flex: 1, ...typography.input, color: colors.textStrong, padding: 0 },
  error: { ...typography.caption, color: colors.error },
})
