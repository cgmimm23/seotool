'use client'

import { useState, useRef } from 'react'

export default function ImageToolPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [outputUrl, setOutputUrl] = useState<string>('')
  const [outputSize, setOutputSize] = useState<number>(0)
  const [inputSize, setInputSize] = useState<number>(0)
  const [inputDims, setInputDims] = useState({ w: 0, h: 0 })
  const [outputDims, setOutputDims] = useState({ w: 0, h: 0 })
  const [quality, setQuality] = useState(80)
  const [maxWidth, setMaxWidth] = useState('')
  const [maxHeight, setMaxHeight] = useState('')
  const [format, setFormat] = useState<'jpeg' | 'png' | 'webp'>('webp')
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  function handleFile(f: File) {
    setFile(f)
    setInputSize(f.size)
    setDone(false)
    setOutputUrl('')
    const reader = new FileReader()
    reader.onload = e => {
      const src = e.target?.result as string
      setPreview(src)
      const img = new Image()
      img.onload = () => setInputDims({ w: img.naturalWidth, h: img.naturalHeight })
      img.src = src
    }
    reader.readAsDataURL(f)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) handleFile(f)
  }

  async function process() {
    if (!file || !preview) return
    setProcessing(true)
    setDone(false)

    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current!
      let w = img.naturalWidth
      let h = img.naturalHeight

      const mw = maxWidth ? parseInt(maxWidth) : null
      const mh = maxHeight ? parseInt(maxHeight) : null

      if (mw && w > mw) { h = Math.round(h * mw / w); w = mw }
      if (mh && h > mh) { w = Math.round(w * mh / h); h = mh }

      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      if (format === 'jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h) }
      ctx.drawImage(img, 0, 0, w, h)

      const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp'
      const q = format === 'png' ? undefined : quality / 100

      canvas.toBlob(blob => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        setOutputUrl(url)
        setOutputSize(blob.size)
        setOutputDims({ w, h })
        setProcessing(false)
        setDone(true)
      }, mimeType, q)
    }
    img.src = preview
  }

  function download() {
    if (!outputUrl) return
    const a = document.createElement('a')
    a.href = outputUrl
    a.download = `optimized.${format === 'jpeg' ? 'jpg' : format}`
    a.click()
  }

  function formatBytes(b: number) {
    if (b < 1024) return b + ' B'
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
    return (b / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const savings = inputSize && outputSize ? Math.round((1 - outputSize / inputSize) * 100) : 0

  const sliderStyle = { flex: 1 }
  const labelStyle = { fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace' }
  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Image Tool</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Compress, resize, and convert images — JPG, PNG, WebP</p>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'start' }}>

        {/* Left — upload + settings */}
        <div>
          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            style={{ border: '2px dashed rgba(30,144,255,0.3)', borderRadius: '12px', padding: '2.5rem', textAlign: 'center', cursor: 'pointer', marginBottom: '12px', background: '#f8f9fb', transition: 'border-color 0.2s' }}
          >
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {preview ? (
              <img src={preview} alt="preview" style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', objectFit: 'contain' }} />
            ) : (
              <>
                <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.4 }}>+</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#4a6080', marginBottom: '4px' }}>Drop image here or click to upload</div>
                <div style={{ fontSize: '12px', color: '#7a8fa8' }}>JPG, PNG, WebP, GIF supported</div>
              </>
            )}
          </div>

          {file && (
            <div style={{ fontSize: '12px', color: '#7a8fa8', marginBottom: '12px', fontFamily: 'Roboto Mono, monospace' }}>
              {file.name} - {formatBytes(inputSize)} - {inputDims.w} x {inputDims.h}px
            </div>
          )}

          {/* Settings */}
          <div style={card}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: 600, marginBottom: '1rem' }}>Settings</div>

            {/* Format */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Output Format</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['webp', 'jpeg', 'png'] as const).map(f => (
                  <button key={f} onClick={() => setFormat(f)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${format === f ? '#1e90ff' : 'rgba(0,0,0,0.1)'}`, background: format === f ? 'rgba(30,144,255,0.08)' : '#f8f9fb', color: format === f ? '#1e90ff' : '#4a6080', fontSize: '13px', fontWeight: format === f ? 600 : 400, cursor: 'pointer', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase' }}>
                    {f === 'jpeg' ? 'JPG' : f.toUpperCase()}
                  </button>
                ))}
              </div>
              {format === 'webp' && <div style={{ fontSize: '11px', color: '#00d084', marginTop: '4px' }}>WebP gives the best compression — recommended for web</div>}
            </div>

            {/* Quality */}
            {format !== 'png' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Quality — {quality}%</label>
                <input type="range" min="10" max="100" value={quality} onChange={e => setQuality(+e.target.value)} style={sliderStyle} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>
                  <span>Smaller file</span><span>Best quality</span>
                </div>
              </div>
            )}

            {/* Resize */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Resize (optional — leave blank to keep original size)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="text" className="form-input" placeholder="Max width px" value={maxWidth} onChange={e => setMaxWidth(e.target.value)} />
                <span style={{ color: '#7a8fa8', fontSize: '13px', flexShrink: 0 }}>x</span>
                <input type="text" className="form-input" placeholder="Max height px" value={maxHeight} onChange={e => setMaxHeight(e.target.value)} />
              </div>
              <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '4px' }}>Aspect ratio is preserved automatically</div>
            </div>

            <button className="btn btn-accent" onClick={process} disabled={!file || processing} style={{ width: '100%', justifyContent: 'center' }}>
              {processing ? 'Processing...' : 'Compress & Convert'}
            </button>
          </div>
        </div>

        {/* Right — output */}
        <div>
          {done && outputUrl ? (
            <>
              {/* Savings banner */}
              <div style={{ background: savings > 0 ? 'rgba(0,208,132,0.08)' : 'rgba(255,165,0,0.08)', border: `1px solid ${savings > 0 ? 'rgba(0,208,132,0.3)' : 'rgba(255,165,0,0.3)'}`, borderRadius: '12px', padding: '1.1rem 1.5rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ fontSize: '40px', fontWeight: 800, fontFamily: 'Montserrat, sans-serif', color: savings > 0 ? '#00d084' : '#ffa500', lineHeight: 1 }}>{savings > 0 ? `-${savings}%` : `+${Math.abs(savings)}%`}</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0d1b2e' }}>{savings > 0 ? 'File size reduced' : 'File size increased'}</div>
                  <div style={{ fontSize: '13px', color: '#7a8fa8', marginTop: '2px' }}>
                    {formatBytes(inputSize)} to {formatBytes(outputSize)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '1px' }}>
                    {inputDims.w}x{inputDims.h}px to {outputDims.w}x{outputDims.h}px
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div style={{ ...card, textAlign: 'center' }}>
                <img src={outputUrl} alt="output" style={{ maxWidth: '100%', maxHeight: '260px', borderRadius: '8px', objectFit: 'contain', marginBottom: '1rem' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '1rem' }}>
                  {[
                    { label: 'Output size', value: formatBytes(outputSize) },
                    { label: 'Dimensions', value: `${outputDims.w}x${outputDims.h}` },
                    { label: 'Format', value: format === 'jpeg' ? 'JPG' : format.toUpperCase() },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#f8f9fb', borderRadius: '8px', padding: '10px' }}>
                      <div style={{ fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', marginBottom: '3px' }}>{s.label}</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Montserrat, sans-serif', color: '#0d1b2e' }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-accent" onClick={download} style={{ width: '100%', justifyContent: 'center' }}>
                  Download {format === 'jpeg' ? 'JPG' : format.toUpperCase()}
                </button>
              </div>
            </>
          ) : (
            <div style={{ ...card, textAlign: 'center', padding: '4rem 2rem', color: '#7a8fa8' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>IMG</div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', color: '#4a6080', marginBottom: '4px' }}>Output will appear here</div>
              <div style={{ fontSize: '13px' }}>Upload an image and click Compress</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
