export default function PlayerHUD({ players, currentTurn, myPlayerId, frozenHandSizes }) {
  const sorted = [...players].sort((a, b) => a.seatOrder - b.seatOrder)

  return (
    <div style={{
      display: 'flex',
      overflowX: 'auto',
      justifyContent: 'center',
      gap: 10,
      padding: '12px 16px',
      height: 96,
      alignItems: 'flex-start',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      WebkitOverflowScrolling: 'touch',
    }}>
      {sorted.map(player => {
        const isActive = player.id === currentTurn
        const isMe = player.id === myPlayerId
        // Show frozen count during tochoo animation; real count after
        const displayCount = frozenHandSizes ? (frozenHandSizes[player.id] ?? player.hand.length) : player.hand.length
        return (
          <div key={player.id} style={{
            minWidth: 62,
            maxWidth: 62,
            padding: '6px 5px 8px',
            borderRadius: 10,
            background: isActive ? 'rgba(200,151,58,0.1)' : 'transparent',
            opacity: player.hasEscaped ? 0.28 : 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            flexShrink: 0,
          }}>
            {/* Arrow area */}
            <div style={{ height: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isActive && (
                <span style={{
                  fontSize: 7,
                  color: 'var(--gold)',
                  animation: 'bob 0.8s ease-in-out infinite',
                  display: 'inline-block',
                }}>▼</span>
              )}
            </div>

            {/* Name */}
            <div style={{
              fontSize: 11,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--cream)' : '#6a6560',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%',
              textAlign: 'center',
              marginBottom: 3,
            }}>
              {isMe ? 'You' : player.name}
            </div>

            {/* Card count badge */}
            <div style={{
              fontSize: 10,
              padding: '2px 7px',
              borderRadius: 5,
              background: isActive ? 'rgba(200,151,58,0.15)' : 'rgba(255,255,255,0.05)',
              color: isActive ? 'var(--gold)' : 'var(--muted)',
              textDecoration: player.hasEscaped ? 'line-through' : 'none',
              opacity: player.hasEscaped ? 0.3 : 1,
            }}>
              {displayCount}
            </div>
          </div>
        )
      })}
    </div>
  )
}
