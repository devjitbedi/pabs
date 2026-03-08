import {
  createDeck,
  dealCards,
  findFirstPlayer,
  getPlayableCards,
  resolveTrick,
  getNextPlayer,
  checkWinCondition,
  drawFromWaste,
} from '../src/engine/gameLogic.js'

const TRICK_ANIM_DELAY_MS = 5000

// ── PartyKit server ─────────────────────────────────────────────────────────
export default class GameServer {
  constructor(party) {
    this.party = party
    this.state = null
  }

  // Send current state to any new connection
  onConnect(conn) {
    if (this.state) {
      conn.send(JSON.stringify({ type: 'STATE_UPDATE', state: this.state }))
    }
  }

  onMessage(message, sender) {
    let action
    try { action = JSON.parse(message) } catch { return }
    this.processAction(action)
  }

  broadcast() {
    this.party.broadcast(JSON.stringify({ type: 'STATE_UPDATE', state: this.state }))
  }

  processAction(action) {
    // ── INIT ──────────────────────────────────────────────────────────────────
    // Host sends this once when creating a fresh room.
    // If the room already has state (game in progress / returned from results)
    // we ignore INIT and let onConnect handle syncing the new connection.
    if (action.type === 'INIT') {
      if (!this.state) {
        this.state = action.state
        this.broadcast()
      }
      return
    }

    if (!this.state) return

    const prevTurn = this.state.currentTurn
    // Shallow-clone state; deep-clone players array so mutations are safe
    let s = {
      ...this.state,
      players: this.state.players.map(p => ({ ...p, hand: [...p.hand] })),
    }

    // ── LOBBY ACTIONS ─────────────────────────────────────────────────────────

    if (action.type === 'JOIN') {
      if (s.status !== 'waiting') return
      if (!s.players.some(p => p.id === action.playerId)) {
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
      this.state = s
      this.broadcast()
      return
    }

    if (action.type === 'REMOVE_PLAYER') {
      if (s.status !== 'waiting') return
      s.players = s.players
        .filter(p => p.id !== action.playerId)
        .map((p, i) => ({ ...p, seatOrder: i }))
      this.state = s
      this.broadcast()
      return
    }

    if (action.type === 'START_GAME') {
      if (s.status !== 'waiting' || s.players.length < 3) return
      const deck = createDeck()
      const hands = dealCards(deck, s.players.length)
      const firstIdx = findFirstPlayer(hands)
      s.players = s.players.map((p, i) => ({ ...p, hand: hands[i] }))
      s.currentTurn = s.players[firstIdx].id
      s.turnStartedAt = Date.now()
      s.isFirstTrick = true
      s.trick = []
      s.trickLedSuit = null
      s.wasteDrawPending = null
      s.wastePile = []
      s.status = 'active'
      s.lastResolvedTrick = null
      s.lastResolvedTrickSuit = null
      s.lastResolvedPickupPlayerId = null
      this.state = s
      this.broadcast()
      return
    }

    // ── GAME CONTROL ACTIONS ──────────────────────────────────────────────────

    if (action.type === 'PAUSE_GAME') {
      if (s.status === 'active') s.status = 'paused'
      this.state = s
      this.broadcast()
      return
    }

    if (action.type === 'RESUME_GAME') {
      if (s.status === 'paused') {
        s.status = 'active'
        s.turnStartedAt = Date.now()
      }
      this.state = s
      this.broadcast()
      return
    }

    if (action.type === 'END_GAME') {
      if (s.status !== 'ending' && s.status !== 'finished') {
        s.status = 'ending'
        s.endingStartedAt = Date.now()
      }
      this.state = s
      this.broadcast()
      return
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
        wasteDrawPending: null,
        turnStartedAt: null,
        endingStartedAt: null,
        lastResolvedTrick: null,
        lastResolvedTrickSuit: null,
        lastResolvedPickupPlayerId: null,
      }
      this.state = s
      this.broadcast()
      return
    }

    // ── PLAY ACTIONS ──────────────────────────────────────────────────────────

    if (action.type === 'PLAY_CARD') {
      if (s.status !== 'active') return
      const { playerId, card } = action
      if (s.currentTurn !== playerId) return
      const playerIdx = s.players.findIndex(p => p.id === playerId)
      if (playerIdx === -1) return
      const player = s.players[playerIdx]

      // Validate the card is playable
      const hasThePower = s.trick.length === 0
      const annotated = getPlayableCards(
        player.hand,
        s.trickLedSuit,
        s.trick,
        s.isFirstTrick,
        hasThePower,
      )
      const playableCard = annotated.find(
        c => c.playable && c.suit === card.suit && c.value === card.value,
      )
      if (!playableCard) return

      // Remove card from hand
      s.players[playerIdx] = {
        ...player,
        hand: player.hand.filter(c => !(c.suit === card.suit && c.value === card.value)),
      }

      // Set led suit on first card of trick
      if (s.trick.length === 0) s.trickLedSuit = card.suit

      const trickEntry = { playerId, card, seatOrder: player.seatOrder }
      s.trick = [...s.trick, trickEntry]

      const isTochoo = s.trick.length > 1 && card.suit !== s.trickLedSuit
      const activePlayers = s.players.filter(p => p.isActive && !p.hasEscaped)
      const allPlayed = activePlayers.every(p => s.trick.some(tc => tc.playerId === p.id))

      // On the first trick: tochoo is forgiven — everyone still plays
      if ((isTochoo && !s.isFirstTrick) || allPlayed) {
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

    if (action.type === 'COMMIT_WASTE_DRAW') {
      const { playerId } = action
      if (s.currentTurn !== playerId || s.wasteDrawPending !== playerId) return
      const playerIdx = s.players.findIndex(p => p.id === playerId)
      if (playerIdx === -1) return
      const player = s.players[playerIdx]

      // Draw a random card from the waste pile and play it straight to the table
      const { card, remainingWaste } = drawFromWaste(s.wastePile)
      s.wastePile = remainingWaste
      s.wasteDrawPending = null
      // The waste-draw player always leads, so this card sets the led suit
      s.trickLedSuit = card.suit

      const trickEntry = { playerId, card, seatOrder: player.seatOrder }
      s.trick = [...s.trick, trickEntry]

      const activePlayers = s.players.filter(p => p.isActive && !p.hasEscaped)
      const allPlayed = activePlayers.every(p => s.trick.some(tc => tc.playerId === p.id))
      if (allPlayed) {
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

    // Stamp turnStartedAt (only for play actions)
    if (action.type === 'PLAY_CARD' || action.type === 'COMMIT_WASTE_DRAW') {
      if (s.lastResolvedTrick != null) {
        // After a trick resolves, offset by animation delay so the timer bar
        // only starts after cards have cleared the table
        s.turnStartedAt = s.currentTurn ? Date.now() + TRICK_ANIM_DELAY_MS : null
      } else if (s.currentTurn !== prevTurn) {
        s.turnStartedAt = s.currentTurn ? Date.now() : null
      }
    }

    this.state = s
    this.broadcast()
  }
}

// ── Trick resolution helper ──────────────────────────────────────────────────
function resolveTrickState(s) {
  const result = resolveTrick(s.trick, s.trickLedSuit, s.isFirstTrick)

  if (result.type === 'discard') {
    s.lastResolvedPickupPlayerId = null
    // All trick cards go to the waste pile
    s.wastePile = [...s.wastePile, ...result.discard.map(tc => tc.card)]

    if (result.winner) {
      s.currentTurn = result.winner
      const winnerIdx = s.players.findIndex(p => p.id === result.winner)
      if (winnerIdx !== -1) {
        const winner = s.players[winnerIdx]
        if (winner.hand.length === 0) {
          if (s.wastePile.length > 0) {
            // Winner must tap a face-down card to draw from waste before leading
            s.wasteDrawPending = result.winner
          } else {
            // Waste pile empty → winner escapes
            s.players[winnerIdx] = { ...winner, hasEscaped: true }
            const next = getNextPlayer(s.players, winner.seatOrder)
            s.currentTurn = next ? next.id : null
          }
        }
      }
    } else {
      // First trick: no winner declared — lowest seatOrder active player leads
      const firstActive = s.players
        .filter(p => p.isActive && !p.hasEscaped)
        .sort((a, b) => a.seatOrder - b.seatOrder)[0]
      s.currentTurn = firstActive ? firstActive.id : null
    }

    s.isFirstTrick = false

  } else if (result.type === 'pickup') {
    // Tochoo: all trick cards go to the player who broke suit
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

  // Auto-escape any player whose hand is now empty.
  // Exclude the wasteDrawPending player — their hand is intentionally empty
  // while they wait to tap their mystery card.
  s.players = s.players.map(p => {
    if (!p.hasEscaped && p.hand.length === 0 && s.wasteDrawPending !== p.id) {
      return { ...p, hasEscaped: true }
    }
    return p
  })

  // If the next-to-play player has already escaped, skip past them
  const currentPlayer = s.players.find(p => p.id === s.currentTurn)
  if (currentPlayer && currentPlayer.hasEscaped) {
    const next = getNextPlayer(s.players, currentPlayer.seatOrder)
    s.currentTurn = next ? next.id : null
  }

  // Check win condition (last non-escaped active player is Bhaabi)
  const { gameOver, loser } = checkWinCondition(s.players)
  if (gameOver) {
    s.status = 'finished'
    s.bhaabi = loser ? loser.id : null
  }

  return s
}
