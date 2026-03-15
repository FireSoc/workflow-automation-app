import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../../api/projects';
import { customersApi } from '../../api/customers';
import type { ProjectCreate } from '../../types';
import { LoadingSpinner } from './LoadingSpinner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProjectFormProps {
  preselectedCustomerId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProjectForm({ preselectedCustomerId, onSuccess, onCancel }: ProjectFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: customers, isPending: loadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  const [form, setForm] = useState<ProjectCreate>({
    customer_id: preselectedCustomerId ?? 0,
    name: '',
    notes: '',
  });
  const [errors, setErrors] = useState<{ customer_id?: string }>({});

  const mutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onSuccess?.();
      navigate(`/projects/${project.id}`);
    },
  });

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.customer_id) next.customer_id = 'Please select a customer.';
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
        <Label htmlFor="customer_id">
          Customer <span className="text-destructive">*</span>
        </Label>
        {loadingCustomers ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <LoadingSpinner size="sm" /> Loading customers…
          </div>
        ) : (
          <select
            id="customer_id"
            className={selectClass}
            value={form.customer_id}
            onChange={(e) => setForm((f) => ({ ...f, customer_id: Number(e.target.value) }))}
            aria-invalid={!!errors.customer_id}
            aria-describedby={errors.customer_id ? 'customer-error' : undefined}
          >
            <option value={0}>Select a customer…</option>
            {customers?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name} ({c.customer_type.toUpperCase()})
              </option>
            ))}
          </select>
        )}
        {errors.customer_id && (
          <p id="customer-error" role="alert" className="text-xs text-destructive">
            {errors.customer_id}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="project_name">
          Project name <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="project_name"
          type="text"
          placeholder="e.g. Q1 onboarding, Pilot launch"
          value={form.name ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.trim() || undefined }))}
          maxLength={255}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">
          Notes <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="notes"
          className="resize-none"
          rows={3}
          placeholder="Any additional context for this onboarding…"
          value={form.notes ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
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
        <Button type="submit" disabled={mutation.isPending || loadingCustomers}>
          {mutation.isPending && <LoadingSpinner size="sm" />}
          Create Project
        </Button>
      </div>
    </form>
  )
}
