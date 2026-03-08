import { useEffect, useState } from 'react'

export default function Toast({ message, visible }) {
  const [animOut, setAnimOut] = useState(false)

  useEffect(() => {
    if (!visible) {
      setAnimOut(true)
    } else {
      setAnimOut(false)
    }
  }, [visible])

  if (!message) return null

  return (
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
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s ease',
      pointerEvents: 'none',
    }}
      dangerouslySetInnerHTML={{ __html: message }}
    />
  )
}
