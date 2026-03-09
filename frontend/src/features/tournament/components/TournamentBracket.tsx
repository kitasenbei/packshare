import { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  Dialog,
  DialogContent,
  DialogActions,
  Card,
  Avatar,
  Divider,
  Badge,
  LinearProgress,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import StarIcon from '@mui/icons-material/Star';
import { loadBracket, saveBracket, type BracketData, type Player } from './TournamentPlayers';

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

  const seeded = [...players].sort((a, b) => a.seed - b.seed);
  const slots: (string | null)[] = new Array(size).fill(null);

  const seedOrder = buildSeedOrder(size);
  for (let i = 0; i < seeded.length; i++) {
    slots[seedOrder[i]] = seeded[i].id;
  }

  const matches: BracketData['matches'] = [];
  let matchId = 0;

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
      winner: isBye ? (p1 || p2) : null,
    });
  }

  for (let r = 1; r < totalRounds; r++) {
    const matchesInRound = size / Math.pow(2, r + 1);
    for (let i = 0; i < matchesInRound; i++) {
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
  const [scoreDialog, setScoreDialog] = useState<BracketData['matches'][0] | null>(null);
  const [editScore1, setEditScore1] = useState(0);
  const [editScore2, setEditScore2] = useState(0);
  const [editNoShow, setEditNoShow] = useState<string | null>(null);

  const persist = useCallback((next: BracketData) => {
    setData(next);
    saveBracket(tournamentAbbrev, next);
  }, [tournamentAbbrev]);

  const handleGenerate = () => {
    const bracket = generateBracket(data.players, data.bestOf);
    persist(bracket);
  };

  const handleReset = () => {
    persist({ ...data, matches: [], generated: false });
  };

  // ── Match Scoring ──

  const openScoreDialog = (match: BracketData['matches'][0]) => {
    setScoreDialog(match);
    setEditScore1(match.score1);
    setEditScore2(match.score2);
    setEditNoShow(match.noShow || null);
  };

  const handleSaveScore = () => {
    if (!scoreDialog) return;
    const winsNeeded = Math.ceil(data.bestOf / 2);
    const winner = editScore1 >= winsNeeded ? scoreDialog.player1
      : editScore2 >= winsNeeded ? scoreDialog.player2
      : null;

    const updatedMatches = data.matches.map((m) => {
      if (m.id === scoreDialog.id) {
        return { ...m, score1: editScore1, score2: editScore2, winner, noShow: editNoShow };
      }
      return m;
    });

    if (winner) {
      const nextRound = scoreDialog.round + 1;
      const nextPosition = Math.floor(scoreDialog.position / 2);
      const isTop = scoreDialog.position % 2 === 0;

      const nextMatch = updatedMatches.find((m) => m.round === nextRound && m.position === nextPosition);
      if (nextMatch) {
        if (isTop) nextMatch.player1 = winner;
        else nextMatch.player2 = winner;
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

  const finalsMatch = data.matches.find((m) => m.round === totalRounds - 1 && m.position === 0);
  const champion = finalsMatch?.winner;
  const winsNeeded = Math.ceil(data.bestOf / 2);

  return (
    <Box>
      {/* Controls */}
      {isOwner && (
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
              Best of
            </Typography>
            <FormControl size="small" fullWidth>
              <Select
                value={data.bestOf}
                onChange={(e) => persist({ ...data, bestOf: e.target.value as number, generated: false, matches: [] })}
                sx={{ fontSize: 13 }}
              >
                {[3, 5, 7, 9, 11, 13].map((bo) => (
                  <MenuItem key={bo} value={bo} sx={{ fontSize: 13 }}>{bo}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {data.players.length < 2 && (
            <Typography variant="caption" color="text.disabled">
              Add at least 2 players in the Players tab to generate a bracket
            </Typography>
          )}

          {!data.generated ? (
            <Button
              variant="contained"
              startIcon={<EmojiEventsIcon />}
              onClick={handleGenerate}
              disabled={data.players.length < 2}
              sx={{ alignSelf: 'flex-end' }}
            >
              Generate Bracket
            </Button>
          ) : (
            <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={handleReset}
              sx={{ alignSelf: 'flex-end' }}>
              Reset Bracket
            </Button>
          )}
        </Stack>
      )}

      {/* Champion banner */}
      {champion && (
        <Card variant="outlined" sx={{
          mb: 3, overflow: 'hidden',
          borderColor: 'rgba(245,200,66,0.4)',
          background: 'linear-gradient(135deg, rgba(245,200,66,0.12) 0%, rgba(245,200,66,0.03) 100%)',
        }}>
          <Box sx={{ textAlign: 'center', py: 3, position: 'relative' }}>
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
                          {!isBye && match.player1 && match.player2 && (
                            <LinearProgress
                              variant="determinate"
                              value={isFinished ? 100 : ((match.score1 + match.score2) / data.bestOf) * 100}
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

      {/* Score Dialog */}
      <Dialog open={!!scoreDialog} onClose={() => setScoreDialog(null)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
        {scoreDialog && (() => {
          const p1Name = getPlayerName(scoreDialog.player1);
          const p2Name = getPlayerName(scoreDialog.player2);
          const p1Wins = editScore1 >= winsNeeded;
          const p2Wins = editScore2 >= winsNeeded;
          const hasWinner = p1Wins || p2Wins;

          return (
            <>
              {/* Header with Bo info */}
              <Box sx={{ px: 3, pt: 2.5, pb: 1.5, textAlign: 'center' }}>
                <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 10, fontFamily: 'inherit' }}>
                  Best of {data.bestOf} · First to {winsNeeded}
                </Typography>
              </Box>

              <DialogContent sx={{ px: 3, pt: 0, pb: 2 }}>
                {/* Scoreboard */}
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  border: '1px solid', borderColor: hasWinner ? 'primary.main' : 'divider',
                  borderRadius: 2, overflow: 'hidden',
                  transition: 'border-color 0.2s',
                }}>
                  {/* Player 1 */}
                  <Box sx={{
                    flex: 1, py: 2, px: 2,
                    textAlign: 'center',
                    backgroundColor: p1Wins ? 'rgba(132,169,140,0.08)' : 'transparent',
                    transition: 'background-color 0.2s',
                  }}>
                    <Typography variant="body2" fontWeight={p1Wins ? 700 : 500} noWrap
                      sx={{ color: p1Wins ? 'primary.main' : 'text.primary', mb: 1.5 }}>
                      {p1Name}
                    </Typography>
                    <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                      <Button size="small" variant="outlined" onClick={() => setEditScore1(Math.max(0, editScore1 - 1))}
                        disabled={editScore1 <= 0}
                        sx={{ minWidth: 32, width: 32, height: 32, p: 0, fontSize: 18, fontWeight: 300 }}>
                        −
                      </Button>
                      <Typography variant="body1" sx={{
                        minWidth: 40, textAlign: 'center', fontSize: 32, fontWeight: 700,
                        color: p1Wins ? 'primary.main' : 'text.primary',
                      }}>
                        {editScore1}
                      </Typography>
                      <Button size="small" variant="outlined" onClick={() => setEditScore1(Math.min(winsNeeded, editScore1 + 1))}
                        disabled={editScore1 >= winsNeeded}
                        sx={{ minWidth: 32, width: 32, height: 32, p: 0, fontSize: 18, fontWeight: 300 }}>
                        +
                      </Button>
                    </Stack>
                  </Box>

                  {/* Divider */}
                  <Divider orientation="vertical" flexItem />

                  {/* Player 2 */}
                  <Box sx={{
                    flex: 1, py: 2, px: 2,
                    textAlign: 'center',
                    backgroundColor: p2Wins ? 'rgba(132,169,140,0.08)' : 'transparent',
                    transition: 'background-color 0.2s',
                  }}>
                    <Typography variant="body2" fontWeight={p2Wins ? 700 : 500} noWrap
                      sx={{ color: p2Wins ? 'primary.main' : 'text.primary', mb: 1.5 }}>
                      {p2Name}
                    </Typography>
                    <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                      <Button size="small" variant="outlined" onClick={() => setEditScore2(Math.max(0, editScore2 - 1))}
                        disabled={editScore2 <= 0}
                        sx={{ minWidth: 32, width: 32, height: 32, p: 0, fontSize: 18, fontWeight: 300 }}>
                        −
                      </Button>
                      <Typography variant="body1" sx={{
                        minWidth: 40, textAlign: 'center', fontSize: 32, fontWeight: 700,
                        color: p2Wins ? 'primary.main' : 'text.primary',
                      }}>
                        {editScore2}
                      </Typography>
                      <Button size="small" variant="outlined" onClick={() => setEditScore2(Math.min(winsNeeded, editScore2 + 1))}
                        disabled={editScore2 >= winsNeeded}
                        sx={{ minWidth: 32, width: 32, height: 32, p: 0, fontSize: 18, fontWeight: 300 }}>
                        +
                      </Button>
                    </Stack>
                  </Box>
                </Box>

                {/* No-show */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.disabled" sx={{ mb: 0.5, display: 'block' }}>
                    No-show
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant={editNoShow === scoreDialog.player1 ? 'contained' : 'outlined'}
                      color={editNoShow === scoreDialog.player1 ? 'error' : 'inherit'}
                      onClick={() => {
                        if (editNoShow === scoreDialog.player1) {
                          setEditNoShow(null);
                        } else {
                          setEditNoShow(scoreDialog.player1);
                          setEditScore1(0);
                          setEditScore2(winsNeeded);
                        }
                      }}
                      sx={{ flex: 1, textTransform: 'none', fontSize: 12 }}
                    >
                      {p1Name}
                    </Button>
                    <Button
                      size="small"
                      variant={editNoShow === scoreDialog.player2 ? 'contained' : 'outlined'}
                      color={editNoShow === scoreDialog.player2 ? 'error' : 'inherit'}
                      onClick={() => {
                        if (editNoShow === scoreDialog.player2) {
                          setEditNoShow(null);
                        } else {
                          setEditNoShow(scoreDialog.player2);
                          setEditScore2(0);
                          setEditScore1(winsNeeded);
                        }
                      }}
                      sx={{ flex: 1, textTransform: 'none', fontSize: 12 }}
                    >
                      {p2Name}
                    </Button>
                  </Stack>
                </Box>

                {/* Winner banner */}
                {hasWinner && (
                  <Box sx={{
                    mt: 2, py: 1, px: 2, borderRadius: 1.5,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                    backgroundColor: 'rgba(132,169,140,0.1)',
                  }}>
                    <EmojiEventsIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                    <Typography variant="body2" fontWeight={600} color="primary.main">
                      {p1Wins ? p1Name : p2Name} wins
                    </Typography>
                  </Box>
                )}
              </DialogContent>

              <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={() => setScoreDialog(null)} sx={{ color: 'text.secondary' }}>Cancel</Button>
                <Button variant="contained" onClick={handleSaveScore}>
                  Save
                </Button>
              </DialogActions>
            </>
          );
        })()}
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
