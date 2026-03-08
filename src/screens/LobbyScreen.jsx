import { useEffect, useRef, useState } from 'react'

const MAX_PLAYERS = 8

export default function LobbyScreen({ state, dispatch, isHost, myPlayerId }) {
  const [copiedToast, setCopiedToast] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [recentJoins, setRecentJoins] = useState({})
  const prevPlayersRef = useRef(state?.players || [])

  useEffect(() => {
    if (!state) return
    const prev = prevPlayersRef.current
    const prevIds = new Set(prev.map(p => p.id))
    const newPlayers = state.players.filter(p => !prevIds.has(p.id))
    if (newPlayers.length > 0) {
      const now = Date.now()
      const updates = {}
      newPlayers.forEach(p => { updates[p.id] = now })
      setRecentJoins(prev => ({ ...prev, ...updates }))
      setTimeout(() => {
        setRecentJoins(prev => {
          const next = { ...prev }
          newPlayers.forEach(p => { delete next[p.id] })
          return next
        })
      }, 2000)
    }
    prevPlayersRef.current = state.players
  }, [state?.players])

  // ── Loading / fallback state ──────────────────────────────────────────────
  if (!state) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        padding: 24,
        background: '#0f0d0b',
      }}>
        <div style={{ color: '#5a5450', fontSize: 15 }}>Waiting for host…</div>
        <div style={{ color: '#4a4540', fontSize: 12 }}>
          If this takes too long, the host may have closed their tab.
        </div>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            marginTop: 8,
            padding: '14px 24px',
            borderRadius: 14,
            border: 'none',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #d4a042, #b8872a)',
            color: '#0f0d0b',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Start a new game
        </button>
      </div>
    )
  }

  if (state.status === 'active' || state.status === 'finished') {
    return null // Router handles navigation
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const hostPlayer = state.players.find(p => p.isHost)
  const hostName = hostPlayer?.name || ''
  const gameName = state.gameName || `${hostName}'s Game`
  const gWords = gameName.split(/\s+/).filter(Boolean)
  const gameLine1 = gWords[0] || ''
  const gameLine2 = gWords.slice(1).join(' ')

  const playerCount = state.players.length
  const emptySlots = Math.max(0, MAX_PLAYERS - playerCount)
  const canStart = isHost && playerCount >= 3
  const needMore = Math.max(0, 3 - playerCount)
  const isReady = playerCount >= 3

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleInvite = async () => {
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title: 'Pabs', text: 'Join my game!', url }) } catch (e) {}
    } else {
      await navigator.clipboard.writeText(url)
      setCopiedToast(true)
      setTimeout(() => setCopiedToast(false), 2000)
    }
  }

  const handleStart = () => {
    if (!canStart) return
    dispatch({ type: 'START_GAME' })
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } catch (e) {}
  }

  const handleLeave = () => {
    sessionStorage.removeItem(`pabs-player-${state.gameId}`)
    dispatch({ type: 'REMOVE_PLAYER', playerId: myPlayerId })
    window.location.href = '/'
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: '#0f0d0b',
    }}>

      {/* ── Top section ──────────────────────────────────────────────────── */}
      <div style={{ padding: '52px 32px 0' }}>
        {/* #6 — "Pabs · [game code]" — click to copy link */}
        <div
          onClick={handleCopyCode}
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: codeCopied ? '#5a9a72' : '#5a5450',
            marginBottom: codeCopied ? 4 : 8,
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'color 0.2s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {codeCopied ? '✓ Link copied' : `Pabs · ${state.gameId}`}
        </div>
        {codeCopied && <div style={{ marginBottom: 4 }} />}
        <div style={{
          fontFamily: "'Instrument Serif', serif",
          fontStyle: 'italic',
          fontSize: 48,
          letterSpacing: '-0.03em',
          lineHeight: 0.92,
        }}>
          <div style={{ color: '#f0ebe0' }}>{gameLine1}</div>
          {gameLine2 && <div style={{ color: '#c8973a' }}>{gameLine2}</div>}
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div style={{
        margin: '28px 32px 0',
        height: 1,
        background: 'rgba(255,255,255,0.05)',
      }} />

      {/* ── Presence section ─────────────────────────────────────────────── */}
      <div style={{ padding: '28px 32px 0', flex: 1 }}>
        {/* #2 — brightened label */}
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: '#4a4540',
        }}>
          In the Room
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>

          {/* Filled player rows */}
          {state.players.map(player => {
            const isMe = player.id === myPlayerId
            const isHst = player.isHost
            const isJoining = !!recentJoins[player.id]

            // Dot appearance
            let dotBg, dotShadow, dotAnim
            if (isHst) {
              dotBg = '#c8973a'
              dotShadow = '0 0 8px rgba(200,151,58,0.5)'
            } else if (isMe) {
              dotBg = '#e8e0d0'
              dotShadow = '0 0 8px rgba(232,224,208,0.4)'
            } else if (isJoining) {
              dotBg = '#5a9a72'
              dotShadow = 'none'
              dotAnim = 'throb 1.5s ease-in-out infinite'
            } else {
              dotBg = '#5a9a72'
              dotShadow = '0 0 6px rgba(90,154,114,0.4)'
            }

            // Name colour
            let nameColor = '#e8e0d0'
            if (isHst) nameColor = '#c8973a'
            else if (isMe) nameColor = '#f0ebe0'

            return (
              <div
                key={player.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  animation: isJoining ? 'fadeSlideIn 0.3s ease' : 'none',
                }}
              >
                {/* Status dot */}
                <div style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: dotBg,
                  boxShadow: dotShadow,
                  animation: dotAnim,
                }} />

                {/* Name + tags */}
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  flex: 1,
                }}>
                  <span style={{
                    fontFamily: "'Instrument Serif', serif",
                    fontStyle: 'italic',
                    fontSize: 26,
                    color: nameColor,
                    letterSpacing: '-0.01em',
                  }}>
                    {player.name}
                  </span>

                  {/* Tags group — tighter gap between Host · You */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    {/* Host tag */}
                    {isHst && (
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: '#c8973a',
                        opacity: 0.65,
                      }}>
                        Host
                      </span>
                    )}

                    {/* separator dot between Host and You */}
                    {isHst && isMe && (
                      <span style={{
                        fontSize: 9,
                        color: '#e8e0d0',
                        opacity: 0.7,
                        fontWeight: 700,
                        letterSpacing: 0,
                      }}>
                        ·
                      </span>
                    )}

                    {/* You tag */}
                    {isMe && (
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: '#e8e0d0',
                        opacity: 0.5,
                      }}>
                        You
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Empty slot rows */}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div key={`empty-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                flexShrink: 0,
                background: '#1e1c18',
              }} />
              {/* #2 — brightened empty slot text */}
              <span style={{
                fontFamily: "'Instrument Sans', sans-serif",
                fontSize: 13,
                color: '#3a3530',
                fontWeight: 400,
              }}>
                Waiting for player…
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div style={{ padding: '24px 32px 44px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Status line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <div style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            flexShrink: 0,
            background: isReady ? '#5a9a72' : '#c8973a',
            animation: 'throb 1.4s ease-in-out infinite',
          }} />
          <span style={{ color: '#5a5450' }}>
            {isReady
              ? <>Ready to play <span style={{ fontWeight: 700, opacity: 0.8 }}>·</span> Waiting for {isHost ? 'you' : hostName} to start</>
              : `Need ${needMore} more to start`}
          </span>
        </div>

        {/* #5 — button row: flex:1 secondary, flex:2 primary */}
        <div style={{ display: 'flex', gap: 10 }}>
          {isHost ? (
            <>
              <button
                onClick={handleInvite}
                style={{
                  flex: 1,
                  padding: '17px 22px',
                  borderRadius: 14,
                  border: 'none',
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)',
                  color: copiedToast ? '#5a9a72' : '#e8e0d0',
                  fontSize: 15,
                  fontWeight: 500,
                  fontFamily: "'Instrument Sans', sans-serif",
                  transition: 'color 0.2s',
                }}
              >
                {copiedToast ? 'Copied!' : 'Invite'}
              </button>

              {/* #7 — fontWeight 500 (was 700) */}
              <button
                onClick={handleStart}
                disabled={!canStart}
                style={{
                  flex: 2,
                  minHeight: 54,
                  padding: '17px 22px',
                  borderRadius: 14,
                  border: 'none',
                  cursor: canStart ? 'pointer' : 'not-allowed',
                  background: canStart
                    ? 'linear-gradient(135deg, #d4a042, #b8872a)'
                    : 'rgba(200,151,58,0.08)',
                  color: canStart ? '#0f0d0b' : 'rgba(200,151,58,0.3)',
                  fontSize: 15,
                  fontWeight: 500,
                  fontFamily: "'Instrument Sans', sans-serif",
                }}
              >
                Start game
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleLeave}
                style={{
                  flex: 1,
                  padding: '17px 22px',
                  borderRadius: 14,
                  border: 'none',
                  cursor: 'pointer',
                  background: 'rgba(180,60,50,0.08)',
                  color: '#8a4a44',
                  fontSize: 15,
                  fontWeight: 500,
                  fontFamily: "'Instrument Sans', sans-serif",
                }}
              >
                Leave
              </button>

              <button
                onClick={handleInvite}
                style={{
                  flex: 2,
                  padding: '17px 22px',
                  borderRadius: 14,
                  border: 'none',
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)',
                  color: copiedToast ? '#5a9a72' : '#e8e0d0',
                  fontSize: 15,
                  fontWeight: 500,
                  fontFamily: "'Instrument Sans', sans-serif",
                  transition: 'color 0.2s',
                }}
              >
                {copiedToast ? 'Copied!' : 'Invite'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
