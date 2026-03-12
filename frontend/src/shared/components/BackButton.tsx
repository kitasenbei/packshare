import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
}

export default function BackButton({ onClick }: BackButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="fixed bottom-6 left-6 z-[1000] gap-2 text-muted-foreground hover:border-primary hover:text-primary"
    >
      <ArrowLeft className="size-4" />
      Go Back
    </Button>
  );
}
