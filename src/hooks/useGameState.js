import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createDeck,
  dealCards,
  findFirstPlayer,
  getPlayableCards,
  resolveTrick,
  getNextPlayer,
  checkWinCondition,
  mustDrawFromWaste,
  drawFromWaste,
  getHighestPlayableCard,
} from '../engine/gameLogic'

const CHANNEL_NAME = 'pabs-game'

export function useGameState(gameId) {
  const navigate = useNavigate()
  const channelRef = useRef(null)
  const stateRef = useRef(null) // host-only canonical state
  const [state, setState] = useState(null)
  const isHostRef = useRef(false)
  const myPlayerIdRef = useRef(null)

  // Detect identity
  useEffect(() => {
    if (!gameId) return
    const storedPlayerId = sessionStorage.getItem(`pabs-player-${gameId}`)
    const storedHost = sessionStorage.getItem(`pabs-host-${gameId}`)
    if (storedPlayerId) myPlayerIdRef.current = storedPlayerId
    if (storedHost === 'true') isHostRef.current = true
  }, [gameId])

  const broadcastState = useCallback((newState) => {
    if (!channelRef.current) return
    channelRef.current.postMessage({ type: 'STATE_UPDATE', gameId, state: newState })
    setState(newState)
  }, [gameId])

  const processAction = useCallback((action) => {
    if (!isHostRef.current || !stateRef.current) return
    let s = { ...stateRef.current }
    s.players = s.players.map(p => ({ ...p }))

    if (action.type === 'JOIN') {
      if (s.status !== 'waiting') {
        // Game already started
        channelRef.current.postMessage({
          type: 'JOIN_REJECTED',
          gameId,
          reason: 'Game already in progress',
        })
        return
      }
      const exists = s.players.some(p => p.id === action.playerId)
      if (!exists) {
        s.players.push({
          id: action.playerId,
          name: action.name,
          isHost: false,
          seatOrder: s.players.length,
          hand: [],
          hasEscaped: false,
          isActive: true,
        })
      }
    }

    if (action.type === 'REQUEST_STATE') {
      broadcastState(stateRef.current)
      return
    }

    if (action.type === 'START_GAME') {
      if (s.players.length < 3) return
      const deck = createDeck()
      const hands = dealCards(deck, s.players.length)
      const firstIdx = findFirstPlayer(hands)
      s.players = s.players.map((p, i) => ({ ...p, hand: hands[i] }))
      s.currentTurn = s.players[firstIdx].id
      s.isFirstTrick = true
      s.trick = []
      s.trickLedSuit = null
      s.wasteDrawPending = null
      s.status = 'active'
    }

    if (action.type === 'PLAY_CARD') {
      const { playerId, card } = action
      if (s.currentTurn !== playerId) return

      const playerIdx = s.players.findIndex(p => p.id === playerId)
      if (playerIdx === -1) return
      const player = s.players[playerIdx]

      // Validate card is playable
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
      if (!playableCard) return

      // Remove card from hand
      s.players[playerIdx] = {
        ...player,
        hand: player.hand.filter(c => !(c.suit === card.suit && c.value === card.value)),
      }

      // Set led suit if first card of trick
      if (s.trick.length === 0) {
        s.trickLedSuit = card.suit
      }

      // Add to trick
      const trickEntry = { playerId, card, seatOrder: player.seatOrder }
      s.trick = [...s.trick, trickEntry]

      // Check if this card is a tochoo (not the first card and wrong suit)
      const isTochoo = s.trick.length > 1 && card.suit !== s.trickLedSuit

      // Determine active non-escaped players
      const activePlayers = s.players.filter(p => p.isActive && !p.hasEscaped)
      const allPlayed = activePlayers.every(p => s.trick.some(tc => tc.playerId === p.id))

      // On the first trick, tochoo is forgiven — everyone still gets to play
      if ((isTochoo && !s.isFirstTrick) || allPlayed) {
        // Resolve the trick
        s = resolveTrickState(s)
      } else {
        // Advance to next player
        const currentPlayer = s.players.find(p => p.id === playerId)
        const next = getNextPlayer(s.players, currentPlayer.seatOrder)
        s.currentTurn = next ? next.id : null
      }
    }

    if (action.type === 'DRAW_FROM_WASTE') {
      const { playerId } = action
      if (s.currentTurn !== playerId) return
      const playerIdx = s.players.findIndex(p => p.id === playerId)
      if (playerIdx === -1) return
      const { card, remainingWaste } = drawFromWaste(s.wastePile)
      s.players[playerIdx] = {
        ...s.players[playerIdx],
        hand: [...s.players[playerIdx].hand, card],
      }
      s.wastePile = remainingWaste
    }

    if (action.type === 'COMMIT_WASTE_DRAW') {
      const { playerId } = action
      if (s.currentTurn !== playerId || s.wasteDrawPending !== playerId) return
      const playerIdx = s.players.findIndex(p => p.id === playerId)
      if (playerIdx === -1) return
      const player = s.players[playerIdx]

      // Reveal a random card from the waste pile and play it directly to the trick
      const { card, remainingWaste } = drawFromWaste(s.wastePile)
      s.wastePile = remainingWaste
      s.wasteDrawPending = null

      // Player is always leading when wasteDrawPending, so this card sets the led suit
      s.trickLedSuit = card.suit

      // Place the card on the table (not in hand)
      const trickEntry = { playerId, card, seatOrder: player.seatOrder }
      s.trick = [...s.trick, trickEntry]

      // Advance to the next player (waste-draw player leads, so never allPlayed yet)
      const activePlayers = s.players.filter(p => p.isActive && !p.hasEscaped)
      const allPlayed = activePlayers.every(p => s.trick.some(tc => tc.playerId === p.id))
      if (allPlayed) {
        s = resolveTrickState(s)
      } else {
        const next = getNextPlayer(s.players, player.seatOrder)
        s.currentTurn = next ? next.id : null
      }
    }

    stateRef.current = s
    broadcastState(s)
  }, [broadcastState, gameId])

  function resolveTrickState(s) {
    const result = resolveTrick(s.trick, s.trickLedSuit, s.isFirstTrick)

    if (result.type === 'discard') {
      s.wastePile = [...s.wastePile, ...result.discard.map(tc => tc.card)]
      s.isFirstTrick = false

      if (result.winner) {
        // Winner gets the power
        s.currentTurn = result.winner
        const winnerIdx = s.players.findIndex(p => p.id === result.winner)
        if (winnerIdx !== -1) {
          const winner = s.players[winnerIdx]
          if (winner.hand.length === 0) {
            if (s.wastePile.length > 0) {
              // Winner leads next round by drawing a mystery card from the waste pile
              s.wasteDrawPending = result.winner
            } else {
              // Escape!
              s.players[winnerIdx] = { ...winner, hasEscaped: true }
              const next = getNextPlayer(s.players, winner.seatOrder)
              s.currentTurn = next ? next.id : null
            }
          }
        }
      } else {
        // First trick: no winner, move to next player from seat 0
        const firstActive = s.players
          .filter(p => p.isActive && !p.hasEscaped)
          .sort((a, b) => a.seatOrder - b.seatOrder)[0]
        s.currentTurn = firstActive ? firstActive.id : null
      }
    } else if (result.type === 'pickup') {
      // Pickup player gets all cards
      const pickupIdx = s.players.findIndex(p => p.id === result.pickupPlayerId)
      if (pickupIdx !== -1) {
        s.players[pickupIdx] = {
          ...s.players[pickupIdx],
          hand: [...s.players[pickupIdx].hand, ...result.pickup.map(tc => tc.card)],
        }
      }
      s.currentTurn = result.pickupPlayerId
      s.isFirstTrick = false
    }

    s.trick = []
    s.trickLedSuit = null

    // Check win condition
    const { gameOver, loser } = checkWinCondition(s.players)
    if (gameOver) {
      s.status = 'finished'
      s.bhaabi = loser ? loser.id : null
    }

    return s
  }

  // Initialize channel
  useEffect(() => {
    if (!gameId) return
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel

    channel.onmessage = (event) => {
      const msg = event.data
      if (msg.gameId !== gameId) return

      if (msg.type === 'ACTION') {
        if (isHostRef.current) {
          processAction(msg.action)
        }
      }

      if (msg.type === 'STATE_UPDATE') {
        setState(msg.state)
        // Navigate based on status
        if (msg.state.status === 'active') {
          navigate(`/${gameId}/game`, { replace: true })
        }
        if (msg.state.status === 'finished') {
          navigate(`/${gameId}/result`, { replace: true })
        }
      }

      if (msg.type === 'JOIN_REJECTED') {
        // handled by join screen
      }
    }

    // If host, set up beforeunload warning
    if (isHostRef.current) {
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

    // Guest: request state on mount
    const storedPlayerId = sessionStorage.getItem(`pabs-player-${gameId}`)
    if (storedPlayerId && !isHostRef.current) {
      setTimeout(() => {
        channel.postMessage({ type: 'ACTION', gameId, action: { type: 'REQUEST_STATE' } })
      }, 100)
    }

    return () => {
      channel.close()
    }
  }, [gameId, navigate, processAction])

  const dispatch = useCallback((action) => {
    if (!channelRef.current) return
    if (isHostRef.current) {
      // Host processes directly
      processAction(action)
    } else {
      channelRef.current.postMessage({ type: 'ACTION', gameId, action })
    }
  }, [gameId, processAction])

  // For host: initialize state from outside
  const initState = useCallback((newState) => {
    stateRef.current = newState
    setState(newState)
  }, [])

  return {
    state,
    dispatch,
    isHost: isHostRef.current,
    myPlayerId: myPlayerIdRef.current,
    initState,
  }
}
