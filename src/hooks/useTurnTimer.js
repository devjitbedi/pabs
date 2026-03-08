import { useEffect, useRef, useState } from 'react'

// turnStartedAt: Unix timestamp (ms) of when this turn/phase began, or null if inactive.
// Deriving timeLeft from a shared wall-clock timestamp ensures all players — including
// anyone who reloads mid-turn — stay perfectly in sync.
// When null, the timer shows a full bar and onExpire never fires.
export function useTurnTimer({ turnStartedAt, durationSeconds = 30, onExpire }) {
  const getRemaining = () => {
    if (!turnStartedAt) return durationSeconds
    // Clamp at 0 so a future timestamp (trick-resolution offset) returns full duration
    const elapsed = Math.max(0, Math.floor((Date.now() - turnStartedAt) / 1000))
    return Math.max(0, durationSeconds - elapsed)
  }

  const [timeLeft, setTimeLeft] = useState(getRemaining)
  const onExpireRef = useRef(onExpire)
  const firedRef = useRef(false)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    firedRef.current = false

    if (!turnStartedAt) {
      setTimeLeft(durationSeconds)
      return
    }

    // Sync immediately so the bar jumps to the correct position right away
    const remaining = getRemaining()
    setTimeLeft(remaining)

    if (remaining <= 0) {
      if (!firedRef.current) {
        firedRef.current = true
        setTimeout(() => onExpireRef.current?.(), 0)
      }
      return
    }

    // Poll every 500ms for smooth accuracy without excessive work
    const interval = setInterval(() => {
      const r = getRemaining()
      setTimeLeft(r)
      if (r <= 0) {
        clearInterval(interval)
        if (!firedRef.current) {
          firedRef.current = true
          setTimeout(() => onExpireRef.current?.(), 0)
        }
      }
    }, 500)

    return () => clearInterval(interval)
  }, [turnStartedAt, durationSeconds]) // eslint-disable-line react-hooks/exhaustive-deps

  const progress = timeLeft / durationSeconds
  return { timeLeft, progress }
}
