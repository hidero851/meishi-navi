import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ChevronDown, ChevronUp, ArrowUpDown, Download, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Card } from '../types'

function exportCSV(cards: Card[]) {
  const headers = ['氏名', 'よみがな', '会社名', '部署', '役職', 'TEL', '携帯', 'メール', '住所', 'Web', '登録者', '出会った場所', 'メモ', '重要度', '登録日']
  const rows = cards.map(c => [
    c.name, c.kana, c.company, c.dept, c.title,
    c.phone, c.mobile, c.email, c.addr, c.web,
    c.registrant, c.met_place, c.notes,
    c.importance,
    c.created_at ? new Date(c.created_at).toLocaleDateString('ja-JP') : '',
  ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))

  const csv = '﻿' + [headers.join(','), ...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `名刺データ_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

type SortKey = 'company' | 'name'
type SortDir = 'asc' | 'desc'

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= n ? 'var(--warn)' : 'var(--border)', fontSize: 12 }}>★</span>
      ))}
    </span>
  )
}

function Avatar({ card }: { card: Card }) {
  if (card.front_photo_url) {
    return (
      <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
        <img src={card.front_photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }
  const initial = (card.name || '?').trim().charAt(0).toUpperCase()
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: 'var(--accent-soft)', color: 'var(--accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: 14, flexShrink: 0,
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
  const [sortKey, setSortKey] = useState<SortKey>('company')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const fetchCards = useCallback(async () => {
    const { data, error } = await supabase
      .from('meishi_cards')
      .select('*')
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false })
    if (!error && data) {
      setCards(data)
      // 全グループを初期展開
      const companies = new Set(data.map((c: Card) => c.company?.trim() || '（会社名なし）'))
      setExpanded(companies)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchCards() }, [fetchCards])

  const filtered = useMemo(() => {
    if (!query.trim()) return cards
    const q = query.toLowerCase()
    return cards.filter(c =>
      [c.name, c.kana, c.company, c.title, c.notes].some(f => (f || '').toLowerCase().includes(q))
    )
  }, [cards, query])

  const grouped = useMemo(() => {
    const map = new Map<string, Card[]>()
    filtered.forEach(card => {
      const key = card.company?.trim() || '（会社名なし）'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(card)
    })

    // グループ内ソート
    map.forEach(members => {
      members.sort((a, b) => {
        if (sortKey === 'name') {
          const an = a.name || '', bn = b.name || ''
          return sortDir === 'asc' ? an.localeCompare(bn, 'ja') : bn.localeCompare(an, 'ja')
        }
        return (b.importance || 3) - (a.importance || 3)
      })
    })

    // グループ間ソート
    const entries = [...map.entries()]
    entries.sort(([ak, av], [bk, bv]) => {
      if (sortKey === 'company') {
        return sortDir === 'asc' ? ak.localeCompare(bk, 'ja') : bk.localeCompare(ak, 'ja')
      } else {
        const an = av[0]?.name || '', bn = bv[0]?.name || ''
        return sortDir === 'asc' ? an.localeCompare(bn, 'ja') : bn.localeCompare(an, 'ja')
      }
    })

    return entries
  }, [filtered, sortKey, sortDir])

  const toggleExpand = (company: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(company)) next.delete(company)
      else next.add(company)
      return next
    })
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sortLabel = (key: SortKey) => {
    if (sortKey !== key) return ''
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '0 16px 80px' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 0 12px',
        marginBottom: 12,
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => supabase.auth.signOut()}
            title="ログアウト"
            style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'var(--surface)', color: 'var(--text2)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="ログアウト"
          >
            <LogOut size={17} />
          </button>
          <button
            onClick={() => exportCSV(cards)}
            disabled={cards.length === 0}
            title="CSVでエクスポート"
            style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'var(--surface)', color: 'var(--text2)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: cards.length > 0 ? 'pointer' : 'not-allowed',
              opacity: cards.length > 0 ? 1 : .4,
            }}
            aria-label="CSVエクスポート"
          >
            <Download size={18} />
          </button>
          <button
            onClick={() => navigate('/card/new')}
            style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'var(--accent)', color: '#fff',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: 'var(--sh2)',
            }}
            aria-label="名刺を追加"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
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

      {/* Sort bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4, marginRight: 4 }}>
          <ArrowUpDown size={13} />並び順:
        </div>
        {(['company', 'name'] as SortKey[]).map(key => (
          <button
            key={key}
            onClick={() => toggleSort(key)}
            style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: `1px solid ${sortKey === key ? 'var(--accent)' : 'var(--border)'}`,
              background: sortKey === key ? 'var(--accent)' : 'var(--surface)',
              color: sortKey === key ? '#fff' : 'var(--text2)',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
            }}
          >
            {key === 'company' ? '会社名' : '人物名'}{sortLabel(key)}
          </button>
        ))}
      </div>

      {/* Expand / Collapse all */}
      {grouped.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button
            onClick={() => setExpanded(new Set(grouped.map(([k]) => k)))}
            style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <ChevronDown size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />全て展開
          </button>
          <button
            onClick={() => setExpanded(new Set())}
            style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <ChevronUp size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />全て閉じる
          </button>
        </div>
      )}

      {/* Card list */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <div className="spinner-dark" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text3)', fontSize: 14 }}>読み込み中…</p>
        </div>
      ) : grouped.length === 0 ? (
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {grouped.map(([company, members]) => {
            const isOpen = expanded.has(company)
            return (
              <div key={company} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface)', boxShadow: 'var(--sh1)' }}>
                {/* Company header */}
                <button
                  onClick={() => toggleExpand(company)}
                  style={{
                    width: '100%', padding: '11px 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'var(--surface2)', border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{company}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 7px',
                      background: 'var(--accent)', color: '#fff', borderRadius: 10,
                    }}>{members.length}</span>
                  </div>
                  {isOpen ? <ChevronUp size={16} color="var(--text3)" /> : <ChevronDown size={16} color="var(--text3)" />}
                </button>

                {/* Members */}
                {isOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {members.map((card, i) => (
                      <div
                        key={card.id}
                        onClick={() => navigate(`/card/${card.id}`)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '11px 14px',
                          borderTop: i === 0 ? '1px solid var(--border)' : '1px solid var(--border)',
                          cursor: 'pointer', transition: 'background .12s',
                          background: 'var(--surface)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
                      >
                        <Avatar card={card} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {card.name || '（名前なし）'}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {card.title || ''}
                          </div>
                        </div>
                        <Stars n={card.importance || 3} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
