import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomeScreen from './screens/HomeScreen'
import LobbyOrJoinScreen from './screens/LobbyOrJoinScreen'
import GameRoute from './screens/GameRoute'
import ResultRoute from './screens/ResultRoute'
import ErrorBoundary from './components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/:gameId" element={<LobbyOrJoinScreen />} />
          <Route path="/:gameId/game" element={<GameRoute />} />
          <Route path="/:gameId/result" element={<ResultRoute />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
