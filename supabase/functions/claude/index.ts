// Server-side proxy for the Anthropic Messages API.
// The app calls THIS function (with the user's Supabase session) instead of
// calling api.anthropic.com directly, so the Anthropic key never ships to the
// client. Used by both the squirrel chat and the medication-label OCR.
//
// Deploy:  supabase functions deploy claude
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Only allow the model(s) the app actually uses, so a leaked anon key can't be
// used to run arbitrary (expensive) Claude requests through this proxy.
const ALLOWED_MODELS = new Set(['claude-haiku-4-5-20251001'])
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS_CAP = 1024

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // Require a real, logged-in Supabase user (not just the public anon key).
  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)
  const { data: { user } } = await supabase.auth.getUser(jwt)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'Server is missing ANTHROPIC_API_KEY' }, 500)

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  // Constrain the request: clamp the model and token budget.
  const model = ALLOWED_MODELS.has(payload.model as string) ? (payload.model as string) : DEFAULT_MODEL
  const maxTokens = Math.min(Number(payload.max_tokens) || 300, MAX_TOKENS_CAP)

  const anthropic = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ ...payload, model, max_tokens: maxTokens }),
  })

  const text = await anthropic.text()
  return new Response(text, { status: anthropic.status, headers: { ...cors, 'content-type': 'application/json' } })
})
