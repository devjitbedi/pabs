import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SplashScreen() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Pabs — The Modern Bhabhi Card Game'
  }, [])

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: '#0f0d0b',
    }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={{
        padding: 'calc(env(safe-area-inset-top) + 16px) 32px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexShrink: 0,
      }}>
        {/* intentionally sparse */}
      </div>

      {/* ── Tagline ──────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
      }}>
        <p style={{
          fontFamily: "'Instrument Serif', serif",
          fontStyle: 'italic',
          fontSize: 'clamp(22px, 6vw, 26px)',
          color: '#c8973a',
          letterSpacing: '-0.02em',
          lineHeight: 1.3,
          maxWidth: 260,
        }}>
          The modern version of Bhabhi. Play with 3 to 8 friends.
        </p>
      </div>

      {/* ── Wordmark ─────────────────────────────────────────────────────── */}
      <div style={{
        padding: '0 32px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#2a2720',
          marginBottom: 10,
        }}>
          Introducing
        </div>
        <div style={{
          fontFamily: "'Instrument Serif', serif",
          fontStyle: 'italic',
          fontSize: 'clamp(72px, 22vw, 96px)',
          color: '#f0ebe0',
          letterSpacing: '-0.04em',
          lineHeight: 0.88,
        }}>
          Pabs
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div style={{
        padding: '20px 32px max(16px, env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        flexShrink: 0,
      }}>
        <button
          onClick={() => navigate('/host')}
          style={{
            width: '100%',
            minHeight: 54,
            padding: 18,
            borderRadius: 14,
            border: 'none',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #d4a042, #b8872a)',
            color: '#0f0d0b',
            fontSize: 15,
            fontWeight: 500,
            fontFamily: "'Instrument Sans', sans-serif",
            letterSpacing: '0.01em',
            boxShadow: '0 4px 24px rgba(200,151,58,0.2)',
          }}
        >
          Create a game
        </button>
      </div>

    </div>
  )
}
