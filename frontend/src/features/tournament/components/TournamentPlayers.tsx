import { useState, useCallback } from 'react';
import {
  Plus, Shuffle, X, Users, Upload, User, Link, Check, TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogMedia,
} from '@/components/ui/alert-dialog';
import { getOsuUser } from '../../auth/api/auth';
import {
  addPlayer as apiAddPlayer,
  bulkAddPlayers,
  updatePlayer as apiUpdatePlayer,
  removePlayer as apiRemovePlayer,
  clearPlayers as apiClearPlayers,
  reorderPlayers,
  saveBracket,
  type TournamentPlayer,
} from '../api/tournaments';

// ── Types (shared with TournamentBracket) ──

export interface Player {
  id: number;
  osuId: number;
  name: string;
  seed: number;
  discord?: string;
}

export interface BracketData {
  matches: Match[];
  bestOf: number;
  generated: boolean;
}

export interface Match {
  id: string;
  round: number;
  position: number;
  player1: number | null;
  player2: number | null;
  score1: number;
  score2: number;
  winner: number | null;
  noShow?: number | null;
}

export function parseBracketData(raw?: string): BracketData {
  if (raw) {
    try { return JSON.parse(raw); } catch { /* fall through */ }
  }
  return { matches: [], bestOf: 7, generated: false };
}

export function toPlayers(apiPlayers?: TournamentPlayer[]): Player[] {
  return (apiPlayers || []).map((p) => ({
    id: p.id,
    osuId: p.osu_id,
    name: p.name,
    seed: p.seed,
    discord: p.discord,
  }));
}

// ── Component ──

interface TournamentPlayersProps {
  tournamentAbbrev: string;
  isOwner: boolean;
  players: Player[];
  bracketData: BracketData;
  onPlayersChanged: (players: Player[]) => void;
  onBracketChanged: (data: BracketData) => void;
}

export default function TournamentPlayers({
  tournamentAbbrev,
  isOwner,
  players,
  bracketData,
  onPlayersChanged,
  onBracketChanged,
}: TournamentPlayersProps) {
  const [playerInput, setPlayerInput] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [editingDiscord, setEditingDiscord] = useState<number | null>(null);
  const [discordInput, setDiscordInput] = useState('');
  const [editingName, setEditingName] = useState<number | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const resetBracket = useCallback(async () => {
    const reset: BracketData = { matches: [], bestOf: bracketData.bestOf, generated: false };
    onBracketChanged(reset);
    try { await saveBracket(tournamentAbbrev, JSON.stringify(reset)); } catch { /* best effort */ }
  }, [tournamentAbbrev, bracketData.bestOf, onBracketChanged]);

  const parseOsuId = (input: string): number | null => {
    const trimmed = input.trim();
    if (/^\d+$/.test(trimmed)) return parseInt(trimmed);
    const match = trimmed.match(/osu\.ppy\.sh\/users\/(\d+)/);
    if (match) return parseInt(match[1]);
    return null;
  };

  const handleAddPlayer = async () => {
    const osuId = parseOsuId(playerInput);
    if (!osuId) {
      setPlayerError('Enter an osu! user ID or profile link');
      return;
    }
    if (players.some((p) => p.osuId === osuId)) {
      setPlayerError(`Player with osu! ID ${osuId} is already in the roster`);
      return;
    }
    setPlayerError('');
    setAdding(true);
    let name = `Player ${osuId}`;
    try {
      const user = await getOsuUser(osuId);
      if (user) name = user.username;
      else setPlayerError('osu! user not found');
    } catch { /* use fallback name */ }

    try {
      const added = await apiAddPlayer(tournamentAbbrev, { osu_id: osuId, name });
      onPlayersChanged([...players, { id: added.id, osuId: added.osu_id, name: added.name, seed: added.seed, discord: added.discord }]);
      setPlayerInput('');
      await resetBracket();
    } catch (err) {
      setPlayerError(err instanceof Error ? err.message : 'Failed to add player');
    }
    setAdding(false);
  };

  const handleRemovePlayer = async (id: number) => {
    try {
      await apiRemovePlayer(tournamentAbbrev, id);
      const next = players.filter((p) => p.id !== id).map((p, i) => ({ ...p, seed: i + 1 }));
      onPlayersChanged(next);
      await resetBracket();
    } catch { /* silently fail */ }
  };

  const handleBulkImport = async () => {
    const lines = bulkInput.split('\n').map((n) => n.trim()).filter(Boolean);
    const existingIds = new Set(players.map((p) => p.osuId));
    const newPlayers: { osu_id: number; name: string }[] = [];
    for (const line of lines) {
      const osuId = parseOsuId(line);
      if (!osuId || existingIds.has(osuId)) continue;
      existingIds.add(osuId);
      newPlayers.push({ osu_id: osuId, name: `Player ${osuId}` });
    }
    if (newPlayers.length === 0) return;

    try {
      const added = await bulkAddPlayers(tournamentAbbrev, newPlayers);
      const mapped = added.map((p) => ({ id: p.id, osuId: p.osu_id, name: p.name, seed: p.seed, discord: p.discord }));
      onPlayersChanged([...players, ...mapped]);
      setBulkInput('');
      setBulkImportOpen(false);
      await resetBracket();
    } catch { /* silently fail */ }
  };

  const shuffleSeeds = async () => {
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const reordered = shuffled.map((p, i) => ({ ...p, seed: i + 1 }));
    onPlayersChanged(reordered);
    try {
      await reorderPlayers(tournamentAbbrev, reordered.map((p) => p.id));
      await resetBracket();
    } catch { /* best effort */ }
  };

  const saveName = async (playerId: number) => {
    const name = nameInput.trim();
    if (!name) return;
    if (players.some((p) => p.id !== playerId && p.name.toLowerCase() === name.toLowerCase())) return;
    onPlayersChanged(players.map((p) => p.id === playerId ? { ...p, name } : p));
    setEditingName(null);
    setNameInput('');
    try {
      await apiUpdatePlayer(tournamentAbbrev, playerId, { name });
      await resetBracket();
    } catch { /* best effort */ }
  };

  const saveDiscord = async (playerId: number) => {
    const discord = discordInput.trim();
    onPlayersChanged(players.map((p) => p.id === playerId ? { ...p, discord: discord || undefined } : p));
    setEditingDiscord(null);
    setDiscordInput('');
    try {
      await apiUpdatePlayer(tournamentAbbrev, playerId, { discord });
    } catch { /* best effort */ }
  };

  const handleClearAll = async () => {
    try {
      await apiClearPlayers(tournamentAbbrev);
      onPlayersChanged([]);
      await resetBracket();
    } catch { /* silently fail */ }
    setClearOpen(false);
  };

  // ── Read-only view ──

  if (!isOwner) {
    const playerCount = players.length;
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarFallback>
                <Users className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-sm font-bold">Player Roster</CardTitle>
              <CardDescription className="text-xs">{`${playerCount} player${playerCount !== 1 ? 's' : ''} registered`}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {playerCount > 0 ? (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-xs font-semibold">Seed</TableHead>
                    <TableHead className="text-xs font-semibold">Player</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell className="py-1">
                        <span className={`text-xs font-bold tabular-nums ${player.seed <= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                          {player.seed}
                        </span>
                      </TableCell>
                      <TableCell className="py-1">
                        <div className="flex items-center gap-2">
                          <Avatar size="sm">
                            <AvatarImage src={`https://a.ppy.sh/${player.osuId}`} />
                            <AvatarFallback>{player.name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{player.name}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <User />
                </EmptyMedia>
                <EmptyTitle>No players added yet</EmptyTitle>
                <EmptyDescription>The tournament organizer hasn't added any players.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Owner view ──

  return (
    <div className="flex flex-col gap-3">
      {/* Add player input + actions */}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="osu! user ID or profile link..."
              value={playerInput}
              onChange={(e) => { setPlayerInput(e.target.value); setPlayerError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
              aria-invalid={!!playerError}
            />
          </div>
          {playerError && (
            <p className="mt-1 text-xs text-destructive">{playerError}</p>
          )}
        </div>
        <Button onClick={handleAddPlayer} disabled={!playerInput.trim() || adding} size="icon" className="shrink-0">
          {adding ? <Spinner /> : <Plus className="size-5" />}
        </Button>
        <Tooltip>
          <TooltipTrigger render={
            <Button variant="outline" onClick={() => setBulkImportOpen(true)} className="shrink-0">
              <Upload data-icon="inline-start" />
              Import
            </Button>
          } />
          <TooltipContent>Bulk import from list</TooltipContent>
        </Tooltip>
        {players.length > 1 && (
          <Tooltip>
            <TooltipTrigger render={
              <Button variant="outline" onClick={shuffleSeeds} className="shrink-0">
                <Shuffle data-icon="inline-start" />
                Shuffle
              </Button>
            } />
            <TooltipContent>Randomize seed order</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Bracket reset warning */}
      <Alert>
        <TriangleAlert />
        <AlertDescription>
          Editing players will reset the bracket
        </AlertDescription>
      </Alert>

      {/* Player list */}
      {players.length > 0 ? (
        <Card className="overflow-hidden">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-xs font-semibold">Seed</TableHead>
                  <TableHead className="text-xs font-semibold">Player</TableHead>
                  <TableHead className="text-xs font-semibold">Discord</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell className="py-1">
                      <span className={`text-xs font-bold tabular-nums ${player.seed <= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                        {player.seed}
                      </span>
                    </TableCell>
                    <TableCell className="py-1">
                      <div className="flex items-center gap-2">
                        <Avatar size="sm">
                          <AvatarImage src={`https://a.ppy.sh/${player.osuId}`} />
                          <AvatarFallback>{player.name[0]}</AvatarFallback>
                        </Avatar>
                        {editingName === player.id ? (
                          <Input
                            className="h-7 w-40 py-0.5 text-[13px]"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveName(player.id); if (e.key === 'Escape') setEditingName(null); }}
                            onBlur={() => saveName(player.id)}
                            autoFocus
                          />
                        ) : (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <span
                                  className="cursor-pointer text-sm hover:text-primary"
                                  onClick={() => { setEditingName(player.id); setNameInput(player.name); }}
                                />
                              }
                            >
                              {player.name}
                            </TooltipTrigger>
                            <TooltipContent>Click to rename</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-1">
                      {editingDiscord === player.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            className="h-7 w-40 py-0.5 text-[13px]"
                            placeholder="Discord username..."
                            value={discordInput}
                            onChange={(e) => setDiscordInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveDiscord(player.id); if (e.key === 'Escape') setEditingDiscord(null); }}
                            autoFocus
                          />
                          <Button variant="ghost" size="icon-xs" onClick={() => saveDiscord(player.id)}>
                            <Check className="size-3.5 text-primary" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="xs"
                          variant={player.discord ? 'ghost' : 'default'}
                          onClick={() => { setEditingDiscord(player.id); setDiscordInput(player.discord || ''); }}
                          className={player.discord ? 'text-primary' : 'bg-[#5865F2] hover:bg-[#4752C4] text-white'}
                        >
                          <Link data-icon="inline-start" />
                          {player.discord || 'Link Discord'}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="py-1 text-right">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleRemovePlayer(player.id)}
                              className="text-muted-foreground hover:text-destructive"
                            />
                          }
                        >
                          <X className="size-3.5" />
                        </TooltipTrigger>
                        <TooltipContent>Remove player</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <User />
            </EmptyMedia>
            <EmptyTitle>No players added yet</EmptyTitle>
            <EmptyDescription>Add players by osu! user ID or profile link, or bulk import a list.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {players.length > 0 && (
        <div className="flex justify-end">
          <Button variant="destructive" size="xs" onClick={() => setClearOpen(true)}>
            Clear all
          </Button>
        </div>
      )}

      {/* Clear all confirmation */}
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <TriangleAlert />
            </AlertDialogMedia>
            <AlertDialogTitle>Clear all players?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {players.length} players and reset the bracket. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleClearAll}>
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Import Dialog */}
      <Dialog open={bulkImportOpen} onOpenChange={(open) => { if (!open) setBulkImportOpen(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="size-5 text-primary" />
              Bulk Import Players
            </DialogTitle>
            <DialogDescription>
              Paste osu! user IDs or profile links, one per line
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={8}
            placeholder={"12345\nhttps://osu.ppy.sh/users/67890\n11111"}
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            autoFocus
          />
          {bulkInput.trim() && (
            <Badge variant="outline" className="w-fit text-[11px]">
              {bulkInput.split('\n').filter((n) => n.trim()).length} players to import
            </Badge>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkImportOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkImport} disabled={!bulkInput.trim()}>
              <Upload data-icon="inline-start" />
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
