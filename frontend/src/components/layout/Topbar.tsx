import { LogOut, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePageLayout } from '@/contexts/PageLayoutContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export function Topbar() {
  const { pageLayout } = usePageLayout();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const email = user?.email ?? '';
  const initials = email.slice(0, 2).toUpperCase() || 'U';

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b-[4px] border-border bg-background px-4 md:px-6">
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
            aria-label="Open user menu"
          >
            <MoreHorizontal className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {email && (
              <>
                <div className="px-2 py-1.5 text-xs text-muted-foreground truncate max-w-[200px]">
                  {email}
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Help</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Avatar className="size-8 border-2 border-border">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
