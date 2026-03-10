import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Avatar,
  Chip,
  Card,
  CardContent,
  Divider,
  Stack,
  LinearProgress,
  Badge,
  createTheme,
  ThemeProvider,
  CssBaseline,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import StarIcon from '@mui/icons-material/Star';
import { getSiteBySubdomain, type Tournament, type TournamentMap } from '../api/tournaments';
import type { SiteConfig, SiteSection } from './SiteBuilder';

// ── Types ──

interface Player {
  id: number;
  osu_id: number;
  name: string;
  seed: number;
}

interface BracketData {
  matches: Match[];
  bestOf: number;
  generated: boolean;
}

interface Match {
  id: string;
  round: number;
  position: number;
  player1: number | null;
  player2: number | null;
  score1: number;
  score2: number;
  winner: number | null;
}

// ── Google Fonts loader ──

const FONT_URLS: Record<string, string> = {
  'Inter, sans-serif': 'Inter:wght@400;500;600;700',
  "'Roboto', sans-serif": 'Roboto:wght@400;500;700',
  "'Poppins', sans-serif": 'Poppins:wght@400;500;600;700',
  "'Montserrat', sans-serif": 'Montserrat:wght@400;500;600;700',
};

function useGoogleFont(fontFamily: string) {
  useEffect(() => {
    const spec = FONT_URLS[fontFamily];
    if (!spec) return;

    const id = `gfont-${spec.split(':')[0]}`;
    if (document.getElementById(id)) return;

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${spec.replace(/ /g, '+')}&display=swap`;
    document.head.appendChild(link);
  }, [fontFamily]);
}

// ── SEO helper ──

function useSEO(title?: string, description?: string) {
  useEffect(() => {
    if (!title) return;
    const prev = document.title;
    document.title = title;

    let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const prevDesc = metaDesc?.content;
    if (description) {
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = description;
    }

    // OG tags
    setMeta('og:title', title);
    if (description) setMeta('og:description', description);

    return () => {
      document.title = prev;
      if (metaDesc && prevDesc !== undefined) metaDesc.content = prevDesc || '';
    };
  }, [title, description]);
}

function setMeta(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.content = content;
}

// ── Theme builder (shared) ──

function buildSiteTheme(config: SiteConfig) {
  const t = config.theme;
  return createTheme({
    palette: {
      mode: 'dark',
      primary: { main: t.primaryColor },
      background: { default: t.backgroundColor, paper: lighten(t.backgroundColor, 0.05) },
      text: { primary: t.textColor, secondary: adjustAlpha(t.textColor, 0.7) },
      divider: adjustAlpha(t.textColor, 0.12),
    },
    typography: { fontFamily: t.fontFamily },
    components: {
      MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' } } },
    },
  });
}

// ── Public page renderer (fetches data by subdomain) ──

interface SiteRendererProps {
  subdomain: string;
}

export default function SiteRenderer({ subdomain }: SiteRendererProps) {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getSiteBySubdomain(subdomain)
      .then((data) => {
        setTournament(data.tournament);
        try {
          setConfig(JSON.parse(data.site.config));
        } catch {
          setError('Invalid site configuration');
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Site not found');
      })
      .finally(() => setLoading(false));
  }, [subdomain]);

  useSEO(
    tournament ? `${tournament.name} | PackShare` : undefined,
    tournament ? `${tournament.name} — ${tournament.format} tournament` : undefined,
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#1a1a2e' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !config || !tournament) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#1a1a2e', color: '#fff' }}>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>404</Typography>
        <Typography color="text.secondary">{error || 'Site not found'}</Typography>
      </Box>
    );
  }

  return <SitePreview config={config} tournament={tournament} />;
}

// ── Reusable preview component (used by both public renderer and editor) ──

interface SitePreviewProps {
  config: SiteConfig;
  tournament: Tournament;
  /** Selected page ID — for editor preview to sync with selected page */
  activePageId?: string;
  /** Compact mode — no sticky nav, reduced padding, for embedded preview */
  compact?: boolean;
}

export function SitePreview({ config, tournament, activePageId, compact }: SitePreviewProps) {
  const [currentPath, setCurrentPath] = useState('/');

  const theme = useMemo(() => buildSiteTheme(config), [config]);
  useGoogleFont(config.theme.fontFamily);

  // If activePageId is provided (editor mode), sync to that page
  useEffect(() => {
    if (activePageId) {
      const page = config.pages.find((p) => p.id === activePageId);
      if (page) setCurrentPath(page.path);
    }
  }, [activePageId, config.pages]);

  const currentPage = useMemo(() => {
    return config.pages.find((p) => p.path === currentPath) || config.pages[0] || null;
  }, [config, currentPath]);

  const bracketData: BracketData = tournament.bracket_data
    ? (() => { try { return JSON.parse(tournament.bracket_data); } catch { return { matches: [], bestOf: 7, generated: false }; } })()
    : { matches: [], bestOf: 7, generated: false };

  const players: Player[] = (tournament.players || []).map((p) => ({
    id: p.id,
    osu_id: p.osu_id,
    name: p.name,
    seed: p.seed,
  }));

  return (
    <ThemeProvider theme={theme}>
      {!compact && <CssBaseline />}
      <Box sx={{ minHeight: compact ? 'auto' : '100vh', bgcolor: 'background.default', borderRadius: compact ? 2 : 0 }}>
        {/* Navigation */}
        {config.pages.length > 1 && (
          <Box sx={{
            position: compact ? 'relative' : 'sticky', top: 0, zIndex: 100,
            bgcolor: 'background.paper',
            borderBottom: '1px solid', borderColor: 'divider',
            ...(compact ? { borderRadius: '8px 8px 0 0' } : { backdropFilter: 'blur(8px)' }),
          }}>
            <Box sx={{ maxWidth: compact ? '100%' : 1000, mx: 'auto', px: compact ? 1.5 : 3, display: 'flex', alignItems: 'center', gap: 0.5, height: compact ? 36 : 48 }}>
              {tournament.logo_url && (
                <Box
                  component="img"
                  src={tournament.logo_url}
                  alt={tournament.name}
                  sx={{ height: compact ? 20 : 28, width: compact ? 20 : 28, borderRadius: 1, objectFit: 'cover', mr: 1 }}
                />
              )}
              <Typography variant="body2" fontWeight={700} sx={{ mr: 2, color: 'primary.main', fontSize: compact ? 11 : 13 }}>
                {tournament.abbreviation}
              </Typography>
              {config.pages.map((page) => (
                <Box
                  key={page.id}
                  onClick={() => setCurrentPath(page.path)}
                  sx={{
                    px: compact ? 1 : 1.5, py: compact ? 0.5 : 0.75, borderRadius: 1, cursor: 'pointer',
                    fontSize: compact ? 10 : 13, fontWeight: currentPath === page.path ? 600 : 400,
                    color: currentPath === page.path ? 'primary.main' : 'text.secondary',
                    bgcolor: currentPath === page.path ? adjustAlpha(config.theme.primaryColor, 0.1) : 'transparent',
                    '&:hover': { bgcolor: adjustAlpha(config.theme.primaryColor, 0.08) },
                    transition: 'all 0.15s',
                  }}
                >
                  {page.name}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Page content */}
        <Box sx={{ maxWidth: compact ? '100%' : 1000, mx: 'auto', px: compact ? 1.5 : 3, py: compact ? 2 : 4 }}>
          {currentPage?.sections.map((section) => (
            <Box key={section.id} sx={{ mb: compact ? 2 : 4 }}>
              <SectionRendererComponent
                section={section}
                tournament={tournament}
                config={config}
                players={players}
                bracketData={bracketData}
                compact={compact}
              />
            </Box>
          ))}
        </Box>

        {/* Footer */}
        {!compact && (
          <Box sx={{ textAlign: 'center', py: 3, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.5 }}>
              Powered by PackShare
            </Typography>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}

// ── Section Renderer ──

function SectionRendererComponent({
  section,
  tournament,
  config,
  players,
  bracketData,
  compact,
}: {
  section: SiteSection;
  tournament: Tournament;
  config: SiteConfig;
  players: Player[];
  bracketData: BracketData;
  compact?: boolean;
}) {
  switch (section.type) {
    case 'hero':
      return <HeroSection tournament={tournament} props={section.props} config={config} compact={compact} />;
    case 'announcements':
      return <AnnouncementsSection tournament={tournament} props={section.props} />;
    case 'players':
      return <PlayersSection players={players} props={section.props} config={config} compact={compact} />;
    case 'bracket':
      return <BracketSection players={players} bracketData={bracketData} config={config} />;
    case 'mappool':
      return <MappoolSection tournament={tournament} props={section.props} config={config} />;
    case 'richtext':
      return <RichTextSection props={section.props} />;
    case 'image':
      return <ImageSection props={section.props} />;
    default:
      return null;
  }
}

// ── Hero ──

function HeroSection({ tournament, props, config, compact }: { tournament: Tournament; props: Record<string, unknown>; config: SiteConfig; compact?: boolean }) {
  const showLogo = props.showLogo !== false;
  const showName = props.showName !== false;
  const showStatus = props.showStatus !== false;

  return (
    <Box sx={{
      position: 'relative', borderRadius: compact ? 2 : 3, overflow: 'hidden',
      minHeight: compact ? 120 : 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', py: compact ? 3 : 6, px: compact ? 2 : 3,
    }}>
      {tournament.banner_url && (
        <Box
          component="img"
          src={tournament.banner_url}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }}
        />
      )}
      <Box sx={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 0%, ${config.theme.backgroundColor} 100%)` }} />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {showLogo && tournament.logo_url && (
          <Box
            component="img"
            src={tournament.logo_url}
            alt={tournament.name}
            sx={{ height: compact ? 40 : 80, maxWidth: compact ? 100 : 200, objectFit: 'contain', mb: compact ? 1 : 2 }}
          />
        )}
        {showName && (
          <Typography variant={compact ? 'h5' : 'h3'} fontWeight="bold" sx={{ mb: 1 }}>
            {tournament.name}
          </Typography>
        )}
        {showStatus && (
          <Chip
            label={tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
            size="small"
            sx={{
              fontWeight: 600, fontSize: 11, height: 24,
              bgcolor: tournament.status === 'live' ? 'error.main'
                : tournament.status === 'completed' ? 'success.main'
                : 'primary.main',
              color: '#fff',
            }}
          />
        )}
      </Box>
    </Box>
  );
}

// ── Announcements ──

function AnnouncementsSection({ tournament, props }: { tournament: Tournament; props: Record<string, unknown> }) {
  const limit = typeof props.limit === 'number' ? props.limit : 5;
  const announcements = (tournament.announcements || []).slice(0, limit);

  if (announcements.length === 0) return null;

  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Announcements</Typography>
      <Stack spacing={1.5}>
        {announcements.map((a) => (
          <Card key={a.id} variant="outlined">
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="subtitle2" fontWeight={600}>{a.title}</Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </Typography>
              {(a.body || a.image) && <Divider sx={{ my: 1 }} />}
              {a.image && (
                <Box component="img" src={a.image} sx={{ width: '100%', borderRadius: 1, mb: a.body ? 1 : 0 }} />
              )}
              {a.body && (
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {a.body}
                </Typography>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}

// ── Players ──

function PlayersSection({ players, props, config, compact }: { players: Player[]; props: Record<string, unknown>; config: SiteConfig; compact?: boolean }) {
  const showSeeds = props.showSeeds !== false;
  const showAvatars = props.showAvatars !== false;

  if (players.length === 0) return null;

  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Players</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: compact ? '1fr 1fr' : { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1 }}>
        {players.map((p) => (
          <Card key={p.id} variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: compact ? 1 : 1.5, px: compact ? 1 : 2, py: compact ? 0.75 : 1.5 }}>
            {showAvatars && (
              <Avatar
                src={`https://a.ppy.sh/${p.osu_id}`}
                sx={{ width: compact ? 24 : 36, height: compact ? 24 : 36 }}
              />
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: compact ? 11 : undefined }}>{p.name}</Typography>
            </Box>
            {showSeeds && (
              <Chip
                label={`#${p.seed}`}
                size="small"
                sx={{
                  height: compact ? 18 : 22, fontSize: compact ? 9 : 11, fontWeight: 'bold',
                  bgcolor: p.seed <= 2 ? config.theme.primaryColor : 'action.hover',
                  color: p.seed <= 2 ? '#fff' : 'text.secondary',
                }}
              />
            )}
          </Card>
        ))}
      </Box>
    </Box>
  );
}

// ── Bracket ──

function BracketSection({ players, bracketData, config }: { players: Player[]; bracketData: BracketData; config: SiteConfig }) {
  if (!bracketData.generated || bracketData.matches.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Avatar sx={{ width: 48, height: 48, mx: 'auto', mb: 1, bgcolor: 'action.hover' }}>
          <EmojiEventsIcon sx={{ color: 'text.disabled' }} />
        </Avatar>
        <Typography variant="body2" color="text.disabled">Bracket not yet generated</Typography>
      </Box>
    );
  }

  const getPlayerName = (id: number | null): string => {
    if (id === null) return 'TBD';
    return players.find((p) => p.id === id)?.name || 'TBD';
  };

  const getPlayerSeed = (id: number | null): number | null => {
    if (id === null) return null;
    return players.find((p) => p.id === id)?.seed ?? null;
  };

  const totalRounds = Math.max(...bracketData.matches.map((m) => m.round)) + 1;
  const winsNeeded = Math.ceil(bracketData.bestOf / 2);

  const roundLabels = (round: number): string => {
    const remaining = totalRounds - round;
    if (remaining === 1) return 'Finals';
    if (remaining === 2) return 'Semifinals';
    if (remaining === 3) return 'Quarterfinals';
    return `Round ${round + 1}`;
  };

  const finalsMatch = bracketData.matches.find((m) => m.round === totalRounds - 1 && m.position === 0);
  const champion = finalsMatch?.winner ?? null;

  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Bracket</Typography>

      {champion !== null && (
        <Card variant="outlined" sx={{
          mb: 3, overflow: 'hidden',
          borderColor: 'rgba(245,200,66,0.4)',
          background: 'linear-gradient(135deg, rgba(245,200,66,0.12) 0%, rgba(245,200,66,0.03) 100%)',
        }}>
          <Box sx={{ textAlign: 'center', py: 3, position: 'relative' }}>
            <StarIcon sx={{ position: 'absolute', top: 12, left: '20%', fontSize: 14, color: 'rgba(245,200,66,0.3)', transform: 'rotate(-15deg)' }} />
            <StarIcon sx={{ position: 'absolute', top: 20, right: '25%', fontSize: 10, color: 'rgba(245,200,66,0.25)', transform: 'rotate(20deg)' }} />
            <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={<MilitaryTechIcon sx={{ fontSize: 18, color: '#f5c842' }} />}>
              <Avatar sx={{ width: 56, height: 56, mx: 'auto', bgcolor: 'rgba(245,200,66,0.15)', border: '2px solid rgba(245,200,66,0.4)' }}>
                <EmojiEventsIcon sx={{ fontSize: 28, color: '#f5c842' }} />
              </Avatar>
            </Badge>
            <Typography variant="h6" fontWeight="bold" sx={{ mt: 1.5 }}>{getPlayerName(champion)}</Typography>
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

      <Box sx={{ overflowX: 'auto', pb: 2 }}>
        <Box sx={{ display: 'flex', gap: 0, minWidth: totalRounds * 240 }}>
          {Array.from({ length: totalRounds }, (_, round) => {
            const roundMatches = bracketData.matches
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
                  height: Math.max(roundMatches.length * 100, bracketData.matches.filter((m) => m.round === 0).length * 100),
                }}>
                  {roundMatches.map((match) => {
                    const isBye = (match.player1 === null || match.player2 === null) && match.winner !== null && match.round === 0;
                    const isFinished = match.winner !== null;

                    return (
                      <Card key={match.id} variant="outlined" sx={{
                        overflow: 'hidden',
                        borderColor: isFinished ? 'primary.main' : 'divider',
                        opacity: isBye ? 0.35 : 1,
                        mb: 1,
                      }}>
                        {!isBye && match.player1 && match.player2 && (
                          <LinearProgress
                            variant="determinate"
                            value={isFinished ? 100 : ((match.score1 + match.score2) / bracketData.bestOf) * 100}
                            sx={{ height: 2, bgcolor: 'transparent', '& .MuiLinearProgress-bar': { bgcolor: isFinished ? 'primary.main' : 'text.disabled' } }}
                          />
                        )}
                        <BracketSlot name={getPlayerName(match.player1)} seed={getPlayerSeed(match.player1)}
                          score={match.score1} isWinner={match.winner === match.player1 && match.winner !== null}
                          isTBD={match.player1 === null} winsNeeded={winsNeeded} primaryColor={config.theme.primaryColor} />
                        <Divider />
                        <BracketSlot name={getPlayerName(match.player2)} seed={getPlayerSeed(match.player2)}
                          score={match.score2} isWinner={match.winner === match.player2 && match.winner !== null}
                          isTBD={match.player2 === null} winsNeeded={winsNeeded} primaryColor={config.theme.primaryColor} />
                      </Card>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

function BracketSlot({ name, seed, score, isWinner, isTBD, winsNeeded, primaryColor }: {
  name: string; seed: number | null; score: number; isWinner: boolean; isTBD: boolean; winsNeeded: number; primaryColor: string;
}) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.75,
      backgroundColor: isWinner ? adjustAlpha(primaryColor, 0.1) : 'transparent',
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
      <Typography variant="body2" sx={{
        flex: 1, minWidth: 0, fontWeight: isWinner ? 700 : 400,
        color: isTBD ? 'text.disabled' : isWinner ? 'primary.main' : 'text.primary',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13,
      }}>
        {name}
      </Typography>
      {!isTBD && (
        <Chip label={score} size="small" sx={{
          height: 22, minWidth: 22, fontWeight: 'bold', fontSize: 12,
          bgcolor: score >= winsNeeded ? 'primary.main' : 'action.hover',
          color: score >= winsNeeded ? 'white' : 'text.secondary',
        }} />
      )}
    </Box>
  );
}

// ── Mappool ──

function MappoolSection({ tournament, props, config }: { tournament: Tournament; props: Record<string, unknown>; config: SiteConfig }) {
  const stageFilter = (props.stage as string) || '';
  const stages = (tournament.stages || []).filter((s) => !stageFilter || s.name === stageFilter);

  if (stages.length === 0 || stages.every((s) => !s.maps?.length)) return null;

  let slotConfigs: Record<string, { label: string; color: string }> = {};
  if (tournament.slot_configs) {
    try { slotConfigs = JSON.parse(tournament.slot_configs); } catch { /* ignore */ }
  }

  const getSlotColor = (slotType: string) => slotConfigs[slotType]?.color || config.theme.primaryColor;

  return (
    <Box>
      {stages.map((stage) => {
        if (!stage.maps?.length) return null;

        const grouped: Record<string, TournamentMap[]> = {};
        for (const map of stage.maps) {
          const key = map.slot_type;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(map);
        }

        return (
          <Box key={stage.id} sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>{stage.name}</Typography>
            {Object.entries(grouped).map(([slotType, maps]) => (
              <Box key={slotType} sx={{ mb: 2 }}>
                <Chip
                  label={slotConfigs[slotType]?.label || slotType}
                  size="small"
                  sx={{ mb: 1, height: 22, fontSize: 11, fontWeight: 'bold', bgcolor: getSlotColor(slotType), color: '#fff' }}
                />
                <Stack spacing={0.5}>
                  {maps.map((map) => (
                    <Card key={map.id} variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1 }}>
                      <Box
                        component="img"
                        src={`https://assets.ppy.sh/beatmaps/${map.beatmapset_id}/covers/list.jpg`}
                        sx={{ width: 48, height: 36, borderRadius: 0.5, objectFit: 'cover', flexShrink: 0 }}
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{map.title}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {map.artist} • {map.creator}
                          {map.difficulty_name && ` [${map.difficulty_name}]`}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                        {map.mod && map.mod !== 'NM' && (
                          <Chip label={map.mod} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 'bold' }} />
                        )}
                        {map.star_rating && (
                          <Chip
                            label={`${map.star_rating.toFixed(2)}★`}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: 10 }}
                          />
                        )}
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              </Box>
            ))}
          </Box>
        );
      })}
    </Box>
  );
}

// ── Rich Text ──

function RichTextSection({ props }: { props: Record<string, unknown> }) {
  const content = (props.content as string) || '';
  if (!content) return null;

  return (
    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
      {content}
    </Typography>
  );
}

// ── Image ──

function ImageSection({ props }: { props: Record<string, unknown> }) {
  const url = (props.url as string) || '';
  const alt = (props.alt as string) || '';
  const fullWidth = props.fullWidth !== false;

  if (!url) return null;

  return (
    <Box
      component="img"
      src={url}
      alt={alt}
      sx={{
        display: 'block',
        width: fullWidth ? '100%' : 'auto',
        maxWidth: '100%',
        borderRadius: 2,
        mx: fullWidth ? 0 : 'auto',
      }}
    />
  );
}

// ── Color utilities ──

function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.min(255, Math.round(r + (255 - r) * amount));
  const ng = Math.min(255, Math.round(g + (255 - g) * amount));
  const nb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

function adjustAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
