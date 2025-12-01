import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { 
  AdminView, 
  PlayerView, 
  LobbyView, 
  ProfileView, 
  StatsView, 
  LeaderboardView 
} from './views';
import { AdminProvider } from './context/AdminContext';
import { PlayerProvider } from './context/PlayerContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { PlayerLayout, ProtectedAdminRoute } from './components/common';
import { useEffect, useState } from 'react';

/**
 * Main App component with routing and context providers
 * Note: Router (BrowserRouter/MemoryRouter) should be provided by parent
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5
 */
function App() {
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check for error message from navigation state
  useEffect(() => {
    if (location.state && (location.state as { error?: string }).error) {
      setErrorMessage((location.state as { error: string }).error);
      // Clear error after showing
      setTimeout(() => setErrorMessage(null), 5000);
    }
  }, [location]);

  return (
    <>
      {errorMessage && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#fee', 
          color: '#c00',
          textAlign: 'center'
        }}>
          {errorMessage}
        </div>
      )}
      <PlayerProvider>
        <WebSocketProvider>
          <NotificationProvider>
            <Routes>
              <Route
                path="/admin"
                element={
                  <ProtectedAdminRoute>
                    <AdminProvider>
                      <AdminView />
                    </AdminProvider>
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/lobby"
                element={
                  <PlayerLayout currentView="lobby">
                    <LobbyView />
                  </PlayerLayout>
                }
              />
              <Route
                path="/profile"
                element={
                  <PlayerLayout currentView="profile">
                    <ProfileView />
                  </PlayerLayout>
                }
              />
              <Route
                path="/stats"
                element={
                  <PlayerLayout currentView="stats">
                    <StatsView />
                  </PlayerLayout>
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <PlayerLayout currentView="leaderboard">
                    <LeaderboardView />
                  </PlayerLayout>
                }
              />
              <Route
                path="/games"
                element={
                  <PlayerLayout currentView="games">
                    <PlayerView />
                  </PlayerLayout>
                }
              />
              <Route
                path="/player"
                element={<PlayerView />}
              />
              <Route
                path="/"
                element={
                  <PlayerLayout currentView="home">
                    <PlayerView />
                  </PlayerLayout>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NotificationProvider>
        </WebSocketProvider>
      </PlayerProvider>
    </>
  );
}

export default App;
