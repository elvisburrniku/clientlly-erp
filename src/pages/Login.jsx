import { useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        }).then(async r => {
          if (!r.ok) {
            const d = await r.json();
            throw new Error(d.error || 'Login failed');
          }
          return r.json();
        });
      } else {
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password, full_name: fullName }),
        }).then(async r => {
          if (!r.ok) {
            const d = await r.json();
            throw new Error(d.error || 'Registration failed');
          }
          return r.json();
        });
      }
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next') || '/';
      window.location.href = next;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">ERP Finance</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {mode === 'login' ? 'Hyni në llogarinë tuaj' : 'Krijoni llogarinë tuaj'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Emri i plotë</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Emri Mbiemri"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="email@shembull.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fjalëkalimi</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? 'Duke u ngarkuar...' : mode === 'login' ? 'Hyr' : 'Regjistrohu'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          {mode === 'login' ? (
            <>Nuk keni llogari?{' '}
              <button onClick={() => { setMode('register'); setError(''); }} className="text-slate-900 font-medium hover:underline">
                Regjistrohu
              </button>
            </>
          ) : (
            <>Keni llogari?{' '}
              <button onClick={() => { setMode('login'); setError(''); }} className="text-slate-900 font-medium hover:underline">
                Hyni
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
