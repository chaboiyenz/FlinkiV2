/**
 * HighlightCard — 1080×1920 (9:16) shareable achievement card
 *
 * Rendered off-screen as a real DOM element, then captured with html-to-image
 * and shared via the Web Share API (mobile) or downloaded as PNG (desktop).
 *
 * Light export: white bg, #210366 accent
 * Dark export:  #0F172A bg, #00FFFF accent
 */
import React, { useRef, useCallback } from 'react'
import { toPng } from 'html-to-image'
import { QRCodeSVG } from 'qrcode.react'

// ─── Types (minimal — avoids circular import with App.tsx) ───────────────────
export type HighlightAchievement = {
  id: string
  title: string
  eventName: string
  status: string
  rootOfTrust?: string
  pillar?: string
  verifiedCount: number // pre-computed from trustLayers
  summaryTime?: string // e.g. "3:22:07"
  summaryDistance?: string // e.g. "42.2 km"
  trophyCount?: number // 1–6 verified layers → drives icon
  isSimulator?: boolean // show orange Layer 3 shield
}

type Props = {
  achievement: HighlightAchievement
  isDark: boolean
  profileUrl: string
  /** Called with the blob so the caller can trigger Web Share / download */
  onImage?: (blob: Blob, filename: string) => void
  children?: React.ReactNode
}

// ─── Trophy icon (inline SVG, no external dep) ───────────────────────────────
function TrophyIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 2h12v7a6 6 0 01-12 0V2zm0 0H2v3a4 4 0 004 4m12-7h4v3a4 4 0 01-4 4M12 15v4m-4 2h8"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── The off-screen card (1080×1920 @ 0.25 render scale, captured at 4×) ────
export const HighlightCardCanvas = React.forwardRef<HTMLDivElement, Props>(
  function HighlightCardCanvas({ achievement, isDark, profileUrl }, ref) {
    const bg = isDark ? '#0F172A' : '#FFFFFF'
    const fg = isDark ? '#FFFFFF' : '#000000'
    const accent = isDark ? '#00FFFF' : '#210366'
    const accentBg = isDark ? 'rgba(0,255,255,0.08)' : 'rgba(33,3,102,0.06)'

    // Render at 25% size; html-to-image captures at pixelRatio 4 → 1080×1920
    const W = 270 // 1080/4
    const H = 480 // 1920/4

    const trophyColor = achievement.isSimulator ? '#F59E0B' : accent

    return (
      <div
        ref={ref}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: W,
          height: H,
          background: bg,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
          overflow: 'hidden',
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: 4, background: accent, flexShrink: 0 }} />

        {/* Header: Flinki wordmark */}
        <div
          style={{
            padding: '18px 20px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 3,
              color: accent,
              textTransform: 'uppercase',
            }}
          >
            FLINKI
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: fg,
              opacity: 0.4,
              letterSpacing: 1,
            }}
          >
            VERIFIED GLOBAL PASSPORT
          </span>
        </div>

        {/* Trophy + verified count */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '28px 20px 16px',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: accentBg,
              border: `2px solid ${accent}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrophyIcon size={36} color={trophyColor} />
          </div>

          {/* Verified signals count */}
          <div
            style={{
              display: 'flex',
              gap: 4,
              marginTop: 4,
            }}
          >
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                style={{
                  width: 20,
                  height: 4,
                  borderRadius: 2,
                  background:
                    i < achievement.verifiedCount ? accent : isDark ? '#1E293B' : '#E2E8F0',
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, color: fg, opacity: 0.5 }}>
            {achievement.verifiedCount}/6 VERIFIED SIGNALS
          </span>
        </div>

        {/* Achievement title block */}
        <div
          style={{
            margin: '0 20px',
            padding: '16px',
            borderRadius: 12,
            background: accentBg,
            border: `1px solid ${accent}40`,
            flexShrink: 0,
          }}
        >
          <p
            style={{
              fontSize: 9,
              fontWeight: 900,
              color: accent,
              letterSpacing: 2,
              margin: 0,
              marginBottom: 6,
              textTransform: 'uppercase',
            }}
          >
            {achievement.rootOfTrust ?? 'Achievement'}
          </p>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: fg,
              lineHeight: 1.1,
              margin: 0,
              letterSpacing: -0.5,
            }}
          >
            {achievement.title}
          </h2>
          <p style={{ fontSize: 11, fontWeight: 600, color: fg, opacity: 0.6, margin: '6px 0 0' }}>
            {achievement.eventName}
          </p>
        </div>

        {/* Stats row */}
        {(achievement.summaryTime || achievement.summaryDistance) && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              margin: '12px 20px 0',
            }}
          >
            {achievement.summaryTime && (
              <div
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: isDark ? '#1E293B' : '#F8FAFC',
                  border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
                }}
              >
                <p
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    color: fg,
                    opacity: 0.5,
                    margin: 0,
                    marginBottom: 3,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  Time
                </p>
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 900,
                    color: fg,
                    margin: 0,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {achievement.summaryTime}
                </p>
              </div>
            )}
            {achievement.summaryDistance && (
              <div
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: isDark ? '#1E293B' : '#F8FAFC',
                  border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
                }}
              >
                <p
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    color: fg,
                    opacity: 0.5,
                    margin: 0,
                    marginBottom: 3,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  Distance
                </p>
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 900,
                    color: fg,
                    margin: 0,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {achievement.summaryDistance}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Layer 3 simulator badge */}
        {achievement.isSimulator && (
          <div
            style={{
              margin: '10px 20px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 10px',
              borderRadius: 8,
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.3)',
            }}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="#F59E0B"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                fontSize: 8,
                fontWeight: 900,
                color: '#F59E0B',
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              Layer 3 · Strava Verified
            </span>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* QR + footer */}
        <div
          style={{
            padding: '0 20px 20px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: fg,
                opacity: 0.4,
                margin: 0,
                marginBottom: 4,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              View Full Passport
            </p>
            <div
              style={{
                padding: 4,
                background: '#FFFFFF',
                borderRadius: 6,
                display: 'inline-block',
              }}
            >
              <QRCodeSVG
                value={profileUrl}
                size={52}
                bgColor="#FFFFFF"
                fgColor={isDark ? '#0F172A' : '#210366'}
                level="M"
              />
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p
              style={{
                fontSize: 8,
                fontWeight: 900,
                color: accent,
                letterSpacing: 2,
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              flinki.io
            </p>
            <p
              style={{
                fontSize: 7,
                color: fg,
                opacity: 0.35,
                margin: '3px 0 0',
                letterSpacing: 0.5,
              }}
            >
              Verified Global Passport
            </p>
          </div>
        </div>
      </div>
    )
  }
)

// ─── Generic capture + share helper ──────────────────────────────────────────
/**
 * Captures any DOM node as a PNG and shares via Web Share API (mobile)
 * or triggers a download (desktop).
 */
// 1×1 transparent PNG — used as placeholder for any cross-origin image that fails to load
const IMAGE_PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png'
  const binary = atob(base64)
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i)
  return new Blob([array], { type: mime })
}

export async function captureAndShare(
  node: HTMLDivElement,
  filename: string,
  title: string,
  text: string
): Promise<void> {
  let blob: Blob | null = null
  try {
    // Run toPng twice — first pass pre-caches images so second pass renders correctly
    await toPng(node, { pixelRatio: 2, cacheBust: true, imagePlaceholder: IMAGE_PLACEHOLDER })
    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      cacheBust: true,
      imagePlaceholder: IMAGE_PLACEHOLDER,
    })
    blob = dataUrlToBlob(dataUrl)
  } catch (err) {
    console.error('[captureAndShare] failed:', err)
    return
  }

  if (
    navigator.canShare &&
    navigator.canShare({ files: [new File([blob], filename, { type: 'image/png' })] })
  ) {
    try {
      await navigator.share({
        title,
        text,
        files: [new File([blob], filename, { type: 'image/png' })],
      })
      return
    } catch {
      // user cancelled — fall through to download
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Share button + capture logic ─────────────────────────────────────────────
export function useHighlightShare() {
  const cardRef = useRef<HTMLDivElement>(null)

  const share = useCallback(async (achievement: HighlightAchievement) => {
    const node = cardRef.current
    if (!node) return

    let blob: Blob | null = null
    try {
      const dataUrl = await toPng(node, { pixelRatio: 4, cacheBust: true })
      const res = await fetch(dataUrl)
      blob = await res.blob()
    } catch {
      return
    }

    const filename = `flinki-${achievement.id}-highlight.png`

    // Mobile: Web Share API
    if (
      navigator.canShare &&
      navigator.canShare({ files: [new File([blob], filename, { type: 'image/png' })] })
    ) {
      try {
        await navigator.share({
          title: achievement.title,
          text: `${achievement.eventName} · Verified on Flinki`,
          files: [new File([blob], filename, { type: 'image/png' })],
        })
        return
      } catch {
        // User cancelled — fall through to download
      }
    }

    // Desktop fallback: download PNG
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return { cardRef, share }
}
