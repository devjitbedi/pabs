// Pure game logic functions — no React, no side effects

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs']
const VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] // 14 = Ace

export function createDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value })
    }
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

export function dealCards(deck, playerCount) {
  const hands = Array.from({ length: playerCount }, () => [])
  deck.forEach((card, i) => {
    hands[i % playerCount].push(card)
  })
  return hands
}

export function findFirstPlayer(hands) {
  for (let i = 0; i < hands.length; i++) {
    if (hands[i].some(c => c.suit === 'spades' && c.value === 14)) {
      return i
    }
  }
  return 0
}

export function getPlayableCards(hand, trickLedSuit, trickCards, isFirstTrick, hasThePower) {
  // First trick + has power: only Ace of Spades
  if (isFirstTrick && hasThePower) {
    return hand.map(card => ({
      ...card,
      playable: card.suit === 'spades' && card.value === 14,
    }))
  }

  // Leading a new trick: all cards playable
  if (trickCards.length === 0) {
    return hand.map(card => ({ ...card, playable: true }))
  }

  // Trick in progress: must follow suit if possible
  const hasSuit = hand.some(c => c.suit === trickLedSuit)
  if (hasSuit) {
    return hand.map(card => ({ ...card, playable: card.suit === trickLedSuit }))
  }

  // No cards of led suit: all playable (tochoo)
  return hand.map(card => ({ ...card, playable: true }))
}

export function resolveTrick(trickCards, trickLedSuit, isFirstTrick) {
  // First trick: all cards to waste, no pickup — but still find who leads next
  if (isFirstTrick) {
    const tochooIndex = trickCards.findIndex(tc => tc.card.suit !== trickLedSuit)
    // Only consider cards played before the tochoo (or all cards if no tochoo)
    const candidates = (tochooIndex === -1 ? trickCards : trickCards.slice(0, tochooIndex))
      .filter(tc => tc.card.suit === trickLedSuit)
    const highestCard = candidates.length > 0
      ? candidates.reduce((best, tc) => tc.card.value > best.card.value ? tc : best, candidates[0])
      : null
    return { type: 'discard', winner: highestCard?.playerId ?? null, pickupPlayerId: null, discard: trickCards }
  }

  // Find first tochoo (card whose suit !== trickLedSuit)
  const tochooIndex = trickCards.findIndex(tc => tc.card.suit !== trickLedSuit)

  if (tochooIndex === -1) {
    // No tochoo: all cards played, find highest of led suit
    let highestCard = trickCards[0]
    for (const tc of trickCards) {
      if (tc.card.suit === trickLedSuit && tc.card.value > highestCard.card.value) {
        highestCard = tc
      }
    }
    return {
      type: 'discard',
      winner: highestCard.playerId,
      pickupPlayerId: null,
      discard: trickCards,
    }
  }

  // Tochoo found: play stopped here
  // Consider only cards played BEFORE the tochoo
  const cardsBeforeTochoo = trickCards.slice(0, tochooIndex)
  // Find highest among those (all are led suit)
  let highestCard = cardsBeforeTochoo[0]
  for (const tc of cardsBeforeTochoo) {
    if (tc.card.value > highestCard.card.value) {
      highestCard = tc
    }
  }

  return {
    type: 'pickup',
    winner: highestCard.playerId,
    pickupPlayerId: highestCard.playerId,
    pickup: trickCards,
  }
}

export function getNextPlayer(players, currentSeatOrder) {
  const activePlayers = players
    .filter(p => p.isActive && !p.hasEscaped)
    .sort((a, b) => a.seatOrder - b.seatOrder)

  if (activePlayers.length === 0) return null

  const currentIndex = activePlayers.findIndex(p => p.seatOrder === currentSeatOrder)
  const nextIndex = (currentIndex + 1) % activePlayers.length
  return activePlayers[nextIndex]
}

export function checkWinCondition(players) {
  const active = players.filter(p => p.isActive && !p.hasEscaped)
  if (active.length === 1) {
    return { gameOver: true, loser: active[0] }
  }
  return { gameOver: false, loser: null }
}

export function getHighestPlayableCard(hand, trickLedSuit, trickCards, isFirstTrick, hasThePower) {
  const annotated = getPlayableCards(hand, trickLedSuit, trickCards, isFirstTrick, hasThePower)
  const playable = annotated.filter(c => c.playable)
  if (playable.length === 0) return null
  return playable.reduce((best, c) => (c.value > best.value ? c : best), playable[0])
}

export function mustDrawFromWaste(playerHand, hasThePower, wastePile) {
  return hasThePower && playerHand.length === 0 && wastePile.length > 0
}

export function drawFromWaste(wastePile) {
  // Shuffle waste pile
  const shuffled = [...wastePile]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return { card: shuffled[0], remainingWaste: shuffled.slice(1) }
}

export function generateGameId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

export function generatePlayerId() {
  return 'player-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now()
}

export function getValueLabel(value) {
  if (value === 14) return 'A'
  if (value === 13) return 'K'
  if (value === 12) return 'Q'
  if (value === 11) return 'J'
  return String(value)
}
