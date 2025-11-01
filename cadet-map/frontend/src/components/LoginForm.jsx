import { useState } from 'react';

const LoginForm = ({ onSubmit, isLoading, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ username, password });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950"
    >
      <div>
        <h1 className="text-xl font-semibold text-sky-200">Cadet Map</h1>
        <p className="text-sm text-slate-400">Sign in to plan your navigation route.</p>
      </div>

      <label className="flex flex-col text-sm text-slate-200">
        Username
        <input
          className="mt-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-500 focus:outline-none"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          required
        />
      </label>

      <label className="flex flex-col text-sm text-slate-200">
        Password
        <input
          className="mt-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-500 focus:outline-none"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </label>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <button
        type="submit"
        className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isLoading}
      >
        {isLoading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
};

export default LoginForm;
