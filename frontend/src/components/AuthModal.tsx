import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, theme = 'dark' }) => {
    const isDark = theme === 'dark';
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin ? { identifier, password } : { username, email, password };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      login(data.token, data.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md ${isDark ? 'bg-slate-950/55' : 'bg-slate-900/30'}`}>
            <div className={`rounded-[28px] p-8 w-full max-w-md shadow-2xl relative ${isDark ? 'bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))] border border-slate-700/80 text-slate-100' : 'soft-panel-strong border border-white/85 text-slate-800'}`}>
        <button
          onClick={onClose}
                    className={`absolute top-4 right-4 transition-colors ${isDark ? 'text-slate-400 hover:text-slate-100' : 'text-slate-400 hover:text-slate-800'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

                <h2 className={`text-2xl font-semibold mb-6 text-center ${isDark ? 'text-stone-100' : 'text-slate-900'}`}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        {error && (
                    <div className={`p-3 rounded-2xl mb-6 text-sm ${isDark ? 'bg-rose-950/40 border border-rose-700/40 text-rose-200' : 'bg-rose-50 border border-rose-200 text-rose-600'}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isLogin ? (
            <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Username or Email</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                                className={`w-full rounded-2xl px-4 py-3 focus:outline-none transition-colors shadow-[0_12px_30px_rgba(148,163,184,0.12)] ${isDark ? 'bg-slate-950/70 border border-slate-700 text-slate-100 focus:border-amber-400' : 'bg-white/80 border border-white/90 text-slate-800 focus:border-sky-200'}`}
                placeholder="Username or Email"
                required
              />
            </div>
          ) : (
            <>
              <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                                    className={`w-full rounded-2xl px-4 py-3 focus:outline-none transition-colors shadow-[0_12px_30px_rgba(148,163,184,0.12)] ${isDark ? 'bg-slate-950/70 border border-slate-700 text-slate-100 focus:border-amber-400' : 'bg-white/80 border border-white/90 text-slate-800 focus:border-sky-200'}`}
                  placeholder="Username"
                  required
                />
              </div>
              <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                                    className={`w-full rounded-2xl px-4 py-3 focus:outline-none transition-colors shadow-[0_12px_30px_rgba(148,163,184,0.12)] ${isDark ? 'bg-slate-950/70 border border-slate-700 text-slate-100 focus:border-amber-400' : 'bg-white/80 border border-white/90 text-slate-800 focus:border-sky-200'}`}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full rounded-2xl px-4 py-3 focus:outline-none transition-colors shadow-[0_12px_30px_rgba(148,163,184,0.12)] ${isDark ? 'bg-slate-950/70 border border-slate-700 text-slate-100 focus:border-amber-400' : 'bg-white/80 border border-white/90 text-slate-800 focus:border-sky-200'}`}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-sky-500 to-cyan-400 text-white font-semibold rounded-2xl px-4 py-3 hover:brightness-105 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className={`mt-6 text-center text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-sky-600 hover:text-sky-700 underline transition-colors"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
