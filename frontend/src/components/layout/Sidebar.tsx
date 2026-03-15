import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  BookOpen,
  FileDown,
  FlaskConical,
  Inbox,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Zap,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const PRIMARY_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/simulator', icon: FlaskConical, label: 'Simulator' },
  { to: '/ops-inbox', icon: Inbox, label: 'Ops Inbox' },
  { to: '/customers', icon: Users, label: 'Customers' },
];

const MORE_NAV = [
  { to: '/playbooks', icon: BookOpen, label: 'Playbooks' },
  { to: '/deals/import', icon: FileDown, label: 'Import deal' },
];

const morePaths = MORE_NAV.map(({ to }) => to);

function isMoreActive(pathname: string) {
  return morePaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function Sidebar() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(() => isMoreActive(location.pathname));
  const isMore = isMoreActive(location.pathname);
  const expanded = moreOpen || isMore;

  return (
    <aside
      className="flex w-14 flex-shrink-0 flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] md:w-56"
      aria-label="Main navigation"
    >
      <div className="flex h-14 items-center gap-2 px-3 md:px-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-black text-white md:size-10">
          <Zap className="size-4 md:size-5" aria-hidden />
        </div>
        <div className="hidden flex-1 md:block">
          <p className="text-sm font-semibold leading-none">Agile</p>
          <p className="mt-0.5 text-xs text-white/70 leading-none">Onboarding</p>
        </div>
      </div>
      <Separator className="bg-white/10" />
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {PRIMARY_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors md:px-3',
                isActive
                  ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            <span className="hidden md:inline">{label}</span>
          </NavLink>
        ))}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            className={cn(
              'flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors md:px-3',
              isMoreActive(location.pathname)
                ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            )}
            aria-expanded={expanded}
            aria-controls="more-nav"
          >
            <span className="flex items-center gap-2.5">
              <MoreHorizontal className="size-5 shrink-0" aria-hidden />
              <span className="hidden md:inline">More</span>
            </span>
            {moreOpen ? (
              <ChevronDown className="size-4 shrink-0" aria-hidden />
            ) : (
              <ChevronRight className="size-4 shrink-0" aria-hidden />
            )}
          </button>
          <div
            id="more-nav"
            className="mt-1 ml-4 space-y-1 border-l border-white/20 pl-2 md:ml-6"
            hidden={!expanded}
          >
            {MORE_NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors md:px-3',
                    isActive
                      ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )
                }
                onClick={() => setMoreOpen(true)}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="hidden md:inline">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      <Separator className="bg-white/10" />
      <div className="px-3 py-3 md:px-4">
        <p className="text-xs text-white/60">Onboarding Ops</p>
      </div>
    </aside>
  )
}
