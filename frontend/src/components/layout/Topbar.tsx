import { MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePageLayout } from '@/contexts/PageLayoutContext';
import { cn } from '@/lib/utils';

interface TopbarProps {
  /** Optional user name for avatar fallback; defaults to "User" */
  userName?: string;
}

export function Topbar({ userName = 'User' }: TopbarProps) {
  const { pageLayout } = usePageLayout();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 md:px-6">
      <div className="min-w-0 flex-1 flex items-center gap-3">
        {pageLayout.title ? (
          <>
            <h1 className="truncate text-lg font-semibold text-foreground">
              {pageLayout.title}
            </h1>
            {pageLayout.subtitle && (
              <span className="hidden truncate text-sm text-muted-foreground sm:inline">
                {pageLayout.subtitle}
              </span>
            )}
            {pageLayout.action != null && (
              <span className="flex shrink-0">{pageLayout.action}</span>
            )}
          </>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              'inline-flex size-8 shrink-0 items-center justify-center rounded-full',
              'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
            aria-label="Open menu"
          >
            <MoreHorizontal className="size-5" />
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
  );
}
