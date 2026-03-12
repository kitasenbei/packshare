import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Rocket,
  Star,
  Zap,
  Diamond,
  Users,
  GitBranch,
  Palette,
  Headphones,
  BarChart3,
  Infinity,
  Tv,
  Trophy,
  Code,
  Server,
  Award,
  Check,
  X,
} from 'lucide-react';

interface PaywallDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function PaywallDialog({ open, onClose }: PaywallDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-3xl" showCloseButton={false}>
        {/* Hero header */}
        <div
          className="rounded-t-xl px-6 pt-6 pb-3 text-center"
          style={{ background: 'linear-gradient(0deg, rgba(132,169,140,0.15) 0%, rgba(132,169,140,0.03) 100%)' }}
        >
          <Rocket className="mx-auto mb-2 size-12 text-primary" />
          <h2 className="mb-1 text-xl font-bold">Upgrade to go Live</h2>
          <p className="text-sm text-muted-foreground">
            Your tournament is ready. Choose a plan to publish it and make it accessible to players.
          </p>
        </div>

        {/* Pricing grid */}
        <div className="grid gap-3 px-2 sm:grid-cols-3">
          {/* Free tier */}
          <div className="flex flex-col rounded-lg border p-4">
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Starter</span>
            <div className="mb-0.5 flex items-baseline gap-1">
              <span className="text-2xl font-bold">Free</span>
            </div>
            <span className="mb-3 text-xs text-muted-foreground">For casual tournaments</span>
            <Separator className="mb-3" />
            <div className="mb-3 flex flex-1 flex-col gap-2">
              {['Up to 8 players', '1 active tournament', 'Basic bracket', 'Community support'].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <Check className="size-4 text-primary" />
                  <span className="text-sm">{f}</span>
                </div>
              ))}
              {['Custom branding', 'Live streaming', 'Analytics'].map((f) => (
                <div key={f} className="flex items-center gap-2 opacity-40">
                  <X className="size-4" />
                  <span className="text-sm">{f}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full">
              Current Plan
            </Button>
          </div>

          {/* Pro tier */}
          <div className="relative flex flex-col rounded-lg border-2 border-primary p-4">
            <Badge className="absolute -top-2.5 right-4 text-[10px] font-bold">
              POPULAR
            </Badge>
            <div className="flex items-center gap-1.5">
              <Zap className="size-4 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Pro</span>
            </div>
            <div className="mb-0.5 flex items-baseline gap-1">
              <span className="text-2xl font-bold">$100</span>
              <span className="text-sm text-muted-foreground">/mo</span>
            </div>
            <span className="mb-3 text-xs text-muted-foreground">For serious organizers</span>
            <Separator className="mb-3" />
            <div className="mb-3 flex flex-1 flex-col gap-2">
              {([
                { icon: <Users className="size-4" />, text: 'Up to 64 players' },
                { icon: <Trophy className="size-4" />, text: '5 active tournaments' },
                { icon: <GitBranch className="size-4" />, text: 'Single & double elimination' },
                { icon: <Palette className="size-4" />, text: 'Custom branding' },
                { icon: <Headphones className="size-4" />, text: 'Priority support' },
                { icon: <BarChart3 className="size-4" />, text: 'Mappool analytics' },
              ] as const).map((f) => (
                <div key={f.text} className="flex items-center gap-2">
                  <span className="flex text-primary">{f.icon}</span>
                  <span className="text-sm">{f.text}</span>
                </div>
              ))}
            </div>
            <Button className="w-full font-bold">
              <Star className="size-4" />
              Upgrade to Pro
            </Button>
          </div>

          {/* Enterprise tier */}
          <div
            className="flex flex-col rounded-lg border p-4"
            style={{ background: 'linear-gradient(180deg, rgba(245,200,66,0.04) 0%, transparent 100%)' }}
          >
            <div className="flex items-center gap-1.5">
              <Diamond className="size-4" style={{ color: '#f5c842' }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#f5c842' }}>Enterprise</span>
            </div>
            <div className="mb-0.5 flex items-baseline gap-1">
              <span className="text-2xl font-bold">$500</span>
              <span className="text-sm text-muted-foreground">/mo</span>
            </div>
            <span className="mb-3 text-xs text-muted-foreground">For leagues &amp; organizations</span>
            <Separator className="mb-3" />
            <div className="mb-3 flex flex-1 flex-col gap-2">
              {([
                { icon: <Infinity className="size-4" />, text: 'Unlimited players' },
                { icon: <Trophy className="size-4" />, text: 'Unlimited tournaments' },
                { icon: <GitBranch className="size-4" />, text: 'All bracket formats' },
                { icon: <Award className="size-4" />, text: 'White-label branding' },
                { icon: <Tv className="size-4" />, text: 'Live streaming overlay' },
                { icon: <Code className="size-4" />, text: 'API access' },
                { icon: <Headphones className="size-4" />, text: 'Dedicated support' },
                { icon: <Server className="size-4" />, text: 'Custom domain' },
              ] as const).map((f) => (
                <div key={f.text} className="flex items-center gap-2">
                  <span className="flex" style={{ color: '#f5c842' }}>{f.icon}</span>
                  <span className="text-sm">{f.text}</span>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full font-bold"
              style={{ borderColor: '#f5c842', color: '#f5c842' }}
            >
              Contact Sales
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          All plans include SSL, 99.9% uptime SLA, and automatic backups. Cancel anytime.
        </p>

        <DialogFooter className="justify-center">
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
