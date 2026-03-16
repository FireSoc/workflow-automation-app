import { Link } from 'react-router-dom';
import { FlaskConical, LayoutDashboard, Sparkles, ArrowRight } from 'lucide-react';
import { AgileLogo } from '@/components/AgileLogo';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const PILLARS = [
  {
    title: 'Simulation',
    description:
      'Run timeline simulations to see how delays and assumptions affect go-live. Model scenarios before they happen.',
    icon: FlaskConical,
  },
  {
    title: 'Visibility',
    description:
      'Track projects, stages, and tasks in one place. See customer onboarding health and what needs attention.',
    icon: LayoutDashboard,
  },
  {
    title: 'AI & recommendations',
    description:
      'Get risk bands and next-best actions powered by your project and playbook data. Ship with confidence.',
    icon: Sparkles,
  },
];

const FLOW_STEPS = [
  {
    number: '1.0',
    title: 'Configure',
    description: 'Set up your onboarding project and playbook.',
    subItems: ['Define stages and task templates', 'Connect playbook to segments'],
  },
  {
    number: '2.0',
    title: 'Simulate',
    description: 'Run simulations with your assumptions.',
    subItems: ['Adjust timelines and delays', 'See impact on go-live dates'],
  },
  {
    number: '3.0',
    title: 'Review',
    description: 'Simulation impact and AI risk insights.',
    subItems: ['Virtual inbox preview', 'Risk bands and recommendations'],
  },
  {
    number: '4.0',
    title: 'Act',
    description: 'Take action in projects and ops.',
    subItems: ['Dashboard and project detail', 'Clear next-best actions'],
  },
];

const CHANGELOG = [
  { title: 'Simulator launch', date: 'Mar 2025', description: 'Run timeline simulations with configurable assumptions.' },
  { title: 'Risk bands', date: 'Feb 2025', description: 'Explainable risk scores and levels across projects.' },
  { title: 'Playbook-driven projects', date: 'Jan 2025', description: 'Stages and tasks driven by segment playbooks.' },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="page-container flex h-12 items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 font-semibold text-foreground"
          >
            <div className="flex size-8 items-center justify-center overflow-hidden rounded-lg">
              <AgileLogo size="md" className="size-8" />
            </div>
            <span>Agile Onboarding</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              Dashboard
            </Link>
            <Link to="/simulator" className={cn(buttonVariants({ size: 'sm' }))}>
              Simulator
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-border bg-gradient-to-b from-muted/50 to-background py-10 md:py-14">
          <div className="page-container flex flex-col items-center gap-5 text-center">
            <Badge variant="secondary" className="text-xs">
              New — Simulator
            </Badge>
            <h1 className="max-w-2xl text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
              The onboarding ops system for teams.
            </h1>
            <p className="max-w-lg text-base text-muted-foreground">
              AI-assisted co-pilot for customer onboarding—clear risk, next-best actions, one place to see what needs attention.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link to="/dashboard" className={cn(buttonVariants({ size: 'default' }), 'gap-2 inline-flex items-center')}>
                Open dashboard
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link to="/simulator" className={cn(buttonVariants({ size: 'default', variant: 'outline' }), 'gap-2 inline-flex items-center')}>
                View simulator
              </Link>
            </div>
          </div>
        </section>

        <section id="value-pillars" className="bg-background py-8 md:py-10">
          <div className="page-container">
            <h2 className="text-center text-xl font-semibold text-foreground sm:text-2xl">
              Built for B2B onboarding operations
            </h2>
            <p className="mx-auto mt-1 max-w-lg text-center text-sm text-muted-foreground">
              From simulation to execution, one workflow.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {PILLARS.map(({ title, description, icon: Icon }) => (
                <Card key={title} className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" aria-hidden />
                    </div>
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription className="text-sm">{description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-border bg-muted/40 py-8 md:py-10">
          <div className="page-container">
            <h2 className="text-center text-xl font-semibold text-foreground sm:text-2xl">
              From idea to go-live
            </h2>
            <div className="mx-auto mt-6 max-w-xl space-y-0">
              {FLOW_STEPS.map((step, i) => (
                <div key={step.number}>
                  <div className="flex flex-col gap-1 py-4 md:flex-row md:items-start md:gap-3">
                    <Badge variant="outline" className="w-fit font-mono text-xs">
                      {step.number}
                    </Badge>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-foreground">
                        {step.title} →
                      </h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {step.description}
                      </p>
                      <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                        {step.subItems.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="text-primary">·</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {i < FLOW_STEPS.length - 1 && <Separator />}
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <Link to="/dashboard" className={cn(buttonVariants(), 'gap-2 inline-flex items-center')}>
                Enter the app
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        <section id="changelog" className="bg-background py-8 md:py-10">
          <div className="page-container">
            <h2 className="text-center text-xl font-semibold text-foreground sm:text-2xl">
              Changelog
            </h2>
            <div className="mx-auto mt-6 max-w-xl space-y-0">
              {CHANGELOG.map((item, i) => (
                <div key={item.title}>
                  <div className="flex flex-col gap-0.5 py-3 md:flex-row md:items-baseline md:gap-3">
                    <span className="text-sm font-medium text-foreground">
                      {item.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.date}
                    </span>
                    <span className="text-sm text-muted-foreground md:flex-1">
                      {item.description}
                    </span>
                  </div>
                  {i < CHANGELOG.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-muted/40 py-8 md:py-10">
          <div className="page-container">
            <h2 className="sr-only">Testimonials</h2>
            <Card className="mx-auto max-w-xl border-border bg-card">
              <CardContent className="py-4">
                <blockquote className="text-base font-medium leading-snug text-foreground">
                  &ldquo;We ship onboarding with confidence. Simulation and risk visibility in one place.&rdquo;
                </blockquote>
                <footer className="mt-2 text-sm text-muted-foreground">
                  — Onboarding lead, B2B SaaS
                </footer>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Separator />
      <footer className="bg-muted/30 py-6">
        <div className="page-container flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Agile Onboarding — workflow simulation and ops visibility.
          </p>
          <div className="flex gap-4">
            <Link
              to="/dashboard"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              to="/simulator"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Simulator
            </Link>
            <Link
              to="/projects"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Projects
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
