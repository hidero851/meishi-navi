import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROMPT = `この名刺の情報をすべて読み取り、以下のJSON形式のみで返してください。読み取れない項目は空文字列。余分な説明・マークダウン不要。

{"name":"氏名","kana":"よみがな","company":"会社名","dept":"部署名","title":"役職","phone":"電話番号","mobile":"携帯番号","email":"メールアドレス","addr":"住所","web":"URL"}`

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
        model: 'claude-haiku-4-5-20251001',
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
