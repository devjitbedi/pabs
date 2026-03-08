import { getValueLabel } from '../engine/gameLogic'

const SUIT_COLORS = {
  hearts: '#b0302a',
  diamonds: '#b0302a',
  spades: '#1c1916',
  clubs: '#1c1916',
}

function SuitIcon({ suit, size = 19 }) {
  const color = SUIT_COLORS[suit]
  const icons = {
    spades: (
      <svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
        <path d="M232,136a56,56,0,0,1-83.4,48.82l11.06,36.88A8,8,0,0,1,152,232H104a8,8,0,0,1-7.66-10.3l11.06-36.88A56,56,0,0,1,24,136c0-32,17.65-62.84,51-89.27a234.14,234.14,0,0,1,49.89-30.11,7.93,7.93,0,0,1,6.16,0A234.14,234.14,0,0,1,181,46.73C214.35,73.16,232,104,232,136Z"/>
      </svg>
    ),
    hearts: (
      <svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
        <path d="M240,102c0,70-103.79,126.66-108.21,129a8,8,0,0,1-7.58,0C119.79,228.66,16,172,16,102A62.07,62.07,0,0,1,78,40c20.65,0,38.73,8.88,50,23.89C139.27,48.88,157.35,40,178,40A62.07,62.07,0,0,1,240,102Z"/>
      </svg>
    ),
    diamonds: (
      <svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
        <path d="M240,128a15.85,15.85,0,0,1-4.67,11.28l-96.05,96.06a16,16,0,0,1-22.56,0h0l-96-96.06a16,16,0,0,1,0-22.56l96.05-96.06a16,16,0,0,1,22.56,0l96.05,96.06A15.85,15.85,0,0,1,240,128Z"/>
      </svg>
    ),
    clubs: (
      <svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
        <path d="M240,144a56,56,0,0,1-84.81,48h-4.44l8.91,29.7A8,8,0,0,1,152,232H104a8,8,0,0,1-7.66-10.3l8.91-29.7h-4.44A56,56,0,1,1,72,88c.78,0,1.55,0,2.33,0a56,56,0,1,1,107.34,0c.77,0,1.55,0,2.33,0A56.06,56.06,0,0,1,240,144Z"/>
      </svg>
    ),
  }
  return icons[suit] || null
}

export default function Card({ suit, value, faceDown = false, playable = true, lifted = false, size = 'hand', onClick }) {
  const w = size === 'hand' ? 56 : 54
  const h = size === 'hand' ? 79 : 76
  const color = SUIT_COLORS[suit]

  const containerStyle = {
    position: 'relative',
    width: w,
    height: h,
    borderRadius: 10,
    flexShrink: 0,
    cursor: playable && !faceDown ? 'pointer' : 'default',
    transform: lifted ? 'translateY(-16px)' : (!playable ? 'translateY(5px)' : 'translateY(0)'),
    zIndex: lifted ? 20 : undefined,
    transition: 'transform 0.15s ease',
    boxShadow: lifted
      ? '0 16px 32px rgba(0,0,0,0.65), -4px 0 8px rgba(0,0,0,0.28)'
      : '0 2px 8px rgba(0,0,0,0.38), 0 1px 2px rgba(0,0,0,0.18)',
  }

  if (faceDown) {
    return (
      <div style={{
        ...containerStyle,
        background: '#161410',
        border: '0.5px solid rgba(255,255,255,0.07)',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          inset: 5,
          borderRadius: 6,
          background: 'repeating-linear-gradient(-45deg, transparent 0, transparent 3px, rgba(200,151,58,0.07) 3px, rgba(200,151,58,0.07) 4px)',
        }} />
      </div>
    )
  }

  return (
    <div style={containerStyle} onClick={playable ? onClick : undefined}>
      {/* Card face */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 10,
        background: '#f6f2eb',
        border: '0.5px solid rgba(0,0,0,0.09)',
      }} />

      {/* Value top-left */}
      <span style={{
        position: 'absolute',
        top: 7,
        left: 8,
        fontFamily: "'Instrument Sans', sans-serif",
        fontWeight: 400,
        fontSize: 20,
        lineHeight: 1,
        letterSpacing: '-0.04em',
        color,
        zIndex: 1,
      }}>
        {getValueLabel(value)}
      </span>

      {/* Suit bottom-left */}
      <div style={{ position: 'absolute', bottom: 7, left: 8, zIndex: 1 }}>
        <SuitIcon suit={suit} size={19} />
      </div>

      {/* Dim overlay for non-playable cards */}
      {!playable && (
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 10,
          background: 'rgba(10,8,6,0.72)',
          backdropFilter: 'saturate(0.1) brightness(0.6)',
          zIndex: 2,
        }} />
      )}
    </div>
  )
}
