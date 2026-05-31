import { Navigate } from 'react-router-dom'

/** @deprecated Use /research/watchlist */
export default function WatchlistPage() {
  return <Navigate to="/research/watchlist" replace />
}
