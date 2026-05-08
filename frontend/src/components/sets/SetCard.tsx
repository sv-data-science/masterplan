'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Package, Star } from 'lucide-react';
import { LegoSet } from '@/types';
import { cn, formatCurrency, getAvailabilityColor, getAvailabilityLabel } from '@/lib/utils';

interface SetCardProps {
  set: LegoSet;
  collectionStatus?: string;
  onAddToCollection?: () => void;
  onAddToWishlist?: () => void;
}

export default function SetCard({ set, collectionStatus, onAddToCollection, onAddToWishlist }: SetCardProps) {
  return (
    <Link href={`/sets/${set.id}`} className="card-hover group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl bg-white/5">
        {set.image_url ? (
          <Image src={set.image_url} alt={set.name} fill className="object-contain p-4 group-hover:scale-105 transition-transform duration-300" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={48} className="text-white/20" />
          </div>
        )}
        {set.retiring_soon && (
          <div className="absolute top-2 left-2 badge bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            Retiring Soon
          </div>
        )}
        {set.is_retired && (
          <div className="absolute top-2 left-2 badge bg-red-500/20 text-red-400 border border-red-500/30">
            Retired
          </div>
        )}
        {collectionStatus === 'owned' && (
          <div className="absolute top-2 right-2 badge bg-green-500/20 text-green-400 border border-green-500/30">
            Owned
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="text-xs text-white/40 font-mono">{set.set_number}</p>
            <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2">{set.name}</h3>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-lego-blue/20 text-lego-blue border border-lego-blue/30">
            {set.theme}
          </span>
          <span className="text-xs text-white/40">{set.year}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-white/50 mb-3">
          <span>{set.pieces?.toLocaleString()} pcs</span>
          {set.minifigs > 0 && <span>{set.minifigs} figs</span>}
          {set.msrp > 0 && <span className="text-white/70 font-medium">{formatCurrency(set.msrp)}</span>}
        </div>

        {set.estimated_value && set.estimated_value > set.msrp && (
          <div className="flex items-center gap-1 mb-3 text-xs text-green-400">
            <Star size={10} className="fill-current" />
            <span>~{formatCurrency(set.estimated_value)} est. value</span>
          </div>
        )}

        <div className={cn('badge w-full justify-center text-xs', getAvailabilityColor(set.availability))}>
          {getAvailabilityLabel(set.availability)}
        </div>

        {(onAddToCollection || onAddToWishlist) && (
          <div className="flex gap-2 mt-3" onClick={(e) => e.preventDefault()}>
            {onAddToCollection && (
              <button onClick={onAddToCollection} className="flex-1 btn-primary text-xs py-1.5">
                Add to Collection
              </button>
            )}
            {onAddToWishlist && (
              <button onClick={onAddToWishlist} className="p-1.5 btn-secondary">
                <Heart size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
