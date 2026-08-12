import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native'
import { Link, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../../src/lib/supabase'
import { useT, LANGUAGES } from '../../src/lib/i18n'

export default function Login() {
  const { t, lang, setLang } = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin() {
    if (!email || !password) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) Alert.alert('Login failed', error.message)
    else router.replace('/')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>

          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <View style={{
              width: 80, height: 80, borderRadius: 24,
              backgroundColor: '#fef3c7',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
            }}>
              <Text style={{ fontSize: 42 }}>🌰</Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#1f1b17', letterSpacing: -0.5 }}>
              {t('login.title')}
            </Text>
            <Text style={{ fontSize: 15, color: '#554336', marginTop: 6 }}>
              {t('login.subtitle')}
            </Text>
          </View>

          {/* Email */}
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#554336', letterSpacing: 0.3, marginBottom: 6, marginLeft: 4 }}>
            {t('auth.email')}
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@example.com"
            placeholderTextColor="#a8a29e"
            style={{
              backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbc2b0',
              borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
              fontSize: 15, color: '#1f1b17', marginBottom: 16,
            }}
          />

          {/* Password */}
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#554336', letterSpacing: 0.3, marginBottom: 6, marginLeft: 4 }}>
            {t('auth.password')}
          </Text>
          <View style={{ position: 'relative', marginBottom: 28 }}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              placeholderTextColor="#a8a29e"
              style={{
                backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbc2b0',
                borderRadius: 14, paddingHorizontal: 16, paddingRight: 48, paddingVertical: 14,
                fontSize: 15, color: '#1f1b17',
              }}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((p) => !p)}
              style={{ position: 'absolute', right: 14, top: 14 }}
            >
              <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#a8a29e" />
            </TouchableOpacity>
          </View>

          {/* Login button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{
              backgroundColor: '#b15f00', borderRadius: 20,
              paddingVertical: 16, alignItems: 'center',
              opacity: loading ? 0.7 : 1,
              shadowColor: '#b15f00', shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
            }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{t('login.button')}</Text>
            }
          </TouchableOpacity>

          {/* Sign up link */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24, gap: 4 }}>
            <Text style={{ color: '#554336', fontSize: 14 }}>{t('login.noAccount')}</Text>
            <Link href="/(auth)/register">
              <Text style={{ color: '#b15f00', fontWeight: '700', fontSize: 14 }}>{t('login.signup')}</Text>
            </Link>
          </View>

          {/* Small language toggle */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 28 }}>
            {LANGUAGES.map((l) => {
              const active = lang === l.code
              return (
                <TouchableOpacity
                  key={l.code}
                  onPress={() => setLang(l.code)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99,
                    backgroundColor: active ? '#fef3c7' : 'transparent',
                    borderWidth: 1, borderColor: active ? '#e7c76a' : '#e7ddd3',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: active ? '700' : '500', color: active ? '#8d4b00' : '#a8a29e' }}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
