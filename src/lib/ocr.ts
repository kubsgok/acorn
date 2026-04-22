import * as ImagePicker from 'expo-image-picker'
import { Alert, Linking, Platform } from 'react-native'

export interface PickedImage {
  uri: string
  base64: string
}

export async function pickImage(source: 'camera' | 'gallery'): Promise<PickedImage | null> {
  try {
    if (source === 'camera') {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync()
      if (!granted) {
        Alert.alert(
          'Camera permission required',
          'Allow camera access to scan medication labels.',
          [
            { text: 'Cancel' },
            { text: 'Open Settings', onPress: () => Platform.OS === 'ios' ? Linking.openURL('app-settings:') : Linking.openSettings() },
          ]
        )
        return null
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        base64: true,
        quality: 0.8,
      })
      if (result.canceled || !result.assets[0].base64) return null
      return { uri: result.assets[0].uri, base64: result.assets[0].base64 }
    } else {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!granted) {
        Alert.alert(
          'Photo library permission required',
          'Allow photo library access to scan medication labels.',
          [
            { text: 'Cancel' },
            { text: 'Open Settings', onPress: () => Platform.OS === 'ios' ? Linking.openURL('app-settings:') : Linking.openSettings() },
          ]
        )
        return null
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        base64: true,
        quality: 0.8,
      })
      if (result.canceled || !result.assets[0].base64) return null
      return { uri: result.assets[0].uri, base64: result.assets[0].base64 }
    }
  } catch (err) {
    console.error('Image pick error:', err)
    return null
  }
}

export interface MedScanResult {
  name: string | null
  dose: string | null
  notes: string | null
}

export async function extractMedInfo(base64: string): Promise<MedScanResult> {
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
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
            },
            {
              type: 'text',
              text: 'Extract medication details from this label. Return ONLY valid JSON with keys "name", "dose", and "notes". Put any additional info (instructions, warnings, doctor/pharmacy info, frequency, duration) into "notes" as a short summary. Example: {"name":"Metformin","dose":"500mg","notes":"Take with food. Prescribed by Dr. Smith."}. Use null for any field you cannot identify.',
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OCR request failed: ${err}`)
  }

  const data = await response.json()
  const text: string = data.content?.[0]?.text ?? ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    return JSON.parse(jsonMatch[0]) as MedScanResult
  } catch {
    throw new Error('Could not parse medication info from image.')
  }
}
