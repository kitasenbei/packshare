import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import {
  Plus,
  Trophy,
  Folder,
  Eye,
  Download,
  Palette,
  Settings,
  ArrowLeft,
  Share2,
  ExternalLink,
  Calendar,
  Pencil,
  Trash2,
  Link as LinkIcon,
  Search,
  ArrowUp,
  ArrowDown,
  FileDown,
} from 'lucide-react';
import type { User, BeatmapsetInfo } from '../../auth/api/auth';
import { getBeatmapset } from '../../auth/api/auth';
import { getMyPacks, trackDownload, deletePack, updatePack, type Pack, type PackBeatmap } from '../../pack/api/packs';
import PackCard from '../../pack/components/PackCard';
import PaletteEditor from './PaletteEditor';
import SortButtons from '../../../shared/components/SortButtons';
import PackBanner from '../../pack/components/PackBanner';
import BeatmapRow from '../../../shared/components/BeatmapRow';
import DownloadButton from '../../../shared/components/DownloadButton';
import OsuButton from '../../../shared/components/OsuButton';
import RemoveButton from '../../../shared/components/RemoveButton';
import { TournamentsSection, type TournamentView } from '../../tournament/components/DashboardTournaments';
import type { Tournament } from '../../tournament/api/tournaments';

type Section = 'packs' | 'tournaments' | 'settings';

interface DashboardProps {
  user: User | null;
  permissions?: string[];
  isKeySession?: boolean;
  onOpenCreatePack: () => void;
}

type PackCardPropsFactory = (pack: Pack) => React.ComponentProps<typeof PackCard>;

const MAPS_PER_PAGE = 10;

export default function Dashboard({ user, permissions = [], isKeySession = false, onOpenCreatePack }: DashboardProps) {
  const navigate = useNavigate();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<Section>('packs');
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [editing, setEditing] = useState(false);
  const [tournamentView, setTournamentView] = useState<TournamentView>('list');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    getMyPacks()
      .then(setPacks)
      .catch((err: Error) => setError(err.message || 'Failed to load packs'))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (!user) return null;

  const canCreate = !isKeySession || permissions.includes('create');
  const totalMaps = packs.reduce((sum, p) => sum + p.beatmaps.length, 0);

  const handleSelectPack = (pack: Pack) => {
    setSelectedPack(pack);
    setEditing(false);
  };

  const handleBackFromPack = () => {
    setSelectedPack(null);
    setEditing(false);
  };

  const handleDeletePack = async (pack: Pack) => {
    try {
      await deletePack(pack.share_code);
      setPacks((prev) => prev.filter((p) => p.id !== pack.id));
      setSelectedPack(null);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pack');
    }
  };

  const handlePackUpdated = (updated: Pack) => {
    setPacks((prev) => prev.map((p) => (p.share_code === updated.share_code ? updated : p)));
    setSelectedPack(updated);
    setEditing(false);
  };

  const navItems: { key: Section; label: string; icon: React.ReactNode; disabled?: boolean; badge?: string }[] = [
    { key: 'packs', label: 'Packs', icon: <Folder /> },
    ...(user.username === 'Kaiinu' ? [{ key: 'tournaments' as Section, label: 'Tournaments', icon: <Trophy /> }] : []),
    { key: 'settings', label: 'Settings', icon: <Settings /> },
  ];

  const packCardProps = (pack: Pack): React.ComponentProps<typeof PackCard> => ({
    pack: {
      ...pack,
      user: pack.user ?? { username: user.username, avatar_url: user.avatar_url },
      beatmap_count: pack.beatmaps.length,
      beatmapset_ids: pack.beatmaps.map((b: Pack['beatmaps'][0]) => b.beatmapset_id),
      star_ratings: pack.beatmaps.map((b: Pack['beatmaps'][0]) => b.star_rating).filter((sr): sr is number => sr != null),
    },
  });

  return (
    <>
    <SidebarProvider defaultOpen={true} style={{ minHeight: 'calc(100vh - 120px)' }}>
      {/* Sidebar */}
      <Sidebar collapsible="none">
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarImage src={user.avatar_url} alt="" />
              <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="truncate font-semibold">{user.username}</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    isActive={!selectedPack && section === item.key}
                    disabled={item.disabled}
                    onClick={() => { setSection(item.key); setSelectedPack(null); setEditing(false); if (item.key !== 'tournaments') { setTournamentView('list'); setSelectedTournament(null); } }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  {item.badge && (
                    <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>Actions</SidebarGroupLabel>
            <SidebarMenu>
              {canCreate && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={onOpenCreatePack}>
                    <Plus />
                    <span>New Pack</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {user.username === 'Kaiinu' && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => { setSection('tournaments'); setSelectedPack(null); setEditing(false); setTournamentView('create'); setSelectedTournament(null); }}
                  >
                    <Trophy />
                    <span>New Tournament</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setPaletteOpen(true)}>
                  <Palette />
                  <span>Theme</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      {/* Content Panel */}
      <div className="min-w-0 flex-1 px-0 lg:px-[300px]">
        {/* Mobile profile header */}
        {!selectedPack && tournamentView === 'list' && (
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <img
              src={user.avatar_url}
              alt=""
              className="size-12 rounded-full border-2 border-primary"
            />
            <div>
              <h2 className="text-lg font-bold">{user.username}</h2>
              <span className="text-xs text-muted-foreground">
                {packs.length} pack{packs.length !== 1 ? 's' : ''} · {totalMaps} maps
              </span>
            </div>
          </div>
        )}

        {/* Mobile nav tabs */}
        {!selectedPack && tournamentView === 'list' && (
          <div className="mb-6 flex gap-2 overflow-x-auto md:hidden">
            {navItems.filter((i) => !i.disabled).map((item) => (
              <Button
                key={item.key}
                size="sm"
                variant={section === item.key ? 'default' : 'outline'}
                onClick={() => setSection(item.key)}
                className="shrink-0"
              >
                {item.label}
              </Button>
            ))}
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-6 text-primary" />
          </div>
        ) : selectedPack ? (
          editing ? (
            <PackEditSection
              pack={selectedPack}
              onBack={() => setEditing(false)}
              onSaved={handlePackUpdated}
            />
          ) : (
            <PackDetailSection
              pack={selectedPack}
              onBack={handleBackFromPack}
              onEdit={() => setEditing(true)}
              onDelete={() => handleDeletePack(selectedPack)}
            />
          )
        ) : (
          <>
{section === 'packs' && (
              <PacksSection
                packs={packs}
                canCreate={canCreate}
                packCardProps={packCardProps}
                onSelectPack={handleSelectPack}
                onOpenCreatePack={onOpenCreatePack}
              />
            )}
            {section === 'tournaments' && (
              <TournamentsSection
                user={user}
                view={tournamentView}
                selectedTournament={selectedTournament}
                onViewChange={setTournamentView}
                onSelectTournament={setSelectedTournament}
              />
            )}
            {section === 'settings' && (
              <SettingsSection user={user} packs={packs} />
            )}
          </>
        )}
      </div>
    </SidebarProvider>
    <PaletteEditor open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}

/* ── Section Components ── */


function PacksSection({
  packs,
  canCreate,
  packCardProps,
  onSelectPack,
  onOpenCreatePack,
}: {
  packs: Pack[];
  canCreate: boolean;
  packCardProps: PackCardPropsFactory;
  onSelectPack: (pack: Pack) => void;
  onOpenCreatePack: () => void;
}) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'views' | 'maps'>('newest');

  const filtered = packs
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name': return a.name.localeCompare(b.name);
        case 'views': return b.views - a.views;
        case 'maps': return b.beatmaps.length - a.beatmaps.length;
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">All Packs</h2>
        {canCreate && (
          <Button size="sm" onClick={onOpenCreatePack}>
            <Plus className="size-4" />
            New Pack
          </Button>
        )}
      </div>

      {packs.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search packs..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <SortButtons
            value={sortBy}
            onChange={(v) => setSortBy(v as typeof sortBy)}
            options={[
              { key: 'newest', label: 'Newest' },
              { key: 'oldest', label: 'Oldest' },
              { key: 'name', label: 'A-Z' },
              { key: 'views', label: 'Views' },
              { key: 'maps', label: 'Maps' },
            ]}
          />
        </div>
      )}

      {packs.length === 0 ? (
        <Card className="p-8 text-center">
          <Folder className="mx-auto mb-2 size-10 text-muted-foreground/30" />
          <p className="mb-4 text-muted-foreground">No packs yet</p>
          {canCreate && (
            <Button onClick={onOpenCreatePack}>
              <Plus className="size-4" />
              Create your first pack
            </Button>
          )}
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <Search className="mx-auto mb-2 size-10 text-muted-foreground/30" />
          <p className="text-muted-foreground">No packs match "{search}"</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((pack) => (
            <div
              key={pack.id}
              onClick={(e) => { e.preventDefault(); onSelectPack(pack); }}
              className="cursor-pointer [&_a]:pointer-events-none"
            >
              <PackCard {...packCardProps(pack)} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ── Pack Detail (inline) ── */

function PackDetailSection({
  pack,
  onBack,
  onEdit,
  onDelete,
}: {
  pack: Pack;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const pageCount = Math.ceil(pack.beatmaps.length / MAPS_PER_PAGE);
  const displayMaps = pack.beatmaps.slice(
    (currentPage - 1) * MAPS_PER_PAGE,
    currentPage * MAPS_PER_PAGE,
  );
  const hasSelection = selectedIds.size > 0;

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDownload = () => {
    const targets = hasSelection
      ? pack.beatmaps.filter((b) => selectedIds.has(b.id))
      : pack.beatmaps;
    targets.forEach((beatmap, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = `https://api.nerinyan.moe/d/${beatmap.beatmapset_id}`;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        trackDownload(pack.share_code, beatmap.beatmapset_id);
      }, index * 500);
    });
    setSelectedIds(new Set());
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/s/${pack.share_code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: pack.name, text: `Check out this beatmap pack: ${pack.name}`, url: shareUrl });
        return;
      } catch { /* cancelled */ }
    }
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };

  const totalDownloads = pack.beatmaps.reduce((s, b) => s + (b.downloads ?? 0), 0);

  // Build page numbers
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (pageCount <= 7) {
      for (let i = 1; i <= pageCount; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(pageCount - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < pageCount - 2) pages.push('ellipsis');
      pages.push(pageCount);
    }
    return pages;
  };

  return (
    <>
      {/* Back + title */}
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon-xs" onClick={onBack}>
          <ArrowLeft className="size-5" />
        </Button>
        <h2 className="flex-1 truncate text-lg font-bold">{pack.name}</h2>
      </div>

      {/* Banner */}
      <Card className="mb-6 overflow-hidden">
        <PackBanner beatmaps={pack.beatmaps} />
      </Card>

      {/* Action buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button size="sm" onClick={handleDownload}>
          <Download className="size-4" />
          {hasSelection ? `Download (${selectedIds.size})` : 'Download All'}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleShare}>
          <Share2 className="size-4" />
          Share
        </Button>
        <Button variant="outline" size="sm" render={<Link to={`/s/${pack.share_code}`} target="_blank" />}>
          <ExternalLink className="size-4" />
          Public Page
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="size-4" />
          Edit
        </Button>
        {!confirmDelete ? (
          <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" />
            Delete
          </Button>
        ) : (
          <Button variant="destructive" size="sm" onClick={onDelete}>
            Confirm Delete
          </Button>
        )}
      </div>

      {/* Two-column: beatmap list + info sidebar */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* Beatmap list */}
        <Card className="min-w-0 flex-1 overflow-hidden">
          {hasSelection && (
            <div className="flex items-center justify-end border-b bg-muted/50 px-3 py-2">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-[13px] text-primary hover:underline"
              >
                Deselect {selectedIds.size}
              </button>
            </div>
          )}

          <div className="p-2">
            {displayMaps.map((beatmap) => {
              const isSelected = selectedIds.has(beatmap.id);
              return (
                <BeatmapRow
                  key={beatmap.id}
                  title={beatmap.title}
                  artist={beatmap.artist}
                  keys={beatmap.keys}
                  creator={beatmap.downloads ? `${beatmap.creator} · ${beatmap.downloads} download${beatmap.downloads !== 1 ? 's' : ''}` : beatmap.creator}
                  creatorPrefix="mapped by"
                  difficultyName={beatmap.difficulty_name}
                  starRating={beatmap.star_rating}
                  beatmapsetId={beatmap.beatmapset_id}
                  onClick={() => toggleSelect(beatmap.id)}
                  sx={isSelected ? {
                    backgroundColor: 'rgba(132,169,140,0.15)',
                    border: '1px solid rgba(132,169,140,0.4)',
                    '&:hover': { backgroundColor: 'rgba(132,169,140,0.22)' },
                  } : undefined}
                  actions={
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <OsuButton onClick={() => window.open(`https://osu.ppy.sh/beatmapsets/${beatmap.beatmapset_id}`, '_blank')} />
                      <DownloadButton
                        downloadUrl={`https://api.nerinyan.moe/d/${beatmap.beatmapset_id}`}
                        downloadName={`${beatmap.artist} - ${beatmap.title}`}
                        onDownloaded={() => trackDownload(pack.share_code, beatmap.beatmapset_id)}
                      />
                    </div>
                  }
                />
              );
            })}
          </div>

          {pageCount > 1 && (
            <div className="flex justify-center border-t py-3">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {getPageNumbers().map((p, i) =>
                    p === 'ellipsis' ? (
                      <PaginationItem key={`e-${i}`}><PaginationEllipsis /></PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink isActive={p === currentPage} onClick={() => setCurrentPage(p)} className="cursor-pointer">
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
                      className={currentPage >= pageCount ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </Card>

        {/* Info sidebar */}
        <div className="w-full shrink-0 md:w-[260px]">
          <Card className="mb-4 p-4">
            <h3 className="mb-3 text-sm font-bold">About</h3>
            {pack.description ? (
              <p className="mb-4 text-sm text-muted-foreground">{pack.description}</p>
            ) : (
              <p className="mb-4 text-sm italic text-muted-foreground/50">No description provided.</p>
            )}
            <Separator className="mb-4" />
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Eye className="size-4 text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground">{pack.views.toLocaleString()} views</span>
              </div>
              <div className="flex items-center gap-2">
                <Download className="size-4 text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground">{totalDownloads.toLocaleString()} downloads</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground">
                  Created {new Date(pack.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

/* ── Pack Edit (inline) ── */

function PackEditSection({
  pack,
  onBack,
  onSaved,
}: {
  pack: Pack;
  onBack: () => void;
  onSaved: (updated: Pack) => void;
}) {
  const [name, setName] = useState(pack.name);
  const [description, setDescription] = useState(pack.description || '');
  const [beatmaps, setBeatmaps] = useState<PackBeatmap[]>([...pack.beatmaps]);
  const [beatmapInput, setBeatmapInput] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingBeatmap, setAddingBeatmap] = useState(false);

  // Difficulty selection
  const [diffSelectOpen, setDiffSelectOpen] = useState(false);
  const [pendingBeatmapset, setPendingBeatmapset] = useState<BeatmapsetInfo | null>(null);

  const extractBeatmapId = (input: string): string | null => {
    if (/^\d+$/.test(input.trim())) return input.trim();
    const match = input.match(/osu\.ppy\.sh\/beatmapsets\/(\d+)/);
    if (match) return match[1];
    const nerinyanMatch = input.match(/nerinyan\.moe.*?(\d+)/);
    if (nerinyanMatch) return nerinyanMatch[1];
    return null;
  };

  const handleAddBeatmap = async () => {
    const id = extractBeatmapId(beatmapInput);
    if (!id) { setError('Invalid beatmap ID or URL'); return; }
    if (beatmaps.some((b) => b.beatmapset_id === parseInt(id))) { setError('Beatmap already in pack'); return; }

    setError('');
    setAddingBeatmap(true);
    try {
      const beatmapset = await getBeatmapset(parseInt(id));
      if (!beatmapset || beatmapset.beatmaps.length === 0) {
        setError('Beatmapset not found or has no mania difficulties');
        setAddingBeatmap(false);
        return;
      }

      if (beatmapset.beatmaps.length === 1) {
        const diff = beatmapset.beatmaps[0];
        setBeatmaps((prev) => [...prev, {
          id: diff.beatmap_id,
          beatmapset_id: beatmapset.beatmapset_id,
          title: beatmapset.title,
          artist: beatmapset.artist,
          creator: beatmapset.creator,
          keys: diff.keys,
          difficulty_name: diff.difficulty_name,
          star_rating: diff.star_rating,
          sort_order: prev.length,
        }]);
        setBeatmapInput('');
      } else {
        setPendingBeatmapset(beatmapset);
        setDiffSelectOpen(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch beatmap info');
    }
    setAddingBeatmap(false);
  };

  const handleSelectDifficulty = (diffIndex: number | 'all') => {
    if (!pendingBeatmapset) return;
    if (diffIndex === 'all') {
      const newBeatmaps: PackBeatmap[] = pendingBeatmapset.beatmaps.map((diff, i) => ({
        id: diff.beatmap_id,
        beatmapset_id: pendingBeatmapset.beatmapset_id,
        title: pendingBeatmapset.title,
        artist: pendingBeatmapset.artist,
        creator: pendingBeatmapset.creator,
        keys: diff.keys,
        difficulty_name: diff.difficulty_name,
        star_rating: diff.star_rating,
        sort_order: beatmaps.length + i,
      }));
      setBeatmaps((prev) => [...prev, ...newBeatmaps]);
    } else {
      const diff = pendingBeatmapset.beatmaps[diffIndex];
      setBeatmaps((prev) => [...prev, {
        id: diff.beatmap_id,
        beatmapset_id: pendingBeatmapset.beatmapset_id,
        title: pendingBeatmapset.title,
        artist: pendingBeatmapset.artist,
        creator: pendingBeatmapset.creator,
        keys: diff.keys,
        difficulty_name: diff.difficulty_name,
        star_rating: diff.star_rating,
        sort_order: prev.length,
      }]);
    }
    setBeatmapInput('');
    setDiffSelectOpen(false);
    setPendingBeatmapset(null);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Pack name is required'); return; }
    if (beatmaps.length === 0) { setError('Pack must have at least one beatmap'); return; }

    setSaving(true);
    setError('');
    try {
      const updated = await updatePack(pack.share_code, {
        name: name.trim(),
        description: description.trim() || undefined,
        beatmaps: beatmaps.map((b) => ({
          beatmapset_id: b.beatmapset_id,
          title: b.title,
          artist: b.artist,
          creator: b.creator,
          keys: b.keys,
          difficulty_name: b.difficulty_name,
          star_rating: b.star_rating,
        })),
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    }
    setSaving(false);
  };

  return (
    <>
      {/* Back + title */}
      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" size="icon-xs" onClick={onBack}>
          <ArrowLeft className="size-5" />
        </Button>
        <h2 className="flex-1 truncate text-lg font-bold">Edit Pack</h2>
      </div>

      {/* Name & Description */}
      <div className="mb-6 flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Pack Name</label>
          <Input value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description (optional)</label>
          <Textarea value={description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} rows={2} />
        </div>
      </div>

      {/* Add beatmap */}
      <span className="mb-3 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        Beatmaps
      </span>
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Add beatmap (ID or osu! URL)"
            value={beatmapInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBeatmapInput(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && beatmapInput.trim() && handleAddBeatmap()}
            className="pl-8"
          />
        </div>
        <Button onClick={handleAddBeatmap} disabled={!beatmapInput.trim() || addingBeatmap} className="min-w-[50px]">
          {addingBeatmap ? <Spinner className="size-4" /> : <Plus className="size-4" />}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Beatmap list */}
      <Card className="mb-6 overflow-hidden">
        <div className="p-2">
          {beatmaps.map((beatmap, index) => (
            <BeatmapRow
              key={beatmap.id}
              title={beatmap.title}
              artist={beatmap.artist}
              keys={beatmap.keys || undefined}
              creator={beatmap.creator}
              beatmapsetId={beatmap.beatmapset_id}
              difficultyName={beatmap.difficulty_name}
              starRating={beatmap.star_rating}
              titleOnly
              density="compact"
              actions={
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={index === 0}
                    onClick={() => setBeatmaps((prev) => {
                      const next = [...prev];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      return next;
                    })}
                  >
                    <ArrowUp className="size-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={index === beatmaps.length - 1}
                    onClick={() => setBeatmaps((prev) => {
                      const next = [...prev];
                      [next[index], next[index + 1]] = [next[index + 1], next[index]];
                      return next;
                    })}
                  >
                    <ArrowDown className="size-3.5 text-muted-foreground" />
                  </Button>
                  <RemoveButton onClick={() => setBeatmaps((prev) => prev.filter((b) => b.id !== beatmap.id))} />
                </div>
              }
            />
          ))}
          {beatmaps.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground/50">No beatmaps — add some above</p>
            </div>
          )}
        </div>
      </Card>

      {/* Save / Cancel */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Spinner className="size-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button variant="outline" onClick={onBack} disabled={saving}>
          Cancel
        </Button>
      </div>

      {/* Difficulty Selection Dialog */}
      <Dialog open={diffSelectOpen} onOpenChange={(o) => { if (!o) { setDiffSelectOpen(false); setPendingBeatmapset(null); } }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Select Difficulty</DialogTitle>
            {pendingBeatmapset && (
              <DialogDescription>
                {pendingBeatmapset.artist} - {pendingBeatmapset.title}
              </DialogDescription>
            )}
          </DialogHeader>
          {pendingBeatmapset && (
            <div className="flex flex-col gap-2">
              <Button className="w-full justify-start" onClick={() => handleSelectDifficulty('all')}>
                Add all {pendingBeatmapset.beatmaps.length} difficulties
              </Button>
              <div className="flex items-center gap-2 py-1">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">or select one</span>
                <Separator className="flex-1" />
              </div>
              {pendingBeatmapset.beatmaps.map((diff, index) => (
                <Button
                  key={diff.beatmap_id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleSelectDifficulty(index)}
                >
                  <span className="mr-2 flex size-6 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
                    {diff.keys}K
                  </span>
                  <span className="flex-1 text-left">
                    <span className="block text-sm">{diff.difficulty_name}</span>
                    <span className="text-xs text-muted-foreground">★ {diff.star_rating.toFixed(2)}</span>
                  </span>
                </Button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDiffSelectOpen(false); setPendingBeatmapset(null); }}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Settings Section ── */

function SettingsSection({ user, packs }: { user: User; packs: Pack[] }) {
  const totalMaps = packs.reduce((sum, p) => sum + p.beatmaps.length, 0);
  const totalViews = packs.reduce((sum, p) => sum + p.views, 0);
  const totalDownloads = packs.reduce((sum, p) => sum + p.beatmaps.reduce((s, b) => s + (b.downloads ?? 0), 0), 0);
  const uniqueBeatmapsets = new Set(packs.flatMap((p) => p.beatmaps.map((b) => b.beatmapset_id)));

  const handleExportPacks = () => {
    const exportData = packs.map((p) => ({
      name: p.name,
      description: p.description,
      share_code: p.share_code,
      beatmaps: p.beatmaps.map((b) => ({
        beatmapset_id: b.beatmapset_id,
        title: b.title,
        artist: b.artist,
        creator: b.creator,
        keys: b.keys,
        difficulty_name: b.difficulty_name,
        star_rating: b.star_rating,
      })),
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `packshare-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Packs exported!');
  };

  const handleExportCsv = () => {
    const rows = [['Pack Name', 'Beatmapset ID', 'Title', 'Artist', 'Creator', 'Keys', 'Difficulty', 'Star Rating']];
    for (const p of packs) {
      for (const b of p.beatmaps) {
        rows.push([p.name, String(b.beatmapset_id), b.title, b.artist, b.creator, String(b.keys || ''), b.difficulty_name || '', String(b.star_rating || '')]);
      }
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `packshare-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('CSV exported!');
  };

  return (
    <>
      <h2 className="mb-6 text-lg font-bold">Settings</h2>

      {/* Account Info */}
      <Card className="mb-6 p-6">
        <h3 className="mb-4 text-sm font-bold">Account</h3>
        <div className="mb-4 flex items-center gap-3">
          <img src={user.avatar_url} alt="" className="size-14 rounded-full border-2 border-primary" />
          <div>
            <p className="font-bold">{user.username}</p>
            <p className="text-sm text-muted-foreground">osu! ID: {user.osu_id}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`https://osu.ppy.sh/users/${user.osu_id}`, '_blank')}
        >
          <ExternalLink className="size-4" />
          View osu! Profile
        </Button>
      </Card>

      {/* Stats Overview */}
      <Card className="mb-6 p-6">
        <h3 className="mb-4 text-sm font-bold">Statistics</h3>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
          {[
            { label: 'Packs', value: packs.length },
            { label: 'Total Maps', value: totalMaps },
            { label: 'Unique Maps', value: uniqueBeatmapsets.size },
            { label: 'Total Views', value: totalViews },
            { label: 'Total Downloads', value: totalDownloads },
            { label: 'Avg Maps/Pack', value: packs.length > 0 ? (totalMaps / packs.length).toFixed(1) : '0' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg bg-muted/50 p-3 text-center">
              <div className="text-lg font-bold">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Export */}
      <Card className="mb-6 p-6">
        <h3 className="mb-1 text-sm font-bold">Export Data</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Download all your pack data for backup or analysis
        </p>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={handleExportPacks} disabled={packs.length === 0}>
            <FileDown className="size-4" />
            Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={packs.length === 0}>
            <FileDown className="size-4" />
            Export CSV
          </Button>
        </div>
      </Card>
    </>
  );
}
