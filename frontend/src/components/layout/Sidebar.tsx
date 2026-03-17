import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  BookOpen,
  FileDown,
  FlaskConical,
  ChevronDown,
  ChevronRight,
  Wrench,
  Columns2,
} from 'lucide-react';
import { AgileLogo } from '@/components/AgileLogo';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const CORE_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/simulator', icon: FlaskConical, label: 'Simulator' },
];

const WORKSPACE_NAV = [
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/pipeline', icon: Columns2, label: 'Pipeline' },
  { to: '/customers', icon: Users, label: 'Customers' },
];

const TOOLS_NAV = [
  { to: '/playbooks', icon: BookOpen, label: 'Playbooks' },
  { to: '/deals/import', icon: FileDown, label: 'Import deal' },
];

const toolsPaths = TOOLS_NAV.map(({ to }) => to);

function isToolsActive(pathname: string) {
  return toolsPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function NavGroup({
  label,
  items,
  onNavClick,
}: {
  label: string;
  items: Array<{ to: string; icon: React.ComponentType<{ className?: string }>; label: string }>;
  onNavClick: (to: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="px-2.5 py-1.5 text-xs font-medium uppercase tracking-wider text-[var(--sidebar-foreground)]/60 md:px-3">
        {label}
      </p>
      {items.map(({ to, icon: Icon, label: itemLabel }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors md:px-3',
              isActive
                ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
                : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/20 hover:text-[var(--sidebar-foreground)]'
            )
          }
          onClick={() => onNavClick(to)}
        >
          <Icon className="size-5 shrink-0" aria-hidden />
          <span className="hidden md:inline">{itemLabel}</span>
        </NavLink>
      ))}
    </div>
  );
}

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [toolsOpen, setToolsOpen] = useState(() => isToolsActive(location.pathname));
  const expanded = toolsOpen || isToolsActive(location.pathname);

  const handleNavClick = (to: string) => {
    // When on Simulator, programmatic navigate() updates the URL but React Router state
    // does not update (no re-render). Use full navigation so the app loads the target route.
    if (location.pathname === '/simulator' && to !== '/simulator') {
      window.location.assign(to);
      return;
    }
    navigate(to);
  };

  return (
    <aside
      className="flex w-14 flex-shrink-0 flex-col border-r-[4px] border-border bg-[var(--sidebar)] text-[var(--sidebar-foreground)] md:w-56"
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-center gap-2 px-3 md:px-4">
        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden md:size-10">
          <AgileLogo size="sm" className="size-5 md:size-6" />
        </div>
        <div className="hidden flex-1 md:block">
          <p className="text-sm font-semibold leading-none">Agile</p>
          <p className="mt-0.5 text-xs text-[var(--sidebar-foreground)]/80 leading-none">Onboarding</p>
        </div>
      </div>
      <Separator className="bg-[var(--sidebar-border)]" />
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
        <NavGroup label="Core" items={CORE_NAV} onNavClick={handleNavClick} />
        <NavGroup label="Workspace" items={WORKSPACE_NAV} onNavClick={handleNavClick} />
        <div className="space-y-1">
          <p className="px-2.5 py-1.5 text-xs font-medium uppercase tracking-wider text-[var(--sidebar-foreground)]/60 md:px-3">
            Tools
          </p>
          <button
            type="button"
            onClick={() => setToolsOpen((o) => !o)}
            className={cn(
              'flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors md:px-3',
              isToolsActive(location.pathname)
                ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
                : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/20 hover:text-[var(--sidebar-foreground)]'
            )}
            aria-expanded={expanded}
            aria-controls="tools-nav"
          >
            <span className="flex items-center gap-2.5">
              <Wrench className="size-5 shrink-0" aria-hidden />
              <span className="hidden md:inline">More</span>
            </span>
            {toolsOpen ? (
              <ChevronDown className="size-4 shrink-0" aria-hidden />
            ) : (
              <ChevronRight className="size-4 shrink-0" aria-hidden />
            )}
          </button>
          <div
            id="tools-nav"
            className="mt-1 space-y-1 border-l border-[var(--sidebar-border)] pl-2 md:ml-3"
            hidden={!expanded}
          >
            {TOOLS_NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors md:px-3',
                    isActive
                      ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
                      : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/20 hover:text-[var(--sidebar-foreground)]'
                  )
                }
                onClick={() => { handleNavClick(to); setToolsOpen(true); }}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="hidden md:inline">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      <Separator className="bg-[var(--sidebar-border)]" />
      <div className="px-3 py-3 md:px-4">
        <p className="text-xs text-[var(--sidebar-foreground)]/70">Onboarding Ops</p>
      </div>
    </aside>
  );
}
