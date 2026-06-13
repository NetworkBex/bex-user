'use client';

import { Settings, ExternalLink, Server, Database, KeyRound } from 'lucide-react';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader, CardDivider } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function AdminSettingsPage() {
  return (
    <>
      <PageHeader
        title="System settings"
        description="Platform configuration and integrations."
        breadcrumb={[{ label: 'Admin', href: '/admin' }, { label: 'Settings' }]}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Django admin" icon={<Settings className="size-4" />} description="Full-control administration." />
          <CardDivider />
          <CardBody className="space-y-3">
            <p className="text-sm text-fg-muted">
              Edit currencies, content models, scheduled jobs, and low-level platform configuration via the Django admin panel.
            </p>
            <a href="http://localhost:8000/admin/" target="_blank" rel="noreferrer" className="inline-block">
              <Button trailingIcon={<ExternalLink className="size-4" />}>Open Django admin</Button>
            </a>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Environment" icon={<Server className="size-4" />} />
          <CardDivider />
          <CardBody className="space-y-2 text-sm">
            <Row label="API base" value={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'} mono />
            <Row label="App" value="BEX Network" />
            <Row label="Frontend" value="Next.js 15 · React 19" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Database" icon={<Database className="size-4" />} />
          <CardDivider />
          <CardBody className="text-sm text-fg-muted">
            Schema migrations and seed data are managed through the backend Makefile (<span className="font-mono text-fg">make backend-migrate</span>).
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="API keys" icon={<KeyRound className="size-4" />} />
          <CardDivider />
          <CardBody className="text-sm text-fg-muted">
            Rotate provider keys (payment processors, exchange APIs) from your secret manager. Credentials are stored encrypted at rest.
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-hairline last:border-0">
      <span className="text-fg-muted">{label}</span>
      <span className={`${mono ? 'font-mono text-xs' : ''} text-fg`}>{value}</span>
    </div>
  );
}
