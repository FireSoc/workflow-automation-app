import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/at-risk': 'At-Risk Accounts',
  '/projects': 'Projects',
  '/playbooks': 'Playbooks',
  '/customers': 'Customers',
};

interface TopbarProps {
  action?: ReactNode;
}

export function Topbar({ action }: TopbarProps) {
  const { pathname } = useLocation();

  const title =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith('/portal/') ? 'Customer portal' : pathname.startsWith('/projects/') ? 'Project' : 'Agile');

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-base font-semibold text-slate-800">{title}</h1>
      {action && <div>{action}</div>}
    </header>
  );
}
