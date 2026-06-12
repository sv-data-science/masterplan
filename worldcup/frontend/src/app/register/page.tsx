'use client';
import { useState } from 'react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', display_name: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { setToken, setUser } = useAuthStore();
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const r = await authApi.register(form);
      setToken(r.data.access_token); setUser(r.data.user);
      toast.success('Account created! Start predicting!');
      router.push('/matches');
    } catch (err: any) { toast.error(err.response?.data?.detail ?? 'Registration failed'); }
    finally { setLoading(false); }
  };

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({...p,[k]:e.target.value}));

  return (
    <div className="max-w-sm mx-auto mt-16">
      <div className="card p-8">
        <div className="text-center mb-6"><span className="text-4xl">🏆</span><h1 className="text-2xl font-bold text-white mt-2">Create account</h1><p className="text-gray-400 text-sm mt-1">Join your friends in WC 2026</p></div>
        <form onSubmit={submit} className="space-y-4">
          <div><label className="block text-sm text-gray-400 mb-1">Display name</label><input value={form.display_name} onChange={f('display_name')} className="input" placeholder="Your name" required autoFocus /></div>
          <div><label className="block text-sm text-gray-400 mb-1">Username</label><input value={form.username} onChange={f('username')} className="input" placeholder="cooluser" required /></div>
          <div><label className="block text-sm text-gray-400 mb-1">Email</label><input type="email" value={form.email} onChange={f('email')} className="input" placeholder="you@example.com" required /></div>
          <div><label className="block text-sm text-gray-400 mb-1">Password</label><input type="password" value={form.password} onChange={f('password')} className="input" placeholder="••••••••" required minLength={6} /></div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">{loading?'Creating…':'Create account'}</button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">Already have one? <Link href="/login" className="text-green-400 hover:underline">Sign in</Link></p>
        <p className="text-center text-xs text-gray-600 mt-2">First to register becomes admin</p>
      </div>
    </div>
  );
}
