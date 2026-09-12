import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SetupNamePage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('名前を入力してください'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({
      data: { display_name: name.trim() }
    })
    if (error) {
      setError('設定に失敗しました。もう一度お試しください。')
      setLoading(false)
    }
    // 成功時は App.tsx の onAuthStateChange がリダイレクト
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '24px 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '36px 28px',
        boxShadow: '0 4px 24px rgba(0,0,0,.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{
            width: 36, height: 36, background: 'var(--accent)',
            borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <line x1="8" y1="6" x2="8" y2="18" />
            </svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.3px' }}>名刺管理 - 株式会社Qibou</span>
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>あなたの名前を設定してください</h2>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>
          名刺を登録したときの「登録者」欄に表示されます
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
              氏名
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="例: 山田 太郎"
              autoFocus
              style={{
                width: '100%', padding: '10px 12px',
                border: '1px solid var(--border)', borderRadius: 8,
                background: 'var(--surface)', color: 'var(--text)',
                fontSize: 14, outline: 'none', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 12px', borderRadius: 8,
              background: 'var(--danger-soft, #FEE2E2)', color: 'var(--danger, #DC2626)',
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px', marginTop: 4,
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 8, fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? .7 : 1,
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading && <div className="spinner" />}
            {loading ? '設定中…' : '設定して始める'}
          </button>
        </form>
      </div>
    </div>
  )
}
