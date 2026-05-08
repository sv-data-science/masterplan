'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', display_name: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const { setToken, setUser } = useAuthStore();
  const router = useRouter();

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const { data } = await authApi.register({ username: form.username, email: form.email, display_name: form.display_name, password: form.password });
      setToken(data.access_token);
      const { data: user } = await authApi.me();
      setUser(user);
      toast.success('Welcome to BrickVault!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-hero-gradient">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-lego-red rounded-2xl flex items-center justify-center font-black text-white text-2xl mx-auto mb-4">BV</div>
          <h1 className="text-3xl font-black text-white">Join BrickVault</h1>
          <p className="text-white/50 mt-2">Start tracking your LEGO collection today</p>
        </div>
        <form onSubmit={handleSubmit} className="card p-8 space-y-4">
          {[
            { field: 'display_name', label: 'Display Name', type: 'text', placeholder: 'The LEGO Maniac' },
            { field: 'username', label: 'Username', type: 'text', placeholder: 'legobuilder42' },
            { field: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
            { field: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
            { field: 'confirm', label: 'Confirm Password', type: 'password', placeholder: '••••••••' },
          ].map(({ field, label, type, placeholder }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-white/70 mb-1.5">{label}</label>
              <input type={type} value={(form as any)[field]} onChange={update(field)} required
                className="input-field w-full" placeholder={placeholder} />
            </div>
          ))}
          <button type="submit" disabled={loading} className="btn-yellow w-full py-3 mt-2 disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create Free Account'}
          </button>
          <p className="text-center text-xs text-white/30">
            By joining you agree this is a fan app unaffiliated with the LEGO Group.
          </p>
          <p className="text-center text-sm text-white/50">
            Already have an account?{' '}
            <Link href="/login" className="text-lego-yellow hover:text-yellow-300">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
