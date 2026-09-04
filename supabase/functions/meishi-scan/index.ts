import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROMPT = `この名刺の情報をすべて読み取り、以下のJSON形式のみで返してください。余分な説明・マークダウン不要。

注意事項：
- name: 人名（漢字・カタカナ・ローマ字いずれも可）
- kana: 氏名のよみがな。ひらがな・カタカナ・ローマ字いずれも可。名刺に記載がなければ空文字列
- company: 会社名・組織名。「株式会社」が別行にあっても社名と結合して返す（例: "株式会社○○"）
- dept: 部署名。なければ空文字列
- title: 役職名。なければ空文字列
- phone: 固定電話番号。なければ空文字列
- mobile: 携帯・スマホの番号。なければ空文字列
- email: メールアドレス。なければ空文字列
- addr: 住所。なければ空文字列
- web: WebサイトURL。なければ空文字列

読み取れない項目は空文字列にすること。

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
