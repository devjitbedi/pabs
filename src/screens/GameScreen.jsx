import { useEffect, useRef, useState } from 'react'
import PlayerHUD from '../components/PlayerHUD'
import TrickArea from '../components/TrickArea'
import TurnBanner from '../components/TurnBanner'
import HandArea from '../components/HandArea'

function buildToastMessage(prevState, nextState, myPlayerId) {
  if (!prevState || !nextState) return null
  if (prevState.trick === nextState.trick) return null

  // A trick just resolved (trick went from non-empty to empty)
  if (prevState.trick.length > 0 && nextState.trick.length === 0) {
    // Game over — bhaabi announcement takes priority over all other messages
    if (nextState.status === 'finished' && nextState.bhaabi) {
      const bhaabi = nextState.players.find(p => p.id === nextState.bhaabi)
      if (bhaabi) {
        const isMe = bhaabi.id === myPlayerId
        const label = isMe ? 'You' : bhaabi.name
        const verb = isMe ? 'are' : 'is'
        return `<span style="color:var(--red-alert);font-weight:700">${label}</span> ${verb} the Bhaabi!`
      }
    }

    // Check if someone picked up
    const pickedUp = nextState.players.find(p => {
      const prevPlayer = prevState.players.find(pp => pp.id === p.id)
      return prevPlayer && p.hand.length > prevPlayer.hand.length + 1
    })

    // Check who escaped
    const newEscapee = nextState.players.find(p => {
      const prevPlayer = prevState.players.find(pp => pp.id === p.id)
      return prevPlayer && !prevPlayer.hasEscaped && p.hasEscaped
    })

    if (newEscapee) {
      return `<span style="color:var(--green);font-weight:700">${newEscapee.name}</span> escaped!`
    }

    if (pickedUp) {
      const cardCount = nextState.lastResolvedTrick?.length ?? prevState.trick.length
      return `<span style="color:var(--red-alert);font-weight:700">${pickedUp.name}</span> picks up ${cardCount} card${cardCount !== 1 ? 's' : ''}`
    }

    // Discard: show how many cards discarded and who was highest
    const winner = nextState.players.find(p => p.id === nextState.currentTurn)
    if (winner) {
      const cardCount = nextState.lastResolvedTrick?.length ?? prevState.trick.length
      const suit = prevState.trickLedSuit
      const suitLabel = suit ? suit.charAt(0).toUpperCase() + suit.slice(1) : 'Cards'
      const suitSingular = suit ? suit.slice(0, -1) : 'card'
      return `${cardCount} ${suitSingular}${cardCount !== 1 ? 's' : ''} discarded — <span style="color:var(--gold);font-weight:700">${winner.name}</span> was highest`
    }
  }

  return null
}

const menuItemBase = {
  display: 'block',
  width: '100%',
  padding: '12px 16px',
  background: 'none',
  border: 'none',
  fontSize: 13,
  textAlign: 'left',
  cursor: 'pointer',
  letterSpacing: '0.02em',
}

export default function GameScreen({ state, dispatch, myPlayerId }) {
  const [toast, setToast] = useState(null)
  const [turnDelayed, setTurnDelayed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [frozenTrick, setFrozenTrick] = useState(null)
  const [frozenTrickSuit, setFrozenTrickSuit] = useState(null)
  const [frozenLastPlayedId, setFrozenLastPlayedId] = useState(null)
  const [frozenLastPlayedIsTochoo, setFrozenLastPlayedIsTochoo] = useState(false)
  const [frozenPickupPlayerId, setFrozenPickupPlayerId] = useState(null)
  const [frozenPlayerHandSizes, setFrozenPlayerHandSizes] = useState(null)
  // Keys ("suit-value") of cards just received via tochoo — animate sliding down into the hand
  const [newCardKeys, setNewCardKeys] = useState(null)
  // 'idle' | 'show' | 'exit' | 'incoming' | 'done'
  const [animPhase, setAnimPhase] = useState('idle')
  const prevStateRef = useRef(null)
  const animTimersRef = useRef([])

  const amIHost = state?.players?.find(p => p.isHost)?.id === myPlayerId

  // Unified effect: detect trick resolution, phase the animation, delay toast
  useEffect(() => {
    if (!state) return
    const prev = prevStateRef.current
    const trickResolved = prev && prev.trick.length > 0 && state.trick.length === 0

    prevStateRef.current = state

    if (trickResolved) {
      // Clear any previous timers and stale slide state
      animTimersRef.current.forEach(clearTimeout)
      animTimersRef.current = []
      setNewCardKeys(null)

      const resolvedTrick = state.lastResolvedTrick || prev.trick
      setFrozenTrick(resolvedTrick)
      setFrozenTrickSuit(state.lastResolvedTrickSuit || prev.trickLedSuit)
      // Identify the last card played (the one not in prev.trick)
      const prevPlayerIds = new Set(prev.trick.map(tc => tc.playerId))
      const lastEntry = resolvedTrick.find(tc => !prevPlayerIds.has(tc.playerId))
      setFrozenLastPlayedId(lastEntry?.playerId ?? null)
      const resolvedSuit = state.lastResolvedTrickSuit || prev.trickLedSuit
      const isTochoo = !!(lastEntry && resolvedSuit && lastEntry.card.suit !== resolvedSuit)
      setFrozenLastPlayedIsTochoo(isTochoo)
      if (isTochoo) {
        setFrozenPickupPlayerId(state.lastResolvedPickupPlayerId ?? null)
        const sizeMap = {}
        prev.players.forEach(p => { sizeMap[p.id] = p.hand.length })
        setFrozenPlayerHandSizes(sizeMap)
      }
      setTurnDelayed(true)
      setAnimPhase('show')

      const isGameOver = state.status === 'finished'
      const msg = buildToastMessage(prev, state, myPlayerId)

      // Compute which card keys are newly received by me after a tochoo pickup.
      // These will slide down into the hand at 2400ms.
      let incomingCardKeys = null
      if (isTochoo && state.lastResolvedPickupPlayerId === myPlayerId) {
        const prevHand = prev.players.find(p => p.id === myPlayerId)?.hand ?? []
        const prevHandKeys = new Set(prevHand.map(c => `${c.suit}-${c.value}`))
        const newKeys = (state.players.find(p => p.id === myPlayerId)?.hand ?? [])
          .filter(c => !prevHandKeys.has(`${c.suit}-${c.value}`))
          .map(c => `${c.suit}-${c.value}`)
        if (newKeys.length > 0) incomingCardKeys = newKeys
      }

      // Phase 2: slide cards out at 1800ms
      animTimersRef.current.push(setTimeout(() => setAnimPhase('exit'), 1800))

      if (isGameOver) {
        // Game over: skip the incoming-cards phase (no next round).
        // Clear frozen state and show the bhaabi toast at 2400ms.
        // Don't schedule a cleanup — GameRoute navigation will unmount this.
        animTimersRef.current.push(setTimeout(() => {
          setAnimPhase('idle')
          setFrozenTrick(null)
          setFrozenTrickSuit(null)
          setFrozenLastPlayedId(null)
          setFrozenLastPlayedIsTochoo(false)
          setFrozenPickupPlayerId(null)
          setFrozenPlayerHandSizes(null)
          setNewCardKeys(null)
          if (msg) setToast({ message: msg, id: Date.now() })
        }, 2400))
      } else {
        // Phase 3: unfreeze hand counts at 2400ms; new cards slide down into the hand
        animTimersRef.current.push(setTimeout(() => {
          setAnimPhase('incoming')
          setFrozenPlayerHandSizes(null)
          if (incomingCardKeys) setNewCardKeys(new Set(incomingCardKeys))
        }, 2400))

        // Phase 4: cards settled, show toast at 3000ms
        animTimersRef.current.push(setTimeout(() => {
          setAnimPhase('done')
          if (msg) setToast({ message: msg, id: Date.now() })
        }, 3000))

        // Phase 5: end delay, clear everything at 5000ms (toast shows for 2000ms)
        animTimersRef.current.push(setTimeout(() => {
          setTurnDelayed(false)
          setFrozenTrick(null)
          setFrozenTrickSuit(null)
          setFrozenLastPlayedId(null)
          setFrozenLastPlayedIsTochoo(false)
          setFrozenPickupPlayerId(null)
          setAnimPhase('idle')
          setNewCardKeys(null)
          setToast(null)
        }, 5000))
      }
    }
  }, [state])

  // Clear timers on unmount
  useEffect(() => {
    return () => animTimersRef.current.forEach(clearTimeout)
  }, [])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = () => setMenuOpen(false)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [menuOpen])

  const isGameVisible =
    state && (state.status === 'active' || state.status === 'paused' || state.status === 'ending' || state.status === 'finished')

  if (!isGameVisible) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--muted)',
      }}>
        Loading game…
      </div>
    )
  }

  const isPaused = state.status === 'paused'
  const isEnding = state.status === 'ending'

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--ink)',
      position: 'relative',
    }}>

      {/* ── Host controls: ⋯ circle button ─────────────────────────────── */}
      {amIHost && (
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 100 }}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(prev => !prev) }}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: menuOpen ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--muted)',
              fontSize: 20,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              padding: 0,
              letterSpacing: '-1px',
            }}
          >
            ⋯
          </button>

          {menuOpen && (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: 44,
                right: 0,
                background: '#1e1b17',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                overflow: 'hidden',
                minWidth: 164,
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              }}
            >
              {isPaused ? (
                <button
                  onClick={() => { dispatch({ type: 'RESUME_GAME' }); setMenuOpen(false) }}
                  style={{ ...menuItemBase, color: 'var(--gold)' }}
                >
                  Resume Game
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (!isEnding) { dispatch({ type: 'PAUSE_GAME' }); setMenuOpen(false) }
                  }}
                  style={{
                    ...menuItemBase,
                    color: isEnding ? 'var(--dim)' : 'var(--cream)',
                    cursor: isEnding ? 'default' : 'pointer',
                  }}
                >
                  Pause Game
                </button>
              )}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
              <button
                onClick={() => {
                  if (!isEnding) { dispatch({ type: 'END_GAME' }); setMenuOpen(false) }
                }}
                style={{
                  ...menuItemBase,
                  color: isEnding ? 'var(--dim)' : 'var(--red-alert)',
                  cursor: isEnding ? 'default' : 'pointer',
                }}
              >
                End Game
              </button>
            </div>
          )}
        </div>
      )}

      {/* Zone 1: Player HUD */}
      <PlayerHUD
        players={state.players}
        currentTurn={state.currentTurn}
        myPlayerId={myPlayerId}
        frozenHandSizes={frozenPlayerHandSizes}
      />

      {/* Zone 2: Trick Area */}
      <TrickArea
        players={state.players}
        trick={frozenTrick ?? state.trick}
        trickLedSuit={frozenTrickSuit ?? state.trickLedSuit}
        toast={toast}
        animPhase={animPhase}
        lastPlayedId={frozenLastPlayedId}
        lastPlayedIsTochoo={frozenLastPlayedIsTochoo}
        pickupPlayerId={frozenPickupPlayerId}
        myPlayerId={myPlayerId}
      />

      {/* Zone 3: Turn Banner */}
      <TurnBanner
        state={state}
        myPlayerId={myPlayerId}
        dispatch={dispatch}
        turnDelayed={turnDelayed}
      />

      {/* Zone 4: Hand Area */}
      <HandArea
        state={state}
        myPlayerId={myPlayerId}
        dispatch={dispatch}
        turnDelayed={turnDelayed}
        newCardKeys={newCardKeys}
      />
    </div>
  )
}
