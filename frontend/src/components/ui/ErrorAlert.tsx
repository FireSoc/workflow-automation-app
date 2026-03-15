import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorAlertProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorAlert({ message = 'Something went wrong.', onRetry }: ErrorAlertProps) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-destructive">Error</p>
        <p className="mt-0.5 text-sm text-destructive/90">{message}</p>
      </div>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry} className="flex-shrink-0 text-destructive hover:bg-destructive/10">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  );
}
