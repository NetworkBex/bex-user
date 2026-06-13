'use client';

import { useEffect, useState } from 'react';
import { ListChecks } from 'lucide-react';
import { coreAPI } from '@/lib/api';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatMoney } from '@/lib/ui';

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    coreAPI.investPlans().then(setPlans).catch(() => {});
  }, []);

  return (
    <>
      <PageHeader
        title="Investment plans"
        description="Configured tiers available to users."
        breadcrumb={[{ label: 'Admin', href: '/admin' }, { label: 'Plans' }]}
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {plans.map((p: any) => (
          <Card key={p.invest_plan_id || p.id} className="overflow-hidden">
            <CardHeader title={p.name} icon={<ListChecks className="size-4" />} action={<Badge tone="accent">{p.percentage}% /d</Badge>} />
            <CardBody className="pt-1 space-y-2 text-sm">
              <Row label="Min stake"  value={formatMoney(p.min_amount)} />
              <Row label="Max stake"  value={formatMoney(p.max_amount)} />
              <Row label="Duration"   value={`${p.duration} days`} />
              <Row label="Total ROI"  value={`${(p.percentage * p.duration).toFixed(1)}%`} tone="success" />
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <div className="flex justify-between items-center text-sm py-1 border-b border-hairline last:border-0">
      <span className="text-fg-muted">{label}</span>
      <span className={`tabular font-medium ${tone === 'success' ? 'text-success' : 'text-fg'}`}>{value}</span>
    </div>
  );
}
