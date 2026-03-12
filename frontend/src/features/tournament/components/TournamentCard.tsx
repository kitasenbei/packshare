import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { Tournament } from '../api/tournaments';
import { placeholderBanner, placeholderLogo } from '../utils/placeholders';

const statusColors: Record<string, string> = {
  live: '#ff4444',
  upcoming: '#4488ff',
  completed: '#44bb44',
};

interface TournamentCardProps {
  tournament: Tournament;
  isOwner?: boolean;
  onClick: () => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export default function TournamentCard({ tournament, isOwner, onClick, onDelete }: TournamentCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'cursor-pointer overflow-hidden transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-lg',
      )}
    >
      {/* Banner */}
      <div
        className="flex h-[100px] items-center gap-4 px-6"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.3)), url(${tournament.banner_url || placeholderBanner})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <img
          src={tournament.logo_url || placeholderLogo}
          alt=""
          className="size-16 rounded-full border-[3px] border-white object-cover"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white">{tournament.name}</h3>
            <span
              className="inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold text-white"
              style={{ backgroundColor: statusColors[tournament.status] || '#666' }}
            >
              {tournament.status.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-white/70">
            {tournament.format} · {tournament.stages?.length || 0} stages
          </p>
        </div>
        {isOwner && onDelete && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  className="text-white/70 hover:text-destructive"
                />
              }
            >
              <Trash2 />
            </TooltipTrigger>
            <TooltipContent>Delete tournament</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Stages */}
      {tournament.stages && tournament.stages.length > 0 && (
        <div className="px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tournament.stages.map((stage) => (
              <Badge key={stage.id} variant="outline">
                {stage.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
