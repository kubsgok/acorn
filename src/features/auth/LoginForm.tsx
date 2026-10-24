import { useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Button, PasswordField, TextField, TextLink, type TextInputHandle } from '@/components/ui'
import { colors, spacing, typography } from '@/theme'
import { validateEmail, validatePassword, type FieldError } from './validation'

const EMAIL_ERROR_KEYS = {
  required: 'login.errors.emailRequired',
  invalid: 'login.errors.emailInvalid',
} as const satisfies Record<FieldError, string>

export type Credentials = { email: string; password: string }

type Props = {
  onSubmit: (credentials: Credentials) => void | Promise<void>
  onForgotPassword: () => void
  submitting?: boolean
  /** Safe, already-translated message for a failed sign-in. */
  formError?: string
}

export function LoginForm({ onSubmit, onForgotPassword, submitting = false, formError }: Props) {
  const { t } = useTranslation()
  const passwordRef = useRef<TextInputHandle>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<FieldError | null>(null)
  const [passwordError, setPasswordError] = useState<FieldError | null>(null)

  const emailMessage = emailError ? t(EMAIL_ERROR_KEYS[emailError]) : undefined
  const passwordMessage = passwordError ? t('login.errors.passwordRequired') : undefined

  function handleSubmit() {
    if (submitting) return
    const nextEmailError = validateEmail(email)
    const nextPasswordError = validatePassword(password)
    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)
    if (nextEmailError || nextPasswordError) return
    void onSubmit({ email: email.trim(), password })
  }

  return (
    <View style={styles.form}>
      <TextField
        label={t('login.email.label')}
        placeholder={t('login.email.placeholder')}
        value={email}
        error={emailMessage}
        onChangeText={(value) => {
          setEmail(value)
          if (emailError) setEmailError(null)
        }}
        onBlur={() => setEmailError(email.length > 0 ? validateEmail(email) : null)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <PasswordField
        inputRef={passwordRef}
        label={t('login.password.label')}
        placeholder={t('login.password.placeholder')}
        showLabel={t('login.password.show')}
        hideLabel={t('login.password.hide')}
        value={password}
        error={passwordMessage}
        onChangeText={(value) => {
          setPassword(value)
          if (passwordError) setPasswordError(null)
        }}
        autoComplete="current-password"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />
      <View style={styles.recovery}>
        <TextLink label={t('login.forgot')} onPress={onForgotPassword} />
      </View>
      {formError ? (
        <Text accessibilityRole="alert" style={styles.formError}>
          {formError}
        </Text>
      ) : null}
      <Button label={t('login.submit')} onPress={handleSubmit} loading={submitting} />
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: spacing.xl },
  recovery: { alignItems: 'flex-end' },
  formError: { ...typography.label, color: colors.error },
})
