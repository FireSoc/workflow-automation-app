import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { crmApi } from '../api/crm';
import { Topbar } from '../components/layout/Topbar';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
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

  return (
    <div>
      <Topbar />
      <div className="px-6 py-6 max-w-2xl">
        <p className="text-sm text-slate-600 mb-6">
          Create an onboarding project from a closed-won deal. This is the same flow used when your CRM sends a deal
          to <code className="text-xs bg-slate-100 px-1 rounded">POST /crm/deals/ingest</code>. Required fields:
          company name and CRM source.
        </p>

        {mutation.isError && (
          <ErrorAlert
            message={(mutation.error as Error).message}
            onRetry={() => mutation.reset()}
          />
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="company_name" className="label">
              Company name <span className="text-red-500">*</span>
            </label>
            <input
              id="company_name"
              type="text"
              className="input"
              placeholder="e.g. Acme Corp"
              value={form.company_name ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
              aria-invalid={!!errors.company_name}
            />
            {errors.company_name && (
              <p role="alert" className="mt-1 text-xs text-red-600">
                {errors.company_name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="crm_source" className="label">
              CRM source <span className="text-red-500">*</span>
            </label>
            <input
              id="crm_source"
              type="text"
              className="input"
              placeholder="e.g. Salesforce, HubSpot, Manual"
              value={form.crm_source ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, crm_source: e.target.value }))}
              aria-invalid={!!errors.crm_source}
            />
            {errors.crm_source && (
              <p role="alert" className="mt-1 text-xs text-red-600">
                {errors.crm_source}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="segment" className="label">
              Segment
            </label>
            <select
              id="segment"
              className="select"
              value={form.segment}
              onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value as CustomerType }))}
            >
              {SEGMENTS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="products_purchased" className="label">
              Products purchased <span className="text-slate-400 font-normal">(comma-separated, optional)</span>
            </label>
            <input
              id="products_purchased"
              type="text"
              className="input"
              placeholder="e.g. core, basic"
              value={productsStr}
              onChange={(e) => setProductsStr(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="target_go_live_date" className="label">
                Target go-live date
              </label>
              <input
                id="target_go_live_date"
                type="date"
                className="input"
                value={typeof form.target_go_live_date === 'string' ? form.target_go_live_date.slice(0, 10) : ''}
                onChange={(e) => setForm((f) => ({ ...f, target_go_live_date: e.target.value || null }))}
              />
            </div>
            <div>
              <label htmlFor="contract_start_date" className="label">
                Contract start date
              </label>
              <input
                id="contract_start_date"
                type="date"
                className="input"
                value={typeof form.contract_start_date === 'string' ? form.contract_start_date.slice(0, 10) : ''}
                onChange={(e) => setForm((f) => ({ ...f, contract_start_date: e.target.value || null }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="implementation_owner" className="label">
                Implementation owner
              </label>
              <input
                id="implementation_owner"
                type="text"
                className="input"
                placeholder="e.g. Jane Smith"
                value={form.implementation_owner ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, implementation_owner: e.target.value || null }))}
              />
            </div>
            <div>
              <label htmlFor="csm_owner" className="label">
                CSM owner
              </label>
              <input
                id="csm_owner"
                type="text"
                className="input"
                placeholder="e.g. John Doe"
                value={form.csm_owner ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, csm_owner: e.target.value || null }))}
              />
            </div>
          </div>

          <div>
            <label htmlFor="special_requirements" className="label">
              Special requirements
            </label>
            <textarea
              id="special_requirements"
              className="input resize-none"
              rows={2}
              placeholder="Any special requirements or notes"
              value={form.special_requirements ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, special_requirements: e.target.value || null }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/projects')}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending && <LoadingSpinner size="sm" />}
              Import deal & create project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
