import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ResultScreen from './ResultScreen'

const CHANNEL_NAME = 'pabs-game'

export default function ResultRoute() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const isHost = sessionStorage.getItem(`pabs-host-${gameId}`) === 'true'
  const myPlayerId = sessionStorage.getItem(`pabs-player-${gameId}`)

  const [state, setState] = useState(() => {
    const raw = sessionStorage.getItem(`pabs-init-${gameId}`)
    return raw ? JSON.parse(raw) : null
  })
  const stateRef = useRef(state)
  const channelRef = useRef(null)

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel

    channel.onmessage = (event) => {
      const msg = event.data
      if (msg.gameId !== gameId) return

      if (isHost && msg.type === 'ACTION') {
        if (msg.action.type === 'REQUEST_STATE' && stateRef.current) {
          channel.postMessage({ type: 'STATE_UPDATE', gameId, state: stateRef.current })
        }
      }

      if (msg.type === 'STATE_UPDATE') {
        stateRef.current = msg.state
        setState(msg.state)
        if (msg.state.status === 'waiting') {
          navigate(`/${gameId}`, { replace: true })
        }
      }
    }

    // Broadcast current state so guests can catch up
    if (isHost && stateRef.current) {
      channel.postMessage({ type: 'STATE_UPDATE', gameId, state: stateRef.current })
    } else if (!isHost) {
      setTimeout(() => {
        channel.postMessage({ type: 'ACTION', gameId, action: { type: 'REQUEST_STATE' } })
      }, 200)
    }

    return () => channel.close()
  }, [gameId, isHost, navigate])

  const dispatch = (action) => {
    if (action.type === 'RESET_GAME' && isHost) {
      if (!stateRef.current) return
      const ns = {
        ...stateRef.current,
        status: 'waiting',
        players: stateRef.current.players.map(p => ({
          ...p,
          hand: [],
          hasEscaped: false,
          isActive: true,
        })),
        currentTurn: null,
        trick: [],
        trickLedSuit: null,
        wastePile: [],
        isFirstTrick: true,
        bhaabi: null,
      }
      stateRef.current = ns
      setState(ns)
      sessionStorage.setItem(`pabs-init-${gameId}`, JSON.stringify(ns))
      if (channelRef.current) {
        channelRef.current.postMessage({ type: 'STATE_UPDATE', gameId, state: ns })
      }
      navigate(`/${gameId}`, { replace: true })
    } else if (!isHost && action.type === 'RESET_GAME') {
      // Guest just navigates when host broadcasts waiting state
    }
  }

  return <ResultScreen state={state} dispatch={dispatch} myPlayerId={myPlayerId} />
}
