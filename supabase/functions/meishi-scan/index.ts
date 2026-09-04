import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROMPT = `You are an expert OCR assistant specializing in Japanese business cards (名刺).
Carefully examine every part of this business card image and extract all text.

Return ONLY a JSON object with these exact keys. No markdown, no explanation.

Rules:
- name: The person's full name. May be in kanji, katakana, hiragana, or romaji. Look for the largest or most prominent name on the card.
- kana: Furigana/reading of the name. Accept hiragana, katakana, or romaji. Empty string if not present.
- company: Organization name. If "株式会社" or "有限会社" etc. appears on a separate line from the rest of the name, combine them (e.g. "株式会社〇〇"). Include the full legal name.
- dept: Department/division name. Empty string if not present.
- title: Job title / position. Empty string if not present.
- phone: Office/landline phone number. Empty string if not present.
- mobile: Mobile/cell phone number. Empty string if not present.
- email: Email address. Empty string if not present.
- addr: Full postal address. Empty string if not present.
- web: Website URL. Empty string if not present.

If a field is unclear or absent, use empty string "". Never omit a key.

{"name":"","kana":"","company":"","dept":"","title":"","phone":"","mobile":"","email":"","addr":"","web":""}`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { image, mimeType } = await req.json()
    if (!image) return new Response(JSON.stringify({ error: 'image required' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: image } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    })

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      return new Response(JSON.stringify({ error: err.error?.message || `API error ${resp.status}` }), {
        status: resp.status, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const data = await resp.json()
    const text = (data.content[0]?.text || '').trim()
    const m = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    const jsonStr = m ? m[1] : text
    const result = JSON.parse(jsonStr)

    return new Response(JSON.stringify(result), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
