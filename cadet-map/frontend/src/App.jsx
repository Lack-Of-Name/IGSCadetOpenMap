import { useState, useCallback } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login.jsx';
import MapPage from './pages/MapPage.jsx';

const ProtectedRoute = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App = () => {
  const [token, setToken] = useState(null);

  const handleLoginSuccess = useCallback((sessionToken) => {
    setToken(sessionToken);
  }, []);

  const handleLogout = useCallback(() => {
    setToken(null);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute isAuthenticated={Boolean(token)}>
              <MapPage onLogout={handleLogout} sessionToken={token} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/login"
          element={
            <Login
              onLoginSuccess={handleLoginSuccess}
              isAuthenticated={Boolean(token)}
            />
          }
        />
        <Route
          path="*"
          element={<Navigate to={token ? '/' : '/login'} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
