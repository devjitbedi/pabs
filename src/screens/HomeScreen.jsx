import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateGameId, generatePlayerId } from '../engine/gameLogic'

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

// ── Main component ────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [step, setStep] = useState(1)
  const [hostName, setHostName] = useState('')
  const [gameName, setGameName] = useState('')
  const [nameFocused, setNameFocused] = useState(false)
  const [gameFocused, setGameFocused] = useState(false)
  const navigate = useNavigate()

  const canContinue = hostName.trim().length > 0
  const canCreate = gameName.trim().length > 0

  const doCreate = (finalGameName) => {
    const gameId = generateGameId()
    const playerId = generatePlayerId()

    sessionStorage.setItem(`pabs-player-${gameId}`, playerId)
    sessionStorage.setItem(`pabs-host-${gameId}`, 'true')

    const initialState = {
      gameId,
      gameName: finalGameName,
      status: 'waiting',
      players: [{
        id: playerId,
        name: hostName.trim(),
        isHost: true,
        seatOrder: 0,
        hand: [],
        hasEscaped: false,
        isActive: true,
      }],
      currentTurn: null,
      trick: [],
      trickLedSuit: null,
      wastePile: [],
      isFirstTrick: true,
      roundNumber: 1,
    }
    sessionStorage.setItem(`pabs-init-${gameId}`, JSON.stringify(initialState))
    navigate(`/${gameId}`)
  }

  // Live preview split for step 2
  const words = gameName.trim().split(/\s+/).filter(Boolean)
  const previewLine1 = words[0] || ''
  const previewLine2 = words.slice(1).join(' ')

  const progressDots = (
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
  )

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
        {step === 2 ? (
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
        ) : (
          <div style={{
            fontFamily: "'Instrument Serif', serif",
            fontStyle: 'italic',
            fontSize: 36,
            color: '#c8973a',
          }}>
            Pabs
          </div>
        )}
        {progressDots}
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '0 32px', display: 'flex', flexDirection: 'column' }}>

        {step === 1 ? (
          /* ────────────────────── Step 1: Your Name ───────────────────── */
          <>
            {/* Helper text */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 6,
              paddingTop: 44,
            }}>
              <div style={{
                fontFamily: "'Instrument Sans', sans-serif",
                fontSize: 13,
                color: '#5a5450',
                fontWeight: 400,
              }}>
                Your name will appear as the host
              </div>
            </div>

            {/* Form */}
            <div style={{ paddingBottom: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                  value={hostName}
                  onChange={e => setHostName(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10))}
                  onKeyDown={e => e.key === 'Enter' && canContinue && setStep(2)}
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
                This is how other players will see you during the game.
              </div>
            </div>
          </>

        ) : (
          /* ───────────────────── Step 2: Name the Game ────────────────── */
          <>
            {/* Live preview */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 6,
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#4a4540',
              }}>
                {hostName.trim()}'s Game
              </div>

              <div style={{
                fontFamily: "'Instrument Serif', serif",
                fontStyle: 'italic',
                fontSize: 52,
                letterSpacing: '-0.03em',
                lineHeight: 0.92,
                minHeight: 96,
              }}>
                {gameName.trim() === '' ? (
                  <span style={{ color: '#4a4540' }}>Name your game.</span>
                ) : (
                  <>
                    <span style={{ color: '#f0ebe0', display: 'block' }}>{previewLine1}</span>
                    {previewLine2 && (
                      <span style={{ color: '#c8973a', display: 'block' }}>{previewLine2}</span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Form */}
            <div style={{ paddingBottom: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#5a5450',
              }}>
                Game Name
              </div>

              <FieldMock focused={gameFocused}>
                <input
                  type="text"
                  value={gameName}
                  onChange={e => {
                    const val = e.target.value
                    const spaces = (val.match(/ /g) || []).length
                    if (spaces <= 1) setGameName(val)
                  }}
                  onKeyDown={e => e.key === 'Enter' && canCreate && doCreate(gameName.trim())}
                  onFocus={() => setGameFocused(true)}
                  onBlur={() => setGameFocused(false)}
                  placeholder="e.g. Cousins Showdown"
                  maxLength={25}
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
                Give your game a 2-word name — your friends will see this when they join.
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 32px 44px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {step === 1 ? (
          <GoldButton disabled={!canContinue} onClick={() => setStep(2)}>
            Continue
          </GoldButton>
        ) : (
          <>
            <GoldButton disabled={!canCreate} onClick={() => doCreate(gameName.trim())}>
              Create game
            </GoldButton>
            <button
              onClick={() => doCreate(`${hostName.trim()}'s Game`)}
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: 14,
                border: 'none',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)',
                color: '#8a8278',
                fontSize: 15,
                fontWeight: 400,
                fontFamily: "'Instrument Sans', sans-serif",
                textAlign: 'center',
              }}
            >
              Skip — use "{hostName.trim()}'s Game"
            </button>
          </>
        )}
      </div>

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
