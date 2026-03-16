import { cn } from '@/lib/utils';

interface AgileLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'size-6',
  md: 'size-8',
  lg: 'size-10',
};

export function AgileLogo({ className, size = 'md' }: AgileLogoProps) {
  return (
    <img
      src="/agile-logo.png"
      alt="Agile Onboarding"
      className={cn(sizeClasses[size], 'shrink-0', className)}
      width={size === 'sm' ? 24 : size === 'md' ? 32 : 40}
      height={size === 'sm' ? 24 : size === 'md' ? 32 : 40}
    />
  );
}
