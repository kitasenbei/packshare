import { useState, useCallback } from 'react';
import { RotateCcw, Trophy, Medal, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import { saveBracket } from '../api/tournaments';
import type { Player, BracketData, Match } from './TournamentPlayers';

// ── Bracket Generation ──

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function generateBracket(players: Player[], bestOf: number): BracketData {
  const n = players.length;
  if (n < 2) return { matches: [], bestOf, generated: false };

  const size = nextPowerOf2(n);
  const totalRounds = Math.log2(size);

  const seeded = [...players].sort((a, b) => a.seed - b.seed);
  const slots: (number | null)[] = new Array(size).fill(null);

  const seedOrder = buildSeedOrder(size);
  for (let i = 0; i < seeded.length; i++) {
    slots[seedOrder[i]] = seeded[i].id;
  }

  const matches: Match[] = [];
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

  return { matches, bestOf, generated: true };
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
  players: Player[];
  bracketData: BracketData;
  onBracketChanged: (data: BracketData) => void;
}

export default function TournamentBracket({
  tournamentAbbrev,
  isOwner,
  players,
  bracketData,
  onBracketChanged,
}: TournamentBracketProps) {
  const [scoreDialog, setScoreDialog] = useState<Match | null>(null);
  const [editScore1, setEditScore1] = useState(0);
  const [editScore2, setEditScore2] = useState(0);
  const [editNoShow, setEditNoShow] = useState<number | null>(null);

  const persist = useCallback(async (next: BracketData) => {
    onBracketChanged(next);
    try { await saveBracket(tournamentAbbrev, JSON.stringify(next)); } catch { /* best effort */ }
  }, [tournamentAbbrev, onBracketChanged]);

  const handleGenerate = () => {
    const bracket = generateBracket(players, bracketData.bestOf);
    persist(bracket);
  };

  const handleReset = () => {
    persist({ ...bracketData, matches: [], generated: false });
  };

  // ── Match Scoring ──

  const openScoreDialog = (match: Match) => {
    setScoreDialog(match);
    setEditScore1(match.score1);
    setEditScore2(match.score2);
    setEditNoShow(match.noShow || null);
  };

  const handleSaveScore = () => {
    if (!scoreDialog) return;
    const winsNeeded = Math.ceil(bracketData.bestOf / 2);
    const winner = editScore1 >= winsNeeded ? scoreDialog.player1
      : editScore2 >= winsNeeded ? scoreDialog.player2
      : null;

    const updatedMatches = bracketData.matches.map((m) => {
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

    persist({ ...bracketData, matches: updatedMatches });
    setScoreDialog(null);
  };

  // ── Helpers ──

  const getPlayerName = (id: number | null): string => {
    if (id === null) return 'TBD';
    return players.find((p) => p.id === id)?.name || 'TBD';
  };

  const getPlayerSeed = (id: number | null): number | null => {
    if (id === null) return null;
    return players.find((p) => p.id === id)?.seed ?? null;
  };

  const totalRounds = bracketData.matches.length > 0
    ? Math.max(...bracketData.matches.map((m) => m.round)) + 1
    : 0;

  const roundLabels = (round: number): string => {
    const remaining = totalRounds - round;
    if (remaining === 1) return 'Finals';
    if (remaining === 2) return 'Semifinals';
    if (remaining === 3) return 'Quarterfinals';
    return `Round ${round + 1}`;
  };

  const finalsMatch = bracketData.matches.find((m) => m.round === totalRounds - 1 && m.position === 0);
  const champion = finalsMatch?.winner ?? null;
  const winsNeeded = Math.ceil(bracketData.bestOf / 2);

  return (
    <div>
      {/* Controls */}
      {isOwner && (
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">
              Best of
            </span>
            <Select
              value={String(bracketData.bestOf)}
              onValueChange={(val) => persist({ ...bracketData, bestOf: Number(val), generated: false, matches: [] })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[3, 5, 7, 9, 11, 13].map((bo) => (
                  <SelectItem key={bo} value={String(bo)}>{bo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {players.length < 2 && (
            <span className="text-xs text-muted-foreground/50">
              Add at least 2 players in the Players tab to generate a bracket
            </span>
          )}

          {!bracketData.generated ? (
            <Button
              onClick={handleGenerate}
              disabled={players.length < 2}
              className="self-end"
            >
              <Trophy data-icon="inline-start" />
              Generate Bracket
            </Button>
          ) : (
            <Button variant="outline" onClick={handleReset} className="self-end">
              <RotateCcw data-icon="inline-start" />
              Reset Bracket
            </Button>
          )}
        </div>
      )}

      {/* Champion banner */}
      {champion !== null && (
        <div
          className="mb-4 overflow-hidden rounded-xl border border-[rgba(245,200,66,0.4)] ring-1 ring-foreground/10"
          style={{ background: 'linear-gradient(135deg, rgba(245,200,66,0.12) 0%, rgba(245,200,66,0.03) 100%)' }}
        >
          <div className="text-center py-6 relative">
            <Star className="absolute top-3 left-[20%] size-3.5 text-[rgba(245,200,66,0.3)] -rotate-[15deg]" />
            <Star className="absolute top-5 right-[25%] size-2.5 text-[rgba(245,200,66,0.25)] rotate-[20deg]" />
            <Star className="absolute bottom-4 left-[30%] size-3 text-[rgba(245,200,66,0.2)] rotate-[10deg]" />

            <div className="relative inline-block">
              <div className="flex items-center justify-center size-14 mx-auto rounded-full bg-[rgba(245,200,66,0.15)] border-2 border-[rgba(245,200,66,0.4)]">
                <Trophy className="size-7 text-[#f5c842]" />
              </div>
              <Medal className="absolute -bottom-1 -right-1 size-[18px] text-[#f5c842]" />
            </div>
            <h6 className="text-lg font-bold mt-2">
              {getPlayerName(champion)}
            </h6>
            <Badge variant="outline" className="mt-1 h-6 text-[11px] font-semibold border-[rgba(245,200,66,0.4)] text-[#f5c842]">
              <Trophy className="size-3.5 text-[#f5c842]" data-icon="inline-start" />
              Champion
            </Badge>
          </div>
        </div>
      )}

      {/* Bracket Visualization */}
      {bracketData.generated && totalRounds > 0 && (
        <div className="overflow-x-auto pb-2">
          <div className="flex" style={{ minWidth: totalRounds * 240 }}>
            {Array.from({ length: totalRounds }, (_, round) => {
              const roundMatches = bracketData.matches
                .filter((m) => m.round === round)
                .sort((a, b) => a.position - b.position);
              const isLast = round === totalRounds - 1;

              return (
                <div key={round} className="flex-1 min-w-[220px] px-1">
                  <div className="flex justify-center mb-2">
                    <Badge
                      variant={isLast ? 'default' : 'outline'}
                      className="text-[10px] font-bold uppercase tracking-wider"
                    >
                      {isLast && <Trophy className="size-3.5" data-icon="inline-start" />}
                      {roundLabels(round)}
                    </Badge>
                  </div>

                  <div
                    className="flex flex-col justify-around"
                    style={{
                      height: roundMatches.length > 0
                        ? Math.max(roundMatches.length * 100, bracketData.matches.filter((m) => m.round === 0).length * 100)
                        : 'auto',
                    }}
                  >
                    {roundMatches.map((match) => {
                      const isBye = (match.player1 === null || match.player2 === null) && match.winner !== null && match.round === 0;
                      const isFinished = match.winner !== null;
                      const canEdit = isOwner && match.player1 !== null && match.player2 !== null && !isBye;

                      return (
                        <div
                          key={match.id}
                          className={`overflow-hidden rounded-xl ring-1 transition-all mb-1 ${
                            isFinished ? 'ring-primary' : 'ring-foreground/10'
                          } ${isBye ? 'opacity-35' : ''} ${
                            canEdit ? 'cursor-pointer hover:ring-primary hover:shadow-md hover:scale-[1.02]' : ''
                          }`}
                          onClick={canEdit ? () => openScoreDialog(match) : undefined}
                        >
                          {!isBye && match.player1 && match.player2 && (
                            <div className="h-0.5 bg-transparent overflow-hidden">
                              <div
                                className={`h-full transition-all ${isFinished ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                                style={{ width: `${isFinished ? 100 : ((match.score1 + match.score2) / bracketData.bestOf) * 100}%` }}
                              />
                            </div>
                          )}
                          <MatchSlot
                            name={getPlayerName(match.player1)}
                            seed={getPlayerSeed(match.player1)}
                            score={match.score1}
                            isWinner={match.winner === match.player1 && match.winner !== null}
                            isTBD={match.player1 === null}
                            winsNeeded={winsNeeded}
                          />
                          <Separator />
                          <MatchSlot
                            name={getPlayerName(match.player2)}
                            seed={getPlayerSeed(match.player2)}
                            score={match.score2}
                            isWinner={match.winner === match.player2 && match.winner !== null}
                            isTBD={match.player2 === null}
                            winsNeeded={winsNeeded}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!bracketData.generated && !isOwner && (
        <div className="rounded-xl ring-1 ring-foreground/10 text-center py-10">
          <div className="flex items-center justify-center size-14 mx-auto mb-2 rounded-full bg-muted">
            <Trophy className="size-7 text-muted-foreground/50" />
          </div>
          <p className="font-semibold mb-1">
            Bracket not yet generated
          </p>
          <p className="text-sm text-muted-foreground/50">
            The tournament organizer hasn't set up the bracket yet
          </p>
        </div>
      )}

      {/* Score Dialog */}
      <Dialog open={!!scoreDialog} onOpenChange={(open) => { if (!open) setScoreDialog(null); }}>
        <DialogContent className="sm:max-w-sm overflow-hidden">
          {scoreDialog && (() => {
            const p1Name = getPlayerName(scoreDialog.player1);
            const p2Name = getPlayerName(scoreDialog.player2);
            const p1Wins = editScore1 >= winsNeeded;
            const p2Wins = editScore2 >= winsNeeded;
            const hasWinner = p1Wins || p2Wins;

            return (
              <>
                {/* Header with Bo info */}
                <div className="text-center">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Best of {bracketData.bestOf} · First to {winsNeeded}
                  </span>
                </div>

                {/* Scoreboard */}
                <div className={`flex items-center gap-0 border rounded-lg overflow-hidden transition-colors ${hasWinner ? 'border-primary' : 'border-border'}`}>
                  {/* Player 1 */}
                  <div className={`flex-1 py-4 px-3 text-center transition-colors ${p1Wins ? 'bg-primary/10' : ''}`}>
                    <p className={`text-sm truncate mb-2 ${p1Wins ? 'font-bold text-primary' : 'font-medium'}`}>
                      {p1Name}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="outline" size="icon-xs"
                        onClick={() => setEditScore1(Math.max(0, editScore1 - 1))}
                        disabled={editScore1 <= 0}
                        className="text-lg font-light"
                      >
                        −
                      </Button>
                      <span className={`text-[32px] font-bold min-w-[40px] text-center ${p1Wins ? 'text-primary' : ''}`}>
                        {editScore1}
                      </span>
                      <Button variant="outline" size="icon-xs"
                        onClick={() => setEditScore1(Math.min(winsNeeded, editScore1 + 1))}
                        disabled={editScore1 >= winsNeeded}
                        className="text-lg font-light"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  {/* Divider */}
                  <Separator orientation="vertical" className="h-auto self-stretch" />

                  {/* Player 2 */}
                  <div className={`flex-1 py-4 px-3 text-center transition-colors ${p2Wins ? 'bg-primary/10' : ''}`}>
                    <p className={`text-sm truncate mb-2 ${p2Wins ? 'font-bold text-primary' : 'font-medium'}`}>
                      {p2Name}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="outline" size="icon-xs"
                        onClick={() => setEditScore2(Math.max(0, editScore2 - 1))}
                        disabled={editScore2 <= 0}
                        className="text-lg font-light"
                      >
                        −
                      </Button>
                      <span className={`text-[32px] font-bold min-w-[40px] text-center ${p2Wins ? 'text-primary' : ''}`}>
                        {editScore2}
                      </span>
                      <Button variant="outline" size="icon-xs"
                        onClick={() => setEditScore2(Math.min(winsNeeded, editScore2 + 1))}
                        disabled={editScore2 >= winsNeeded}
                        className="text-lg font-light"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>

                {/* No-show */}
                <div>
                  <span className="text-xs text-muted-foreground/50 block mb-1">
                    No-show
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={editNoShow === scoreDialog.player1 ? 'destructive' : 'outline'}
                      onClick={() => {
                        if (editNoShow === scoreDialog.player1) {
                          setEditNoShow(null);
                        } else {
                          setEditNoShow(scoreDialog.player1);
                          setEditScore1(0);
                          setEditScore2(winsNeeded);
                        }
                      }}
                      className="flex-1 text-xs"
                    >
                      {p1Name}
                    </Button>
                    <Button
                      size="sm"
                      variant={editNoShow === scoreDialog.player2 ? 'destructive' : 'outline'}
                      onClick={() => {
                        if (editNoShow === scoreDialog.player2) {
                          setEditNoShow(null);
                        } else {
                          setEditNoShow(scoreDialog.player2);
                          setEditScore2(0);
                          setEditScore1(winsNeeded);
                        }
                      }}
                      className="flex-1 text-xs"
                    >
                      {p2Name}
                    </Button>
                  </div>
                </div>

                {/* Winner banner */}
                {hasWinner && (
                  <div className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-primary/10">
                    <Trophy className="size-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">
                      {p1Wins ? p1Name : p2Name} wins
                    </span>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setScoreDialog(null)}>Cancel</Button>
                  <Button onClick={handleSaveScore}>
                    Save
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
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
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 transition-colors ${isWinner ? 'bg-primary/10' : ''}`}>
      {seed !== null && (
        <div className={`flex items-center justify-center size-5 rounded-full text-[9px] font-bold ${
          seed <= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}>
          {seed}
        </div>
      )}
      <span
        className={`flex-1 min-w-0 text-[13px] truncate ${
          isWinner ? 'font-bold text-primary' : isTBD ? 'text-muted-foreground/50' : ''
        }`}
      >
        {name}
      </span>
      {!isTBD && (
        <span className={`inline-flex items-center justify-center h-[22px] min-w-[22px] rounded-full text-xs font-bold px-1 ${
          score >= winsNeeded ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}>
          {score}
        </span>
      )}
    </div>
  );
}
