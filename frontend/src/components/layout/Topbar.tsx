import { Link } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { AgileLogo } from '@/components/AgileLogo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface TopbarProps {
  /** Optional user name for avatar fallback; defaults to "User" */
  userName?: string;
}

export function Topbar({ userName = 'User' }: TopbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 md:px-6">
      <Link to="/dashboard" className="flex shrink-0 items-center" aria-label="Agile Onboarding home">
        <AgileLogo size="sm" className="size-8" />
      </Link>
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
