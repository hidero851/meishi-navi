import { useEffect, useRef, useState } from 'react'
import { X, Camera } from 'lucide-react'

interface Props {
  onCapture: (file: File) => void
  onClose: () => void
}

export default function CameraModal({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => setReady(true)
        }
      })
      .catch(() => setError('カメラへのアクセスが許可されていません'))

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const shoot = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], 'camera.jpg', { type: 'image/jpeg' })
      streamRef.current?.getTracks().forEach(t => t.stop())
      onCapture(file)
    }, 'image/jpeg', 0.95)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: '#000',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Close */}
      <button
        onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); onClose() }}
        style={{
          position: 'absolute', top: 16, right: 16, zIndex: 101,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(0,0,0,.6)', color: '#fff',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <X size={20} />
      </button>

      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ flex: 1, objectFit: 'cover', width: '100%' }}
      />

      {/* Guide overlay */}
      {ready && (
        <div style={{
          position: 'absolute', inset: '15% 8%',
          border: '2px solid rgba(255,255,255,.6)',
          borderRadius: 12, pointerEvents: 'none',
        }} />
      )}

      {/* Error */}
      {error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#fff', fontSize: 15, textAlign: 'center', padding: '0 32px' }}>{error}</p>
        </div>
      )}

      {/* Shoot button */}
      <div style={{ padding: '24px 0 40px', display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,.4)' }}>
        <p style={{ position: 'absolute', color: 'rgba(255,255,255,.7)', fontSize: 12, top: 'auto', marginTop: -32 }}>
          名刺を枠内に合わせて撮影
        </p>
        <button
          onClick={shoot}
          disabled={!ready}
          style={{
            width: 68, height: 68, borderRadius: '50%',
            background: ready ? '#fff' : 'rgba(255,255,255,.4)',
            border: '4px solid rgba(255,255,255,.5)',
            cursor: ready ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Camera size={28} color={ready ? '#111' : '#999'} />
        </button>
      </div>
    </div>
  )
}
