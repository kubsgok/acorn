import { useState } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import { minTouchTarget } from '@/theme'
import Eye from '../../../assets/svg/eye.svg'
import { TextField, type TextFieldProps } from './TextField'

type Props = Omit<TextFieldProps, 'trailing' | 'secureTextEntry'> & {
  showLabel: string
  hideLabel: string
}

export function PasswordField({ showLabel, hideLabel, ...fieldProps }: Props) {
  const [visible, setVisible] = useState(false)
  return (
    <TextField
      autoCapitalize="none"
      autoCorrect={false}
      textContentType="password"
      {...fieldProps}
      secureTextEntry={!visible}
      trailing={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? hideLabel : showLabel}
          hitSlop={(minTouchTarget - 20) / 2}
          onPress={() => setVisible((v) => !v)}
          style={styles.toggle}
        >
          <Eye />
        </Pressable>
      }
    />
  )
}

const styles = StyleSheet.create({
  toggle: { width: 20, height: 20 },
})
