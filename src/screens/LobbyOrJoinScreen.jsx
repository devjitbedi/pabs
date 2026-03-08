import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PartySocket from 'partysocket'
import JoinScreen from './JoinScreen'
import LobbyScreen from './LobbyScreen'

export default function LobbyOrJoinScreen() {
  const { gameId } = useParams()
  const navigate = useNavigate()

  // Read sessionStorage ONCE at mount — stable for component lifetime
  const isHost = useRef(sessionStorage.getItem(`pabs-host-${gameId}`) === 'true').current
  const mountPlayerId = useRef(sessionStorage.getItem(`pabs-player-${gameId}`)).current

  const [joined, setJoined] = useState(!!mountPlayerId)
  const [myPlayerId, setMyPlayerId] = useState(mountPlayerId)
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
      if (msg.state.status === 'active') {
        navigate(`/${gameId}/game`, { replace: true })
      }
      if (msg.state.status === 'finished') {
        navigate(`/${gameId}/result`, { replace: true })
      }
    }

    // Host sends INIT to seed the server if it has no state yet.
    // Server ignores INIT when it already has state and will send the
    // current state back via onConnect instead.
    socket.onopen = () => {
      if (isHost) {
        const raw = sessionStorage.getItem(`pabs-init-${gameId}`)
        if (raw) {
          socket.send(JSON.stringify({ type: 'INIT', state: JSON.parse(raw) }))
        }
      }
    }

    return () => socket.close()
  }, [gameId, isHost, navigate])

  // Called by JoinScreen when a guest enters their name and taps Join
  const handleJoin = (playerId, name) => {
    sessionStorage.setItem(`pabs-player-${gameId}`, playerId)
    setMyPlayerId(playerId)
    setJoined(true)
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: 'JOIN', playerId, name }))
    }
  }

  // LobbyScreen calls this for START_GAME / REMOVE_PLAYER
  const dispatch = (action) => {
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify(action))
    }
  }

  if (!joined) {
    return <JoinScreen gameId={gameId} onJoin={handleJoin} preloadedState={state} />
  }

  return (
    <LobbyScreen
      state={state}
      dispatch={dispatch}
      isHost={isHost}
      myPlayerId={myPlayerId}
    />
  )
}
