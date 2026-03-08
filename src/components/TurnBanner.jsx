import { useTurnTimer } from '../hooks/useTurnTimer'
import { getHighestPlayableCard } from '../engine/gameLogic'

function TimerBar({ progress, urgent, frozen }) {
  const color = frozen
    ? 'linear-gradient(90deg, var(--gold-light), var(--gold))'
    : urgent
      ? 'linear-gradient(90deg, #e07060, var(--red-alert))'
      : 'linear-gradient(90deg, var(--gold-light), var(--gold))'

  return (
    <div style={{
      width: '100%',
      height: 2,
      background: 'rgba(255,255,255,0.05)',
      borderRadius: 1,
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${progress * 100}%`,
        height: '100%',
        background: color,
        transition: frozen ? 'none' : 'width 1s linear',
        animation: urgent && !frozen ? 'pulse 0.5s ease-in-out infinite' : 'none',
      }} />
    </div>
  )
}

export default function TurnBanner({ state, myPlayerId, dispatch, turnDelayed }) {
  const { currentTurn, players, trick, trickLedSuit, isFirstTrick, status } = state
  const isMyTurn = currentTurn === myPlayerId
  const currentPlayer = players.find(p => p.id === currentTurn)
  const myPlayer = players.find(p => p.id === myPlayerId)
  const amIHost = players.find(p => p.isHost)?.id === myPlayerId

  const hasThePower = trick.length === 0

  const autoPlay = () => {
    if (!myPlayer) return
    // Waste draw pending: auto-commit when timer expires
    if (state.wasteDrawPending === myPlayerId) {
      dispatch({ type: 'COMMIT_WASTE_DRAW', playerId: myPlayerId })
      return
    }
    const card = getHighestPlayableCard(
      myPlayer.hand,
      trickLedSuit,
      trick,
      isFirstTrick,
      hasThePower
    )
    if (card) {
      dispatch({ type: 'PLAY_CARD', playerId: myPlayerId, card: { suit: card.suit, value: card.value } })
    }
  }

  // Turn timer: all players derive timeLeft from the same wall-clock timestamp stored
  // in state, so reloading a tab always shows the correct remaining time.
  // null during animation delays or non-active states so the bar stays full.
  const timerStartedAt = (status === 'active' && !turnDelayed) ? (state.turnStartedAt ?? null) : null
  const { timeLeft, progress } = useTurnTimer({
    turnStartedAt: timerStartedAt,
    durationSeconds: 30,
    onExpire: isMyTurn ? autoPlay : undefined,
  })

  // Ending countdown: same wall-clock approach for consistency
  const { timeLeft: endTimeLeft, progress: endProgress } = useTurnTimer({
    turnStartedAt: state.endingStartedAt ?? null,
    durationSeconds: 10,
    onExpire: amIHost ? () => dispatch({ type: 'RESET_GAME' }) : undefined,
  })

  // ── FINISHED ─────────────────────────────────────────────────────────────────
  if (status === 'finished') {
    return (
      <div style={{ padding: '8px 16px 0', textAlign: 'center' }}>
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4,
        }}>
          GAME OVER
        </div>
        <div style={{
          fontFamily: "'Instrument Serif', serif", fontStyle: 'italic',
          fontSize: 26, color: 'var(--cream)', lineHeight: 1.2, marginBottom: 8,
        }}>
          Heading to results…
        </div>
        <TimerBar progress={1} frozen />
      </div>
    )
  }

  // ── PAUSED ──────────────────────────────────────────────────────────────────
  if (status === 'paused') {
    return (
      <div style={{ padding: '8px 16px 0', textAlign: 'center' }}>
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4,
        }}>
          GAME PAUSED
        </div>
        <div style={{
          fontFamily: "'Instrument Serif', serif", fontStyle: 'italic',
          fontSize: 26, color: 'var(--cream)', lineHeight: 1.2, marginBottom: 8,
        }}>
          {amIHost ? 'Waiting for you to resume' : 'Waiting for host to resume'}
        </div>
        <TimerBar progress={1} frozen />
      </div>
    )
  }

  // ── ENDING ───────────────────────────────────────────────────────────────────
  if (status === 'ending') {
    const urgent = endTimeLeft <= 3
    return (
      <div style={{ padding: '8px 16px 0', textAlign: 'center' }}>
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: 'var(--red-alert)', marginBottom: 4,
        }}>
          HOST IS ENDING THE GAME
        </div>
        <div style={{
          fontFamily: "'Instrument Serif', serif", fontStyle: 'italic',
          fontSize: 26, color: 'var(--cream)', lineHeight: 1.2, marginBottom: 8,
        }}>
          Returning to lobby in {endTimeLeft}s…
        </div>
        <TimerBar progress={endProgress} urgent={urgent} />
      </div>
    )
  }

  // ── ESCAPED ──────────────────────────────────────────────────────────────────
  if (myPlayer?.hasEscaped) {
    return (
      <div style={{ padding: '8px 16px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 4 }}>
          You've escaped
        </div>
        <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 26, color: 'var(--cream)', lineHeight: 1.2, marginBottom: 8 }}>
          Sit back &amp; relax
        </div>
        <TimerBar progress={1} frozen />
      </div>
    )
  }

  // ── DELAYED (post-trick animation) ───────────────────────────────────────────
  if (turnDelayed) {
    return (
      <div style={{ padding: '8px 16px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 4 }}>
          End of round
        </div>
        <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 26, color: 'var(--muted)', lineHeight: 1.2, marginBottom: 8 }}>
          Waiting…
        </div>
        <TimerBar progress={1} frozen />
      </div>
    )
  }

  // ── ACTIVE ───────────────────────────────────────────────────────────────────
  const suitLabel = trickLedSuit
    ? trickLedSuit.charAt(0).toUpperCase() + trickLedSuit.slice(1)
    : null

  // Singular form of suit name (spades → spade, hearts → heart, etc.)
  const suitSingular = trickLedSuit ? trickLedSuit.slice(0, -1) : null

  // Check if it's a tochoo situation (your turn, trick in progress, you don't have the led suit)
  const myHand = myPlayer?.hand || []
  const hasSuit = trickLedSuit ? myHand.some(c => c.suit === trickLedSuit) : false
  const isTochooSituation = isMyTurn && !hasThePower && trickLedSuit && !hasSuit && trick.length > 0

  // Find who currently holds the highest card of the led suit
  const getHighestSuitPlayer = () => {
    if (!trickLedSuit || !trick.length) return null
    const suitCards = trick.filter(tc => tc.card.suit === trickLedSuit)
    if (!suitCards.length) return null
    const highest = suitCards.reduce((best, tc) => tc.card.value > best.card.value ? tc : best, suitCards[0])
    return players.find(p => p.id === highest.playerId)
  }

  let topLine = ''
  let bottomLine = ''

  if (isMyTurn) {
    if (state.wasteDrawPending === myPlayerId) {
      topLine = 'YOUR TURN'
      bottomLine = 'Choose a discarded card'
    } else {
      topLine = hasThePower
        ? 'YOUR TURN'
        : `YOUR TURN · ${suitLabel ? suitLabel.toUpperCase() + ' LED' : ''}`
      if (hasThePower) {
        bottomLine = 'Choose any suit'
      } else if (isTochooSituation) {
        const highestPlayer = getHighestSuitPlayer()
        bottomLine = `Give any card to ${highestPlayer?.name || 'the leader'}`
      } else {
        bottomLine = `Play a ${suitSingular}`
      }
    }
  } else {
    const name = currentPlayer ? currentPlayer.name : '…'
    topLine = trickLedSuit
      ? `${name.toUpperCase()}'S TURN · ${suitLabel.toUpperCase()} LED`
      : `${name.toUpperCase()}'S TURN`
    bottomLine = 'Waiting…'
  }

  // When timerStartedAt is null, progress is already 1 (full bar)
  const displayProgress = progress
  const isUrgent = timerStartedAt !== null && timeLeft <= 5

  return (
    <div style={{ padding: '8px 16px 0', textAlign: 'center' }}>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: isMyTurn ? 'var(--gold)' : 'var(--dim)',
        marginBottom: 4,
      }}>
        {topLine}
      </div>
      <div style={{
        fontFamily: "'Instrument Serif', serif", fontStyle: 'italic',
        fontSize: 26, color: 'var(--cream)', lineHeight: 1.2, marginBottom: 8,
      }}>
        {bottomLine}
      </div>
      <TimerBar progress={displayProgress} urgent={isUrgent} frozen={turnDelayed} />
    </div>
  )
}
