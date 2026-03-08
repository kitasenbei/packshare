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
  Alert,
  Card,
  CardHeader,
  CardContent,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tooltip,
  Divider,
  Badge,
  LinearProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupIcon from '@mui/icons-material/Group';
import UploadIcon from '@mui/icons-material/Upload';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SportsScoreIcon from '@mui/icons-material/SportsScore';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';

// ── Types ──

interface Player {
  id: string;
  name: string;
  seed: number;
}

interface Match {
  id: string;
  round: number;
  position: number; // position within round (0-indexed)
  player1: string | null; // player id or null (TBD)
  player2: string | null;
  score1: number;
  score2: number;
  winner: string | null;
}

interface BracketData {
  players: Player[];
  matches: Match[];
  bestOf: number;
  generated: boolean;
}

const STORAGE_PREFIX = 'packshare_bracket_';

function loadBracket(tournamentAbbrev: string): BracketData {
  const saved = localStorage.getItem(`${STORAGE_PREFIX}${tournamentAbbrev}`);
  if (saved) {
    try { return JSON.parse(saved); } catch { /* fall through */ }
  }
  return { players: [], matches: [], bestOf: 7, generated: false };
}

function saveBracket(tournamentAbbrev: string, data: BracketData) {
  localStorage.setItem(`${STORAGE_PREFIX}${tournamentAbbrev}`, JSON.stringify(data));
}

// ── Bracket Generation ──

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function generateBracket(players: Player[], bestOf: number): BracketData {
  const n = players.length;
  if (n < 2) return { players, matches: [], bestOf, generated: false };

  const size = nextPowerOf2(n);
  const totalRounds = Math.log2(size);

  // Seed ordering for proper bracket placement
  const seeded = [...players].sort((a, b) => a.seed - b.seed);
  const slots: (string | null)[] = new Array(size).fill(null);

  // Standard seeding: 1v(size), 2v(size-1), etc. with proper bracket placement
  const seedOrder = buildSeedOrder(size);
  for (let i = 0; i < seeded.length; i++) {
    slots[seedOrder[i]] = seeded[i].id;
  }

  const matches: Match[] = [];
  let matchId = 0;

  // Round 1
  for (let i = 0; i < size / 2; i++) {
    const p1 = slots[i * 2];
    const p2 = slots[i * 2 + 1];
    const isBye = p1 === null || p2 === null;
    matches.push({
      id: `m${matchId++}`,
      round: 0,
      position: i,
      player1: p1,
      player2: p2,
      score1: 0,
      score2: 0,
      winner: isBye ? (p1 || p2) : null, // auto-advance byes
    });
  }

  // Subsequent rounds (empty, filled by winners)
  for (let r = 1; r < totalRounds; r++) {
    const matchesInRound = size / Math.pow(2, r + 1);
    for (let i = 0; i < matchesInRound; i++) {
      // Check if both source matches are byes
      const src1 = matches.find((m) => m.round === r - 1 && m.position === i * 2);
      const src2 = matches.find((m) => m.round === r - 1 && m.position === i * 2 + 1);
      const p1 = src1?.winner || null;
      const p2 = src2?.winner || null;

      matches.push({
        id: `m${matchId++}`,
        round: r,
        position: i,
        player1: p1,
        player2: p2,
        score1: 0,
        score2: 0,
        winner: null,
      });
    }
  }

  return { players, matches, bestOf, generated: true };
}

function buildSeedOrder(size: number): number[] {
  if (size === 1) return [0];
  const half = buildSeedOrder(size / 2);
  const result: number[] = [];
  for (const h of half) {
    result.push(h * 2);
    result.push(h * 2 + 1);
  }
  return result;
}

// ── Component ──

interface TournamentBracketProps {
  tournamentAbbrev: string;
  isOwner: boolean;
}

export default function TournamentBracket({ tournamentAbbrev, isOwner }: TournamentBracketProps) {
  const [data, setData] = useState<BracketData>(() => loadBracket(tournamentAbbrev));
  const [playerInput, setPlayerInput] = useState('');
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [scoreDialog, setScoreDialog] = useState<Match | null>(null);
  const [editScore1, setEditScore1] = useState(0);
  const [editScore2, setEditScore2] = useState(0);

  const persist = useCallback((next: BracketData) => {
    setData(next);
    saveBracket(tournamentAbbrev, next);
  }, [tournamentAbbrev]);

  // ── Player Management ──

  const addPlayer = () => {
    const name = playerInput.trim();
    if (!name) return;
    if (data.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) return;
    const player: Player = {
      id: `p${Date.now()}`,
      name,
      seed: data.players.length + 1,
    };
    persist({ ...data, players: [...data.players, player] });
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

  const handleGenerate = () => {
    const bracket = generateBracket(data.players, data.bestOf);
    persist(bracket);
  };

  const handleReset = () => {
    persist({ ...data, matches: [], generated: false });
  };

  // ── Match Scoring ──

  const openScoreDialog = (match: Match) => {
    setScoreDialog(match);
    setEditScore1(match.score1);
    setEditScore2(match.score2);
  };

  const handleSaveScore = () => {
    if (!scoreDialog) return;
    const winsNeeded = Math.ceil(data.bestOf / 2);
    const winner = editScore1 >= winsNeeded ? scoreDialog.player1
      : editScore2 >= winsNeeded ? scoreDialog.player2
      : null;

    const updatedMatches = data.matches.map((m) => {
      if (m.id === scoreDialog.id) {
        return { ...m, score1: editScore1, score2: editScore2, winner };
      }
      return m;
    });

    // Advance winner to next round
    if (winner) {
      const nextRound = scoreDialog.round + 1;
      const nextPosition = Math.floor(scoreDialog.position / 2);
      const isTop = scoreDialog.position % 2 === 0;

      const nextMatch = updatedMatches.find((m) => m.round === nextRound && m.position === nextPosition);
      if (nextMatch) {
        if (isTop) nextMatch.player1 = winner;
        else nextMatch.player2 = winner;
        // Clear next match result if players changed
        nextMatch.score1 = 0;
        nextMatch.score2 = 0;
        nextMatch.winner = null;
      }
    }

    persist({ ...data, matches: updatedMatches });
    setScoreDialog(null);
  };

  // ── Helpers ──

  const getPlayerName = (id: string | null): string => {
    if (!id) return 'TBD';
    return data.players.find((p) => p.id === id)?.name || 'TBD';
  };

  const getPlayerSeed = (id: string | null): number | null => {
    if (!id) return null;
    return data.players.find((p) => p.id === id)?.seed ?? null;
  };

  const totalRounds = data.matches.length > 0
    ? Math.max(...data.matches.map((m) => m.round)) + 1
    : 0;

  const roundLabels = (round: number): string => {
    const remaining = totalRounds - round;
    if (remaining === 1) return 'Finals';
    if (remaining === 2) return 'Semifinals';
    if (remaining === 3) return 'Quarterfinals';
    return `Round ${round + 1}`;
  };

  // Find the finals winner
  const finalsMatch = data.matches.find((m) => m.round === totalRounds - 1 && m.position === 0);
  const champion = finalsMatch?.winner;

  const winsNeeded = Math.ceil(data.bestOf / 2);

  return (
    <Box>
      {/* Players & Setup */}
      {isOwner && (
        <Box sx={{ mb: 3 }}>
          {!data.generated && (
            <Stack spacing={2}>
              {/* Player roster card */}
              <Card variant="outlined">
                <CardHeader
                  avatar={
                    <Badge badgeContent={data.players.length} color="primary" showZero
                      sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 18, minWidth: 18 } }}>
                      <Avatar sx={{ width: 34, height: 34, bgcolor: 'action.hover' }}>
                        <GroupIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      </Avatar>
                    </Badge>
                  }
                  title="Player Roster"
                  subheader="Add players and set seeds before generating the bracket"
                  slotProps={{
                    title: { variant: 'subtitle2', fontWeight: 'bold' },
                    subheader: { variant: 'caption' },
                  }}
                  action={
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                      <Tooltip title="Bulk import from list">
                        <Button size="small" variant="outlined" startIcon={<UploadIcon />}
                          onClick={() => setBulkImportOpen(true)} sx={{ fontSize: 12 }}>
                          Import
                        </Button>
                      </Tooltip>
                      {data.players.length > 1 && (
                        <Tooltip title="Randomize seed order">
                          <IconButton size="small" onClick={shuffleSeeds}>
                            <ShuffleIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  }
                  sx={{ pb: 0 }}
                />
                <CardContent sx={{ pt: 1.5 }}>
                  {/* Add player input */}
                  <Stack direction="row" spacing={1} sx={{ mb: data.players.length > 0 ? 1.5 : 0 }}>
                    <TextField
                      size="small"
                      placeholder="Player name..."
                      value={playerInput}
                      onChange={(e) => setPlayerInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                      fullWidth
                      slotProps={{
                        input: {
                          startAdornment: <PersonIcon sx={{ fontSize: 18, color: 'text.disabled', mr: 0.75 }} />,
                        },
                      }}
                    />
                    <Button size="small" variant="contained" onClick={addPlayer} disabled={!playerInput.trim()}
                      sx={{ minWidth: 40, px: 1 }}>
                      <AddIcon sx={{ fontSize: 20 }} />
                    </Button>
                  </Stack>

                  {/* Player list */}
                  {data.players.length > 0 && (
                    <List dense disablePadding sx={{
                      border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden',
                    }}>
                      {data.players.map((player, i) => (
                        <ListItem
                          key={player.id}
                          divider={i < data.players.length - 1}
                          sx={{ py: 0.25 }}
                        >
                          <ListItemAvatar sx={{ minWidth: 36 }}>
                            <Avatar sx={{
                              width: 26, height: 26, fontSize: 11, fontWeight: 'bold',
                              bgcolor: player.seed <= 3 ? 'primary.main' : 'action.hover',
                              color: player.seed <= 3 ? 'white' : 'text.secondary',
                            }}>
                              {player.seed}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={player.name}
                            slotProps={{ primary: { variant: 'body2' } }}
                          />
                          <IconButton size="small" edge="end" onClick={() => removePlayer(player.id)}
                            sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                            <CloseIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </ListItem>
                      ))}
                    </List>
                  )}

                  {data.players.length === 0 && (
                    <Box sx={{ py: 3, textAlign: 'center' }}>
                      <PersonIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 0.5 }} />
                      <Typography variant="body2" color="text.disabled">
                        No players added yet
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Settings + Generate card */}
              <Card variant="outlined">
                <CardHeader
                  avatar={
                    <Avatar sx={{ width: 34, height: 34, bgcolor: 'action.hover' }}>
                      <SportsScoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    </Avatar>
                  }
                  title="Match Settings"
                  slotProps={{ title: { variant: 'subtitle2', fontWeight: 'bold' } }}
                  sx={{ pb: 0 }}
                />
                <CardContent>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Win condition
                  </Typography>
                  <Stack direction="row" spacing={0.75} sx={{ mb: 2.5, flexWrap: 'wrap' }}>
                    {[3, 5, 7, 9, 11, 13].map((bo) => (
                      <Chip
                        key={bo}
                        label={`Bo${bo}`}
                        size="small"
                        onClick={() => persist({ ...data, bestOf: bo })}
                        sx={{
                          cursor: 'pointer', fontWeight: 'bold',
                          backgroundColor: data.bestOf === bo ? 'primary.main' : 'action.hover',
                          color: data.bestOf === bo ? 'white' : 'text.primary',
                          transition: 'all 0.15s',
                          '&:hover': { transform: 'scale(1.05)' },
                        }}
                      />
                    ))}
                  </Stack>

                  <Divider sx={{ mb: 2 }} />

                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={<EmojiEventsIcon />}
                    onClick={handleGenerate}
                    disabled={data.players.length < 2}
                    sx={{ py: 1.25, fontWeight: 'bold', fontSize: 14 }}
                  >
                    Generate Bracket ({data.players.length} players)
                  </Button>

                  {data.players.length < 2 && data.players.length > 0 && (
                    <Alert severity="info" sx={{ mt: 1.5 }} icon={<GroupIcon sx={{ fontSize: 18 }} />}>
                      Need at least 2 players to generate a bracket
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Stack>
          )}

          {data.generated && (
            <Card variant="outlined" sx={{ mb: 2, px: 2, py: 1.5 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Button size="small" variant="outlined" startIcon={<RestartAltIcon />} onClick={handleReset}
                  sx={{ fontSize: 12 }}>
                  Reset
                </Button>
                <Divider orientation="vertical" flexItem />
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Chip label={`${data.players.length} players`} size="small" variant="outlined"
                    sx={{ height: 22, fontSize: 11, borderColor: 'divider' }} />
                  <Chip label={`Bo${data.bestOf}`} size="small" variant="outlined"
                    sx={{ height: 22, fontSize: 11, borderColor: 'divider' }} />
                  <Chip label="Single Elimination" size="small" variant="outlined"
                    sx={{ height: 22, fontSize: 11, borderColor: 'divider' }} />
                </Stack>
              </Stack>
            </Card>
          )}
        </Box>
      )}

      {/* Champion banner */}
      {champion && (
        <Card variant="outlined" sx={{
          mb: 3, overflow: 'hidden',
          borderColor: 'rgba(245,200,66,0.4)',
          background: 'linear-gradient(135deg, rgba(245,200,66,0.12) 0%, rgba(245,200,66,0.03) 100%)',
        }}>
          <Box sx={{ textAlign: 'center', py: 3, position: 'relative' }}>
            {/* Decorative stars */}
            <StarIcon sx={{ position: 'absolute', top: 12, left: '20%', fontSize: 14, color: 'rgba(245,200,66,0.3)', transform: 'rotate(-15deg)' }} />
            <StarIcon sx={{ position: 'absolute', top: 20, right: '25%', fontSize: 10, color: 'rgba(245,200,66,0.25)', transform: 'rotate(20deg)' }} />
            <StarIcon sx={{ position: 'absolute', bottom: 16, left: '30%', fontSize: 12, color: 'rgba(245,200,66,0.2)', transform: 'rotate(10deg)' }} />

            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={<MilitaryTechIcon sx={{ fontSize: 18, color: '#f5c842' }} />}
            >
              <Avatar sx={{
                width: 56, height: 56, mx: 'auto',
                bgcolor: 'rgba(245,200,66,0.15)', border: '2px solid rgba(245,200,66,0.4)',
              }}>
                <EmojiEventsIcon sx={{ fontSize: 28, color: '#f5c842' }} />
              </Avatar>
            </Badge>
            <Typography variant="h6" fontWeight="bold" sx={{ mt: 1.5 }}>
              {getPlayerName(champion)}
            </Typography>
            <Chip
              icon={<EmojiEventsIcon sx={{ fontSize: '14px !important', color: '#f5c842 !important' }} />}
              label="Champion"
              size="small"
              variant="outlined"
              sx={{ mt: 0.5, height: 24, fontSize: 11, fontWeight: 600, borderColor: 'rgba(245,200,66,0.4)', color: '#f5c842' }}
            />
          </Box>
        </Card>
      )}

      {/* Bracket Visualization */}
      {data.generated && totalRounds > 0 && (
        <Box sx={{ overflowX: 'auto', pb: 2 }}>
          <Box sx={{ display: 'flex', gap: 0, minWidth: totalRounds * 240 }}>
            {Array.from({ length: totalRounds }, (_, round) => {
              const roundMatches = data.matches
                .filter((m) => m.round === round)
                .sort((a, b) => a.position - b.position);
              const isLast = round === totalRounds - 1;

              return (
                <Box key={round} sx={{ flex: 1, minWidth: 220, px: 1 }}>
                  <Chip
                    label={roundLabels(round)}
                    size="small"
                    variant={isLast ? 'filled' : 'outlined'}
                    icon={isLast ? <EmojiEventsIcon sx={{ fontSize: '14px !important' }} /> : undefined}
                    sx={{
                      display: 'flex', width: 'fit-content', mx: 'auto', mb: 1.5,
                      height: 24, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5,
                      ...(isLast ? { bgcolor: 'primary.main', color: 'white' } : { borderColor: 'divider' }),
                    }}
                  />

                  <Box sx={{
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-around',
                    height: roundMatches.length > 0 ? Math.max(roundMatches.length * 100, data.matches.filter((m) => m.round === 0).length * 100) : 'auto',
                  }}>
                    {roundMatches.map((match) => {
                      const isBye = (match.player1 === null || match.player2 === null) && match.winner !== null && match.round === 0;
                      const isFinished = match.winner !== null;
                      const canEdit = isOwner && match.player1 !== null && match.player2 !== null && !isBye;

                      return (
                        <Card
                          key={match.id}
                          variant="outlined"
                          onClick={canEdit ? () => openScoreDialog(match) : undefined}
                          sx={{
                            overflow: 'hidden',
                            cursor: canEdit ? 'pointer' : 'default',
                            borderColor: isFinished ? 'primary.main' : 'divider',
                            opacity: isBye ? 0.35 : 1,
                            transition: 'all 0.15s',
                            '&:hover': canEdit ? {
                              borderColor: 'primary.main',
                              boxShadow: '0 2px 8px rgba(132,169,140,0.2)',
                              transform: 'scale(1.02)',
                            } : {},
                            mb: 1,
                          }}
                        >
                          {/* Progress bar showing match completion */}
                          {!isBye && match.player1 && match.player2 && (
                            <LinearProgress
                              variant="determinate"
                              value={((match.score1 + match.score2) / data.bestOf) * 100}
                              sx={{
                                height: 2,
                                bgcolor: 'transparent',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: isFinished ? 'primary.main' : 'text.disabled',
                                },
                              }}
                            />
                          )}
                          <MatchSlot
                            name={getPlayerName(match.player1)}
                            seed={getPlayerSeed(match.player1)}
                            score={match.score1}
                            isWinner={match.winner === match.player1 && match.winner !== null}
                            isTBD={match.player1 === null}
                            winsNeeded={winsNeeded}
                          />
                          <Divider />
                          <MatchSlot
                            name={getPlayerName(match.player2)}
                            seed={getPlayerSeed(match.player2)}
                            score={match.score2}
                            isWinner={match.winner === match.player2 && match.winner !== null}
                            isTBD={match.player2 === null}
                            winsNeeded={winsNeeded}
                          />
                        </Card>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Empty state */}
      {!data.generated && !isOwner && (
        <Card variant="outlined" sx={{ textAlign: 'center', py: 5 }}>
          <Avatar sx={{ width: 56, height: 56, mx: 'auto', mb: 1.5, bgcolor: 'action.hover' }}>
            <EmojiEventsIcon sx={{ fontSize: 28, color: 'text.disabled' }} />
          </Avatar>
          <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>
            Bracket not yet generated
          </Typography>
          <Typography variant="body2" color="text.disabled">
            The tournament organizer hasn't set up the bracket yet
          </Typography>
        </Card>
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

      {/* Score Dialog */}
      <Dialog open={!!scoreDialog} onClose={() => setScoreDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
          <SportsScoreIcon sx={{ fontSize: 24, color: 'primary.main', mb: 0.5, display: 'block', mx: 'auto' }} />
          Match Score
        </DialogTitle>
        <DialogContent>
          {scoreDialog && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <Chip
                label={`Best of ${data.bestOf} — First to ${winsNeeded}`}
                size="small"
                variant="outlined"
                sx={{ alignSelf: 'center', height: 24, fontSize: 11, borderColor: 'divider' }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Chip
                    label={getPlayerName(scoreDialog.player1)}
                    size="small"
                    sx={{
                      mb: 1.5, fontWeight: 600, maxWidth: '100%',
                      ...(editScore1 >= winsNeeded ? { bgcolor: 'primary.main', color: 'white' } : {}),
                    }}
                  />
                  <TextField
                    type="number"
                    size="small"
                    value={editScore1}
                    onChange={(e) => setEditScore1(Math.max(0, Math.min(winsNeeded, parseInt(e.target.value) || 0)))}
                    slotProps={{ input: { style: { textAlign: 'center', fontSize: 28, fontWeight: 'bold' } } }}
                    sx={{ width: 80 }}
                  />
                </Box>
                <Typography variant="h5" color="text.disabled" sx={{ fontWeight: 300 }}>:</Typography>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Chip
                    label={getPlayerName(scoreDialog.player2)}
                    size="small"
                    sx={{
                      mb: 1.5, fontWeight: 600, maxWidth: '100%',
                      ...(editScore2 >= winsNeeded ? { bgcolor: 'primary.main', color: 'white' } : {}),
                    }}
                  />
                  <TextField
                    type="number"
                    size="small"
                    value={editScore2}
                    onChange={(e) => setEditScore2(Math.max(0, Math.min(winsNeeded, parseInt(e.target.value) || 0)))}
                    slotProps={{ input: { style: { textAlign: 'center', fontSize: 28, fontWeight: 'bold' } } }}
                    sx={{ width: 80 }}
                  />
                </Box>
              </Box>
              {editScore1 >= winsNeeded && (
                <Alert severity="success" icon={<EmojiEventsIcon sx={{ fontSize: 18 }} />}>
                  <strong>{getPlayerName(scoreDialog.player1)}</strong> wins the match!
                </Alert>
              )}
              {editScore2 >= winsNeeded && (
                <Alert severity="success" icon={<EmojiEventsIcon sx={{ fontSize: 18 }} />}>
                  <strong>{getPlayerName(scoreDialog.player2)}</strong> wins the match!
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setScoreDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveScore} startIcon={<SportsScoreIcon />}>
            Save Score
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Match Slot ──

function MatchSlot({
  name,
  seed,
  score,
  isWinner,
  isTBD,
  winsNeeded,
}: {
  name: string;
  seed: number | null;
  score: number;
  isWinner: boolean;
  isTBD: boolean;
  winsNeeded: number;
}) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 0.75,
      px: 1.5, py: 0.75,
      backgroundColor: isWinner ? 'rgba(132,169,140,0.1)' : 'transparent',
      transition: 'background-color 0.15s',
    }}>
      {seed !== null && (
        <Avatar sx={{
          width: 20, height: 20, fontSize: 9, fontWeight: 'bold',
          bgcolor: seed <= 2 ? 'primary.main' : 'action.hover',
          color: seed <= 2 ? 'white' : 'text.disabled',
        }}>
          {seed}
        </Avatar>
      )}
      <Typography
        variant="body2"
        sx={{
          flex: 1, minWidth: 0,
          fontWeight: isWinner ? 700 : 400,
          color: isTBD ? 'text.disabled' : isWinner ? 'primary.main' : 'text.primary',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontSize: 13,
        }}
      >
        {name}
      </Typography>
      {!isTBD && (
        <Chip
          label={score}
          size="small"
          sx={{
            height: 22, minWidth: 22, fontWeight: 'bold', fontSize: 12,
            bgcolor: score >= winsNeeded ? 'primary.main' : 'action.hover',
            color: score >= winsNeeded ? 'white' : 'text.secondary',
          }}
        />
      )}
    </Box>
  );
}
