import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="min-h-screen bg-[#f7f8f5] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1
            className="text-[#1a2a1a] text-2xl"
            style={{ fontFamily: 'Playfair Display, serif', fontWeight: 500 }}
          >
            Client.Portal
          </h1>
          <p
            className="text-[#7a8a7a] text-sm mt-1"
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            Sign in to your account
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#eceee6] rounded-xl p-6 shadow-sm">

          {/* Email */}
          <div className="mb-4">
            <label
              className="block text-xs font-medium text-[#4a5a4a] mb-1.5 uppercase tracking-wide"
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="you@example.com"
              className="w-full px-3 py-2 text-sm bg-[#f7f8f5] border border-[#eceee6] rounded-md outline-none focus:border-[#2d7a2d] transition-colors text-[#1a2a1a]"
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
            />
          </div>

          {/* Password */}
          <div className="mb-5">
            <label
              className="block text-xs font-medium text-[#4a5a4a] mb-1.5 uppercase tracking-wide"
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm bg-[#f7f8f5] border border-[#eceee6] rounded-md outline-none focus:border-[#2d7a2d] transition-colors text-[#1a2a1a]"
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-4 px-3 py-2 bg-[#fde8e8] border border-[#f5c0c0] rounded-md text-sm text-[#c0392b]"
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-2 bg-[#2d7a2d] text-white text-sm rounded-md hover:bg-[#256425] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}