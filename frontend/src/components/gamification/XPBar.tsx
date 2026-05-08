import { xpForNextLevel, getLevelTitle } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface XPBarProps {
  xp: number;
  level: number;
  className?: string;
}

export default function XPBar({ xp, level, className }: XPBarProps) {
  const nextLevelXP = xpForNextLevel(level);
  const currentLevelXP = xpForNextLevel(level - 1);
  const progress = Math.min(((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100, 100);

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-lego-yellow">Level {level} · {getLevelTitle(level)}</span>
        <span className="text-white/50">{xp.toLocaleString()} / {nextLevelXP.toLocaleString()} XP</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-lego-yellow to-lego-orange rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
