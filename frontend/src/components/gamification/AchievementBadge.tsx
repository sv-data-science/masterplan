import { Achievement } from '@/types';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

const rarityStyles = {
  bronze: 'from-orange-900/50 to-orange-800/30 border-orange-600/40 text-orange-400',
  silver: 'from-slate-700/50 to-slate-600/30 border-slate-400/40 text-slate-300',
  gold: 'from-yellow-900/50 to-yellow-800/30 border-yellow-500/40 text-yellow-400',
  platinum: 'from-purple-900/50 to-purple-800/30 border-purple-500/40 text-purple-400',
};

export default function AchievementBadge({ achievement, size = 'md' }: { achievement: Achievement; size?: 'sm' | 'md' | 'lg' }) {
  const locked = !achievement.unlocked;
  const sizeClasses = { sm: 'w-12 h-12 text-2xl', md: 'w-16 h-16 text-3xl', lg: 'w-20 h-20 text-4xl' };

  return (
    <div className={cn('group relative flex flex-col items-center gap-2', locked && 'opacity-40')}>
      <div className={cn(
        'rounded-2xl border bg-gradient-to-b flex items-center justify-center shadow-lg',
        sizeClasses[size],
        rarityStyles[achievement.rarity]
      )}>
        {locked ? <Lock size={size === 'sm' ? 16 : size === 'md' ? 20 : 24} /> : <span>{achievement.icon}</span>}
      </div>
      {size !== 'sm' && (
        <div className="text-center">
          <p className="text-xs font-semibold text-white/90 leading-tight">{achievement.name}</p>
          {size === 'lg' && <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{achievement.description}</p>}
        </div>
      )}
      {/* Tooltip */}
      <div className="absolute -top-14 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 bg-lego-dark border border-white/20 rounded-xl px-3 py-2 text-xs text-white whitespace-nowrap shadow-xl">
        <p className="font-semibold">{achievement.name}</p>
        <p className="text-white/60">{achievement.description}</p>
        <p className="text-lego-yellow mt-0.5">+{achievement.xp_reward} XP</p>
      </div>
    </div>
  );
}
