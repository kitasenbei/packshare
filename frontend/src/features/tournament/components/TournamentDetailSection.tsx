import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ButtonGroup } from '@/components/ui/button-group';
import { Spinner } from '@/components/ui/spinner';
import {
  Pencil,
  ExternalLink,
  Check,
  X,
  Copy,
  Users,
  GitBranch,
  Code,
  Server,
  List,
  Settings,
  Megaphone,
  Clock,
  Tv,
  CheckCircle2,
} from 'lucide-react';
import type { User } from '../../auth/api/auth';
import { palette } from '../../../shared/theme/palette';
import { placeholderBanner, placeholderLogo } from '../utils/placeholders';
import {
  getTournament,
  updateTournament,
  type Tournament,
} from '../api/tournaments';
import TournamentPlayers, { toPlayers, parseBracketData, type Player, type BracketData } from './TournamentPlayers';
import TournamentBracket from './TournamentBracket';
import { toAnnouncements, type Announcement } from './TournamentAnnouncements';
import { statusColors } from './TournamentStatus';
import SlotsEditor from './SlotsEditor';
import TournamentAnnouncements from './TournamentAnnouncements';
import SiteSettings from './SiteSettings';
import { parseSlotConfigs } from './slotUtils';
import MappoolTab from './MappoolTab';
import SettingsTab from './SettingsTab';
import PaywallDialog from './PaywallDialog';

const statusIcons: Record<string, React.ReactElement> = {
  upcoming: <Clock className="size-3" />,
  live: <Tv className="size-3" />,
  completed: <CheckCircle2 className="size-3" />,
};

interface TournamentDetailSectionProps {
  tournament: Tournament;
  user: User;
  onBack: () => void;
  onUpdated: (t: Tournament) => void;
  onDeleted: () => void;
}

export default function TournamentDetailSection({
  tournament: initialTournament,
  user,
  onBack,
  onUpdated,
  onDeleted,
}: TournamentDetailSectionProps) {
  const [tournament, setTournament] = useState<Tournament>(initialTournament);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailTab, setDetailTab] = useState<'mappool' | 'players' | 'bracket' | 'slots' | 'news' | 'website' | 'details'>('mappool');
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(tournament.name);
  const [savingName, setSavingName] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Players, bracket, announcements (from API)
  const [players, setPlayers] = useState<Player[]>([]);
  const [bracketData, setBracketData] = useState<BracketData>({ matches: [], bestOf: 7, generated: false });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Load full tournament data
  useEffect(() => {
    setLoading(true);
    getTournament(tournament.abbreviation)
      .then((full) => {
        setTournament(full);
        setEditName(full.name);
        setPlayers(toPlayers(full.players));
        setBracketData(parseBracketData(full.bracket_data));
        setAnnouncements(toAnnouncements(full.announcements));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tournament.abbreviation]);

  const isOwner = user.osu_id === tournament.user?.osu_id;
  const slotConfigs = parseSlotConfigs(tournament.slot_configs);

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    setSavingName(true);
    try {
      const updated = await updateTournament(tournament.abbreviation, { name: editName.trim() });
      setTournament(updated);
      onUpdated(updated);
      setEditingName(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
    setSavingName(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/t/${tournament.abbreviation}`);
    toast.info('Link copied!');
  };

  const handleTournamentChanged = (updated: Tournament) => {
    setTournament(updated);
    onUpdated(updated);
  };

  const handleError = (msg: string) => {
    toast.error(msg);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Breadcrumb nav */}
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink className="cursor-pointer text-sm" onClick={onBack}>
              Tournaments
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-sm font-semibold">{tournament.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Hero card */}
      <Card className="overflow-hidden">
        <div style={{ background: `linear-gradient(180deg, ${palette.mid}15 0%, ${palette.light}08 100%)` }}>
          {/* Banner */}
          <div className="relative" style={{ aspectRatio: '4/1' }}>
            <img
              src={tournament.banner_url || placeholderBanner}
              alt=""
              className="size-full object-cover"
              style={{
                maskImage: 'linear-gradient(180deg, black 40%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(180deg, black 40%, transparent 100%)',
              }}
            />
          </div>

          {/* Header row */}
          <div className="flex items-start justify-between px-4 pb-0">
            <div className="flex items-center gap-3">
              <img
                src={tournament.logo_url || placeholderLogo}
                alt=""
                className="size-12 rounded-lg object-cover"
              />
              <div>
                {editingName ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                      className="h-7 flex-1 text-base font-bold"
                      autoFocus
                    />
                    <Button variant="ghost" size="icon-xs" onClick={handleSaveName} disabled={savingName}>
                      <Check className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => { setEditingName(false); setEditName(tournament.name); }}>
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold">{tournament.name}</span>
                    {isOwner && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setEditingName(true)}
                              className="text-muted-foreground"
                            />
                          }
                        >
                          <Pencil className="size-3.5" />
                        </TooltipTrigger>
                        <TooltipContent>Rename</TooltipContent>
                      </Tooltip>
                    )}
                    <span
                      className="ml-1 inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-[11px] font-bold capitalize text-white"
                      style={{ backgroundColor: `${statusColors[tournament.status]}dd` }}
                    >
                      {statusIcons[tournament.status]}
                      {tournament.status}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <ButtonGroup className="mt-1">
              <Tooltip>
                <TooltipTrigger render={<Button variant="outline" size="sm" onClick={handleCopyLink} className="px-2" />}>
                  <Copy className="size-4" />
                </TooltipTrigger>
                <TooltipContent>Copy link</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-2"
                      render={<Link to={`/t/${tournament.abbreviation}`} target="_blank" />}
                    />
                  }
                >
                  <ExternalLink className="size-4" />
                </TooltipTrigger>
                <TooltipContent>Open public page</TooltipContent>
              </Tooltip>
            </ButtonGroup>
          </div>

          {error && (
            <Alert variant="destructive" className="mx-4 mt-2">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Sidebar + Content */}
          <SidebarProvider defaultOpen={true} className="min-h-0 items-start">
            <Sidebar collapsible="none" className="h-auto border-r bg-transparent">
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupLabel>Tournament</SidebarGroupLabel>
                  <SidebarMenu>
                    {([
                      { key: 'mappool', label: 'Mappool', icon: List },
                      { key: 'players', label: 'Players', icon: Users },
                      { key: 'bracket', label: 'Bracket', icon: GitBranch },
                      { key: 'slots', label: 'Slots', icon: Server },
                      { key: 'news', label: 'News', icon: Megaphone },
                    ] as const).map(({ key, label, icon: Icon }) => (
                      <SidebarMenuItem key={key}>
                        <SidebarMenuButton
                          isActive={detailTab === key}
                          onClick={() => setDetailTab(key)}
                        >
                          <Icon />
                          <span>{label}</span>
                        </SidebarMenuButton>
                        {key === 'players' && players.length > 0 && (
                          <SidebarMenuBadge>{players.length}</SidebarMenuBadge>
                        )}
                        {key === 'mappool' && (tournament.stages?.reduce((n, s) => n + (s.maps?.length ?? 0), 0) ?? 0) > 0 && (
                          <SidebarMenuBadge>{tournament.stages?.reduce((n, s) => n + (s.maps?.length ?? 0), 0)}</SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroup>
                {isOwner && (
                  <SidebarGroup>
                    <SidebarGroupLabel>Management</SidebarGroupLabel>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton disabled className="opacity-40">
                          <Code />
                          <span>Website (Soon)</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={detailTab === 'details'}
                          onClick={() => setDetailTab('details')}
                        >
                          <Settings />
                          <span>Settings</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroup>
                )}
                {!isOwner && (
                  <SidebarGroup>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={detailTab === 'details'}
                          onClick={() => setDetailTab('details')}
                        >
                          <Settings />
                          <span>Settings</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroup>
                )}
              </SidebarContent>
            </Sidebar>

            {/* Content area */}
            <div className="min-w-0 flex-1 p-4">
              {detailTab === 'mappool' && (
                <MappoolTab
                  tournament={tournament}
                  isOwner={isOwner}
                  slotConfigs={slotConfigs}
                  onTournamentChanged={handleTournamentChanged}
                  onError={handleError}
                  onTabChange={(tab) => setDetailTab(tab as typeof detailTab)}
                />
              )}
              {detailTab === 'players' && (
                <TournamentPlayers
                  tournamentAbbrev={tournament.abbreviation}
                  isOwner={isOwner}
                  players={players}
                  bracketData={bracketData}
                  onPlayersChanged={setPlayers}
                  onBracketChanged={setBracketData}
                />
              )}
              {detailTab === 'bracket' && (
                <TournamentBracket
                  tournamentAbbrev={tournament.abbreviation}
                  isOwner={isOwner}
                  players={players}
                  bracketData={bracketData}
                  onBracketChanged={setBracketData}
                />
              )}
              {detailTab === 'slots' && (
                <SlotsEditor
                  tournament={tournament}
                  slotConfigs={slotConfigs}
                  isOwner={isOwner}
                  onUpdated={handleTournamentChanged}
                  onError={handleError}
                />
              )}
              {detailTab === 'news' && (
                <TournamentAnnouncements
                  tournamentAbbrev={tournament.abbreviation}
                  isOwner={isOwner}
                  announcements={announcements}
                  onAnnouncementsChanged={setAnnouncements}
                />
              )}
              {isOwner && detailTab === 'website' && (
                <SiteSettings tournament={tournament} />
              )}
              {detailTab === 'details' && (
                <SettingsTab
                  tournament={tournament}
                  isOwner={isOwner}
                  onTournamentChanged={handleTournamentChanged}
                  onDeleted={onDeleted}
                  onError={handleError}
                />
              )}
            </div>
          </SidebarProvider>
        </div>
      </Card>

      {/* Paywall */}
      <PaywallDialog open={showPaywall} onClose={() => setShowPaywall(false)} />
    </>
  );
}
