import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PartySocket from 'partysocket'
import ResultScreen from './ResultScreen'

export default function ResultRoute() {
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

  // RESET_GAME (and any other actions) are forwarded to the PartyKit server.
  const dispatch = (action) => {
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify(action))
    }
  }

  return <ResultScreen state={state} dispatch={dispatch} myPlayerId={myPlayerId} />
}
