'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Megaphone, MapPin, CalendarDays, Hotel, Plane, Users, Target, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { cn, formatDateRange, formatMoney, daysBetween } from '@/lib/ui';
import { rankByKey, type AffiliateMe, type CompensationPlan, type RankKey } from '@/lib/affiliate';

export type AnnouncementCategory = 'office_opening' | 'trip' | 'webinar' | 'general';

export type Announcement = {
  id: number | string;
  title: string;
  subtitle?: string;
  body?: string;
  background_image?: string;
  category: AnnouncementCategory;
  event_start?: string | null;
  event_end?: string | null;
  location?: string;
  hotel_covered?: boolean;
  flight_covered?: boolean;
  qualification_start?: string | null;
  qualification_end?: string | null;
  spots_total: number;
  spots_filled: number;
  volume_weights?: Record<string, number>;
  volume_target_usd?: number | string;
  rank_target?: string;
  sort_order?: number;
  is_published?: boolean;
  date_created?: string;
  date_updated?: string;
};

type Props = {
  announcement: Announcement;
  /** Other published announcements — used in the "Official Events" footer. */
  siblings?: Announcement[];
  /** Optional live position for the qualification gauge. */
  me?: AffiliateMe | null;
  plan?: CompensationPlan | null;
  /** Compact mode used in the hero — drops the qualification panel. */
  compact?: boolean;
  className?: string;
};

const CATEGORY_LABEL: Record<AnnouncementCategory, string> = {
  office_opening: 'Global launch',
  trip:           'Trip / event',
  webinar:        'Webinar',
  general:        'Announcement',
};

const CATEGORY_TONE: Record<AnnouncementCategory, 'warning' | 'info' | 'accent' | 'neutral'> = {
  office_opening: 'warning',
  trip:           'info',
  webinar:        'accent',
  general:        'neutral',
};

export function AnnouncementCard({
  announcement,
  siblings = [],
  me = null,
  plan = null,
  compact = false,
  className,
}: Props) {
  // Forced dark palette — the card sits on top of a photo, so all text
  // stays white in BOTH themes. Don't use `text-fg-inverse` (that
  // swaps per theme and disappears in light mode against the dark bg).
  const TXT       = 'text-white';
  const TXT_SUB   = 'text-white/80';
  const TXT_MUTED = 'text-white/60';
  const BADGE_BG  = 'bg-black/55 border-white/25';
  const PILL_BG   = 'bg-white/10 border-white/20 hover:bg-white/15';

  const bg = announcement.background_image || '/announcements/nyc.svg';
  const tone = CATEGORY_TONE[announcement.category] ?? 'warning';

  // The user's current weighted volume (sum of level weights * team volume
  // at each level) vs the target. Backend only exposes a single
  // teamVolumeUsd, so we approximate level contribution: L1 = 100% of
  // team volume, L2 = 40% of (team - direct volume), L3 = 20% of (team -
  // L2's coverage). This is intentionally approximate — the real per-level
  // split needs a backend endpoint we don't yet have.
  const myWeighted = useMemo(() => {
    if (!me) return 0;
    const w = announcement.volume_weights ?? {};
    const lvl1 = (w['1'] ?? 0) / 100;
    const lvl2 = (w['2'] ?? 0) / 100;
    const lvl3 = (w['3'] ?? 0) / 100;
    const tv   = me.teamVolumeUsd ?? 0;
    const direct = me.personalInvestUsd ?? 0; // proxy: personal volume
    return lvl1 * direct + lvl2 * Math.max(0, tv - direct) * 0.6 + lvl3 * Math.max(0, tv - direct) * 0.4;
  }, [me, announcement.volume_weights]);

  const target = parseFloat(String(announcement.volume_target_usd ?? 0)) || 0;
  const volPct = target > 0 ? Math.min(100, (myWeighted / target) * 100) : 0;

  const currentRank = me && plan ? rankByKey(plan, me.rank as RankKey) : null;
  const targetRank  = me && plan && announcement.rank_target
    ? rankByKey(plan, announcement.rank_target as RankKey)
    : null;
  const rankMet = currentRank && targetRank
    ? plan!.ranks.findIndex((r) => r.key === currentRank.key) >=
      plan!.ranks.findIndex((r) => r.key === targetRank.key)
    : false;

  const spotsPct = announcement.spots_total > 0
    ? Math.min(100, (announcement.spots_filled / announcement.spots_total) * 100)
    : 0;

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/10 shadow-[var(--shadow-lg)]',
        'text-white isolate',
        className,
      )}
    >
      {/* Background image — full bleed, with strong gradient overlay for legibility */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${bg})` }}
        aria-hidden
      />
      {/* Stronger overlay: top stays darker so the badge + title pop,
          bottom is near-opaque so the meta grid + pills stay readable. */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(180deg, rgba(10,8,20,0.55) 0%, rgba(10,8,20,0.78) 55%, rgba(10,8,20,0.96) 100%)',
        }}
        aria-hidden
      />

      <div className="relative p-5 md:p-6 flex flex-col gap-4 min-h-[320px]">
        {/* Top row — category badge + featured ribbon */}
        <div className="flex items-center justify-between gap-2">
          <Badge tone={tone} className={cn('backdrop-blur-sm', BADGE_BG)}>
            <Megaphone className="size-3" />{CATEGORY_LABEL[announcement.category]}
          </Badge>
          {announcement.event_start && (
            <span className={cn('text-[11px] uppercase tracking-wider font-semibold', TXT_SUB)}>
              {formatDateRange(announcement.event_start, announcement.event_end)}
            </span>
          )}
        </div>

        {/* Title + subtitle */}
        <div className="min-w-0">
          <h3 className={cn('text-[24px] md:text-[28px] font-semibold leading-tight tracking-tight line-clamp-2', TXT)}>
            {announcement.title}
          </h3>
          {announcement.subtitle && (
            <p className={cn('mt-1.5 text-[13px] md:text-[14px] line-clamp-2 leading-relaxed', TXT_SUB)}>
              {announcement.subtitle}
            </p>
          )}
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-auto">
          {announcement.location && (
            <Meta icon={<MapPin className="size-3.5" />} label="Location" value={announcement.location} />
          )}
          {announcement.event_start && (
            <Meta
              icon={<CalendarDays className="size-3.5" />}
              label="Ceremony"
              value={formatDateRange(announcement.event_start, announcement.event_end)}
            />
          )}
          {announcement.qualification_start && (
            <Meta
              icon={<CalendarDays className="size-3.5" />}
              label="Qualification window"
              value={formatDateRange(announcement.qualification_start, announcement.qualification_end)}
            />
          )}
          {announcement.spots_total > 0 && (
            <div className="text-[11px]">
              <div className={cn('flex items-center gap-1 mb-1.5', TXT_SUB)}>
                <Users className="size-3.5" />
                <span className="uppercase tracking-wider font-semibold">Spots</span>
              </div>
              <div className={cn('font-semibold tabular', TXT)}>
                {announcement.spots_filled} of {announcement.spots_total}
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${spotsPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Hotel / flight covered pills */}
        {(announcement.hotel_covered || announcement.flight_covered) && (
          <div className="flex flex-wrap gap-1.5">
            {announcement.hotel_covered && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-white border border-emerald-400/50">
                <Hotel className="size-3" /> Hotel covered
              </span>
            )}
            {announcement.flight_covered && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-white border border-emerald-400/50">
                <Plane className="size-3" /> Flight covered
              </span>
            )}
          </div>
        )}

        {/* Qualification paths — only on the full card, not the compact hero teaser */}
        {!compact && (target > 0 || announcement.rank_target) && (
          <div className="rounded-lg border border-white/20 bg-black/40 backdrop-blur-sm p-4 space-y-3">
            <div className={cn('flex items-center gap-2 text-[12px] uppercase tracking-wider font-semibold', TXT_SUB)}>
              <Trophy className="size-3.5" />Your qualification
              <span className={cn('ml-auto text-[11px] normal-case tracking-normal font-medium', TXT_MUTED)}>
                In progress
              </span>
            </div>

            {target > 0 && (
              <div>
                <div className="flex items-baseline justify-between text-[12px] mb-1.5">
                  <span className={cn('inline-flex items-center gap-1', TXT_SUB)}>
                    <Target className="size-3" />Path 1 — Weighted volume
                  </span>
                  <span className={cn('tabular font-semibold', TXT)}>
                    {formatMoney(myWeighted, { decimals: 0 })} / {formatMoney(target, { decimals: 0 })}
                  </span>
                </div>
                <Progress value={volPct} tone="accent" />
                {announcement.volume_weights && Object.keys(announcement.volume_weights).length > 0 && (
                  <div className={cn('mt-2 grid grid-cols-3 gap-2 text-[10px]', TXT_SUB)}>
                    {[1, 2, 3].map((lvl) => {
                      const w = announcement.volume_weights?.[String(lvl)] ?? 0;
                      return (
                        <div key={lvl} className="rounded border border-white/15 px-1.5 py-1">
                          <div className={cn('font-semibold', TXT)}>L{lvl} ×{w}%</div>
                          <div className="tabular">
                            {formatMoney(myWeighted * (w / 100), { decimals: 0 })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {announcement.rank_target && targetRank && (
              <div>
                <div className="flex items-baseline justify-between text-[12px] mb-1.5">
                  <span className={cn('inline-flex items-center gap-1', TXT_SUB)}>
                    <Trophy className="size-3" />Path 2 — Rank
                  </span>
                  <span className={cn('font-semibold', TXT)}>
                    {currentRank?.title ?? '—'} → {targetRank.title}
                  </span>
                </div>
                <div className={cn('text-[11px]', TXT_SUB)}>
                  Reach {targetRank.title} or higher at any point during the qualification window. Reaching either path qualifies you for the event.
                </div>
                {rankMet && (
                  <div className="mt-2 text-[11px] text-emerald-300 font-semibold">✓ Rank requirement met</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Official Events footer */}
        {siblings.length > 0 && (
          <div className="pt-3 mt-1 border-t border-white/15">
            <div className={cn('text-[10px] uppercase tracking-wider font-semibold mb-2', TXT_MUTED)}>
              Official Events
            </div>
            <div className="flex flex-wrap gap-1.5">
              {siblings
                .filter((s) => s.id !== announcement.id)
                .map((s) => (
                  <span
                    key={String(s.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors',
                      PILL_BG, TXT,
                    )}
                    title={`${s.location ?? ''} — ${formatDateRange(s.event_start, s.event_end)}`}
                  >
                    <span className="size-1.5 rounded-full bg-accent" />
                    {s.title}
                    {s.event_start && (
                      <span className={cn('tabular font-normal', TXT_MUTED)}>
                        {new Date(s.event_start).toLocaleDateString(undefined, { month: 'short' })}
                      </span>
                    )}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="text-[11px]">
      <div className="text-white/60 mb-1.5 inline-flex items-center gap-1">
        {icon}<span className="uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <div className="font-semibold text-white">{value}</div>
    </div>
  );
}

/** Placeholder for the "About this event" body card. Optional, only renders when
 *  the announcement has a body. Same dark palette as the main card. */
export function AnnouncementDetail({
  announcement,
  className,
}: {
  announcement: Announcement;
  className?: string;
}) {
  if (!announcement.body) return null;
  return (
    <div className={cn('rounded-xl border border-border bg-surface p-5 md:p-6', className)}>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-fg-muted mb-2">
        About this event
      </div>
      <p className="text-[14px] text-fg leading-relaxed whitespace-pre-line">
        {announcement.body}
      </p>
      {announcement.qualification_end && (
        <div className="mt-4 pt-4 border-t border-hairline text-[12px] text-fg-muted">
          You have <span className="text-fg font-semibold tabular">{daysBetween(new Date(), announcement.qualification_end)}</span> days left
          to qualify ({formatDateRange(announcement.qualification_start, announcement.qualification_end)}).
        </div>
      )}
    </div>
  );
}
