import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminView, PlayerView } from './views';
import { AdminProvider } from './context/AdminContext';
import { PlayerProvider } from './context/PlayerContext';

/**
 * Main App component with routing and context providers
 * Note: Router (BrowserRouter/MemoryRouter) should be provided by parent
 */
function App() {
  return (
    <Routes>
      <Route
        path="/admin"
        element={
          <AdminProvider>
            <AdminView />
          </AdminProvider>
        }
      />
      <Route
        path="/player"
        element={
          <PlayerProvider>
            <PlayerView />
          </PlayerProvider>
        }
      />
      <Route
        path="/"
        element={
          <PlayerProvider>
            <PlayerView />
          </PlayerProvider>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
