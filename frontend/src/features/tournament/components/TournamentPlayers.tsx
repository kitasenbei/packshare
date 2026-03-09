import { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardHeader,
  CardContent,
  Avatar,
  Tooltip,
  Badge,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import CloseIcon from '@mui/icons-material/Close';
import GroupIcon from '@mui/icons-material/Group';
import UploadIcon from '@mui/icons-material/Upload';
import PersonIcon from '@mui/icons-material/Person';
import LinkIcon from '@mui/icons-material/Link';
import CheckIcon from '@mui/icons-material/Check';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
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
  };

  if (!isOwner) {
    const playerCount = players.length;
    return (
      <Card variant="outlined">
        <CardHeader
          avatar={
            <Badge badgeContent={playerCount} color="primary" showZero
              sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 18, minWidth: 18 } }}>
              <Avatar sx={{ width: 34, height: 34, bgcolor: 'action.hover' }}>
                <GroupIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </Avatar>
            </Badge>
          }
          title="Player Roster"
          subheader={`${playerCount} player${playerCount !== 1 ? 's' : ''} registered`}
          slotProps={{
            title: { variant: 'subtitle2', fontWeight: 'bold' },
            subheader: { variant: 'caption' },
          }}
          sx={{ pb: 0 }}
        />
        <CardContent sx={{ pt: 1.5 }}>
          {playerCount > 0 ? (
            <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ width: 48, fontWeight: 600, fontSize: 12 }}>Seed</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Player</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {players.map((player) => (
                    <TableRow key={player.id} hover>
                      <TableCell sx={{ py: 0.5 }}>
                        <Avatar sx={{
                          width: 24, height: 24, fontSize: 11, fontWeight: 'bold',
                          bgcolor: player.seed <= 3 ? 'primary.main' : 'action.hover',
                          color: player.seed <= 3 ? 'white' : 'text.secondary',
                        }}>
                          {player.seed}
                        </Avatar>
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar
                            src={`https://a.ppy.sh/${player.osuId}`}
                            variant="rounded"
                            sx={{ width: 28, height: 28 }}
                          />
                          <Typography variant="body2">{player.name}</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ py: 3, textAlign: 'center' }}>
              <PersonIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 0.5 }} />
              <Typography variant="body2" color="text.disabled">
                No players added yet
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={2}>
      {/* Add player input + actions */}
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField
          size="small"
          placeholder="osu! user ID or profile link..."
          value={playerInput}
          onChange={(e) => { setPlayerInput(e.target.value); setPlayerError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
          fullWidth
          error={!!playerError}
          helperText={playerError}
          slotProps={{
            input: {
              startAdornment: <PersonIcon sx={{ fontSize: 18, color: 'text.disabled', mr: 0.75 }} />,
            },
          }}
        />
        <Button variant="contained" onClick={handleAddPlayer} disabled={!playerInput.trim() || adding}
          sx={{ minWidth: 40, px: 1, height: 40 }}>
          {adding ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <AddIcon sx={{ fontSize: 20 }} />}
        </Button>
        <Tooltip title="Bulk import from list">
          <Button variant="outlined" startIcon={<UploadIcon />}
            onClick={() => setBulkImportOpen(true)} sx={{ fontSize: 12, flexShrink: 0, height: 40 }}>
            Import Players
          </Button>
        </Tooltip>
        {players.length > 1 && (
          <Button variant="outlined" startIcon={<ShuffleIcon />} onClick={shuffleSeeds}
            sx={{ fontSize: 12, flexShrink: 0, height: 40 }}>
            Randomize Seed
          </Button>
        )}
      </Stack>

          {/* Player list */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            <WarningAmberIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.disabled">
              Editing players will reset the bracket
            </Typography>
          </Stack>
          {players.length > 0 ? (
            <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ width: 48, fontWeight: 600, fontSize: 12 }}>Seed</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Player</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Discord</TableCell>
                    <TableCell sx={{ width: 48 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {players.map((player) => (
                    <TableRow key={player.id} hover>
                      <TableCell sx={{ py: 0.5 }}>
                        <Avatar sx={{
                          width: 24, height: 24, fontSize: 11, fontWeight: 'bold',
                          bgcolor: player.seed <= 3 ? 'primary.main' : 'action.hover',
                          color: player.seed <= 3 ? 'white' : 'text.secondary',
                        }}>
                          {player.seed}
                        </Avatar>
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar
                            src={`https://a.ppy.sh/${player.osuId}`}
                            variant="rounded"
                            sx={{ width: 28, height: 28 }}
                          />
                          {editingName === player.id ? (
                            <TextField
                              size="small"
                              value={nameInput}
                              onChange={(e) => setNameInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveName(player.id); if (e.key === 'Escape') setEditingName(null); }}
                              onBlur={() => saveName(player.id)}
                              autoFocus
                              sx={{ '& .MuiInputBase-input': { fontSize: 13, py: 0.5 } }}
                            />
                          ) : (
                            <Typography variant="body2"
                              onClick={() => { setEditingName(player.id); setNameInput(player.name); }}
                              sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>
                              {player.name}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        {editingDiscord === player.id ? (
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <TextField
                              size="small"
                              placeholder="Discord username..."
                              value={discordInput}
                              onChange={(e) => setDiscordInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveDiscord(player.id); if (e.key === 'Escape') setEditingDiscord(null); }}
                              autoFocus
                              sx={{ '& .MuiInputBase-input': { fontSize: 13, py: 0.5 } }}
                            />
                            <IconButton size="small" onClick={() => saveDiscord(player.id)}>
                              <CheckIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                            </IconButton>
                          </Stack>
                        ) : (
                          <Button size="small" variant={player.discord ? 'text' : 'contained'}
                            onClick={() => { setEditingDiscord(player.id); setDiscordInput(player.discord || ''); }}
                            startIcon={<LinkIcon sx={{ fontSize: 14 }} />}
                            sx={{ fontSize: 11, textTransform: 'none', minWidth: 0, px: 0.75, ...(player.discord ? { color: 'primary.main' } : { bgcolor: '#5865F2', color: 'white', '&:hover': { bgcolor: '#4752C4' } }) }}>
                            {player.discord || 'Link Discord'}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }} align="right">
                        <IconButton size="small" onClick={() => handleRemovePlayer(player.id)}
                          sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                          <CloseIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ py: 3, textAlign: 'center' }}>
              <PersonIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 0.5 }} />
              <Typography variant="body2" color="text.disabled">
                No players added yet
              </Typography>
            </Box>
          )}

      {players.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button size="small" variant="text" color="error" onClick={handleClearAll} sx={{ fontSize: 12 }}>
            Clear all
          </Button>
        </Box>
      )}

      {/* Bulk Import Dialog */}
      <Dialog open={bulkImportOpen} onClose={() => setBulkImportOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UploadIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          Bulk Import Players
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Paste osu! user IDs or profile links, one per line
          </Typography>
          <TextField
            multiline
            rows={8}
            fullWidth
            placeholder={"12345\nhttps://osu.ppy.sh/users/67890\n11111"}
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            autoFocus
          />
          {bulkInput.trim() && (
            <Chip
              label={`${bulkInput.split('\n').filter((n) => n.trim()).length} players to import`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mt: 1.5, height: 24, fontSize: 11 }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBulkImportOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleBulkImport} disabled={!bulkInput.trim()}
            startIcon={<UploadIcon />}>
            Import
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
