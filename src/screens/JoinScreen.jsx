import { useState } from 'react'
import { generatePlayerId } from '../engine/gameLogic'

// ── Shared sub-components ─────────────────────────────────────────────────────

function FieldMock({ focused, children }) {
  return (
    <div style={{
      background: focused ? 'rgba(200,151,58,0.04)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${focused ? 'rgba(200,151,58,0.3)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 12,
      padding: '16px 18px',
      transition: 'background 0.2s, border-color 0.2s',
    }}>
      {children}
    </div>
  )
}

function GoldButton({ disabled, onClick, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        minHeight: 54,
        padding: 18,
        borderRadius: 14,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: disabled
          ? 'rgba(200,151,58,0.08)'
          : 'linear-gradient(135deg, #d4a042, #b8872a)',
        color: disabled ? 'rgba(200,151,58,0.3)' : '#0f0d0b',
        fontSize: 15,
        fontWeight: 500,
        fontFamily: "'Instrument Sans', sans-serif",
      }}
    >
      {children}
    </button>
  )
}

// ── Wordmark ──────────────────────────────────────────────────────────────────

const Wordmark = (
  <div style={{
    fontFamily: "'Instrument Serif', serif",
    fontStyle: 'italic',
    fontSize: 32,
    color: '#4a4540',
  }}>
    Pabs
  </div>
)

// ── Main component ────────────────────────────────────────────────────────────

export default function JoinScreen({ gameId, onJoin, preloadedState }) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [nameFocused, setNameFocused] = useState(false)

  // Pull display info from preloaded state (falls back gracefully while loading)
  const hostPlayer = preloadedState?.players?.find(p => p.isHost)
  const hostName = hostPlayer?.name || '…'
  const gameName = preloadedState?.gameName || gameId
  const players = preloadedState?.players || []

  const gWords = gameName.split(/\s+/).filter(Boolean)
  const gameLine1 = gWords[0] || ''
  const gameLine2 = gWords.slice(1).join(' ')

  const canJoin = name.trim().length > 0

  const handleJoin = () => {
    if (!canJoin) return
    const playerId = generatePlayerId()
    sessionStorage.setItem(`pabs-player-${gameId}`, playerId)
    onJoin(playerId, name.trim())
  }

  // Avatar bubbles for step 1
  const MAX_BUBBLES = 3
  const shownPlayers = players.slice(0, MAX_BUBBLES)
  const extraCount = Math.max(0, players.length - MAX_BUBBLES)

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: '#0f0d0b',
    }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={{
        padding: '52px 32px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {step === 1 ? Wordmark : (
          <button
            onClick={() => setStep(1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#e8e0d0" viewBox="0 0 256 256">
              <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z" />
            </svg>
          </button>
        )}
        {/* Progress dots — same pattern as HomeScreen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {[1, 2].map(n => {
            const isActive = n === step
            const isDone = n < step
            return (
              <div key={n} style={{
                height: 3,
                borderRadius: 2,
                width: isActive ? 18 : 8,
                background: isActive ? '#c8973a' : isDone ? '#5a5450' : '#4a4540',
                transition: 'all 0.3s ease',
              }} />
            )
          })}
        </div>
      </div>

      {step === 1 ? (
        /* ────────────── Step 1: Invite Landing ─────────────────────────── */
        <>
          {/* Body */}
          <div style={{
            flex: 1,
            padding: '0 32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 28,
          }}>

            {/* Block 1 — Invited by */}
            <div>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#4a4540',
                marginBottom: 4,
              }}>
                You've been invited by
              </div>
              <div style={{
                fontFamily: "'Instrument Serif', serif",
                fontStyle: 'italic',
                fontSize: 32,
                color: '#c8973a',
                letterSpacing: '-0.01em',
                lineHeight: 1.1,
              }}>
                {hostName}
              </div>
            </div>

            {/* Block 2 — Game name */}
            <div>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#4a4540',
                marginBottom: 8,
              }}>
                Game · {gameId}
              </div>
              <div style={{
                fontFamily: "'Instrument Serif', serif",
                fontStyle: 'italic',
                fontSize: 52,
                letterSpacing: '-0.03em',
                lineHeight: 0.92,
              }}>
                <span style={{ color: '#f0ebe0', display: 'block' }}>{gameLine1}</span>
                {gameLine2 && (
                  <span style={{ color: '#c8973a', display: 'block' }}>{gameLine2}</span>
                )}
              </div>
            </div>

            {/* Block 3 — Already in the room */}
            <div>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#4a4540',
                marginBottom: 10,
              }}>
                Already in the Room
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                {/* Avatar bubbles */}
                {players.length > 0 ? (
                  <div style={{ display: 'flex' }}>
                    {shownPlayers.map((p, i) => (
                      <div key={p.id} style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        background: p.isHost ? '#2a200e' : '#1e1c18',
                        border: '2px solid #0f0d0b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: "'Instrument Serif', serif",
                        fontStyle: 'italic',
                        fontSize: 13,
                        color: p.isHost ? '#c8973a' : '#8a8278',
                        marginRight: (i < shownPlayers.length - 1 || extraCount > 0) ? -8 : 0,
                        position: 'relative',
                        zIndex: shownPlayers.length - i,
                        flexShrink: 0,
                      }}>
                        {p.name.charAt(0)}
                      </div>
                    ))}
                    {extraCount > 0 && (
                      <div style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        background: '#1e1c18',
                        border: '2px solid #0f0d0b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        color: '#5a5550',
                        flexShrink: 0,
                      }}>
                        +{extraCount}
                      </div>
                    )}
                  </div>
                ) : (
                  // Loading state
                  <div style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.04)',
                    border: '2px solid #0f0d0b',
                    flexShrink: 0,
                  }} />
                )}

                {/* Count text */}
                <div style={{ marginLeft: 16, fontSize: 12, color: '#5a5450' }}>
                  <span style={{ fontWeight: 600, color: '#5a5550' }}>{players.length}</span>
                  {' '}player{players.length !== 1 ? 's' : ''} waiting
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

          {/* Footer */}
          <div style={{ padding: '20px 32px 44px' }}>
            <GoldButton disabled={false} onClick={() => setStep(2)}>
              Join game
            </GoldButton>
          </div>
        </>

      ) : (
        /* ────────────── Step 2: Enter Your Name ────────────────────────── */
        <>
          {/* Body */}
          <div style={{ flex: 1, padding: '0 32px', display: 'flex', flexDirection: 'column' }}>

            {/* Game context block */}
            <div style={{
              paddingTop: 36,
              paddingBottom: 32,
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              marginBottom: 32,
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#4a4540',
                marginBottom: 6,
              }}>
                Joining
              </div>
              <div style={{
                fontFamily: "'Instrument Serif', serif",
                fontStyle: 'italic',
                fontSize: 36,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                marginBottom: 10,
              }}>
                <span style={{ color: '#f0ebe0', display: 'block' }}>{gameLine1}</span>
                {gameLine2 && (
                  <span style={{ color: '#c8973a', display: 'block' }}>{gameLine2}</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#5a5450' }}>
                Hosted by{' '}
                <span style={{ fontWeight: 600, color: '#5a5550' }}>{hostName}</span>
              </div>
            </div>

            {/* Form */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              paddingBottom: 28,
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#5a5450',
              }}>
                Your Name
              </div>

              <FieldMock focused={nameFocused}>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10))}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  placeholder="Your name…"
                  maxLength={10}
                  autoFocus
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontFamily: "'Instrument Serif', serif",
                    fontStyle: 'italic',
                    fontSize: 22,
                    color: '#e8e0d0',
                    letterSpacing: '-0.01em',
                    caretColor: '#c8973a',
                  }}
                />
              </FieldMock>

              <div style={{
                fontFamily: "'Instrument Serif', serif",
                fontStyle: 'italic',
                fontSize: 12,
                color: '#4a4540',
                lineHeight: 1.5,
              }}>
                This is how other players will see you.
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

          {/* Footer */}
          <div style={{ padding: '20px 32px 44px' }}>
            <GoldButton disabled={!canJoin} onClick={handleJoin}>
              Join game
            </GoldButton>
          </div>
        </>
      )}

      <style>{`
        input::placeholder {
          font-family: 'Instrument Serif', serif;
          font-style: italic;
          font-size: 15px;
          color: #4a4540;
        }
      `}</style>
    </div>
  )
}
