import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, ArrowRight, MoreHorizontal, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { customersApi } from '../api/customers';
import { projectsApi } from '../api/projects';
import { CustomerTypeBadge } from '../components/ui/StatusBadge';
import { CustomerForm } from '../components/ui/CustomerForm';
import { PageContainer } from '@/components/layout/PageContainer';
import { usePageLayout } from '@/contexts/PageLayoutContext';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { EmptyState } from '@/components/ui/EmptyState';

export function Customers() {
  const [isModalOpen, setModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<{ id: number; company_name: string } | null>(null);
  const { setPageLayout } = usePageLayout();
  const queryClient = useQueryClient();

  const deleteCustomerMutation = useMutation({
    mutationFn: (id: number) => customersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setCustomerToDelete(null);
    },
  });

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

  useEffect(() => {
    setPageLayout({
      title: 'Customers',
      subtitle: 'Manage customer accounts and link to onboarding projects.',
      action: (
        <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          New customer
        </Button>
      ),
    });
  }, [setPageLayout]);

  return (
    <PageContainer className="flex flex-col gap-6">
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
                      <div className="flex items-center justify-end gap-1">
                        {(() => {
                          const projectId = getMostRecentProjectIdForCustomer(customer.id);
                          const viewLink =
                            projectId != null
                              ? `/projects/${projectId}`
                              : `/projects/list?company=${customer.id}`;
                          return (
                            <Link
                              to={viewLink}
                              className="text-sm font-medium text-primary underline-offset-4 hover:underline inline-flex items-center gap-1"
                            >
                              View projects <ArrowRight className="h-3 w-3" />
                            </Link>
                          );
                        })()}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Actions">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setCustomerToDelete({ id: customer.id, company_name: customer.company_name })}
                            >
                              <Trash2 className="size-4 mr-2" />
                              Delete customer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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

      <Dialog open={customerToDelete != null} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete customer</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{customerToDelete?.company_name}</strong>? This will also delete
            all onboarding projects for this customer. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCustomerToDelete(null)}
              disabled={deleteCustomerMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => customerToDelete && deleteCustomerMutation.mutate(customerToDelete.id)}
              disabled={deleteCustomerMutation.isPending}
            >
              {deleteCustomerMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
