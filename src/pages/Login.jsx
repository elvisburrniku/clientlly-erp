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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-indigo-50/40 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md anim-rise">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200 mb-4">
            <span className="text-white font-extrabold text-lg">C</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Clientlly ERP</h1>
          <p className="text-gray-500 mt-1 text-sm font-normal">
            {mode === 'login' ? 'Hyni në llogarinë tuaj' : 'Krijoni llogarinë tuaj'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Emri i plotë</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                  placeholder="Emri Mbiemri"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                data-testid="input-email"
                className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                placeholder="email@shembull.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fjalëkalimi</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                data-testid="input-password"
                className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              data-testid="button-login"
              className="w-full inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? 'Duke u ngarkuar...' : mode === 'login' ? 'Hyr' : 'Regjistrohu'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            {mode === 'login' ? (
              <>Nuk keni llogari?{' '}
                <button onClick={() => { setMode('register'); setError(''); }} className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">
                  Regjistrohu
                </button>
              </>
            ) : (
              <>Keni llogari?{' '}
                <button onClick={() => { setMode('login'); setError(''); }} className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">
                  Hyni
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Clientlly ERP · Të gjitha të drejtat e rezervuara
        </p>
      </div>
    </div>
  );
}
