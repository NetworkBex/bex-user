'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, Users, Network } from 'lucide-react';
import { affiliateAPI } from '@/lib/api';
import { Card, CardHeader, CardDivider, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Progress';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatMoney } from '@/lib/ui';

interface Node {
  id: number;
  username: string;
  email: string;
  level: number;
  joined: string | null;
  status: number;
  volumeUsd: number;
  active: boolean;
  children: Node[];
}

function TreeNode({ node, depth }: { node: Node; depth: number }) {
  // Expand the first couple of levels by default; deeper ones collapse.
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = (node.children?.length ?? 0) > 0;
  return (
    <div>
      <div className="flex items-center gap-2 py-1.5" style={{ paddingLeft: depth * 16 }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={!hasChildren}
          aria-label={hasChildren ? (open ? 'Collapse' : 'Expand') : undefined}
          className={`grid place-items-center size-5 rounded transition-colors ${hasChildren ? 'text-fg-muted hover:text-fg' : 'opacity-0 pointer-events-none'}`}
        >
          <ChevronRight className={`size-4 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
        <Avatar name={node.username} size={26} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-medium text-fg truncate">{node.username}</span>
            <Badge tone="neutral" className="!py-0">L{node.level}</Badge>
            {node.active && <Badge tone="success" className="!py-0">active</Badge>}
          </div>
          <div className="text-[11.5px] text-fg-subtle truncate">{node.email}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[12.5px] tabular text-fg">{formatMoney(node.volumeUsd)}</div>
          {hasChildren && <div className="text-[11px] text-fg-subtle">{node.children.length} direct</div>}
        </div>
      </div>
      {open && hasChildren && (
        <div className="border-l border-hairline ml-2.5">
          {node.children.map((c) => <TreeNode key={c.id} node={c} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

export function DownlineTree() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    affiliateAPI.downline()
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const tree: Node[] = data?.tree ?? [];

  return (
    <Card className="mb-6">
      <CardHeader
        title="Your downline tree"
        icon={<Network className="size-4" />}
        description={
          data
            ? `${data.totalMembers} members · ${data.activeMembers} active · ${data.levels} levels · ${formatMoney(data.totalVolumeUsd)} team volume`
            : 'Everyone in your network — every level, fully expandable'
        }
      />
      <CardDivider />
      <CardBody>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} mode="pulse" className="h-10 w-full rounded" />)}
          </div>
        ) : tree.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="No downline yet"
            description="When you refer users — and they refer others — your full pyramid appears here, level by level."
          />
        ) : (
          <div className="-my-1">
            {tree.map((n) => <TreeNode key={n.id} node={n} depth={0} />)}
            {data?.truncated && (
              <p className="text-[11.5px] text-fg-subtle mt-3">Showing the first {data.totalMembers} members of your network.</p>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
