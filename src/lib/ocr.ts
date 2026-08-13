import * as ImagePicker from 'expo-image-picker'
import { Alert, Linking, Platform } from 'react-native'
import { supabase } from './supabase'

export interface PickedImage {
  uri: string
  base64: string
  mediaType: string
}

const isWeb = Platform.OS === 'web'
const ANTHROPIC_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// Normalize an asset mime type to one the vision API accepts (default jpeg).
function normalizeMediaType(mime?: string | null): string {
  if (mime && ANTHROPIC_MEDIA_TYPES.includes(mime)) return mime
  return 'image/jpeg'
}

export async function pickImage(source: 'camera' | 'gallery'): Promise<PickedImage | null> {
  try {
    if (source === 'camera') {
      // On web there's no reliable native camera; fall through to the file
      // picker (which on mobile browsers can still open the camera).
      if (!isWeb) {
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
        return { uri: result.assets[0].uri, base64: result.assets[0].base64, mediaType: normalizeMediaType(result.assets[0].mimeType) }
      }
    }

    if (!isWeb) {
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
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: !isWeb, // the crop editor isn't supported on web
      base64: true,
      quality: 0.8,
    })
    if (result.canceled || !result.assets[0].base64) return null
    return { uri: result.assets[0].uri, base64: result.assets[0].base64, mediaType: normalizeMediaType(result.assets[0].mimeType) }
  } catch (err) {
    console.error('Image pick error:', err)
    return null
  }
}

export interface MedScanResult {
  name: string | null
  dose: string | null
  notes: string | null
  frequency: 'daily' | 'weekdays' | 'weekends' | null
}

export async function extractMedInfo(base64: string, mediaType = 'image/jpeg'): Promise<MedScanResult> {
  // Calls the `claude` Edge Function (server-side proxy) — the Anthropic key
  // lives on the server, never in the client bundle.
  const { data, error } = await supabase.functions.invoke('claude', {
    body: {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: 'Extract medication details from this label. Return ONLY valid JSON with keys "name", "dose", "notes", and "frequency". For "frequency": return "daily" if taken every day, "weekdays" if Monday–Friday only, "weekends" if Saturday–Sunday only, or null if unclear. Put any other info (instructions, warnings, doctor/pharmacy info, duration) into "notes" as a short summary. Example: {"name":"Metformin","dose":"500mg","notes":"Take with food. Prescribed by Dr. Smith.","frequency":"daily"}. Use null for any field you cannot identify.',
            },
          ],
        },
      ],
    },
  })

  if (error) throw new Error(`OCR request failed: ${error.message}`)

  const text: string = data?.content?.[0]?.text ?? ''
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    return JSON.parse(jsonMatch[0]) as MedScanResult
  } catch {
    throw new Error('Could not parse medication info from image.')
  }
}
