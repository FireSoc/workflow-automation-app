import { useLayoutEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Package, Search, MoreHorizontal, Eye } from 'lucide-react';
import { playbooksApi } from '../api/playbooks';
import { CustomerTypeBadge } from '../components/ui/StatusBadge';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePageLayout } from '@/contexts/PageLayoutContext';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { OnboardingPlaybook } from '../types';

type SortKey = 'name' | 'created_at' | 'updated_at' | 'duration';
type FilterStatus = 'active' | 'archived';

function durationFromPlaybook(p: OnboardingPlaybook): number | null {
  const rules = p.duration_rules;
  if (!rules || typeof rules !== 'object') return null;
  const values = Object.values(rules) as number[];
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0);
}

function PlaybookDetailContent({ playbook }: { playbook: OnboardingPlaybook }) {
  const tasks = (playbook.default_tasks ?? []) as { stage?: string; title?: string }[];
  const byStage = useMemo(
    () =>
      tasks.reduce<Record<string, string[]>>((acc, t) => {
        const s = t.stage ?? 'other';
        if (!acc[s]) acc[s] = [];
        acc[s].push(t.title ?? '—');
        return acc;
      }, {}),
    [tasks]
  );

  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs font-medium text-muted-foreground">Segment</span>
        <div className="mt-1">
          <CustomerTypeBadge type={playbook.segment} />
        </div>
      </div>
      {playbook.supported_products?.length > 0 && (
        <div>
          <span className="text-xs font-medium text-muted-foreground">Products</span>
          <p className="mt-1 text-sm flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            {playbook.supported_products.join(', ')}
          </p>
        </div>
      )}
      <div>
        <span className="text-xs font-medium text-muted-foreground">Stages & tasks</span>
        <div className="mt-1 text-xs text-muted-foreground space-y-1">
          {Object.entries(byStage).map(([stage, titles]) => (
            <div key={stage}>
              <span className="font-medium uppercase text-foreground">{stage}</span>
              <ul className="list-disc list-inside ml-1 mt-0.5">
                {titles.slice(0, 8).map((title, i) => (
                  <li key={i}>{title}</li>
                ))}
                {titles.length > 8 && (
                  <li className="text-muted-foreground">+{titles.length - 8} more</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PlaybookInspector() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [viewPlaybook, setViewPlaybook] = useState<OnboardingPlaybook | null>(null);

  const { data: playbooks, isPending, isError, refetch } = useQuery({
    queryKey: ['playbooks'],
    queryFn: playbooksApi.list,
  });

  const filteredAndSorted = useMemo(() => {
    if (!playbooks) return [];
    const q = search.trim().toLowerCase();
    let list = playbooks.filter((p) => {
      const matchSearch = !q || p.name.toLowerCase().includes(q);
      const archived = (p as OnboardingPlaybook & { archived?: boolean }).archived ?? false;
      const matchStatus =
        filterStatus === 'active' ? !archived : archived;
      return matchSearch && matchStatus;
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = (a.name ?? '').localeCompare(b.name ?? '');
          break;
        case 'created_at':
          cmp =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'updated_at':
          cmp =
            new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case 'duration': {
          const da = durationFromPlaybook(a) ?? 0;
          const db = durationFromPlaybook(b) ?? 0;
          cmp = da - db;
          break;
        }
        default:
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [playbooks, search, filterStatus, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else setSortKey(key);
  };

  const { setPageLayout } = usePageLayout();
  useLayoutEffect(() => {
    setPageLayout({
      title: 'Playbooks',
      subtitle: 'Onboarding playbooks by segment and their default stages and tasks.',
    });
  }, [setPageLayout]);

  if (isPending) return <PageLoading />;

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        title="Playbooks"
        subtitle="Onboarding playbooks by segment and their default stages and tasks."
      />

      {isError && (
        <ErrorAlert message="Could not load playbooks." onRetry={() => refetch()} />
      )}

      {!isError && (!playbooks || playbooks.length === 0) && (
        <EmptyState
          title="No playbooks"
          description="Create playbooks in the backend to drive onboarding project generation."
          icon={<BookOpen className="h-12 w-12 text-muted-foreground" />}
        />
      )}

      {!isError && playbooks && playbooks.length > 0 && (
        <>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search playbooks…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Tabs
              value={filterStatus}
              onValueChange={(v) => setFilterStatus(v as FilterStatus)}
            >
              <TabsList>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">Playbooks</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sort by name, duration, last used, or created. Use row actions to view details.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {filteredAndSorted.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  {filterStatus === 'archived'
                    ? 'No archived playbooks.'
                    : 'No playbooks match your search.'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8 font-medium"
                          onClick={() => toggleSort('name')}
                        >
                          Name
                          {sortKey === 'name' && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                        </Button>
                      </TableHead>
                      <TableHead>Segment</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8 font-medium"
                          onClick={() => toggleSort('duration')}
                        >
                          Duration
                          {sortKey === 'duration' && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                        </Button>
                      </TableHead>
                      <TableHead>Last used</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8 font-medium"
                          onClick={() => toggleSort('created_at')}
                        >
                          Created
                          {sortKey === 'created_at' && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                        </Button>
                      </TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSorted.map((p) => {
                      const duration = durationFromPlaybook(p);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>
                            <CustomerTypeBadge type={p.segment} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {duration != null ? `${duration}d` : '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">—</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString('en-US')}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button variant="ghost" size="icon-sm" aria-label="Row actions">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                }
                              />
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onSelect={() => setViewPlaybook(p)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Sheet
        open={viewPlaybook !== null}
        onOpenChange={(open) => !open && setViewPlaybook(null)}
      >
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{viewPlaybook?.name ?? 'Playbook'}</SheetTitle>
            <SheetDescription>
              Segment, products, and default stages and tasks.
            </SheetDescription>
          </SheetHeader>
          {viewPlaybook && (
            <div className="mt-4">
              <PlaybookDetailContent playbook={viewPlaybook} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
