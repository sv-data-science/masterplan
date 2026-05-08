'use client';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Package, Trash2, Star } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { collectionApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { CollectionItem } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

const STATUS_TABS = [
  { value: 'owned', label: 'Owned' },
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'previously_owned', label: 'Previously Owned' },
];

export default function CollectionPage() {
  const [activeStatus, setActiveStatus] = useState('owned');
  const { user } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => { if (!user) router.push('/login'); }, [user, router]);

  const { data: items, isLoading } = useQuery({
    queryKey: ['collection', activeStatus],
    queryFn: () => collectionApi.list({ status: activeStatus }).then(r => r.data),
    enabled: !!user,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => collectionApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection'] });
      qc.invalidateQueries({ queryKey: ['collection-stats'] });
      toast.success('Removed from collection');
    },
  });

  if (!user) return null;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">My Collection</h1>
            <p className="text-white/50 mt-1">All your LEGO sets and minifigures</p>
          </div>
          <Link href="/catalog" className="btn-primary">Browse Catalog</Link>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 mb-8 border-b border-white/10 pb-0">
          {STATUS_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setActiveStatus(value)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors -mb-px',
                activeStatus === value
                  ? 'border-lego-red text-white bg-lego-red/10'
                  : 'border-transparent text-white/50 hover:text-white'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="card animate-pulse h-64" />
            ))}
          </div>
        ) : !items || items.length === 0 ? (
          <div className="text-center py-24">
            <Package size={56} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/50 text-lg font-medium">
              {activeStatus === 'owned' ? 'No sets in your collection yet' : activeStatus === 'wishlist' ? 'Your wishlist is empty' : 'No previously owned sets'}
            </p>
            <p className="text-white/30 text-sm mt-2">Browse the catalog to add some!</p>
            <Link href="/catalog" className="btn-primary mt-4 inline-block">Browse Catalog</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map((item: CollectionItem) => {
              const s = item.set;
              if (!s) return null;
              return (
                <div key={item.id} className="card-hover group relative">
                  <Link href={`/sets/${s.id}`}>
                    <div className="relative aspect-[4/3] bg-white/5 rounded-t-2xl overflow-hidden">
                      {s.image_url ? (
                        <Image src={s.image_url} alt={s.name} fill className="object-contain p-3" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={36} className="text-white/20" />
                        </div>
                      )}
                      {item.is_sealed && (
                        <div className="absolute bottom-2 left-2 badge bg-lego-blue/20 text-lego-blue border border-lego-blue/30 text-xs">Sealed</div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-white/30 font-mono">{s.set_number}</p>
                      <p className="text-sm font-semibold text-white leading-tight line-clamp-2 mt-0.5">{s.name}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-white/40">{s.theme} · {s.year}</span>
                        {s.estimated_value && (
                          <span className="text-xs text-green-400 font-medium">{formatCurrency(s.estimated_value)}</span>
                        )}
                      </div>
                      {item.quantity > 1 && (
                        <div className="mt-1 text-xs text-lego-yellow">×{item.quantity}</div>
                      )}
                    </div>
                  </Link>
                  <button
                    onClick={() => removeMutation.mutate(item.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg transition-all"
                  >
                    <Trash2 size={12} className="text-white" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
