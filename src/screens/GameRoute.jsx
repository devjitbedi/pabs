import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PartySocket from 'partysocket'
import GameScreen from './GameScreen'

export default function GameRoute() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const myPlayerId = sessionStorage.getItem(`pabs-player-${gameId}`)

  const [state, setState] = useState(null)
  const socketRef = useRef(null)

  useEffect(() => {
    const socket = new PartySocket({
      host: import.meta.env.VITE_PARTYKIT_HOST,
      room: gameId,
    })
    socketRef.current = socket

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.type !== 'STATE_UPDATE') return
      setState(msg.state)
      if (msg.state.status === 'waiting') {
        navigate(`/${gameId}`, { replace: true })
      }
    }

    return () => socket.close()
  }, [gameId, navigate])

  // Delay navigation to the results screen so the end-of-game
  // animation and bhaabi toast can finish playing.
  useEffect(() => {
    if (state?.status !== 'finished') return
    const timer = setTimeout(() => {
      navigate(`/${gameId}/result`, { replace: true })
    }, 7000)
    return () => clearTimeout(timer)
  }, [state?.status, gameId, navigate])

  // All actions are forwarded to the PartyKit server.
  // Actions that need a playerId (PLAY_CARD, COMMIT_WASTE_DRAW) already include
  // it when dispatched from HandArea / TurnBanner.
  const dispatch = (action) => {
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify(action))
    }
  }

  return <GameScreen state={state} dispatch={dispatch} myPlayerId={myPlayerId} />
}
