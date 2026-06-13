import { Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/ui';
import type { CompensationPlan } from '@/lib/affiliate';

/** Visualizes the 7 unilevel rates, marking which ones the user has unlocked. */
export function LevelLadder({ plan, unlocked }: { plan: CompensationPlan; unlocked: number }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {plan.unilevel.map((l) => {
        const open = l.level <= unlocked;
        return (
          <div
            key={l.level}
            className={cn(
              'rounded-md border px-2 py-2 text-center transition-colors',
              open
                ? 'border-accent/40 bg-accent-soft/40 text-fg'
                : 'border-border bg-surface-sunk/40 text-fg-muted'
            )}
            title={`${l.relationship} · unlocked at ${l.unlockRank}`}
          >
            <div className="text-[10px] uppercase tracking-wider text-fg-muted">L{l.level}</div>
            <div className="mt-1 text-[15px] font-semibold tabular">{l.rate}%</div>
            <div className="mt-1.5 flex justify-center">
              {open
                ? <Unlock className="size-3 text-accent" />
                : <Lock   className="size-3 text-fg-subtle" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
