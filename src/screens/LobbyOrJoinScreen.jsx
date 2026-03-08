import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import JoinScreen from './JoinScreen'
import LobbyScreen from './LobbyScreen'

const CHANNEL_NAME = 'pabs-game'

export default function LobbyOrJoinScreen() {
  const { gameId } = useParams()
  const navigate = useNavigate()

  // Read sessionStorage ONCE at mount — stable for component lifetime
  const isHost = useRef(sessionStorage.getItem(`pabs-host-${gameId}`) === 'true').current
  const mountPlayerId = useRef(sessionStorage.getItem(`pabs-player-${gameId}`)).current

  const [joined, setJoined] = useState(!!mountPlayerId)
  const [myPlayerId, setMyPlayerId] = useState(mountPlayerId)

  const [state, setState] = useState(null)
  const stateRef = useRef(null)
  const channelRef = useRef(null)
  const hasStateRef = useRef(false) // tracks whether we've received state yet

  // Channel created ONCE per gameId
  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel

    const handleMessage = (event) => {
      const msg = event.data
      if (msg.gameId !== gameId) return

      if (msg.type === 'STATE_UPDATE') {
        hasStateRef.current = true
        stateRef.current = msg.state
        setState(msg.state)
        if (msg.state.status === 'active') {
          navigate(`/${gameId}/game`, { replace: true })
        }
        if (msg.state.status === 'finished') {
          navigate(`/${gameId}/result`, { replace: true })
        }
        return
      }

      if (msg.type === 'ACTION' && isHost) {
        const { action } = msg

        if (action.type === 'REQUEST_STATE') {
          if (stateRef.current) {
            channel.postMessage({ type: 'STATE_UPDATE', gameId, state: stateRef.current })
          }
          return
        }

        if (action.type === 'JOIN') {
          const s = stateRef.current
          if (!s || s.status !== 'waiting') return
          const ns = { ...s, players: [...s.players] }
          if (!ns.players.some(p => p.id === action.playerId)) {
            ns.players.push({
              id: action.playerId,
              name: action.name,
              isHost: false,
              seatOrder: ns.players.length,
              hand: [],
              hasEscaped: false,
              isActive: true,
            })
          }
          stateRef.current = ns
          hasStateRef.current = true
          setState(ns)
          sessionStorage.setItem(`pabs-init-${gameId}`, JSON.stringify(ns))
          channel.postMessage({ type: 'STATE_UPDATE', gameId, state: ns })
          return
        }

        if (action.type === 'REMOVE_PLAYER') {
          const s = stateRef.current
          if (!s || s.status !== 'waiting') return
          const ns = {
            ...s,
            players: s.players
              .filter(p => p.id !== action.playerId)
              .map((p, i) => ({ ...p, seatOrder: i })),
          }
          stateRef.current = ns
          setState(ns)
          sessionStorage.setItem(`pabs-init-${gameId}`, JSON.stringify(ns))
          channel.postMessage({ type: 'STATE_UPDATE', gameId, state: ns })
          return
        }
      }
    }

    channel.addEventListener('message', handleMessage)

    if (isHost) {
      const raw = sessionStorage.getItem(`pabs-init-${gameId}`)
      if (raw) {
        const initState = JSON.parse(raw)
        stateRef.current = initState
        hasStateRef.current = true
        setState(initState)
        channel.postMessage({ type: 'STATE_UPDATE', gameId, state: initState })
      }
    } else {
      // All guests request state immediately (new guests need it for the invite landing screen)
      setTimeout(() => {
        channel.postMessage({ type: 'ACTION', gameId, action: { type: 'REQUEST_STATE' } })
      }, 150)
    }

    return () => {
      channel.removeEventListener('message', handleMessage)
      channel.close()
    }
  }, [gameId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Guest polling: keep asking for state until we receive it (pre-join and post-join)
  useEffect(() => {
    if (isHost) return

    const interval = setInterval(() => {
      if (hasStateRef.current) {
        clearInterval(interval)
        return
      }
      const ch = channelRef.current
      if (ch) {
        ch.postMessage({ type: 'ACTION', gameId, action: { type: 'REQUEST_STATE' } })
      }
    }, 1500)

    return () => clearInterval(interval)
  }, [gameId, isHost])

  const handleJoin = (playerId, name) => {
    setMyPlayerId(playerId)
    setJoined(true) // triggers polling useEffect above

    const ch = channelRef.current
    if (!ch) return

    ch.postMessage({ type: 'ACTION', gameId, action: { type: 'JOIN', playerId, name } })

    // Also send REQUEST_STATE shortly after as a fallback
    setTimeout(() => {
      if (!hasStateRef.current && channelRef.current) {
        channelRef.current.postMessage({ type: 'ACTION', gameId, action: { type: 'REQUEST_STATE' } })
      }
    }, 400)
  }

  const dispatch = (action) => {
    const ch = channelRef.current
    if (!ch) return
    if (isHost) {
      handleStartGame(action)
    } else {
      ch.postMessage({ type: 'ACTION', gameId, action })
    }
  }

  const handleStartGame = (action) => {
    if (action.type !== 'START_GAME') return
    const s = stateRef.current
    if (!s || s.players.length < 3) return

    import('../engine/gameLogic').then(({ createDeck, dealCards, findFirstPlayer }) => {
      const deck = createDeck()
      const hands = dealCards(deck, s.players.length)
      const firstIdx = findFirstPlayer(hands)
      const ns = {
        ...s,
        players: s.players.map((p, i) => ({ ...p, hand: hands[i] })),
        currentTurn: s.players[firstIdx].id,
        turnStartedAt: Date.now(),
        isFirstTrick: true,
        trick: [],
        trickLedSuit: null,
        status: 'active',
      }
      stateRef.current = ns
      hasStateRef.current = true
      setState(ns)
      sessionStorage.setItem(`pabs-init-${gameId}`, JSON.stringify(ns))
      if (channelRef.current) {
        channelRef.current.postMessage({ type: 'STATE_UPDATE', gameId, state: ns })
      }
      navigate(`/${gameId}/game`, { replace: true })
    })
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
