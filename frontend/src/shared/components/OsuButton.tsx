import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import osuLogo from '../../assets/osu-logo.svg';

interface OsuButtonProps {
  onClick: () => void;
  variant?: 'light' | 'dark';
  iconOnly?: boolean;
}

export default function OsuButton({ onClick, variant = 'light', iconOnly }: OsuButtonProps) {
  const isDark = variant === 'dark';
  return (
    <Button
      size={iconOnly ? 'icon' : 'sm'}
      variant="ghost"
      onClick={onClick}
      className={cn(
        'gap-1 font-semibold',
        isDark
          ? 'text-primary/80 bg-primary/15 hover:bg-primary/25'
          : 'text-primary bg-primary/8 hover:bg-primary/15',
      )}
    >
      <img src={osuLogo} alt="" className="size-4" />
      {!iconOnly && 'Open on osu!'}
    </Button>
  );
}
