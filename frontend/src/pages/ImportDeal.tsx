import { useLayoutEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { crmApi } from '../api/crm';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePageLayout } from '@/contexts/PageLayoutContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { DealIngestPayload, CustomerType } from '../types';

const SEGMENTS: { value: CustomerType; label: string }[] = [
  { value: 'smb', label: 'SMB' },
  { value: 'mid_market', label: 'Mid-Market' },
  { value: 'enterprise', label: 'Enterprise' },
];

function toISOOrNull(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function ImportDeal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPageLayout } = usePageLayout();
  const [form, setForm] = useState<DealIngestPayload>({
    crm_source: '',
    company_name: '',
    segment: 'smb',
    products_purchased: [],
    target_go_live_date: null,
    contract_start_date: null,
    implementation_owner: null,
    csm_owner: null,
    special_requirements: null,
  });
  const [errors, setErrors] = useState<{ company_name?: string; crm_source?: string }>({});

  const mutation = useMutation({
    mutationFn: crmApi.ingestDeal,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      navigate(`/projects/${data.project.id}`);
    },
  });

  function validate(): boolean {
    const next: { company_name?: string; crm_source?: string } = {};
    if (!form.company_name?.trim()) next.company_name = 'Company name is required.';
    if (!form.crm_source?.trim()) next.crm_source = 'CRM source is required (e.g. Salesforce, Manual).';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const payload: DealIngestPayload = {
      ...form,
      company_name: form.company_name!.trim(),
      crm_source: form.crm_source!.trim(),
      products_purchased: form.products_purchased?.length ? form.products_purchased : [],
      target_go_live_date: form.target_go_live_date ? (toISOOrNull(form.target_go_live_date as string) ?? null) : null,
      contract_start_date: form.contract_start_date ? (toISOOrNull(form.contract_start_date as string) ?? null) : null,
      implementation_owner: form.implementation_owner?.trim() || null,
      csm_owner: form.csm_owner?.trim() || null,
      special_requirements: form.special_requirements?.trim() || null,
    };
    mutation.mutate(payload);
  }

  const productsStr = Array.isArray(form.products_purchased)
    ? form.products_purchased.join(', ')
    : '';
  const setProductsStr = (s: string) =>
    setForm((f) => ({
      ...f,
      products_purchased: s
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean),
    }));

  const inputClass = cn(
    'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
  );

  useLayoutEffect(() => {
    setPageLayout({
      title: 'Import deal',
      subtitle: 'Create an onboarding project from a closed-won deal.',
    });
  }, [setPageLayout]);

  return (
    <PageContainer className="max-w-2xl">
      <PageHeader
        title="Import deal"
        subtitle="Create an onboarding project from a closed-won deal. Same flow as POST /crm/deals/ingest. Required: company name and CRM source."
      />

      {mutation.isError && (
        <ErrorAlert
          message={(mutation.error as Error).message}
          onRetry={() => mutation.reset()}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Import deal</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">
                Company name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="company_name"
                type="text"
                placeholder="e.g. Acme Corp"
                value={form.company_name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                aria-invalid={!!errors.company_name}
                className={errors.company_name ? 'border-destructive' : ''}
              />
              {errors.company_name && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.company_name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="crm_source">
                CRM source <span className="text-destructive">*</span>
              </Label>
              <Input
                id="crm_source"
                type="text"
                placeholder="e.g. Salesforce, HubSpot, Manual"
                value={form.crm_source ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, crm_source: e.target.value }))}
                aria-invalid={!!errors.crm_source}
                className={errors.crm_source ? 'border-destructive' : ''}
              />
              {errors.crm_source && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.crm_source}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="segment">Segment</Label>
              <Select
                value={form.segment}
                onValueChange={(v) => setForm((f) => ({ ...f, segment: v as CustomerType }))}
              >
                <SelectTrigger id="segment" className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="products_purchased">
                Products purchased <span className="text-muted-foreground font-normal">(comma-separated, optional)</span>
              </Label>
              <Input
                id="products_purchased"
                type="text"
                placeholder="e.g. core, basic"
                value={productsStr}
                onChange={(e) => setProductsStr(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="target_go_live_date">Target go-live date</Label>
                <Input
                  id="target_go_live_date"
                  type="date"
                  value={typeof form.target_go_live_date === 'string' ? form.target_go_live_date.slice(0, 10) : ''}
                  onChange={(e) => setForm((f) => ({ ...f, target_go_live_date: e.target.value || null }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contract_start_date">Contract start date</Label>
                <Input
                  id="contract_start_date"
                  type="date"
                  value={typeof form.contract_start_date === 'string' ? form.contract_start_date.slice(0, 10) : ''}
                  onChange={(e) => setForm((f) => ({ ...f, contract_start_date: e.target.value || null }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="implementation_owner">Implementation owner</Label>
                <Input
                  id="implementation_owner"
                  type="text"
                  placeholder="e.g. Jane Smith"
                  value={form.implementation_owner ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, implementation_owner: e.target.value || null }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="csm_owner">CSM owner</Label>
                <Input
                  id="csm_owner"
                  type="text"
                  placeholder="e.g. John Doe"
                  value={form.csm_owner ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, csm_owner: e.target.value || null }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="special_requirements">Special requirements</Label>
              <Textarea
                id="special_requirements"
                rows={2}
                placeholder="Any special requirements or notes"
                value={form.special_requirements ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, special_requirements: e.target.value || null }))}
                className="resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => navigate('/projects')}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <LoadingSpinner size="sm" />}
                Import deal & create project
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
