'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import {
  Package, Calendar, Users, DollarSign, TrendingUp, Heart, Plus,
  ExternalLink, ArrowLeft, AlertCircle, Tag, Star, CheckCircle2
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import SetCard from '@/components/sets/SetCard';
import { setsApi, collectionApi } from '@/lib/api';
import { LegoSet } from '@/types';
import { cn, formatCurrency, formatNumber, getAvailabilityColor, getAvailabilityLabel } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

type Status = 'owned' | 'wishlist' | 'previously_owned';
type Condition = 'sealed' | 'opened' | 'incomplete' | 'damaged';

export default function SetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const [status, setStatus] = useState<Status>('owned');
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState<Condition>('opened');
  const [isSealed, setIsSealed] = useState(false);
  const [isComplete, setIsComplete] = useState(true);
  const [notes, setNotes] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');

  const { data: set, isLoading, error } = useQuery({
    queryKey: ['set', id],
    queryFn: () => setsApi.get(id).then((r) => r.data as LegoSet),
    enabled: !!id,
    retry: false,
  });

  const { data: related } = useQuery({
    queryKey: ['related-sets', set?.theme],
    queryFn: () => setsApi.list({ theme: set?.theme, size: 6 }).then((r) => r.data),
    enabled: !!set?.theme,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      collectionApi.add({
        set_id: id,
        status,
        quantity,
        condition: status === 'owned' ? condition : undefined,
        is_sealed: status === 'owned' ? isSealed : undefined,
        is_complete: status === 'owned' ? isComplete : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection'] });
      qc.invalidateQueries({ queryKey: ['collection-stats'] });
      const labels: Record<Status, string> = {
        owned: 'collection',
        wishlist: 'wishlist',
        previously_owned: 'previously owned',
      };
      toast.success(`Added to ${labels[status]}!`);
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      toast.error(detail || 'Failed to add to collection');
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
          <div className="h-6 bg-white/5 rounded w-32 mb-6" />
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="aspect-square bg-white/5 rounded-2xl" />
            <div className="space-y-4">
              <div className="h-4 bg-white/5 rounded w-24" />
              <div className="h-10 bg-white/10 rounded w-3/4" />
              <div className="h-6 bg-white/5 rounded w-1/2" />
              <div className="h-32 bg-white/5 rounded" />
              <div className="h-12 bg-white/10 rounded" />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !set) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <AlertCircle size={48} className="text-white/20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Set Not Found</h1>
          <p className="text-white/50 mb-6">This set doesn&apos;t exist in our catalog.</p>
          <Link href="/catalog" className="btn-primary">Browse Catalog</Link>
        </div>
      </AppShell>
    );
  }

  const valueDelta = set.estimated_value && set.msrp ? set.estimated_value - set.msrp : 0;
  const valuePct = set.msrp ? (valueDelta / set.msrp) * 100 : 0;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image column */}
          <div className="space-y-4">
            <div className="card aspect-square relative overflow-hidden bg-white/5">
              {set.image_url ? (
                <Image
                  src={set.image_url}
                  alt={set.name}
                  fill
                  className="object-contain p-8"
                  unoptimized
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package size={96} className="text-white/10" />
                </div>
              )}
              {set.is_retired && (
                <div className="absolute top-4 left-4 badge bg-red-500/20 text-red-400 border border-red-500/30 text-sm px-3 py-1">
                  Retired
                </div>
              )}
              {set.retiring_soon && !set.is_retired && (
                <div className="absolute top-4 left-4 badge bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-sm px-3 py-1">
                  Retiring Soon
                </div>
              )}
            </div>

            {/* Quick facts grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-4">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <Calendar size={12} /> Release Year
                </div>
                <div className="text-xl font-bold text-white">{set.year}</div>
              </div>
              <div className="card p-4">
                <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                  <Package size={12} /> Pieces
                </div>
                <div className="text-xl font-bold text-white">{formatNumber(set.pieces || 0)}</div>
              </div>
              {(set.minifigs ?? 0) > 0 && (
                <div className="card p-4">
                  <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                    <Users size={12} /> Minifigures
                  </div>
                  <div className="text-xl font-bold text-white">{set.minifigs}</div>
                </div>
              )}
              {set.msrp ? (
                <div className="card p-4">
                  <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                    <DollarSign size={12} /> Original MSRP
                  </div>
                  <div className="text-xl font-bold text-white">{formatCurrency(set.msrp, set.currency)}</div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Info / actions column */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-sm text-white/40">#{set.set_number}</span>
                <span className={cn('badge', getAvailabilityColor(set.availability))}>
                  {getAvailabilityLabel(set.availability)}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-3">
                {set.name}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/catalog?theme=${encodeURIComponent(set.theme)}`}
                  className="badge bg-lego-blue/20 text-lego-blue border border-lego-blue/30 hover:bg-lego-blue/30 transition-colors"
                >
                  <Tag size={10} /> {set.theme}
                </Link>
                {set.subtheme && (
                  <span className="badge bg-white/10 text-white/70 border border-white/20">
                    {set.subtheme}
                  </span>
                )}
              </div>
            </div>

            {set.description && (
              <p className="text-white/70 leading-relaxed">{set.description}</p>
            )}

            {/* Value section */}
            {(set.estimated_value || set.msrp) && (
              <div className="card p-5 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
                <div className="flex items-center gap-2 text-green-400 text-xs font-semibold mb-3">
                  <TrendingUp size={12} /> ESTIMATED MARKET VALUE
                </div>
                <div className="flex items-end gap-4 flex-wrap">
                  {set.estimated_value && (
                    <div>
                      <div className="text-3xl font-black text-white">
                        {formatCurrency(set.estimated_value, set.currency)}
                      </div>
                      <div className="text-xs text-white/40 mt-0.5">Average secondary market</div>
                    </div>
                  )}
                  {valueDelta > 0 && set.msrp && (
                    <div className="ml-auto text-right">
                      <div className="text-green-400 font-bold">
                        +{formatCurrency(valueDelta, set.currency)} ({valuePct.toFixed(0)}%)
                      </div>
                      <div className="text-xs text-white/40 mt-0.5">vs. original MSRP</div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-white/30 mt-3 leading-relaxed">
                  Estimates are informational only, sourced from public sold-listing data. BrickVault is not a marketplace.
                </p>
              </div>
            )}

            {/* Add to collection */}
            {user ? (
              <div className="card p-5 space-y-4">
                <h2 className="font-bold text-white flex items-center gap-2">
                  <Plus size={16} /> Add to Your Collection
                </h2>

                {/* Status pills */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'owned', label: 'Own It', icon: CheckCircle2 },
                    { value: 'wishlist', label: 'Want It', icon: Heart },
                    { value: 'previously_owned', label: 'Previously', icon: Star },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setStatus(value as Status)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all',
                        status === value
                          ? 'bg-lego-red/20 border-lego-red/50 text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>

                {status === 'owned' && (
                  <div className="space-y-3 pt-2 border-t border-white/10">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-white/50 mb-1.5">Quantity</label>
                        <input
                          type="number"
                          min={1}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="input-field w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/50 mb-1.5">Condition</label>
                        <select
                          value={condition}
                          onChange={(e) => setCondition(e.target.value as Condition)}
                          className="input-field w-full"
                        >
                          <option value="sealed">Sealed</option>
                          <option value="opened">Opened</option>
                          <option value="incomplete">Incomplete</option>
                          <option value="damaged">Damaged</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSealed}
                          onChange={(e) => setIsSealed(e.target.checked)}
                          className="rounded border-white/20 bg-white/5"
                        />
                        <span className="text-white/70">Sealed in box</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isComplete}
                          onChange={(e) => setIsComplete(e.target.checked)}
                          className="rounded border-white/20 bg-white/5"
                        />
                        <span className="text-white/70">Complete</span>
                      </label>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => addMutation.mutate()}
                  disabled={addMutation.isPending}
                  className="btn-primary w-full py-3 disabled:opacity-50"
                >
                  {addMutation.isPending ? 'Adding...' : `Add to ${status === 'owned' ? 'Collection' : status === 'wishlist' ? 'Wishlist' : 'Previously Owned'}`}
                </button>
              </div>
            ) : (
              <div className="card p-5 text-center">
                <p className="text-white/60 mb-3">Sign in to track this set in your collection</p>
                <Link href="/login" className="btn-primary inline-block">Sign In</Link>
              </div>
            )}

            {set.brickset_url && (
              <a
                href={set.brickset_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                <ExternalLink size={12} /> View on Rebrickable
              </a>
            )}
          </div>
        </div>

        {/* Related sets */}
        {related?.items && related.items.length > 1 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">More from {set.theme}</h2>
              <Link
                href={`/catalog?theme=${encodeURIComponent(set.theme)}`}
                className="text-sm text-lego-yellow hover:text-yellow-300"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {related.items
                .filter((s: LegoSet) => s.id !== set.id)
                .slice(0, 5)
                .map((s: LegoSet) => (
                  <SetCard key={s.id} set={s} />
                ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-12 text-center text-xs text-white/20 max-w-2xl mx-auto">
          Set images and data sourced from public LEGO catalog data.
          BrickVault is an unofficial fan app and is not affiliated with the LEGO Group.
        </div>
      </div>
    </AppShell>
  );
}
