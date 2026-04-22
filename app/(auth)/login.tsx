import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, Alert, ActivityIndicator
} from 'react-native'
import { Link, router } from 'expo-router'
import { supabase } from '../../src/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) Alert.alert('Login failed', error.message)
    else router.replace('/')
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#fdf8f0' }}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>
        <Text style={{ fontSize: 36 }}>🌰</Text>
        <Text style={{ fontSize: 28, fontWeight: '700', color: '#1c1917', marginTop: 8, marginBottom: 4 }}>
          Welcome back
        </Text>
        <Text style={{ fontSize: 15, color: '#78716c', marginBottom: 32 }}>
          Your squirrel missed you.
        </Text>

        <Text style={{ fontSize: 13, fontWeight: '600', color: '#44403c', marginBottom: 6 }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="you@example.com"
          placeholderTextColor="#a8a29e"
          style={{
            borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 12,
            padding: 14, fontSize: 15, backgroundColor: '#fff', marginBottom: 16
          }}
        />

        <Text style={{ fontSize: 13, fontWeight: '600', color: '#44403c', marginBottom: 6 }}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#a8a29e"
          style={{
            borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 12,
            padding: 14, fontSize: 15, backgroundColor: '#fff', marginBottom: 24
          }}
        />

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={{
            backgroundColor: '#d97706', borderRadius: 14, padding: 16,
            alignItems: 'center', opacity: loading ? 0.7 : 1
          }}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Log in</Text>
          }
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20, gap: 4 }}>
          <Text style={{ color: '#78716c', fontSize: 14 }}>No account?</Text>
          <Link href="/(auth)/register">
            <Text style={{ color: '#d97706', fontWeight: '600', fontSize: 14 }}>Sign up</Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
