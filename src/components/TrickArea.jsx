import Card from './Card'

function getGridLayout(playerCount) {
  // Returns rows of array indices into the activePlayers array
  const layouts = {
    3: [[0, 1, 2]],
    4: [[0, 1, 2, 3]],
    5: [[0, 1, 2], [3, 4]],
    6: [[0, 1, 2], [3, 4, 5]],
    7: [[0, 1, 2, 3], [4, 5, 6]],
    8: [[0, 1, 2, 3], [4, 5, 6, 7]],
  }
  return layouts[playerCount] || [[...Array(playerCount).keys()]]
}

export default function TrickArea({ players, trick, trickLedSuit, toast, animPhase, lastPlayedId, lastPlayedIsTochoo, pickupPlayerId, myPlayerId }) {
  // During show/exit keep any player whose card is in the current trick (handles the
  // just-escaped player whose last card still needs to animate out).
  // All other phases show only players still in the game.
  const trickPlayerIds = new Set(trick.map(tc => tc.playerId))
  const showEscapedInGrid = animPhase === 'show' || animPhase === 'exit'
  const activePlayers = [...players]
    .filter(p => p.isActive && (!p.hasEscaped || (showEscapedInGrid && trickPlayerIds.has(p.id))))
    .sort((a, b) => a.seatOrder - b.seatOrder)

  const playerCount = activePlayers.length
  // getGridLayout returns rows of array indices into activePlayers (not seat orders),
  // so the grid always packs tightly regardless of which seat orders remain.
  const rows = getGridLayout(playerCount)

  const isExiting = animPhase === 'exit'
  const isIncoming = animPhase === 'incoming'
  const isDone = animPhase === 'done'
  const hideBadges = isExiting || isIncoming || isDone

  // During incoming/done phases, treat trick as empty so all slots show face-down
  const effectiveTrick = (isIncoming || isDone) ? [] : trick
  const effectiveSuit = (isIncoming || isDone) ? null : trickLedSuit

  // Detect tochoo during show phase (for shake + dramatic animation)
  const isShowTochoo = animPhase === 'show' && !!lastPlayedId && lastPlayedIsTochoo

  // Find current highest of led suit (for "High" badge)
  let highestLedCard = null
  if (effectiveSuit) {
    const ledCards = effectiveTrick.filter(tc => tc.card.suit === effectiveSuit)
    if (ledCards.length > 0) {
      highestLedCard = ledCards.reduce((best, tc) =>
        tc.card.value > best.card.value ? tc : best, ledCards[0]
      )
    }
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      padding: '12px 8px',
      overflow: 'hidden',
      animation: isShowTochoo ? 'screenShake 0.45s ease-out 0.18s' : undefined,
    }}>
      {/* Felt background */}
      <div style={{
        width: '100%',
        flex: 1,
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.02)',
        background: 'rgba(255,255,255,0.01)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        position: 'relative',
        padding: 12,
        overflow: 'hidden',
      }}>
        {/* Toast */}
        {toast && toast.message && (
          <div style={{
            position: 'absolute',
            top: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            background: 'rgba(12,10,8,0.93)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 100,
            padding: '7px 16px',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--muted)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
            dangerouslySetInnerHTML={{ __html: toast.message }}
          />
        )}

        {/* Grid rows */}
        {rows.map((rowIndices, rowIdx) => (
          <div key={rowIdx} style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}>
            {rowIndices.map(playerIdx => {
              const player = activePlayers[playerIdx]
              if (!player) return null

              const trickEntry = effectiveTrick.find(tc => tc.playerId === player.id)
              const hasPlayed = !!trickEntry
              const isTochoo = hasPlayed && effectiveSuit && trickEntry.card.suit !== effectiveSuit
              const isHigh = hasPlayed && highestLedCard && trickEntry.playerId === highestLedCard.playerId && !isTochoo

              // Build card element based on animation phase
              let cardElement
              if (isIncoming) {
                // Face-down cards slide in from right; rightmost player arrives first
                const reverseIdx = activePlayers.length - 1 - playerIdx
                cardElement = (
                  <div style={{
                    animation: 'cardEnter 0.45s ease-out forwards',
                    animationDelay: `${reverseIdx * 30}ms`,
                    animationFillMode: 'backwards',
                  }}>
                    <Card faceDown={true} size="hand" />
                  </div>
                )
              } else if (isDone) {
                // Cards settled in place
                cardElement = <Card faceDown={true} size="hand" />
              } else if (hasPlayed) {
                // Flip only for the card just played: during idle (live play) or
                // during show phase only for the last played card
                const isLastPlayed = player.id === lastPlayedId
                const shouldFlip = animPhase === 'idle' || (animPhase === 'show' && isLastPlayed)
                const isTochooPlay = (animPhase === 'show' && isLastPlayed && lastPlayedIsTochoo) || (animPhase === 'idle' && isTochoo)
                const flipAnim = isTochooPlay
                  ? 'cardTochoo 0.55s ease-out, tochooGlow 0.85s ease-out'
                  : shouldFlip ? 'cardFlip 0.52s ease-out' : undefined
                // Tochoo exit: cards fly toward recipient (down for them, up for others)
                // Normal exit: cards slide off to the right
                let exitStyle
                if (isExiting) {
                  if (lastPlayedIsTochoo && pickupPlayerId) {
                    // Tochoo with a real pickup: cards fly toward the recipient
                    const iAmRecipient = myPlayerId === pickupPlayerId
                    exitStyle = {
                      animation: `${iAmRecipient ? 'cardFlyDown' : 'cardFlyUp'} 0.55s ease-in forwards`,
                      animationDelay: `${playerIdx * 30}ms`,
                    }
                  } else {
                    // Normal discard OR first-trick forgiven tochoo: slide right
                    exitStyle = {
                      animation: 'cardExit 0.45s ease-in forwards',
                      animationDelay: `${playerIdx * 45}ms`,
                    }
                  }
                }

                cardElement = (
                  <div style={exitStyle ?? (flipAnim ? { animation: flipAnim, borderRadius: 10 } : undefined)}>
                    <Card
                      suit={trickEntry.card.suit}
                      value={trickEntry.card.value}
                      size="hand"
                      playable={true}
                    />
                  </div>
                )
              } else {
                cardElement = <Card faceDown={true} size="hand" />
              }

              return (
                <div key={player.id} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  {/* Player name — always stays in place */}
                  <div style={{
                    fontSize: 8,
                    fontWeight: 600,
                    letterSpacing: '0.07em',
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    maxWidth: 54,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: 5,
                  }}>
                    {player.name}
                  </div>

                  {/* Card slot */}
                  {cardElement}

                  {/* Status pip — hidden during all animation phases */}
                  <div style={{ height: 18, display: 'flex', alignItems: 'center', marginTop: 3 }}>
                    {!hideBadges && isHigh && (
                      <span style={{
                        fontSize: 9,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 100,
                        background: 'rgba(200,151,58,0.15)',
                        color: 'var(--gold)',
                        letterSpacing: '0.03em',
                      }}>High</span>
                    )}
                    {!hideBadges && isTochoo && (
                      <span style={{
                        fontSize: 9,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 100,
                        background: 'rgba(176,48,42,0.15)',
                        color: 'var(--red-suit)',
                        letterSpacing: '0.03em',
                      }}>No {effectiveSuit.charAt(0).toUpperCase() + effectiveSuit.slice(1)}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
