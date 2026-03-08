import { useEffect, useRef } from 'react'
import Card from './Card'
import { getPlayableCards } from '../engine/gameLogic'

const SUIT_ORDER = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 }

export default function HandArea({ state, myPlayerId, dispatch, turnDelayed, newCardKeys }) {
  const { currentTurn, players, trick, trickLedSuit, isFirstTrick, status } = state
  const myPlayer = players.find(p => p.id === myPlayerId)
  // Only playable when it's your turn, game is active, you haven't escaped, and the post-trick delay has cleared
  const isMyTurn = currentTurn === myPlayerId && status === 'active' && !myPlayer?.hasEscaped && !turnDelayed
  const containerRef = useRef(null)

  if (!myPlayer) return null

  const hasThePower = trick.length === 0
  const annotated = getPlayableCards(
    myPlayer.hand,
    trickLedSuit,
    trick,
    isFirstTrick,
    hasThePower
  )

  // Sort: Spades → Hearts → Clubs → Diamonds, descending value within each suit
  const sorted = [...annotated].sort((a, b) => {
    const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit]
    if (suitDiff !== 0) return suitDiff
    return b.value - a.value
  })

  // Auto-scroll to the first playable card when it becomes your turn
  useEffect(() => {
    if (isMyTurn && containerRef.current) {
      const firstPlayable = containerRef.current.querySelector('[data-playable="true"]')
      if (firstPlayable) {
        const containerLeft = containerRef.current.getBoundingClientRect().left
        const cardLeft = firstPlayable.getBoundingClientRect().left
        const targetScrollLeft = containerRef.current.scrollLeft + (cardLeft - containerLeft) - 20
        containerRef.current.scrollLeft = Math.max(0, targetScrollLeft)
      } else {
        containerRef.current.scrollLeft = 0
      }
    }
  }, [isMyTurn])

  const handleCardClick = (card) => {
    if (!isMyTurn || !card.playable) return
    dispatch({ type: 'PLAY_CARD', playerId: myPlayerId, card: { suit: card.suit, value: card.value } })
  }

  // Waste draw pending: show a single face-down mystery card the player taps to reveal
  if (state.wasteDrawPending === myPlayerId && !turnDelayed) {
    return (
      <div style={{
        padding: '28px 20px 30px',
        paddingBottom: `max(30px, calc(30px + env(safe-area-inset-bottom, 0px)))`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        minHeight: 107,
      }}>
        <div
          onClick={() => dispatch({ type: 'COMMIT_WASTE_DRAW', playerId: myPlayerId })}
          style={{ cursor: 'pointer' }}
        >
          <Card faceDown={true} size="hand" playable={true} />
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        padding: '28px 20px 30px',
        paddingBottom: `max(30px, calc(30px + env(safe-area-inset-bottom, 0px)))`,
        overflowX: 'auto',
        overflowY: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
        minHeight: 107,
      }}
    >
      {/* margin: 0 auto centers when content fits; scrolls from left when it overflows */}
      <div style={{ display: 'flex', alignItems: 'flex-end', margin: '0 auto' }}>
        {sorted.map((card, i) => {
          const isPlayable = isMyTurn && card.playable
          // Playable cards sit in a higher z-index tier so they always render
          // in front of non-playable (dimmed) cards regardless of horizontal position
          const zIndex = isPlayable ? 200 + i : i
          const cardKey = `${card.suit}-${card.value}`
          const isNew = newCardKeys?.has(cardKey) ?? false

          return (
            <div
              key={cardKey}
              data-playable={isPlayable ? 'true' : undefined}
              style={{
                marginLeft: i === 0 ? 0 : -18,
                zIndex,
                position: 'relative',
                boxShadow: '-4px 0 8px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.3)',
                animation: isNew ? 'cardSlideDown 0.45s ease-out forwards' : 'none',
              }}
              onClick={() => handleCardClick(card)}
            >
              <Card
                suit={card.suit}
                value={card.value}
                playable={isPlayable}
                size="hand"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
