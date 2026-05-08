'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Package } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import SetCard from '@/components/sets/SetCard';
import { setsApi, collectionApi } from '@/lib/api';
import { LegoSet } from '@/types';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';

const THEMES = ['Star Wars', 'Harry Potter', 'Technic', 'City', 'Creator', 'Marvel', 'Architecture', 'Ideas', 'Speed Champions', 'Minecraft'];
const YEARS = Array.from({ length: 10 }, (_, i) => 2024 - i);

export default function CatalogPage() {
  const [search, setSearch] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [page, setPage] = useState(1);
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['sets', search, selectedTheme, selectedYear, page],
    queryFn: () => setsApi.list({
      q: search || undefined,
      theme: selectedTheme || undefined,
      year: selectedYear ? parseInt(selectedYear) : undefined,
      page,
      size: 24,
    }).then(r => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: themes } = useQuery({
    queryKey: ['themes'],
    queryFn: () => setsApi.themes().then(r => r.data),
  });

  const handleAddToCollection = async (set: LegoSet) => {
    if (!user) { toast.error('Sign in to add to collection'); return; }
    try {
      await collectionApi.add({ set_id: set.id, status: 'owned' });
      toast.success(`${set.name} added to collection!`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to add');
    }
  };

  const handleAddToWishlist = async (set: LegoSet) => {
    if (!user) { toast.error('Sign in to add to wishlist'); return; }
    try {
      await collectionApi.add({ set_id: set.id, status: 'wishlist' });
      toast.success(`${set.name} added to wishlist!`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Already in wishlist');
    }
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">LEGO Catalog</h1>
          <p className="text-white/50">Browse and add sets to your collection</p>
        </div>

        {/* Search & filters */}
        <div className="card p-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search sets by name or number..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="input-field w-full pl-10"
              />
            </div>
            <select
              value={selectedTheme}
              onChange={e => { setSelectedTheme(e.target.value); setPage(1); }}
              className="input-field min-w-[150px]"
            >
              <option value="">All Themes</option>
              {(themes || THEMES).map((t: string) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={selectedYear}
              onChange={e => { setSelectedYear(e.target.value); setPage(1); }}
              className="input-field min-w-[120px]"
            >
              <option value="">All Years</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-[4/3] bg-white/5 rounded-t-2xl" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-white/5 rounded" />
                  <div className="h-4 bg-white/10 rounded" />
                  <div className="h-3 bg-white/5 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : data?.items?.length === 0 ? (
          <div className="text-center py-24">
            <Package size={48} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/40 text-lg">No sets found</p>
            <p className="text-white/30 text-sm mt-1">Try adjusting your search filters</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/50 text-sm">{data?.total?.toLocaleString()} sets found</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {data?.items?.map((set: LegoSet) => (
                <SetCard
                  key={set.id}
                  set={set}
                  onAddToCollection={() => handleAddToCollection(set)}
                  onAddToWishlist={() => handleAddToWishlist(set)}
                />
              ))}
            </div>
            {/* Pagination */}
            {data && data.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-4 py-2 disabled:opacity-30">
                  Previous
                </button>
                <span className="text-white/50 text-sm">Page {page} of {data.pages}</span>
                <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages} className="btn-secondary px-4 py-2 disabled:opacity-30">
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
