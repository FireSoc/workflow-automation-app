import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../api/customers';
import type { CustomerCreate, CustomerType } from '../../types';
import { LoadingSpinner } from './LoadingSpinner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

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

  const selectClass = cn(
    'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="company_name">
          Company Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="company_name"
          placeholder="Acme Corp"
          value={form.company_name}
          onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
          aria-invalid={!!errors.company_name}
          aria-describedby={errors.company_name ? 'company-name-error' : undefined}
          className={errors.company_name ? 'border-destructive' : ''}
        />
        {errors.company_name && (
          <p id="company-name-error" role="alert" className="text-xs text-destructive">
            {errors.company_name}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer_type">
          Customer Type <span className="text-destructive">*</span>
        </Label>
        <Select
          value={form.customer_type}
          onValueChange={(v) => setForm((f) => ({ ...f, customer_type: v as CustomerType }))}
        >
          <SelectTrigger id="customer_type" className={selectClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="smb">SMB</SelectItem>
            <SelectItem value="mid_market">Mid-Market</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="industry">
          Industry <span className="text-destructive">*</span>
        </Label>
        <Input
          id="industry"
          placeholder="SaaS, FinTech, Healthcare…"
          value={form.industry ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
          aria-invalid={!!errors.industry}
          aria-describedby={errors.industry ? 'industry-error' : undefined}
          className={errors.industry ? 'border-destructive' : ''}
        />
        {errors.industry && (
          <p id="industry-error" role="alert" className="text-xs text-destructive">
            {errors.industry}
          </p>
        )}
      </div>

      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {(mutation.error as Error).message}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <LoadingSpinner size="sm" />}
          Create Customer
        </Button>
      </div>
    </form>
  )
}
