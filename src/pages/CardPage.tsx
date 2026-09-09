import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Camera, Zap, Edit2, Trash2, Save, X, GalleryHorizontal } from 'lucide-react'
import { supabase, STORAGE_BUCKET, EDGE_FUNCTION_URL } from '../lib/supabase'
import type { Card } from '../types'
import CameraModal from '../components/CameraModal'

const IMP_LABELS = ['', '低', '低め', '普通', '高め', '高']

const FIELDS: { label: string; key: keyof Card; type?: string; placeholder?: string }[] = [
  { label: '氏名',   key: 'name',    placeholder: '田中 太郎' },
  { label: 'よみ',   key: 'kana',    placeholder: 'たなか たろう' },
  { label: '会社名', key: 'company', placeholder: '株式会社〇〇' },
  { label: '部署',   key: 'dept',    placeholder: '営業部' },
  { label: '役職',   key: 'title',   placeholder: '部長' },
]

const CONTACT_FIELDS: { label: string; key: keyof Card; type?: string; placeholder?: string }[] = [
  { label: 'TEL',   key: 'phone',  type: 'tel',   placeholder: '03-1234-5678' },
  { label: '携帯',  key: 'mobile', type: 'tel',   placeholder: '090-1234-5678' },
  { label: 'メール', key: 'email', type: 'email', placeholder: 'tanaka@example.com' },
  { label: '住所',  key: 'addr',   placeholder: '〒000-0000 東京都…' },
  { label: 'Web',   key: 'web',    type: 'url',   placeholder: 'https://example.com' },
]

function compress(file: File): Promise<{ dataUrl: string; blob: Blob }> {
  return new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onerror = rej
    reader.onload = e => {
      const img = new Image()
      img.onerror = rej
      img.onload = () => {
        const MAX = 1600
        let w = img.width, h = img.height
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX }
          else { w = Math.round(w * MAX / h); h = MAX }
        }
        const c = document.createElement('canvas')
        c.width = w; c.height = h
        c.getContext('2d')!.drawImage(img, 0, 0, w, h)
        c.toBlob(blob => {
          if (!blob) { rej(new Error('compress failed')); return }
          res({ dataUrl: c.toDataURL('image/jpeg', 0.92), blob })
        }, 'image/jpeg', 0.92)
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

async function uploadPhoto(blob: Blob, cardId: string, side: 'front' | 'back'): Promise<string> {
  const path = `${cardId}/${side}.jpg`
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl + `?t=${Date.now()}`
}

let toastTimer: ReturnType<typeof setTimeout>
function useToast() {
  const [msg, setMsg] = useState('')
  const [show, setShow] = useState(false)
  const toast = (m: string) => {
    setMsg(m); setShow(true)
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => setShow(false), 3000)
  }
  return { msg, show, toast }
}

export default function CardPage({ mode }: { mode: 'new' | 'view' | 'edit' }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { msg, show, toast } = useToast()

  const [card, setCard] = useState<Partial<Card>>({ importance: 3 })
  const [loading, setLoading] = useState(mode !== 'new')
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)

  const [photoSide, setPhotoSide] = useState<'front' | 'back'>('front')
  const [frontPreview, setFrontPreview] = useState<string | null>(null)
  const [backPreview, setBackPreview] = useState<string | null>(null)
  const [frontBlob, setFrontBlob] = useState<Blob | null>(null)
  const [backBlob, setBackBlob] = useState<Blob | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const isEditing = mode === 'new' || mode === 'edit'

  // Auto-fill registrant from logged-in user on new card
  useEffect(() => {
    if (mode !== 'new') return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setCard(prev => ({ ...prev, registrant: prev.registrant || user.email! }))
    })
  }, [mode])

  // Load existing card
  useEffect(() => {
    if (!id) return
    supabase.from('meishi_cards').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error || !data) { toast('名刺が見つかりません'); navigate('/'); return }
      setCard(data)
      setFrontPreview(data.front_photo_url || null)
      setBackPreview(data.back_photo_url || null)
      setLoading(false)
    })
  }, [id])

  const currentPreview = photoSide === 'front' ? frontPreview : backPreview

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const { dataUrl, blob } = await compress(file)
      if (photoSide === 'front') { setFrontPreview(dataUrl); setFrontBlob(blob) }
      else { setBackPreview(dataUrl); setBackBlob(blob) }
    } catch { toast('画像の読み込みに失敗しました') }
  }

  const handleScan = async () => {
    const preview = photoSide === 'front' ? frontPreview : backPreview
    if (!preview) return
    setScanning(true)
    try {
      const base64 = preview.split(',')[1]
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({ image: base64, mimeType: 'image/jpeg' }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || `エラー ${res.status}`) }
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      // Merge: only overwrite if result is non-empty
      setCard(prev => {
        const merged = { ...prev }
        ;(['name', 'kana', 'company', 'dept', 'title', 'phone', 'mobile', 'email', 'addr', 'web'] as (keyof Card)[]).forEach(k => {
          const v = data[k]
          if (v && String(v).trim()) (merged as Record<string, unknown>)[k] = String(v).trim()
        })
        return merged
      })
      toast('読み取り完了！内容を確認してください ✓')
    } catch (e: unknown) {
      toast('エラー: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setScanning(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const cardId = id || crypto.randomUUID()
      let frontUrl = card.front_photo_url || null
      let backUrl = card.back_photo_url || null

      if (frontBlob) frontUrl = await uploadPhoto(frontBlob, cardId, 'front')
      if (backBlob) backUrl = await uploadPhoto(backBlob, cardId, 'back')

      const payload = {
        ...card,
        id: cardId,
        front_photo_url: frontUrl,
        back_photo_url: backUrl,
        importance: card.importance || 3,
      }
      delete (payload as Record<string, unknown>).created_at
      delete (payload as Record<string, unknown>).updated_at

      const { error } = await supabase.from('meishi_cards').upsert(payload)
      if (error) throw new Error(error.message)

      toast('保存しました ✓')
      navigate(`/card/${cardId}`, { replace: true })
    } catch (e: unknown) {
      toast('保存失敗: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !confirm('この名刺を削除しますか？')) return
    // Delete photos from storage
    await supabase.storage.from(STORAGE_BUCKET).remove([`${id}/front.jpg`, `${id}/back.jpg`])
    const { error } = await supabase.from('meishi_cards').delete().eq('id', id)
    if (error) { toast('削除失敗: ' + error.message); return }
    navigate('/')
  }

  const field = (key: keyof Card) => String(card[key] || '')
  const setField = (key: keyof Card, val: string) => setCard(prev => ({ ...prev, [key]: val }))

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner-dark" />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '0 16px 80px' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 0 12px', marginBottom: 20,
        borderBottom: '1px solid var(--border)',
      }}>
        <button
          onClick={() => navigate(mode === 'edit' ? `/card/${id}` : '/')}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--accent)', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <ChevronLeft size={18} />
          {mode === 'edit' ? '詳細に戻る' : '一覧へ戻る'}
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          {mode === 'view' && id && (
            <>
              <button onClick={handleDelete} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                background: 'none', color: 'var(--danger)', border: '1px solid var(--danger)',
                borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <Trash2 size={14} />削除
              </button>
              <button onClick={() => navigate(`/card/${id}/edit`)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <Edit2 size={14} />編集
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button onClick={() => navigate(mode === 'edit' ? `/card/${id}` : '/')} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
                borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <X size={14} />キャンセル
              </button>
              <button onClick={handleSave} disabled={saving} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                opacity: saving ? .7 : 1,
              }}>
                {saving ? <div className="spinner" /> : <Save size={14} />}
                {saving ? '保存中…' : '保存する'}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="sm:grid-cols-[300px_1fr]">
        {/* Photo panel */}
        <div>
          {/* Tabs */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 10, background: 'var(--surface2)' }}>
            {(['front', 'back'] as const).map(side => (
              <button
                key={side}
                onClick={() => setPhotoSide(side)}
                style={{
                  flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600,
                  background: photoSide === side ? 'var(--accent)' : 'none',
                  color: photoSide === side ? '#fff' : 'var(--text2)',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                }}
              >
                {side === 'front' ? '表面' : '裏面'}
              </button>
            ))}
          </div>

          {/* Photo slot */}
          <div
            onClick={() => {
              if (isEditing && !currentPreview) fileInputRef.current?.click()
              else if (!isEditing && currentPreview) setLightbox(currentPreview)
            }}
            style={{
              position: 'relative', aspectRatio: '1.75',
              border: currentPreview ? '1px solid var(--border)' : '2px dashed var(--border)',
              borderRadius: 12, overflow: 'hidden',
              background: 'var(--surface)',
              cursor: (isEditing && !currentPreview) || (!isEditing && currentPreview) ? 'pointer' : 'default',
              transition: 'border-color .15s',
            }}
          >
            {currentPreview ? (
              <img src={currentPreview} alt="名刺" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text3)' }}>
                <Camera size={36} strokeWidth={1.5} style={{ opacity: .5 }} />
                <span style={{ fontSize: 13 }}>{isEditing ? 'タップして写真を追加' : '写真なし'}</span>
              </div>
            )}
            {scanning && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,113,227,.88)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 12, color: '#fff', borderRadius: 11,
              }}>
                <div className="spinner" />
                <span style={{ fontSize: 13, fontWeight: 500 }}>AI読み取り中…</span>
              </div>
            )}
          </div>

          {/* Photo actions (edit mode only) */}
          {isEditing && (
            <>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  onClick={() => setShowCamera(true)}
                  style={{
                    flex: 1, padding: 9, border: '1px solid var(--border)', borderRadius: 8,
                    background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <Camera size={14} />カメラで撮影
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    flex: 1, padding: 9, border: '1px solid var(--border)', borderRadius: 8,
                    background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <GalleryHorizontal size={14} />ライブラリ
                </button>
              </div>
              <button
                onClick={handleScan}
                disabled={!currentPreview || scanning}
                style={{
                  width: '100%', marginTop: 8, padding: 9,
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  borderRadius: 8, fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  cursor: currentPreview && !scanning ? 'pointer' : 'not-allowed',
                  opacity: !currentPreview || scanning ? .5 : 1, fontFamily: 'inherit',
                }}
              >
                <Zap size={14} />AI読み取り
              </button>
            </>
          )}
        </div>

        {/* Info panel */}
        <div>
          {/* Basic info */}
          <div className="surface" style={{ padding: '16px 16px 8px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text3)', marginBottom: 12 }}>基本情報</div>
            {FIELDS.map(f => (
              <div key={f.key} className="field-row">
                <span className="field-lbl">{f.label}</span>
                <input className="field-inp" value={field(f.key)} readOnly={!isEditing} placeholder={isEditing ? f.placeholder : ''} onChange={e => setField(f.key, e.target.value)} />
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="surface" style={{ padding: '16px 16px 8px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text3)', marginBottom: 12 }}>連絡先</div>
            {CONTACT_FIELDS.map(f => (
              <div key={f.key} className="field-row">
                <span className="field-lbl">{f.label}</span>
                {!isEditing && f.key === 'email' && card.email ? (
                  <a href={`mailto:${card.email}`} style={{ flex: 1, padding: '7px 6px', fontSize: 14, color: 'var(--accent)', textDecoration: 'none' }}>{card.email}</a>
                ) : !isEditing && f.key === 'web' && card.web ? (
                  <a href={card.web} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '7px 6px', fontSize: 14, color: 'var(--accent)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.web}</a>
                ) : !isEditing && f.key === 'phone' && card.phone ? (
                  <a href={`tel:${card.phone}`} style={{ flex: 1, padding: '7px 6px', fontSize: 14, color: 'var(--accent)', textDecoration: 'none' }}>{card.phone}</a>
                ) : !isEditing && f.key === 'mobile' && card.mobile ? (
                  <a href={`tel:${card.mobile}`} style={{ flex: 1, padding: '7px 6px', fontSize: 14, color: 'var(--accent)', textDecoration: 'none' }}>{card.mobile}</a>
                ) : (
                  <input className="field-inp" type={f.type} value={field(f.key)} readOnly={!isEditing} placeholder={isEditing ? f.placeholder : ''} onChange={e => setField(f.key, e.target.value)} />
                )}
              </div>
            ))}
          </div>

          {/* Registration info */}
          <div className="surface" style={{ padding: '16px 16px 8px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text3)', marginBottom: 12 }}>登録情報</div>
            <div className="field-row">
              <span className="field-lbl">登録者</span>
              <input className="field-inp" value={field('registrant')} readOnly={!isEditing} placeholder={isEditing ? '例: 山田 花子' : ''} onChange={e => setField('registrant', e.target.value)} />
            </div>
            <div className="field-row">
              <span className="field-lbl">出会った場所</span>
              <input className="field-inp" value={field('met_place')} readOnly={!isEditing} placeholder={isEditing ? '例: 東京ビジネスEXPO 2026' : ''} onChange={e => setField('met_place', e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div className="surface" style={{ padding: '16px 16px 8px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text3)', marginBottom: 12 }}>メモ</div>
            <textarea
              className="field-inp field-ta"
              value={field('notes')}
              readOnly={!isEditing}
              placeholder={isEditing ? '相手に関するメモを入力…' : ''}
              onChange={e => setField('notes', e.target.value)}
            />
          </div>

          {/* Importance */}
          <div className="surface" style={{ padding: '16px 16px 12px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text3)', marginBottom: 12 }}>重要度</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 6px' }}>
              {[1, 2, 3, 4, 5].map(v => (
                <button
                  key={v}
                  className={`imp-star${v <= (card.importance || 3) ? ' on' : ''}`}
                  disabled={!isEditing}
                  onClick={() => setField('importance', String(v))}
                >★</button>
              ))}
              <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 4 }}>
                {IMP_LABELS[card.importance || 3]}
              </span>
            </div>
          </div>

          {/* Dates (view mode) */}
          {mode === 'view' && card.created_at && (
            <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'right' }}>
              登録: {new Date(card.created_at).toLocaleDateString('ja-JP')}
              {card.updated_at && card.updated_at !== card.created_at && (
                <> ／ 更新: {new Date(card.updated_at).toLocaleDateString('ja-JP')}</>
              )}
            </p>
          )}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,.15)', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
          <img
            src={lightbox}
            alt="名刺"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8, cursor: 'default' }}
          />
        </div>
      )}

      {showCamera && (
        <CameraModal
          onCapture={async file => {
            setShowCamera(false)
            try {
              const { dataUrl, blob } = await compress(file)
              if (photoSide === 'front') { setFrontPreview(dataUrl); setFrontBlob(blob) }
              else { setBackPreview(dataUrl); setBackBlob(blob) }
            } catch { toast('画像の読み込みに失敗しました') }
          }}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Toast */}
      <div className={`toast-base${show ? ' show' : ''}`}>{msg}</div>
    </div>
  )
}
