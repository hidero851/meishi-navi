import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROMPT = `You are an expert OCR assistant specializing in Japanese business cards (名刺). You have exceptional ability to read kanji, katakana, hiragana, and mixed Japanese-English text.

Step 1: Read ALL text visible on the card carefully, paying special attention to every kanji character.
Step 2: Categorize the text into the fields below.
Step 3: Return ONLY the JSON object. No markdown, no explanation, no extra text.

Field rules:
- name: Person's full name (氏名). Usually the most prominent text. Read every kanji stroke carefully. May be kanji, katakana, hiragana, or romaji.
- kana: Reading of the name (よみがな/フリガナ). Accept hiragana, katakana, or romaji. Empty string if absent.
- company: Full organization name. Combine "株式会社"/"有限会社"/"合同会社" etc. with the company name even if on separate lines (e.g. "株式会社〇〇"). Read each kanji carefully.
- dept: Department name (部署). Empty string if absent.
- title: Job title (役職). Empty string if absent.
- phone: Landline/office phone. Empty string if absent.
- mobile: Mobile phone number. Empty string if absent.
- email: Email address. Empty string if absent.
- addr: Full postal address. Empty string if absent.
- web: Website URL. Empty string if absent.

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
        model: 'claude-sonnet-5',
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
