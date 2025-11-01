import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm.jsx';
import { login } from '../utils/api.js';

const Login = ({ onLoginSuccess, isAuthenticated }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await login(credentials);
      onLoginSuccess(result.token);
      navigate('/', { replace: true });
    } catch (requestError) {
      const message = requestError?.response?.data?.message ?? 'Login failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <LoginForm onSubmit={handleSubmit} isLoading={isLoading} error={error} />
    </div>
  );
};

export default Login;
