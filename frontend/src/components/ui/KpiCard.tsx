import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: number | string;
  icon?: ReactNode;
  iconClassName?: string;
  trend?: ReactNode;
  className?: string;
}

export function KpiCard({
  label,
  value,
  icon,
  iconClassName = 'bg-muted',
  trend,
  className,
}: KpiCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="flex flex-row items-start gap-3 px-3 pt-4 pb-4">
        {icon != null && (
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-lg p-2.5',
              iconClassName
            )}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums text-foreground">
            {value}
          </p>
          {trend != null && <div className="mt-1">{trend}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
