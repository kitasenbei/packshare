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

// ── Types (shared with TournamentBracket) ──

export interface Player {
  id: string;
  name: string;
  seed: number;
  discord?: string;
}

export interface BracketData {
  players: Player[];
  matches: Match[];
  bestOf: number;
  generated: boolean;
}

export interface Match {
  id: string;
  round: number;
  position: number;
  player1: string | null;
  player2: string | null;
  score1: number;
  score2: number;
  winner: string | null;
  noShow?: string | null;
}

const STORAGE_PREFIX = 'packshare_bracket_';

export function loadBracket(tournamentAbbrev: string): BracketData {
  const saved = localStorage.getItem(`${STORAGE_PREFIX}${tournamentAbbrev}`);
  if (saved) {
    try { return JSON.parse(saved); } catch { /* fall through */ }
  }
  return { players: [], matches: [], bestOf: 7, generated: false };
}

export function saveBracket(tournamentAbbrev: string, data: BracketData) {
  localStorage.setItem(`${STORAGE_PREFIX}${tournamentAbbrev}`, JSON.stringify(data));
}

// ── Component ──

interface TournamentPlayersProps {
  tournamentAbbrev: string;
  isOwner: boolean;
}

export default function TournamentPlayers({ tournamentAbbrev, isOwner }: TournamentPlayersProps) {
  const [data, setData] = useState<BracketData>(() => loadBracket(tournamentAbbrev));
  const [playerInput, setPlayerInput] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [editingDiscord, setEditingDiscord] = useState<string | null>(null);
  const [discordInput, setDiscordInput] = useState('');

  const persist = useCallback((next: BracketData) => {
    setData(next);
    saveBracket(tournamentAbbrev, next);
  }, [tournamentAbbrev]);

  const addPlayer = () => {
    const name = playerInput.trim();
    if (!name) {
      setPlayerError('Enter a player name');
      return;
    }
    if (data.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      setPlayerError(`"${name}" is already in the roster`);
      return;
    }
    setPlayerError('');
    const player: Player = {
      id: `p${Date.now()}`,
      name,
      seed: data.players.length + 1,
    };
    persist({ ...data, players: [...data.players, player], generated: false, matches: [] });
    setPlayerInput('');
  };

  const removePlayer = (id: string) => {
    const next = data.players.filter((p) => p.id !== id)
      .map((p, i) => ({ ...p, seed: i + 1 }));
    persist({ ...data, players: next, generated: false, matches: [] });
  };

  const bulkImport = () => {
    const names = bulkInput
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n && !data.players.some((p) => p.name.toLowerCase() === n.toLowerCase()));
    if (names.length === 0) return;
    const newPlayers: Player[] = names.map((name, i) => ({
      id: `p${Date.now()}_${i}`,
      name,
      seed: data.players.length + i + 1,
    }));
    persist({ ...data, players: [...data.players, ...newPlayers], generated: false, matches: [] });
    setBulkInput('');
    setBulkImportOpen(false);
  };

  const shuffleSeeds = () => {
    const shuffled = [...data.players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    persist({
      ...data,
      players: shuffled.map((p, i) => ({ ...p, seed: i + 1 })),
      generated: false,
      matches: [],
    });
  };

  const saveDiscord = (playerId: string) => {
    const discord = discordInput.trim();
    persist({
      ...data,
      players: data.players.map((p) => p.id === playerId ? { ...p, discord: discord || undefined } : p),
    });
    setEditingDiscord(null);
    setDiscordInput('');
  };

  const clearAll = () => {
    persist({ players: [], matches: [], bestOf: data.bestOf, generated: false });
  };

  if (!isOwner) {
    const playerCount = data.players.length;
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
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 48, fontWeight: 600, fontSize: 12 }}>Seed</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Player</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.players.map((player) => (
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
                        <Typography variant="body2">{player.name}</Typography>
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
          placeholder="Player name..."
          value={playerInput}
          onChange={(e) => { setPlayerInput(e.target.value); setPlayerError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
          fullWidth
          error={!!playerError}
          helperText={playerError}
          slotProps={{
            input: {
              startAdornment: <PersonIcon sx={{ fontSize: 18, color: 'text.disabled', mr: 0.75 }} />,
            },
          }}
        />
        <Button variant="contained" onClick={addPlayer} disabled={!playerInput.trim()}
          sx={{ minWidth: 40, px: 1, height: 40 }}>
          <AddIcon sx={{ fontSize: 20 }} />
        </Button>
        <Tooltip title="Bulk import from list">
          <Button variant="outlined" startIcon={<UploadIcon />}
            onClick={() => setBulkImportOpen(true)} sx={{ fontSize: 12, flexShrink: 0, height: 40 }}>
            Import Players
          </Button>
        </Tooltip>
        {data.players.length > 1 && (
          <Button variant="outlined" startIcon={<ShuffleIcon />} onClick={shuffleSeeds}
            sx={{ fontSize: 12, flexShrink: 0, height: 40 }}>
            Randomize Seed
          </Button>
        )}
      </Stack>

          {/* Player list */}
          <Typography variant="caption" color="text.disabled">
            ⚠ Editing players will reset the bracket
          </Typography>
          {data.players.length > 0 ? (
            <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 48, fontWeight: 600, fontSize: 12 }}>Seed</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Player</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Discord</TableCell>
                    <TableCell sx={{ width: 48 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.players.map((player) => (
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
                        <Typography variant="body2">{player.name}</Typography>
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
                          <Button size="small" variant="text"
                            onClick={() => { setEditingDiscord(player.id); setDiscordInput(player.discord || ''); }}
                            startIcon={<LinkIcon sx={{ fontSize: 14 }} />}
                            sx={{ fontSize: 11, color: player.discord ? 'primary.main' : 'text.disabled', '&:hover': { color: 'primary.main' }, textTransform: 'none', minWidth: 0, px: 0.5 }}>
                            {player.discord || 'Link Discord'}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }} align="right">
                        <IconButton size="small" onClick={() => removePlayer(player.id)}
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

      {data.players.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button size="small" variant="text" color="error" onClick={clearAll} sx={{ fontSize: 12 }}>
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
            Paste player names, one per line
          </Typography>
          <TextField
            multiline
            rows={8}
            fullWidth
            placeholder={"Player1\nPlayer2\nPlayer3"}
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
          <Button variant="contained" onClick={bulkImport} disabled={!bulkInput.trim()}
            startIcon={<UploadIcon />}>
            Import
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
