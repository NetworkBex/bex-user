'use client';

import { useEffect, useState } from 'react';
import { User, Lock, Mail, Phone, Globe, Shield } from 'lucide-react';
import { authAPI, userAPI } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader, CardDivider } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Progress';
import { NotificationSettings } from '@/components/dashboard/NotificationSettings';
import { shortDate } from '@/lib/ui';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ fullname: '', email: '', phone: '', country: '' });
  const [pw, setPw] = useState({ old_password: '', new_password: '', cnew_password: '' });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const { toast } = useToast() || { toast: (() => {}) as any };

  useEffect(() => {
    authAPI.me().then((res) => {
      const c = res.data.customer;
      setUser(c);
      setForm({ fullname: c.fullname || '', email: c.email, phone: c.phone || '', country: c.country || '' });
    }).catch(() => {});
  }, []);

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await userAPI.updateProfile(form); toast('Profile updated'); }
    catch { toast('Update failed', 'error'); }
    finally { setSaving(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPw(true);
    try {
      await userAPI.changePassword(pw);
      toast('Password changed');
      setPw({ old_password: '', new_password: '', cnew_password: '' });
    } catch (err: any) {
      toast(err.response?.data?.old_password || err.response?.data?.error || 'Password change failed', 'error');
    } finally { setSavingPw(false); }
  };

  return (
    <>
      <PageHeader
        title="Profile"
        description="Manage your account and security settings."
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Profile' }]}
      />

      {!user ? (
        <PageSpinner label="Loading profile…" className="min-h-[420px]" />
      ) : (
        <>
          <Card className="mb-6 overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Avatar name={user.fullname || user.username} size={64} />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-fg">{user.fullname || user.username}</h2>
                <p className="text-sm text-fg-muted">{user.email}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {user.email_verified
                    ? <Badge tone="success">Email verified</Badge>
                    : <Badge tone="warning">Email unverified</Badge>}
                  <Badge tone="neutral">Member since {shortDate(user.date_created)}</Badge>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Account details" icon={<User className="size-4" />} />
              <CardDivider />
              <CardBody>
                <form onSubmit={updateProfile} className="space-y-4">
                  <Field label="Full name"><Input value={form.fullname} onChange={(e) => setForm({ ...form, fullname: e.target.value })} leadingIcon={<User />} /></Field>
                  <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} leadingIcon={<Mail />} /></Field>
                  <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} leadingIcon={<Phone />} /></Field>
                  <Field label="Country"><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} leadingIcon={<Globe />} /></Field>
                  <Button type="submit" loading={saving}>Save changes</Button>
                </form>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Security" icon={<Shield className="size-4" />} description="Rotate your password regularly." />
              <CardDivider />
              <CardBody>
                <form onSubmit={changePassword} className="space-y-4">
                  <Field label="Current password" required>
                    <Input type="password" value={pw.old_password} onChange={(e) => setPw({ ...pw, old_password: e.target.value })} required leadingIcon={<Lock />} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="New password" required>
                      <Input type="password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} required leadingIcon={<Lock />} />
                    </Field>
                    <Field label="Confirm" required>
                      <Input type="password" value={pw.cnew_password} onChange={(e) => setPw({ ...pw, cnew_password: e.target.value })} required leadingIcon={<Lock />} />
                    </Field>
                  </div>
                  <Button type="submit" loading={savingPw}>Update password</Button>
                </form>
              </CardBody>
            </Card>

            <NotificationSettings />
          </div>
        </>
      )}
    </>
  );
}
