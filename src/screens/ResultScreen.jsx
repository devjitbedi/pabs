import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ResultScreen({ state, dispatch, myPlayerId }) {
  const [countdown, setCountdown] = useState(60)
  const navigate = useNavigate()

  const amIBhaabi = state?.bhaabi === myPlayerId

  useEffect(() => {
    if (!state || state.status !== 'finished') return
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          dispatch({ type: 'RESET_GAME' })
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [state?.status, dispatch])

  if (!state || state.status !== 'finished') {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--muted)',
      }}>
        Loading…
      </div>
    )
  }

  const bhaabi = state.players.find(p => p.id === state.bhaabi)
  const escapees = state.players.filter(p => p.hasEscaped)
  const sorted = [
    ...escapees.sort((a, b) => (a.escapeOrder || 0) - (b.escapeOrder || 0)),
    ...(bhaabi ? [bhaabi] : []),
  ]

  const myIndex = sorted.findIndex(p => p.id === myPlayerId)
  const amIFirst = !amIBhaabi && myIndex === 0

  const headline = amIBhaabi
    ? 'Better luck next time'
    : amIFirst
      ? 'Congrats on being the best'
      : 'Congrats on not being last'

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      padding: '0 24px',
      paddingBottom: 'env(safe-area-inset-bottom, 20px)',
      background: 'var(--ink)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Red glow for bhaabi */}
      {amIBhaabi && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(192,74,64,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      )}

      {/* Center: result */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        position: 'relative',
        zIndex: 1,
        paddingTop: 40,
      }}>
        {/* Status label */}
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: amIBhaabi ? 'var(--red-alert)' : 'var(--green)',
        }}>
          {amIBhaabi ? "You're the Bhaabi" : 'You Escaped'}
        </div>

        {/* Main headline */}
        <div style={{
          fontFamily: "'Instrument Serif', serif",
          fontStyle: 'italic',
          fontSize: 44,
          color: 'var(--cream)',
          textAlign: 'center',
          lineHeight: 1.1,
        }}>
          {headline}
        </div>

        {/* Leaderboard */}
        <div style={{
          width: '100%',
          marginTop: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {sorted.map((player, i) => {
            const isBhaabi = player.id === state.bhaabi
            const isMe = player.id === myPlayerId
            const isFirst = i === 0 && !isBhaabi

            // Placement number styling
            const rankColor = isFirst
              ? 'var(--gold)'
              : isBhaabi
                ? 'var(--red-alert)'
                : 'var(--dim)'
            const rankGlow = isFirst
              ? '0 0 10px rgba(200,151,58,0.7)'
              : isBhaabi
                ? '0 0 10px rgba(192,74,64,0.7)'
                : 'none'

            // Status pill label — merge "You ·" prefix when it's me
            const statusLabel = (isMe ? 'You · ' : '') + (isBhaabi ? 'Bhaabi' : 'Escaped')

            return (
              <div key={player.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 12,
                background: isMe ? 'rgba(200,151,58,0.06)' : 'rgba(255,255,255,0.02)',
              }}>
                {/* Placement number */}
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  width: 20,
                  textAlign: 'center',
                  color: rankColor,
                  textShadow: rankGlow,
                }}>
                  {i + 1}
                </span>

                {/* Player name */}
                <span style={{
                  fontFamily: "'Instrument Serif', serif",
                  fontStyle: 'italic',
                  fontSize: 20,
                  color: 'var(--cream)',
                  flex: 1,
                }}>
                  {player.name}
                </span>

                {/* Status pill */}
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: isBhaabi ? 'rgba(192,74,64,0.15)' : 'rgba(90,154,114,0.15)',
                  color: isBhaabi ? 'var(--red-alert)' : 'var(--green)',
                }}>
                  {statusLabel}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Countdown bar */}
      <div style={{
        paddingBottom: 24,
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          textAlign: 'center',
          fontSize: 13,
          color: 'var(--muted)',
          marginBottom: 10,
        }}>
          Back to lobby in {countdown}s
        </div>
        <div style={{
          width: '100%',
          height: 3,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${(countdown / 60) * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--gold-light), var(--gold))',
            transition: 'width 1s linear',
          }} />
        </div>
      </div>
    </div>
  )
}
