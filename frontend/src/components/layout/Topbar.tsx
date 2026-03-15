import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/projects': 'Projects',
  '/simulator': 'Decision Sandbox',
  '/ops-inbox': 'Ops Inbox',
  '/customers': 'Customers',
  '/deals/import': 'Import deal',
  '/playbooks': 'Playbooks',
};

interface TopbarProps {
  action?: ReactNode;
  /** Optional user name for avatar fallback; defaults to "User" */
  userName?: string;
}

export function Topbar({ action, userName = 'User' }: TopbarProps) {
  const { pathname } = useLocation();

  const title =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith('/portal/') ? 'Customer portal' : pathname.startsWith('/projects/') ? 'Project' : 'Agile');

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        {action != null && <div className="hidden sm:block">{action}</div>}
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Open menu">
              <MoreHorizontal className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Help</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Avatar className="size-8 border-2 border-border">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {userName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
