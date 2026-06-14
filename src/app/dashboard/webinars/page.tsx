'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Video, Calendar, Clock, Play, Radio, ExternalLink, CalendarPlus, User,
} from 'lucide-react';
import { coreAPI } from '@/lib/api';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Progress';
import { cn } from '@/lib/ui';

type Host = { name: string; role?: string; avatar_url?: string };
type Webinar = {
  id: number;
  title: string;
  description: string;
  speaker: string;
  hosts: Host[];
  image_url: string;
  scheduled_for: string;
  ends_at: string;
  duration_minutes: number;
  join_url: string;
  replay_url: string;
  status: 'live' | 'upcoming' | 'replay';
};

/** Normalize to a host list (falls back to the legacy single speaker). */
function hostsOf(w: Webinar): Host[] {
  if (w.hosts && w.hosts.length) return w.hosts;
  return w.speaker ? [{ name: w.speaker }] : [];
}

/* ── date helpers ─────────────────────────────────────────────────── */
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const fmtTime = (s: string) =>
  new Date(s).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
function relWhen(s: string): string {
  const diff = new Date(s).getTime() - Date.now();
  const d = Math.round(diff / 86_400_000);
  if (d > 1) return `in ${d} days`;
  if (d === 1) return 'tomorrow';
  const h = Math.round(diff / 3_600_000);
  if (h > 1) return `in ${h} hours`;
  if (h >= 0) return 'starting soon';
  return 'recently';
}
function gcalUrl(w: Webinar): string {
  const z = (s: string) => new Date(s).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: w.title,
    dates: `${z(w.scheduled_for)}/${z(w.ends_at)}`,
    details: `${w.description}${w.join_url ? `\n\nJoin: ${w.join_url}` : ''}`,
    location: w.join_url || '',
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export default function WebinarsPage() {
  const [webinars, setWebinars] = useState<Webinar[] | null>(null);

  useEffect(() => {
    coreAPI.webinars().then((rows) => setWebinars(rows as Webinar[])).catch(() => setWebinars([]));
  }, []);

  const { upcoming, replays } = useMemo(() => {
    const list = webinars ?? [];
    const upcoming = list
      .filter((w) => w.status === 'live' || w.status === 'upcoming')
      .sort((a, b) => +new Date(a.scheduled_for) - +new Date(b.scheduled_for));
    const replays = list
      .filter((w) => w.status === 'replay')
      .sort((a, b) => +new Date(b.scheduled_for) - +new Date(a.scheduled_for));
    return { upcoming, replays };
  }, [webinars]);

  const loading = webinars === null;
  const featured = upcoming[0];
  const restUpcoming = upcoming.slice(1);

  return (
    <>
      <PageHeader
        title="Webinars"
        description="Live sessions with the BEX team and on-demand replays — strategy, onboarding, and partner growth."
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton mode="pulse" className="h-64 w-full rounded-2xl" />
          <div className="grid md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} mode="pulse" className="h-56 w-full rounded-xl" />)}
          </div>
        </div>
      ) : (webinars?.length ?? 0) === 0 ? (
        <EmptyState icon={<Video />} title="No webinars scheduled yet"
          description="Live sessions and replays will appear here. Check back soon." />
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <SectionTitle icon={<Calendar className="size-4" />} title="Upcoming & live" count={upcoming.length} />
              {featured && <FeaturedWebinar w={featured} />}
              {restUpcoming.length > 0 && (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                  {restUpcoming.map((w) => <UpcomingCard key={w.id} w={w} />)}
                </div>
              )}
            </section>
          )}

          {/* Replay library */}
          {replays.length > 0 && (
            <section>
              <SectionTitle icon={<Play className="size-4" />} title="Replay library" count={replays.length} />
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {replays.map((w) => <ReplayCard key={w.id} w={w} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}

/* ── pieces ───────────────────────────────────────────────────────── */

function SectionTitle({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="grid place-items-center size-7 rounded-md bg-accent-soft text-accent">{icon}</span>
      <h2 className="text-[16px] font-semibold text-fg">{title}</h2>
      <span className="text-[12px] text-fg-subtle tabular">({count})</span>
    </div>
  );
}

function Cover({ src, className, children }: { src?: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn('relative overflow-hidden bg-surface-2', className)}>
      {src
        ? <img src={src} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
        : <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-accent-soft to-surface-2">
            <Video className="size-8 text-accent/50" />
          </div>}
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: Webinar['status'] }) {
  if (status === 'live') {
    return (
      <Badge tone="danger" className="backdrop-blur-sm">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-white" />
        </span>
        LIVE NOW
      </Badge>
    );
  }
  if (status === 'upcoming') return <Badge tone="accent"><Radio className="size-3" /> Upcoming</Badge>;
  return <Badge tone="neutral"><Play className="size-3" /> Replay</Badge>;
}

function HostAvatar({ h }: { h: Host }) {
  return h.avatar_url
    ? <img src={h.avatar_url} alt={h.name} className="size-6 rounded-full border-2 border-surface object-cover" loading="lazy" />
    : <span className="size-6 rounded-full border-2 border-surface bg-surface-2 grid place-items-center text-fg-subtle"><User className="size-3" /></span>;
}

/** Compact host row: overlapping avatars + comma-joined names. */
function Hosts({ w }: { w: Webinar }) {
  const list = hostsOf(w);
  if (!list.length) return null;
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <span className="flex -space-x-2">
        {list.slice(0, 4).map((h, i) => <HostAvatar key={i} h={h} />)}
      </span>
      <span className="text-[12px] text-fg-muted truncate">{list.map((h) => h.name).join(', ')}</span>
    </span>
  );
}

/** Detailed host list: avatar · name · role, one chip per host. */
function HostsDetailed({ w }: { w: Webinar }) {
  const list = hostsOf(w);
  if (!list.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
      {list.map((h, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 text-[12.5px]">
          <HostAvatar h={h} />
          <span className="text-fg font-medium">{h.name}</span>
          {h.role ? <span className="text-fg-subtle">· {h.role}</span> : null}
        </span>
      ))}
    </div>
  );
}

function FeaturedWebinar({ w }: { w: Webinar }) {
  return (
    <Card className="overflow-hidden">
      <div className="grid md:grid-cols-[1.1fr_1fr]">
        <Cover src={w.image_url} className="aspect-video md:aspect-auto md:min-h-[260px]">
          <div className="absolute top-3 left-3"><StatusPill status={w.status} /></div>
        </Cover>
        <CardBody className="p-5 md:p-6 flex flex-col">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-accent">
            {w.status === 'live' ? 'Happening now' : `Next session · ${relWhen(w.scheduled_for)}`}
          </div>
          <h3 className="mt-2 text-[20px] md:text-[22px] font-semibold tracking-tight text-fg leading-snug">{w.title}</h3>
          <HostsDetailed w={w} />
          <p className="mt-3 text-[13.5px] text-fg-muted leading-relaxed line-clamp-3">{w.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-fg-muted">
            <span className="inline-flex items-center gap-1.5"><Calendar className="size-3.5" /> {fmtDate(w.scheduled_for)}</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" /> {fmtTime(w.scheduled_for)} · {w.duration_minutes} min</span>
          </div>

          <div className="mt-auto pt-5 flex flex-wrap gap-2">
            {w.join_url && (
              <a href={w.join_url} target="_blank" rel="noreferrer">
                <Button leadingIcon={w.status === 'live' ? <Radio className="size-4" /> : <Video className="size-4" />}>
                  {w.status === 'live' ? 'Join live now' : 'Join session'}
                </Button>
              </a>
            )}
            <a href={gcalUrl(w)} target="_blank" rel="noreferrer">
              <Button variant="secondary" leadingIcon={<CalendarPlus className="size-4" />}>Add to calendar</Button>
            </a>
          </div>
        </CardBody>
      </div>
    </Card>
  );
}

function UpcomingCard({ w }: { w: Webinar }) {
  return (
    <Card className="overflow-hidden flex flex-col">
      <Cover src={w.image_url} className="aspect-video">
        <div className="absolute top-3 left-3"><StatusPill status={w.status} /></div>
      </Cover>
      <CardBody className="p-4 flex flex-col flex-1">
        <h3 className="text-[15px] font-semibold text-fg leading-snug line-clamp-2">{w.title}</h3>
        <div className="mt-1.5"><Hosts w={w} /></div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-fg-muted">
          <span className="inline-flex items-center gap-1"><Calendar className="size-3.5" /> {fmtDate(w.scheduled_for)}</span>
          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {fmtTime(w.scheduled_for)}</span>
        </div>
        <div className="mt-auto pt-4 flex gap-2">
          {w.join_url && (
            <a href={w.join_url} target="_blank" rel="noreferrer" className="flex-1">
              <Button size="sm" className="w-full">{w.status === 'live' ? 'Join live' : 'Join'}</Button>
            </a>
          )}
          <a href={gcalUrl(w)} target="_blank" rel="noreferrer">
            <Button size="sm" variant="secondary" leadingIcon={<CalendarPlus className="size-4" />} aria-label="Add to calendar" />
          </a>
        </div>
      </CardBody>
    </Card>
  );
}

function ReplayCard({ w }: { w: Webinar }) {
  return (
    <a href={w.replay_url || undefined} target="_blank" rel="noreferrer" className="group block">
      <Card className="overflow-hidden h-full flex flex-col transition-colors group-hover:border-border-strong">
        <Cover src={w.image_url} className="aspect-video">
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 grid place-items-center">
            <span className="grid place-items-center size-11 rounded-full bg-white/90 text-accent-fg shadow-lg transition-transform group-hover:scale-110">
              <Play className="size-5 translate-x-0.5 fill-current" />
            </span>
          </div>
          <div className="absolute bottom-2 right-2">
            <span className="rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white tabular">{w.duration_minutes} min</span>
          </div>
        </Cover>
        <CardBody className="p-4 flex-1">
          <h3 className="text-[14.5px] font-semibold text-fg leading-snug line-clamp-2">{w.title}</h3>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <Hosts w={w} />
            <span className="text-[11.5px] text-fg-subtle">{fmtDate(w.scheduled_for)}</span>
          </div>
        </CardBody>
      </Card>
    </a>
  );
}
