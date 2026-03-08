import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import GameScreen from './GameScreen'
import {
  createDeck,
  dealCards,
  findFirstPlayer,
  getPlayableCards,
  resolveTrick,
  getNextPlayer,
  checkWinCondition,
  drawFromWaste,
  getHighestPlayableCard,
} from '../engine/gameLogic'

const CHANNEL_NAME = 'pabs-game'

function applyAction(s, action) {
  const prevTurn = s.currentTurn
  s = { ...s, players: s.players.map(p => ({ ...p, hand: [...p.hand] })) }

  if (action.type === 'PAUSE_GAME') {
    if (s.status === 'active') s.status = 'paused'
    return s
  }

  if (action.type === 'RESUME_GAME') {
    if (s.status === 'paused') {
      s.status = 'active'
      // Reset the turn clock so the active player gets a fresh window after the pause
      s.turnStartedAt = Date.now()
    }
    return s
  }

  if (action.type === 'END_GAME') {
    if (s.status !== 'ending' && s.status !== 'finished') {
      s.status = 'ending'
      s.endingStartedAt = Date.now()
    }
    return s
  }

  if (action.type === 'PLAY_CARD') {
    if (s.status !== 'active') return s
    const { playerId, card } = action
    if (s.currentTurn !== playerId) return s

    const playerIdx = s.players.findIndex(p => p.id === playerId)
    if (playerIdx === -1) return s
    const player = s.players[playerIdx]

    const hasThePower = s.trick.length === 0
    const annotated = getPlayableCards(
      player.hand,
      s.trickLedSuit,
      s.trick,
      s.isFirstTrick,
      hasThePower
    )
    const playableCard = annotated.find(
      c => c.playable && c.suit === card.suit && c.value === card.value
    )
    if (!playableCard) return s

    // Remove card from hand
    s.players[playerIdx] = {
      ...player,
      hand: player.hand.filter(c => !(c.suit === card.suit && c.value === card.value)),
    }

    // Set led suit if starting trick
    if (s.trick.length === 0) {
      s.trickLedSuit = card.suit
    }

    const trickEntry = { playerId, card, seatOrder: player.seatOrder }
    s.trick = [...s.trick, trickEntry]

    const isTochoo = s.trick.length > 1 && card.suit !== s.trickLedSuit
    const activePlayers = s.players.filter(p => p.isActive && !p.hasEscaped)
    const allPlayed = activePlayers.every(p => s.trick.some(tc => tc.playerId === p.id))

    if (isTochoo || allPlayed) {
      // Save the complete trick (including this last card) before resolve clears it
      s.lastResolvedTrick = [...s.trick]
      s.lastResolvedTrickSuit = s.trickLedSuit
      s = resolveTrickState(s)
    } else {
      s.lastResolvedTrick = null
      s.lastResolvedTrickSuit = null
      const next = getNextPlayer(s.players, player.seatOrder)
      s.currentTurn = next ? next.id : null
    }
  }

  if (action.type === 'DRAW_FROM_WASTE') {
    const { playerId } = action
    if (s.currentTurn !== playerId) return s
    const playerIdx = s.players.findIndex(p => p.id === playerId)
    if (playerIdx === -1) return s
    if (s.wastePile.length === 0) return s
    const { card, remainingWaste } = drawFromWaste(s.wastePile)
    s.players[playerIdx] = {
      ...s.players[playerIdx],
      hand: [...s.players[playerIdx].hand, card],
    }
    s.wastePile = remainingWaste
  }

  if (action.type === 'RESET_GAME') {
    s = {
      ...s,
      status: 'waiting',
      players: s.players.map(p => ({
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
      turnStartedAt: null,
      endingStartedAt: null,
    }
  }

  // Stamp turnStartedAt to keep the timer bar in sync across all clients.
  // We must always update on trick resolution — not just when currentTurn changes —
  // because the tochoo player is both prevTurn AND the pickup player (same ID), and
  // the last-seated player can win their own trick, so prevTurn === currentTurn in both cases.
  const TRICK_ANIM_DELAY_MS = 5000
  if (s.lastResolvedTrick != null) {
    // Trick just resolved: offset by the full animation delay so the bar starts
    // counting down only after the card-shuffling animation finishes.
    s.turnStartedAt = s.currentTurn ? Date.now() + TRICK_ANIM_DELAY_MS : null
  } else if (s.currentTurn !== prevTurn) {
    // Mid-trick turn advance: no animation, timer starts immediately.
    s.turnStartedAt = s.currentTurn ? Date.now() : null
  }

  return s
}

function resolveTrickState(s) {
  const result = resolveTrick(s.trick, s.trickLedSuit, s.isFirstTrick)

  if (result.type === 'discard') {
    s.lastResolvedPickupPlayerId = null
    s.wastePile = [...s.wastePile, ...result.discard.map(tc => tc.card)]

    if (result.winner) {
      s.currentTurn = result.winner
      const winnerIdx = s.players.findIndex(p => p.id === result.winner)
      if (winnerIdx !== -1) {
        const winner = s.players[winnerIdx]
        if (winner.hand.length === 0) {
          if (s.wastePile.length > 0) {
            const { card, remainingWaste } = drawFromWaste(s.wastePile)
            s.players[winnerIdx] = { ...winner, hand: [card] }
            s.wastePile = remainingWaste
          } else {
            s.players[winnerIdx] = { ...winner, hasEscaped: true }
            const next = getNextPlayer(s.players, winner.seatOrder)
            s.currentTurn = next ? next.id : null
          }
        }
      }
    } else {
      // First trick
      const firstActive = s.players
        .filter(p => p.isActive && !p.hasEscaped)
        .sort((a, b) => a.seatOrder - b.seatOrder)[0]
      s.currentTurn = firstActive ? firstActive.id : null
    }

    s.isFirstTrick = false
  } else if (result.type === 'pickup') {
    const pickupIdx = s.players.findIndex(p => p.id === result.pickupPlayerId)
    if (pickupIdx !== -1) {
      s.players[pickupIdx] = {
        ...s.players[pickupIdx],
        hand: [...s.players[pickupIdx].hand, ...result.pickup.map(tc => tc.card)],
      }
    }
    s.currentTurn = result.pickupPlayerId
    s.lastResolvedPickupPlayerId = result.pickupPlayerId
    s.isFirstTrick = false
  }

  s.trick = []
  s.trickLedSuit = null

  // Mark any player whose hand is now empty as escaped (catches non-winners who played their last card)
  s.players = s.players.map(p => {
    if (!p.hasEscaped && p.hand.length === 0) {
      return { ...p, hasEscaped: true }
    }
    return p
  })

  // If currentTurn now points to an escaped player, skip to the next active player
  const currentPlayer = s.players.find(p => p.id === s.currentTurn)
  if (currentPlayer && currentPlayer.hasEscaped) {
    const next = getNextPlayer(s.players, currentPlayer.seatOrder)
    s.currentTurn = next ? next.id : null
  }

  const { gameOver, loser } = checkWinCondition(s.players)
  if (gameOver) {
    s.status = 'finished'
    s.bhaabi = loser ? loser.id : null
  }

  return s
}

export default function GameRoute() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const isHost = sessionStorage.getItem(`pabs-host-${gameId}`) === 'true'
  const myPlayerId = sessionStorage.getItem(`pabs-player-${gameId}`)

  const [state, setState] = useState(null)
  const stateRef = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel

    channel.onmessage = (event) => {
      const msg = event.data
      if (msg.gameId !== gameId) return

      if (isHost && msg.type === 'ACTION') {
        const action = msg.action
        if (action.type === 'REQUEST_STATE') {
          if (stateRef.current) {
            channel.postMessage({ type: 'STATE_UPDATE', gameId, state: stateRef.current })
          }
          return
        }
        let ns = applyAction(stateRef.current, action)
        stateRef.current = ns
        setState(ns)
        channel.postMessage({ type: 'STATE_UPDATE', gameId, state: ns })

        if (ns.status === 'finished') {
          sessionStorage.setItem(`pabs-init-${gameId}`, JSON.stringify(ns))
          // Navigation is handled by the useEffect below after the animation plays
        }
        if (ns.status === 'waiting') {
          sessionStorage.setItem(`pabs-init-${gameId}`, JSON.stringify(ns))
          navigate(`/${gameId}`, { replace: true })
        }
      }

      if (msg.type === 'STATE_UPDATE') {
        stateRef.current = msg.state
        setState(msg.state)
        if (msg.state.status === 'finished') {
          sessionStorage.setItem(`pabs-init-${gameId}`, JSON.stringify(msg.state))
          // Navigation is handled by the useEffect below after the animation plays
        }
        if (msg.state.status === 'waiting') {
          sessionStorage.setItem(`pabs-init-${gameId}`, JSON.stringify(msg.state))
          navigate(`/${gameId}`, { replace: true })
        }
      }
    }

    // Load initial state
    const raw = sessionStorage.getItem(`pabs-init-${gameId}`)
    if (raw) {
      const initState = JSON.parse(raw)
      stateRef.current = initState
      setState(initState)
      if (isHost) {
        channel.postMessage({ type: 'STATE_UPDATE', gameId, state: initState })
      }
    } else if (!isHost) {
      setTimeout(() => {
        channel.postMessage({ type: 'ACTION', gameId, action: { type: 'REQUEST_STATE' } })
      }, 200)
    }

    if (isHost) {
      const handleUnload = (e) => {
        e.preventDefault()
        e.returnValue = 'Closing this tab will end the game for everyone.'
      }
      window.addEventListener('beforeunload', handleUnload)
      return () => {
        channel.close()
        window.removeEventListener('beforeunload', handleUnload)
      }
    }

    return () => channel.close()
  }, [gameId, isHost, navigate])

  const dispatch = (action) => {
    if (!channelRef.current) return
    if (isHost) {
      // Process locally
      let ns = applyAction(stateRef.current, action)
      stateRef.current = ns
      setState(ns)
      channelRef.current.postMessage({ type: 'STATE_UPDATE', gameId, state: ns })
      if (ns.status === 'finished') {
        sessionStorage.setItem(`pabs-init-${gameId}`, JSON.stringify(ns))
        // Navigation is handled by the useEffect below after the animation plays
      }
      if (ns.status === 'waiting') {
        sessionStorage.setItem(`pabs-init-${gameId}`, JSON.stringify(ns))
        navigate(`/${gameId}`, { replace: true })
      }
    } else {
      channelRef.current.postMessage({ type: 'ACTION', gameId, action })
    }
  }

  // Delay navigation to results so the end-of-game animation and bhaabi toast can finish
  useEffect(() => {
    if (state?.status !== 'finished') return
    const timer = setTimeout(() => {
      navigate(`/${gameId}/result`, { replace: true })
    }, 7000)
    return () => clearTimeout(timer)
  }, [state?.status, gameId, navigate])

  return <GameScreen state={state} dispatch={dispatch} myPlayerId={myPlayerId} />
}
