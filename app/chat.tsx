import { useState, useRef, useEffect, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../src/lib/supabase'
import { useAuthStore } from '../src/stores/authStore'
import { useAcornStore } from '../src/stores/acornStore'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  showSuggestions?: boolean
}

interface UserContext {
  squirrelName: string
  streak: number
  longestStreak: number
  balance: number
  meds: { name: string; dose: string | null; notes: string | null; times: string[] }[]
  todayLogs: { name: string; status: string; scheduledAt: string }[]
}

function buildSystemPrompt(ctx: UserContext): string {
  const medList = ctx.meds.length > 0
    ? ctx.meds.map((m) => `  - ${m.name}${m.dose ? ` (${m.dose})` : ''} at ${m.times.join(', ')}${m.notes ? ` — ${m.notes}` : ''}`).join('\n')
    : '  (no medications added yet)'

  const logList = ctx.todayLogs.length > 0
    ? ctx.todayLogs.map((l) => {
        const time = new Date(l.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        return `  - ${l.name} @ ${time}: ${l.status}`
      }).join('\n')
    : '  (no logs yet today)'

  return `You are ${ctx.squirrelName}, a warm and encouraging squirrel companion in Acorn, a medication tracking app. You live in the user's digital forest, which grows as they stick to their medication routine.

USER'S CURRENT STATE:
- Streak: ${ctx.streak} day${ctx.streak !== 1 ? 's' : ''} (longest ever: ${ctx.longestStreak} days)
- Acorn balance: ${ctx.balance} 🌰

MEDICATIONS & SCHEDULE:
${medList}

TODAY'S LOG:
${logList}

YOUR PERSONALITY:
- Warm, playful, and encouraging — like a best friend who happens to be a forest squirrel
- Use nature/forest emojis occasionally (🌿🐿️🌰✨🌱🍂) but don't overdo it
- Keep replies concise: 2–4 sentences max
- Celebrate adherence, streaks, and milestones enthusiastically
- Gently nudge about missed or pending doses — never shame
- You can answer questions about the user's medications, schedules, and progress
- NEVER give medical advice — always say "ask your doctor" for medical questions
- Refer to yourself in first person as ${ctx.squirrelName}
- The forest grows more beautiful every day the user takes their medications`
}

function makeGreeting(ctx: UserContext): string {
  const pending = ctx.todayLogs.filter((l) => l.status === 'pending').length
  const taken = ctx.todayLogs.filter((l) => l.status === 'on_time' || l.status === 'late').length
  const overdue = ctx.todayLogs.filter((l) => {
    if (l.status !== 'pending') return false
    return (Date.now() - new Date(l.scheduledAt).getTime()) / 60000 > 60
  }).length

  if (ctx.meds.length === 0) {
    return `Hi! I'm ${ctx.squirrelName} 🐿️ I'm so happy you're here! Add your first medication in Settings and we can start growing our forest together. 🌱`
  }
  if (overdue > 0) {
    return `Hey! I noticed you have ${overdue} overdue dose${overdue > 1 ? 's' : ''} today. Don't worry — you can still log them now! Our forest is counting on you 🌿`
  }
  if (taken > 0 && pending === 0) {
    return `You're amazing! All done for today 🎉 That's ${ctx.streak} day${ctx.streak !== 1 ? 's' : ''} in a row — our forest is thriving! 🌰✨`
  }
  if (taken > 0 && pending > 0) {
    return `Great progress today! You've taken ${taken} medication${taken > 1 ? 's' : ''} so far. ${pending} more to go — you've got this! 🐿️`
  }
  if (ctx.streak > 0) {
    return `Good day! You're on a ${ctx.streak}-day streak — that's amazing! 🌿 Don't forget your medications today to keep our forest growing.`
  }
  return `Hi there! I'm ${ctx.squirrelName} 🐿️ I'm here to cheer you on every day. How are you feeling today?`
}

async function callClaude(systemPrompt: string, history: { role: string; content: string }[]): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY is not set.')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt,
      messages: history,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Chat request failed: ${err}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text ?? "Sorry, I couldn't think of anything to say! 🐿️"
}

export default function ChatScreen() {
  const user = useAuthStore((s) => s.user)
  const squirrelName = useAuthStore((s) => s.squirrelName)
  const { balance, currentStreak, longestStreak } = useAcornStore()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [contextLoading, setContextLoading] = useState(true)
  const [userCtx, setUserCtx] = useState<UserContext | null>(null)

  const scrollRef = useRef<ScrollView>(null)
  const inputRef = useRef<TextInput>(null)

  const name = squirrelName ?? 'Nutmeg'

  // Fetch user context and set initial greeting
  useEffect(() => {
    if (!user) return
    loadContext()
  }, [user])

  async function loadContext() {
    if (!user) return
    setContextLoading(true)

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)

    const [{ data: medsData }, { data: logsData }] = await Promise.all([
      supabase
        .from('medications')
        .select('name, dose, notes, schedules:medication_schedules(time_of_day)')
        .eq('user_id', user.id),
      supabase
        .from('medication_logs')
        .select('status, scheduled_at, medication:medications(name)')
        .eq('user_id', user.id)
        .gte('scheduled_at', todayStart.toISOString())
        .lte('scheduled_at', todayEnd.toISOString()),
    ])

    const meds = (medsData ?? []).map((m: any) => ({
      name: m.name,
      dose: m.dose,
      notes: m.notes,
      times: (m.schedules ?? []).map((s: any) => s.time_of_day.slice(0, 5)),
    }))

    const todayLogs = (logsData ?? []).map((l: any) => ({
      name: l.medication?.name ?? 'Unknown',
      status: l.status,
      scheduledAt: l.scheduled_at,
    }))

    const ctx: UserContext = {
      squirrelName: name,
      streak: currentStreak,
      longestStreak,
      balance,
      meds,
      todayLogs,
    }

    setUserCtx(ctx)
    setContextLoading(false)

    // Set initial greeting
    const greeting = makeGreeting(ctx)
    setMessages([
      {
        id: '0',
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
        showSuggestions: true,
      },
    ])
  }

  function scrollToBottom() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }

  useEffect(() => {
    if (messages.length > 0) scrollToBottom()
  }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading || !userCtx) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    setInput('')
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      // Build conversation history for Claude (exclude showSuggestions, just role+content)
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const systemPrompt = buildSystemPrompt(userCtx)
      const reply = await callClaude(systemPrompt, history)

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (e: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Oops, I got a bit confused! 🐿️ Try again in a moment.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, height: 64,
        borderBottomWidth: 1, borderBottomColor: '#e7e5e4',
        backgroundColor: '#fff8f5',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#78716c" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Squirrel avatar */}
            <View style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: '#fde68a',
              borderWidth: 2, borderColor: '#8d4b00',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 20 }}>🐿️</Text>
            </View>
            <View>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#1f1b17', letterSpacing: -0.3 }}>{name}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#006e2d', letterSpacing: 1, textTransform: 'uppercase' }}>
                Online
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="dots-vertical" size={22} color="#78716c" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 20 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        >
          {/* Date divider */}
          <View style={{ alignItems: 'center' }}>
            <View style={{ backgroundColor: '#f6ece6', paddingHorizontal: 16, paddingVertical: 4, borderRadius: 99 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#554336', letterSpacing: 0.3 }}>Today</Text>
            </View>
          </View>

          {contextLoading ? (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <ActivityIndicator color="#b15f00" />
              <Text style={{ color: '#a8a29e', marginTop: 12, fontSize: 13 }}>{name} is getting ready...</Text>
            </View>
          ) : (
            messages.map((msg) => (
              <View key={msg.id}>
                {msg.role === 'assistant' ? (
                  /* Squirrel message */
                  <View style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                      <View style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: '#fde68a',
                        alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Text style={{ fontSize: 16 }}>🐿️</Text>
                      </View>
                      <View style={{
                        backgroundColor: '#fcf2eb',
                        borderWidth: 1, borderColor: '#dbc2b0',
                        borderRadius: 20, borderBottomLeftRadius: 4,
                        padding: 14,
                      }}>
                        <Text style={{ fontSize: 14, color: '#1f1b17', lineHeight: 21 }}>{msg.content}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 10, color: '#a8a29e', marginTop: 4, marginLeft: 40 }}>
                      {formatTime(msg.timestamp)}
                    </Text>

                    {/* Suggestion cards */}
                    {msg.showSuggestions && (
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                        <TouchableOpacity
                          onPress={() => router.replace('/(tabs)/forest')}
                          style={{
                            flex: 1, backgroundColor: '#fff',
                            borderWidth: 1, borderColor: '#dbc2b0',
                            borderRadius: 14, padding: 14, gap: 8,
                          }}
                        >
                          <MaterialCommunityIcons name="tree-outline" size={22} color="#8d4b00" />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#1f1b17', letterSpacing: 0.2 }}>
                            View Forest
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => router.replace('/(tabs)/progress')}
                          style={{
                            flex: 1, backgroundColor: '#fff',
                            borderWidth: 1, borderColor: '#dbc2b0',
                            borderRadius: 14, padding: 14, gap: 8,
                          }}
                        >
                          <MaterialCommunityIcons name="chart-bar" size={22} color="#006e2d" />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#1f1b17', letterSpacing: 0.2 }}>
                            My Progress
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ) : (
                  /* User message */
                  <View style={{ alignSelf: 'flex-end', maxWidth: '80%' }}>
                    <View style={{
                      backgroundColor: '#8d4b00',
                      borderRadius: 20, borderBottomRightRadius: 4,
                      padding: 14,
                    }}>
                      <Text style={{ fontSize: 14, color: '#fff', lineHeight: 21 }}>{msg.content}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: '#a8a29e', marginTop: 4, alignSelf: 'flex-end', marginRight: 2 }}>
                      {formatTime(msg.timestamp)}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}

          {/* Typing indicator */}
          {loading && (
            <View style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                <View style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: '#fde68a',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 16 }}>🐿️</Text>
                </View>
                <View style={{
                  backgroundColor: '#fcf2eb', borderWidth: 1, borderColor: '#dbc2b0',
                  borderRadius: 20, borderBottomLeftRadius: 4, padding: 14,
                  flexDirection: 'row', gap: 4, alignItems: 'center',
                }}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={{
                      width: 7, height: 7, borderRadius: 4,
                      backgroundColor: '#b15f00', opacity: 0.5 + i * 0.25,
                    }} />
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input area */}
        <View style={{
          borderTopWidth: 1, borderTopColor: '#dbc2b0',
          backgroundColor: '#fff8f5',
          paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 16,
          flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <View style={{ flex: 1, position: 'relative' }}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder={`Message ${name}...`}
              placeholderTextColor="#a8a29e"
              multiline
              maxLength={1000}
              style={{
                backgroundColor: '#fff',
                borderWidth: 1, borderColor: '#dbc2b0',
                borderRadius: 24,
                paddingLeft: 16, paddingRight: 48,
                paddingTop: 12, paddingBottom: 12,
                fontSize: 14, color: '#1f1b17',
                maxHeight: 120,
                textAlignVertical: 'center',
              }}
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                position: 'absolute', right: 4, bottom: 4,
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: !input.trim() || loading ? '#dbc2b0' : '#8d4b00',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="send" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
