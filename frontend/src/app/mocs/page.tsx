'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Plus, Wrench } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { mocsApi, api } from '@/lib/api';
import { MOC } from '@/types';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function MOCsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', theme: '', images: '', piece_count: '' });
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: mocs, isLoading } = useQuery({
    queryKey: ['mocs'],
    queryFn: () => mocsApi.list().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const images = form.images ? form.images.split('\n').map((s) => s.trim()).filter(Boolean) : [];
      return api.post('/mocs', {
        title: form.title,
        description: form.description || undefined,
        theme: form.theme || undefined,
        images,
        piece_count: form.piece_count ? parseInt(form.piece_count) : undefined,
        tags: [],
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mocs'] });
      toast.success('MOC published!');
      setShowCreate(false);
      setForm({ title: '', description: '', theme: '', images: '', piece_count: '' });
    },
    onError: () => toast.error('Failed to publish MOC'),
  });

  const likeMutation = useMutation({
    mutationFn: (moc: MOC) => moc.liked_by_me ? mocsApi.unlike(moc.id) : mocsApi.like(moc.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mocs'] }),
  });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">MOCs & Fan Creations</h1>
            <p className="text-white/50 mt-1">Community LEGO builds and original designs</p>
          </div>
          {user && (
            <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Share a MOC
            </button>
          )}
        </div>

        {showCreate && (
          <div className="card p-6 mb-8">
            <h2 className="font-bold text-white mb-4">Share Your MOC</h2>
            <div className="space-y-4">
              <input placeholder="MOC Title *" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} className="input-field w-full" />
              <textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="input-field w-full h-24 resize-none" />
              <div className="grid sm:grid-cols-2 gap-4">
                <input placeholder="Theme (e.g. Star Wars, City...)" value={form.theme} onChange={e => setForm(f => ({...f, theme: e.target.value}))} className="input-field w-full" />
                <input placeholder="Piece count" type="number" value={form.piece_count} onChange={e => setForm(f => ({...f, piece_count: e.target.value}))} className="input-field w-full" />
              </div>
              <textarea placeholder="Image URLs (one per line)" value={form.images} onChange={e => setForm(f => ({...f, images: e.target.value}))} className="input-field w-full h-20 resize-none text-sm font-mono" />
              <div className="flex gap-3">
                <button onClick={() => createMutation.mutate()} disabled={!form.title || createMutation.isPending} className="btn-primary disabled:opacity-50">
                  {createMutation.isPending ? 'Publishing...' : 'Publish MOC'}
                </button>
                <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({length: 6}).map((_,i) => <div key={i} className="card animate-pulse h-64" />)}
          </div>
        ) : !mocs?.length ? (
          <div className="text-center py-24">
            <Wrench size={56} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/50 text-lg">No MOCs yet — be the first to share!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mocs.map((moc: MOC) => (
              <div key={moc.id} className="card-hover overflow-hidden">
                <div className="aspect-video bg-white/5 relative">
                  {moc.images?.[0] ? (
                    <Image src={moc.images[0]} alt={moc.title} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Wrench size={40} className="text-white/20" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-white mb-1">{moc.title}</h3>
                  {moc.description && <p className="text-white/60 text-sm line-clamp-2 mb-3">{moc.description}</p>}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {moc.theme && <span className="badge bg-lego-blue/20 text-lego-blue border border-lego-blue/30">{moc.theme}</span>}
                      {moc.piece_count && <span className="text-xs text-white/40">{moc.piece_count.toLocaleString()} pcs</span>}
                    </div>
                    <button
                      onClick={() => user && likeMutation.mutate(moc)}
                      className={`flex items-center gap-1.5 text-sm transition-colors ${moc.liked_by_me ? 'text-red-400' : 'text-white/40 hover:text-red-400'}`}
                    >
                      <Heart size={14} className={moc.liked_by_me ? 'fill-current' : ''} />
                      {moc.likes}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
