'use client';
import { useState } from 'react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setToken, setUser } = useAuthStore();
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const r = await authApi.login(email, password);
      setToken(r.data.access_token); setUser(r.data.user);
      toast.success(`Welcome back, ${r.data.user.display_name}!`);
      router.push('/');
    } catch (err: any) { toast.error(err.response?.data?.detail ?? 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-sm mx-auto mt-16">
      <div className="card p-8">
        <div className="text-center mb-6"><span className="text-4xl">⚽</span><h1 className="text-2xl font-bold text-white mt-2">Sign in</h1><p className="text-gray-400 text-sm mt-1">World Cup 2026 Predictor</p></div>
        <form onSubmit={submit} className="space-y-4">
          <div><label className="block text-sm text-gray-400 mb-1">Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input" placeholder="you@example.com" required autoFocus /></div>
          <div><label className="block text-sm text-gray-400 mb-1">Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="input" placeholder="••••••••" required /></div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">No account? <Link href="/register" className="text-green-400 hover:underline">Sign up</Link></p>
      </div>
    </div>
  );
}
