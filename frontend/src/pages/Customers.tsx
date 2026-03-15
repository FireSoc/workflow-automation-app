import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Building2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { customersApi } from '../api/customers';
import { projectsApi } from '../api/projects';
import { CustomerTypeBadge } from '../components/ui/StatusBadge';
import { CustomerForm } from '../components/ui/CustomerForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { EmptyState } from '@/components/ui/EmptyState';

export function Customers() {
  const [isModalOpen, setModalOpen] = useState(false);

  const { data: customers, isPending, isError, refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  function getMostRecentProjectIdForCustomer(customerId: number): number | null {
    if (!projects?.length) return null;
    const forCustomer = projects
      .filter((p) => p.customer_id === customerId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return forCustomer[0]?.id ?? null;
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <span />
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          New Customer
        </Button>
      </div>

      {isPending && <PageLoading />}

      {isError && (
        <ErrorAlert
          message="Failed to load customers. Is the backend running?"
          onRetry={() => refetch()}
        />
      )}

      {!isPending && !isError && customers?.length === 0 && (
        <EmptyState
          title="No customers yet"
          description="Add your first customer to start an onboarding project."
          icon={<Building2 className="h-12 w-12 text-muted-foreground" />}
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              New Customer
            </Button>
          }
        />
      )}

      {!isPending && !isError && customers && customers.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              All Customers
              <Badge variant="secondary" className="font-normal">
                {customers.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-5 py-3">Company</TableHead>
                  <TableHead className="px-5 py-3">Type</TableHead>
                  <TableHead className="px-5 py-3">Industry</TableHead>
                  <TableHead className="px-5 py-3">Created</TableHead>
                  <TableHead className="px-5 py-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7 rounded-full bg-primary/10">
                          <AvatarFallback className="text-xs font-semibold text-primary">
                            {customer.company_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{customer.company_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-3.5">
                      <CustomerTypeBadge type={customer.customer_type} />
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-muted-foreground">{customer.industry}</TableCell>
                    <TableCell className="px-5 py-3.5 text-muted-foreground">
                      {new Date(customer.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-right">
                      {(() => {
                        const projectId = getMostRecentProjectIdForCustomer(customer.id);
                        return projectId != null ? (
                          <Link to={`/projects/${projectId}`} className="text-sm font-medium text-primary underline-offset-4 hover:underline inline-flex items-center gap-1">
                            View projects <ArrowRight className="h-3 w-3" />
                          </Link>
                        ) : (
                          <Link to={`/projects/list?company=${customer.id}`} className="text-sm font-medium text-primary underline-offset-4 hover:underline inline-flex items-center gap-1">
                            View projects <ArrowRight className="h-3 w-3" />
                          </Link>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm
            onSuccess={() => setModalOpen(false)}
            onCancel={() => setModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
