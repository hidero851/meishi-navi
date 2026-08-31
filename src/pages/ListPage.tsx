import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Card } from '../types'

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= n ? 'var(--warn)' : 'var(--border)', fontSize: 13 }}>★</span>
      ))}
    </span>
  )
}

function Avatar({ card }: { card: Card }) {
  if (card.front_photo_url) {
    return (
      <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
        <img src={card.front_photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }
  const initial = (card.name || '?').trim().charAt(0).toUpperCase()
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%',
      background: 'var(--accent-soft)', color: 'var(--accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: 15, flexShrink: 0,
    }}>
      {initial}
    </div>
  )
}

export default function ListPage() {
  const navigate = useNavigate()
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const fetchCards = useCallback(async () => {
    const { data, error } = await supabase
      .from('meishi_cards')
      .select('*')
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false })
    if (!error && data) setCards(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchCards() }, [fetchCards])

  const filtered = query.trim()
    ? cards.filter(c =>
        [c.name, c.kana, c.company, c.title, c.notes].some(f =>
          (f || '').toLowerCase().includes(query.toLowerCase())
        )
      )
    : cards

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '0 16px 80px' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 0 12px',
        marginBottom: 20,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, background: 'var(--accent)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <line x1="8" y1="6" x2="8" y2="18" />
            </svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.3px' }}>名刺ボックス</span>
        </div>
        <button
          onClick={() => navigate('/card/new')}
          style={{
            width: 42, height: 42, borderRadius: '50%',
            background: 'var(--accent)', color: '#fff',
            border: 'none', fontSize: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: 'var(--sh2)',
          }}
          aria-label="名刺を追加"
        >
          <Plus size={20} />
        </button>
      </header>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
        <input
          type="search"
          placeholder="名前・会社名・メモで検索"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px 10px 38px',
            border: '1px solid var(--border)', borderRadius: 12,
            background: 'var(--surface)', color: 'var(--text)',
            fontSize: 14, outline: 'none', fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Desktop column headers */}
      <div className="hidden sm:flex" style={{ padding: '0 56px 6px 56px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text3)', gap: 12 }}>
        <span style={{ flex: 1 }}>氏名</span>
        <span style={{ flex: 1 }}>会社・役職</span>
        <span style={{ width: 64, textAlign: 'right' }}>重要度</span>
      </div>

      {/* Card list */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <div className="spinner-dark" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text3)', fontSize: 14 }}>読み込み中…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '72px 24px', textAlign: 'center', color: 'var(--text2)' }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: .4 }}>📇</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
            {cards.length === 0 ? '名刺がありません' : '見つかりませんでした'}
          </h3>
          <p style={{ fontSize: 14, marginBottom: 24 }}>
            {cards.length === 0 ? '右上の＋から名刺を追加してください' : `「${query}」に一致する名刺はありません`}
          </p>
          {cards.length === 0 && (
            <button
              onClick={() => navigate('/card/new')}
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              最初の名刺を追加する
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(card => (
            <div
              key={card.id}
              onClick={() => navigate(`/card/${card.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, cursor: 'pointer',
                boxShadow: 'var(--sh1)', transition: 'all .15s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget
                el.style.borderColor = 'var(--accent)'
                el.style.boxShadow = 'var(--sh2)'
                el.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                el.style.borderColor = 'var(--border)'
                el.style.boxShadow = 'var(--sh1)'
                el.style.transform = ''
              }}
            >
              <Avatar card={card} />
              <div style={{ flex: 1, minWidth: 0 }} className="sm:flex sm:gap-3 sm:items-center">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {card.name || '（名前なし）'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className="sm:hidden">
                    {[card.company, card.title].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }} className="hidden sm:block">
                  <div style={{ fontSize: 13, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.company}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.title}</div>
                </div>
              </div>
              <Stars n={card.importance || 3} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
