import { Link } from 'react-router-dom';
import {
  FlaskConical,
  LayoutDashboard,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  Activity,
  Lightbulb,
  Play,
  BookOpen,
  Shield,
  Star,
  Calendar,
  Users,
} from 'lucide-react';
import { AgileLogo } from '@/components/AgileLogo';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// ─── Static mock data ─────────────────────────────────────────────────────────

const MOCK_PROJECTS = [
  { name: 'Acme Corp', stage: 'Integration', status: 'at_risk', progress: 55, risk: 'Elevated' },
  { name: 'Stripe Inc', stage: 'Setup', status: 'on_track', progress: 35, risk: 'Low' },
  { name: 'Figma Corp', stage: 'Training', status: 'on_track', progress: 75, risk: 'Moderate' },
  { name: 'Notion Inc', stage: 'Kickoff', status: 'blocked', progress: 12, risk: 'High' },
] as const;

const MOCK_ACTIONS = [
  { title: 'Send training materials', project: 'Acme Corp', type: 'overdue', badge: 'Overdue' },
  { title: 'API integration review', project: 'Notion Inc', type: 'blocked', badge: 'Blocked' },
  { title: 'Confirm go-live date', project: 'Figma Corp', type: 'soon', badge: 'Due today' },
] as const;

const CAPABILITIES = [
  {
    icon: BookOpen,
    title: 'Playbook-driven projects',
    desc: 'Automatically create stages and tasks from your segment playbook when a deal closes. No manual setup required.',
  },
  {
    icon: Shield,
    title: 'Risk & AI insights',
    desc: 'Explainable risk scores with overdue detection, blocker triage, and AI-powered next-best action recommendations.',
  },
  {
    icon: FlaskConical,
    title: 'Timeline simulation',
    desc: 'Model delays and assumptions before they happen. Compare scenarios and pick the safest path to go-live.',
  },
];

const FLOW_STEPS = [
  {
    num: '01',
    title: 'Deal closes',
    desc: 'CRM sends a webhook. Project, customer, and kickoff tasks are created automatically from your playbook.',
  },
  {
    num: '02',
    title: 'Stages run',
    desc: 'Playbook templates drive the project through Kickoff → Setup → Integration → Training → Go-live.',
  },
  {
    num: '03',
    title: 'Risk is tracked',
    desc: 'Overdue tasks, blockers, and inactivity surface as risk scores. AI flags what needs attention.',
  },
  {
    num: '04',
    title: 'Team acts',
    desc: 'Next-best actions, the simulator, and the dashboard give your team a clear path every day.',
  },
];

// ─── Mockup primitives ────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const cls =
    status === 'at_risk'
      ? 'bg-amber-500'
      : status === 'blocked'
        ? 'bg-red-500'
        : 'bg-emerald-500';
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

function RiskPill({ risk }: { risk: string }) {
  const cls =
    risk === 'High'
      ? 'bg-red-100 text-red-700'
      : risk === 'Elevated'
        ? 'bg-amber-100 text-amber-700'
        : risk === 'Moderate'
          ? 'bg-yellow-100 text-yellow-700'
          : 'bg-emerald-100 text-emerald-700';
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>{risk}</span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-200">
      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${value}%` }} />
    </div>
  );
}

// ─── Dashboard mockup ─────────────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 border-b border-slate-200">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-2 flex-1 rounded bg-white px-2 py-0.5 text-[10px] text-slate-400 border border-slate-200">
          app.agile.co/dashboard
        </div>
        <div className="ml-2 shrink-0 rounded bg-indigo-600 px-2 py-0.5 text-[10px] text-white font-medium">
          Run simulation
        </div>
      </div>

      {/* App shell */}
      <div className="flex min-h-0">
        {/* Mini sidebar */}
        <div className="hidden sm:flex w-32 shrink-0 flex-col gap-0.5 border-r border-slate-100 bg-slate-50 p-2 py-3">
          <div className="flex items-center gap-1.5 rounded px-1.5 py-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50">
            <LayoutDashboard className="h-3 w-3 shrink-0" />
            Dashboard
          </div>
          {[
            { label: 'Projects', icon: FolderKanban },
            { label: 'Customers', icon: Users },
            { label: 'Simulator', icon: FlaskConical },
            { label: 'Playbooks', icon: BookOpen },
          ].map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 rounded px-1.5 py-1 text-[10px] text-slate-400"
            >
              <Icon className="h-3 w-3 shrink-0" />
              {label}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 p-3 space-y-3">
          {/* Page header */}
          <div>
            <p className="text-xs font-semibold text-slate-800">Onboarding Overview</p>
            <p className="text-[10px] text-slate-400">Active projects and tasks at a glance</p>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'Projects', value: '12/15', icon: FolderKanban, cls: 'text-indigo-600' },
              { label: 'At risk', value: '4', icon: AlertTriangle, cls: 'text-amber-500' },
              { label: 'Completed', value: '3', icon: CheckCircle2, cls: 'text-emerald-500' },
              { label: 'Tasks', value: '24', icon: Activity, cls: 'text-slate-500' },
            ].map(({ label, value, icon: Icon, cls }) => (
              <div key={label} className="rounded-lg border border-slate-100 bg-white p-1.5 shadow-sm">
                <div className="flex items-center gap-1 mb-0.5">
                  <Icon className={`h-2.5 w-2.5 ${cls}`} />
                  <span className="text-[9px] text-slate-400">{label}</span>
                </div>
                <p className="text-xs font-semibold text-slate-700 tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          {/* Two-column: actions + projects */}
          <div className="grid grid-cols-5 gap-2">
            {/* Actions panel */}
            <div className="col-span-2 rounded-lg border border-slate-100 bg-white shadow-sm p-2">
              <div className="flex items-center gap-1 mb-2">
                <Lightbulb className="h-2.5 w-2.5 text-indigo-500" />
                <span className="text-[9px] font-semibold text-slate-700">Next best actions</span>
              </div>
              <div className="space-y-1.5">
                {MOCK_ACTIONS.map((a) => (
                  <div key={a.title} className="flex items-start gap-1.5">
                    <span
                      className={`mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                        a.type === 'overdue'
                          ? 'bg-red-500'
                          : a.type === 'blocked'
                            ? 'bg-amber-500'
                            : 'bg-indigo-400'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-medium text-slate-700 truncate">{a.title}</p>
                      <p className="text-[8px] text-slate-400 truncate">{a.project}</p>
                    </div>
                    <span
                      className={`ml-auto shrink-0 rounded px-1 py-0.5 text-[8px] font-medium ${
                        a.type === 'overdue'
                          ? 'bg-red-50 text-red-600'
                          : a.type === 'blocked'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-indigo-50 text-indigo-600'
                      }`}
                    >
                      {a.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Project progress panel */}
            <div className="col-span-3 rounded-lg border border-slate-100 bg-white shadow-sm p-2">
              <div className="flex items-center gap-1 mb-2">
                <FolderKanban className="h-2.5 w-2.5 text-indigo-500" />
                <span className="text-[9px] font-semibold text-slate-700">Project progress</span>
              </div>
              <div className="space-y-1.5">
                {MOCK_PROJECTS.map((p) => (
                  <div key={p.name} className="flex items-center gap-2">
                    <StatusDot status={p.status} />
                    <span className="w-16 shrink-0 truncate text-[9px] font-medium text-slate-700">
                      {p.name}
                    </span>
                    <div className="flex-1">
                      <ProgressBar value={p.progress} />
                    </div>
                    <span className="w-6 shrink-0 text-right text-[9px] text-slate-400">
                      {p.progress}%
                    </span>
                    <RiskPill risk={p.risk} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Simulator mockup ─────────────────────────────────────────────────────────

function SimulatorMockup() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 border-b border-slate-200">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-2 flex-1 rounded bg-white px-2 py-0.5 text-[10px] text-slate-400 border border-slate-200">
          app.agile.co/simulator
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-800">Scenario Simulator</p>
            <p className="text-[10px] text-slate-400">Model delays before they happen</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded bg-indigo-600 px-2 py-1 text-[10px] text-white font-medium">
            <Play className="h-2.5 w-2.5" />
            Run simulation
          </div>
        </div>

        {/* Assumptions */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded border border-slate-200 bg-slate-50 p-2">
            <p className="text-[9px] text-slate-500 mb-1">Customer delay (days)</p>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-indigo-200">
                <div className="h-full w-1/3 rounded-full bg-indigo-500" />
              </div>
              <span className="text-[10px] font-semibold text-slate-700">1.5</span>
            </div>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-2">
            <p className="text-[9px] text-slate-500 mb-1">Internal delay (days)</p>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-indigo-200">
                <div className="h-full w-1/5 rounded-full bg-indigo-500" />
              </div>
              <span className="text-[10px] font-semibold text-slate-700">0.5</span>
            </div>
          </div>
        </div>

        {/* Branch comparison */}
        <div className="space-y-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
            Branch comparison
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 space-y-1">
              <div className="flex items-center gap-1">
                <Star className="h-2.5 w-2.5 fill-emerald-500 text-emerald-600" />
                <span className="text-[9px] font-semibold text-emerald-800">Baseline</span>
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between text-[8px]">
                  <span className="text-slate-500">Risk score</span>
                  <span className="font-medium text-emerald-700">−4.2</span>
                </div>
                <div className="flex justify-between text-[8px]">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-medium text-emerald-700">−2.0 days</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-2 space-y-1">
              <span className="text-[9px] font-semibold text-slate-700">Slow customer</span>
              <div className="space-y-0.5">
                <div className="flex justify-between text-[8px]">
                  <span className="text-slate-500">Risk score</span>
                  <span className="font-medium text-red-600">+8.5</span>
                </div>
                <div className="flex justify-between text-[8px]">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-medium text-red-600">+5.0 days</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI rec */}
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-2">
          <div className="flex items-start gap-1.5">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-indigo-600" />
            <p className="text-[9px] text-indigo-800">
              <span className="font-semibold">AI recommendation: </span>
              Baseline reduces risk by 4.2 pts. Front-load customer-required tasks to protect go-live.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Project detail mockup ────────────────────────────────────────────────────

function ProjectDetailMockup() {
  const stages = ['Kickoff', 'Setup', 'Integration', 'Training', 'Go-live'];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 border-b border-slate-200">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-2 flex-1 rounded bg-white px-2 py-0.5 text-[10px] text-slate-400 border border-slate-200">
          app.agile.co/projects/42
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Project header */}
        <div>
          <p className="text-xs font-semibold text-slate-800">Acme Corp — Onboarding</p>
          <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
              Integration
            </span>
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-700">
              At risk
            </span>
          </div>
        </div>

        {/* Stage progress */}
        <div className="flex items-center gap-0.5">
          {stages.map((s, i) => (
            <div key={s} className="flex flex-1 items-center last:flex-none">
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[8px] font-bold ${
                  i < 2
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : i === 2
                      ? 'border-indigo-600 bg-white text-indigo-600'
                      : 'border-slate-300 bg-white text-slate-300'
                }`}
              >
                {i < 2 ? '✓' : i + 1}
              </div>
              {i < stages.length - 1 && (
                <div className={`h-0.5 flex-1 ${i < 2 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* AI risk summary */}
        <div className="rounded border border-amber-200 bg-amber-50 p-2">
          <div className="mb-0.5 flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5 text-amber-600" />
            <span className="text-[9px] font-semibold text-amber-800">AI Risk Summary</span>
          </div>
          <p className="text-[9px] text-amber-700">
            2 overdue tasks. Customer hasn't responded in 4 days. Consider escalating integration
            review.
          </p>
        </div>

        {/* Task list */}
        <div className="space-y-1">
          {[
            { name: 'API credentials setup', status: 'overdue', due: 'Mar 12' },
            { name: 'Test data migration', status: 'in_progress', due: 'Mar 18' },
            { name: 'Integration walkthrough call', status: 'pending', due: 'Mar 20' },
          ].map((t) => (
            <div key={t.name} className="flex items-center gap-2 rounded bg-slate-50 px-2 py-1">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  t.status === 'overdue'
                    ? 'bg-red-500'
                    : t.status === 'in_progress'
                      ? 'bg-indigo-500'
                      : 'bg-slate-300'
                }`}
              />
              <span className="flex-1 truncate text-[9px] text-slate-700">{t.name}</span>
              <div className="flex shrink-0 items-center gap-1 text-[8px] text-slate-400">
                <Calendar className="h-2 w-2" />
                {t.due}
              </div>
              <span
                className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-medium ${
                  t.status === 'overdue'
                    ? 'bg-red-50 text-red-600'
                    : t.status === 'in_progress'
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
                {t.status === 'overdue'
                  ? 'Overdue'
                  : t.status === 'in_progress'
                    ? 'In progress'
                    : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#1e1b4b]/95 backdrop-blur supports-[backdrop-filter]:bg-[#1e1b4b]/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold text-white">
            <div className="flex size-8 items-center justify-center overflow-hidden rounded-lg">
              <AgileLogo size="md" className="size-8" />
            </div>
            <span>Agile</span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5" aria-label="Product navigation">
            {[
              { label: 'Dashboard', to: '/dashboard' },
              { label: 'Projects', to: '/projects' },
              { label: 'Simulator', to: '/simulator' },
              { label: 'Playbooks', to: '/playbooks' },
            ].map(({ label, to }) => (
              <Link
                key={label}
                to={to}
                className="rounded-md px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="rounded-md px-3 py-1.5 text-sm text-white/70 transition-colors hover:text-white"
            >
              Log in
            </Link>
            <Link
              to="/dashboard"
              className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-indigo-900 transition-colors hover:bg-white/90"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#1e1b4b] pb-0 pt-16 sm:pt-20">
          {/* Radial glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.35),transparent)]" />

          <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              All your onboarding,
              <br className="hidden sm:block" /> all in one place
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-lg text-indigo-200/80">
              Agile is the AI-assisted ops co-pilot for B2B onboarding teams — playbook-driven
              projects, risk visibility, next-best actions, and simulation in one workspace.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-indigo-900 shadow transition-colors hover:bg-white/90"
              >
                Open dashboard
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                to="/simulator"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                View simulator
              </Link>
            </div>
          </div>

          {/* ── Hero product mockup ── */}
          <div className="relative mx-auto mt-14 max-w-5xl px-4 sm:px-6">
            {/* Floating card — risk alert (left) */}
            <div className="absolute left-0 top-6 z-10 hidden w-48 rounded-xl border border-slate-200 bg-white p-3 shadow-xl sm:block lg:-left-4">
              <div className="mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] font-semibold text-slate-700">Risk detected</span>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-500">
                Acme Corp — 2 tasks overdue. Integration at risk of missing go-live.
              </p>
              <div className="mt-2 flex items-center gap-1 rounded border border-amber-100 bg-amber-50 px-2 py-1">
                <span className="text-[9px] font-semibold text-amber-700">Risk score: 74</span>
                <span className="ml-auto text-[9px] font-medium text-amber-500">Elevated ↑</span>
              </div>
            </div>

            {/* Floating card — AI recommendation (right) */}
            <div className="absolute right-0 top-6 z-10 hidden w-52 rounded-xl border border-slate-200 bg-white p-3 shadow-xl sm:block lg:-right-4">
              <div className="mb-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-indigo-500" />
                <span className="text-[10px] font-semibold text-slate-700">AI recommendation</span>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-500">
                Front-load customer-required tasks to reduce go-live risk by 4 days.
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[9px] font-medium text-indigo-600">
                  On track
                </span>
                <span className="text-[9px] text-slate-400">after action</span>
              </div>
            </div>

            {/* Main dashboard mockup */}
            <DashboardMockup />

            {/* Fade the mockup into the background below */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
          </div>
        </section>

        {/* ── Capabilities ───────────────────────────────────────────────────── */}
        <section id="capabilities" className="bg-background py-20 md:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Built for B2B onboarding teams
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
                Agile gives every onboarding team one place to run projects, track risk, and ship
                customers to go-live without missing a beat.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {CAPABILITIES.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works + project detail mockup ───────────────────────────── */}
        <section id="how-it-works" className="border-y border-border bg-muted/30 py-20 md:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              {/* Left: steps */}
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  From deal won to go-live
                </h2>
                <p className="mt-3 text-base text-muted-foreground">
                  CRM closes the deal. Agile creates the project. Playbooks drive the stages. Risk
                  is tracked automatically.
                </p>

                <div className="mt-8 space-y-6">
                  {FLOW_STEPS.map((step) => (
                    <div key={step.num} className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {step.num}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                        <p className="mt-0.5 text-sm text-muted-foreground">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <Link
                    to="/dashboard"
                    className={cn(buttonVariants(), 'inline-flex items-center gap-2')}
                  >
                    Enter the app
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </div>

              {/* Right: project detail mockup */}
              <div>
                <ProjectDetailMockup />
              </div>
            </div>
          </div>
        </section>

        {/* ── Simulator spotlight ─────────────────────────────────────────────── */}
        <section id="simulator" className="bg-background py-20 md:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              {/* Left: simulator mockup */}
              <div className="order-2 md:order-1">
                <SimulatorMockup />
              </div>

              {/* Right: copy */}
              <div className="order-1 md:order-2">
                <Badge variant="secondary" className="mb-3">
                  Simulator
                </Badge>
                <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Model risk before it happens
                </h2>
                <p className="mt-3 text-base text-muted-foreground">
                  Run timeline simulations with configurable delay assumptions. Compare branches
                  side-by-side. Get AI recommendations on the safest path to go-live.
                </p>

                <ul className="mt-6 space-y-3">
                  {[
                    'Adjust customer and internal delay assumptions',
                    'Compare multiple scenario branches',
                    'See downstream impact on go-live dates',
                    'AI-powered recommendations on each simulation run',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2
                        className="mt-0.5 size-4 shrink-0 text-primary"
                        aria-hidden
                      />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <Link
                    to="/simulator"
                    className={cn(buttonVariants(), 'inline-flex items-center gap-2')}
                  >
                    <FlaskConical className="size-4" aria-hidden />
                    Open simulator
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <Separator />
      <footer className="bg-muted/30 py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            {/* Brand */}
            <div>
              <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
                <AgileLogo size="md" className="size-7" />
                <span>Agile</span>
              </Link>
              <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
                AI-assisted onboarding ops co-pilot for B2B SaaS teams.
              </p>
            </div>

            {/* Links */}
            <div className="flex gap-10">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">Product</p>
                {[
                  { label: 'Dashboard', to: '/dashboard' },
                  { label: 'Projects', to: '/projects' },
                  { label: 'Simulator', to: '/simulator' },
                  { label: 'Playbooks', to: '/playbooks' },
                ].map(({ label, to }) => (
                  <Link
                    key={label}
                    to={to}
                    className="block text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {label}
                  </Link>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">Workspace</p>
                {[
                  { label: 'Customers', to: '/customers' },
                  { label: 'Customer portal', to: '/portal/projects/1' },
                  { label: 'Import deal', to: '/deals/import' },
                ].map(({ label, to }) => (
                  <Link
                    key={label}
                    to={to}
                    className="block text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Separator className="my-6" />
          <p className="text-xs text-muted-foreground">
            © 2025 Agile Onboarding. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
