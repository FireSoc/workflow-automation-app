import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../api/customers';
import type { CustomerCreate, CustomerType } from '../../types';
import { LoadingSpinner } from './LoadingSpinner';

interface CustomerFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CustomerForm({ onSuccess, onCancel }: CustomerFormProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CustomerCreate>({
    company_name: '',
    customer_type: 'smb',
    industry: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerCreate, string>>>({});

  const mutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onSuccess?.();
    },
  });

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.company_name.trim()) next.company_name = 'Company name is required.';
    if (!(form.industry ?? '').trim()) next.industry = 'Industry is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate(form);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="company_name" className="label">
          Company Name <span className="text-red-500">*</span>
        </label>
        <input
          id="company_name"
          className="input"
          placeholder="Acme Corp"
          value={form.company_name}
          onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
          aria-invalid={!!errors.company_name}
          aria-describedby={errors.company_name ? 'company-name-error' : undefined}
        />
        {errors.company_name && (
          <p id="company-name-error" role="alert" className="mt-1 text-xs text-red-600">
            {errors.company_name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="customer_type" className="label">
          Customer Type <span className="text-red-500">*</span>
        </label>
        <select
          id="customer_type"
          className="select"
          value={form.customer_type}
          onChange={(e) => setForm((f) => ({ ...f, customer_type: e.target.value as CustomerType }))}
        >
          <option value="smb">SMB</option>
          <option value="mid_market">Mid-Market</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      <div>
        <label htmlFor="industry" className="label">
          Industry <span className="text-red-500">*</span>
        </label>
        <input
          id="industry"
          className="input"
          placeholder="SaaS, FinTech, Healthcare…"
          value={form.industry ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
          aria-invalid={!!errors.industry}
          aria-describedby={errors.industry ? 'industry-error' : undefined}
        />
        {errors.industry && (
          <p id="industry-error" role="alert" className="mt-1 text-xs text-red-600">
            {errors.industry}
          </p>
        )}
      </div>

      {mutation.isError && (
        <p role="alert" className="text-sm text-red-600">
          {(mutation.error as Error).message}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending && <LoadingSpinner size="sm" />}
          Create Customer
        </button>
      </div>
    </form>
  );
}
