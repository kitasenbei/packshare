import { useState, useEffect, useMemo } from 'react';
import { Trophy, Medal, Star } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import { getSiteBySubdomain, type Tournament, type TournamentMap } from '../api/tournaments';
import type { SiteConfig, SiteSection, SitePage as SitePageType, BuilderElement, ElementStyles } from '../types/siteConfig';

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
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#1a1a2e' }}>
        <Spinner className="size-8" />
      </div>
    );
  }

  if (error || !config || !tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-white" style={{ backgroundColor: '#1a1a2e' }}>
        <h1 className="text-3xl font-bold mb-1">404</h1>
        <p className="text-white/60">{error || 'Site not found'}</p>
      </div>
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

  const t = config.theme;
  const bgPaper = lighten(t.backgroundColor, 0.05);
  const textSecondary = adjustAlpha(t.textColor, 0.7);
  const dividerColor = adjustAlpha(t.textColor, 0.12);

  return (
    <div
      style={{
        minHeight: compact ? 'auto' : '100vh',
        backgroundColor: t.backgroundColor,
        color: t.textColor,
        fontFamily: t.fontFamily,
        borderRadius: compact ? 8 : 0,
      }}
    >
      {/* Navigation */}
      {config.pages.length > 1 && (
        <div
          style={{
            position: compact ? 'relative' : 'sticky',
            top: 0,
            zIndex: 100,
            backgroundColor: bgPaper,
            borderBottom: `1px solid ${dividerColor}`,
            ...(compact
              ? { borderRadius: '8px 8px 0 0' }
              : { backdropFilter: 'blur(8px)' }),
          }}
        >
          <div
            className="flex items-center"
            style={{
              maxWidth: compact ? '100%' : 1000,
              margin: '0 auto',
              padding: compact ? '0 6px' : '0 12px',
              gap: 2,
              height: compact ? 36 : 48,
            }}
          >
            {tournament.logo_url && (
              <img
                src={tournament.logo_url}
                alt={tournament.name}
                style={{
                  height: compact ? 20 : 28,
                  width: compact ? 20 : 28,
                  borderRadius: 4,
                  objectFit: 'cover',
                  marginRight: 4,
                }}
              />
            )}
            <span
              style={{
                fontWeight: 700,
                color: t.primaryColor,
                fontSize: compact ? 11 : 13,
                marginRight: 8,
              }}
            >
              {tournament.abbreviation}
            </span>
            {config.pages.map((page) => (
              <div
                key={page.id}
                onClick={() => setCurrentPath(page.path)}
                style={{
                  padding: compact ? '2px 4px' : '3px 6px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: compact ? 10 : 13,
                  fontWeight: currentPath === page.path ? 600 : 400,
                  color: currentPath === page.path ? t.primaryColor : textSecondary,
                  backgroundColor: currentPath === page.path
                    ? adjustAlpha(t.primaryColor, 0.1)
                    : 'transparent',
                  transition: 'all 0.15s',
                }}
              >
                {page.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Page content */}
      {currentPage?.layout === 'canvas' ? (
        <CanvasPageRenderer
          page={currentPage}
          tournament={tournament}
          config={config}
          players={players}
          bracketData={bracketData}
          compact={compact}
        />
      ) : (
        <div style={{ maxWidth: compact ? '100%' : 1000, margin: '0 auto', padding: compact ? '8px 6px' : '16px 12px' }}>
          {currentPage?.sections.map((section) => (
            <div key={section.id} style={{ marginBottom: compact ? 8 : 16 }}>
              <SectionRendererComponent
                section={section}
                tournament={tournament}
                config={config}
                players={players}
                bracketData={bracketData}
                compact={compact}
              />
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {!compact && (
        <div className="text-center py-3" style={{ borderTop: `1px solid ${dividerColor}` }}>
          <span className="text-xs opacity-50" style={{ color: textSecondary }}>
            Powered by PackShare
          </span>
        </div>
      )}
    </div>
  );
}

// ── Canvas/Builder Page Renderer (premium element tree) ──

function CanvasPageRenderer({
  page,
}: {
  page: SitePageType;
  tournament: Tournament;
  config: SiteConfig;
  players: Player[];
  bracketData: BracketData;
  compact?: boolean;
}) {
  const elements = page.elements || {};
  const rootIds = page.rootElementIds || [];

  if (rootIds.length === 0) return null;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {rootIds.map((id) => (
        <ElementRenderer key={id} elementId={id} elements={elements} />
      ))}
    </div>
  );
}

function ElementRenderer({ elementId, elements }: { elementId: string; elements: Record<string, BuilderElement> }) {
  const el = elements[elementId];
  if (!el) return null;

  const css = elementStylestoCSS(el.styles);

  if (el.type === 'text') {
    return (
      <div style={{ ...css, whiteSpace: 'pre-wrap' }}>
        {el.content || ''}
      </div>
    );
  }

  if (el.type === 'image') {
    return el.content ? (
      <img src={el.content} style={{ display: 'block', ...css }} />
    ) : null;
  }

  if (el.type === 'button') {
    const Wrapper = el.href ? 'a' : 'div';
    return (
      <Wrapper
        {...(el.href ? { href: el.href, target: '_blank', rel: 'noopener noreferrer' } : {})}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', cursor: 'pointer', ...css }}
      >
        {el.content || 'Button'}
      </Wrapper>
    );
  }

  if (el.type === 'divider' || el.type === 'spacer') {
    return <div style={css} />;
  }

  // Container
  return (
    <div style={css}>
      {el.children.map((childId) => (
        <ElementRenderer key={childId} elementId={childId} elements={elements} />
      ))}
    </div>
  );
}

function elementStylestoCSS(styles: ElementStyles): Record<string, unknown> {
  const css: Record<string, unknown> = {};

  if (styles.display) css.display = styles.display;
  if (styles.flexDirection) css.flexDirection = styles.flexDirection;
  if (styles.alignItems) css.alignItems = styles.alignItems;
  if (styles.justifyContent) css.justifyContent = styles.justifyContent;
  if (styles.flexWrap) css.flexWrap = styles.flexWrap;
  if (styles.gap != null) css.gap = `${styles.gap}px`;

  if (styles.width) css.width = styles.width;
  if (styles.height) css.height = styles.height;
  if (styles.minHeight) css.minHeight = styles.minHeight;
  if (styles.maxWidth) css.maxWidth = styles.maxWidth;

  if (styles.paddingTop != null) css.paddingTop = `${styles.paddingTop}px`;
  if (styles.paddingRight != null) css.paddingRight = `${styles.paddingRight}px`;
  if (styles.paddingBottom != null) css.paddingBottom = `${styles.paddingBottom}px`;
  if (styles.paddingLeft != null) css.paddingLeft = `${styles.paddingLeft}px`;
  if (styles.marginTop != null) css.marginTop = `${styles.marginTop}px`;
  if (styles.marginRight != null) css.marginRight = `${styles.marginRight}px`;
  if (styles.marginBottom != null) css.marginBottom = `${styles.marginBottom}px`;
  if (styles.marginLeft != null) css.marginLeft = `${styles.marginLeft}px`;

  if (styles.backgroundColor) css.backgroundColor = styles.backgroundColor;
  if (styles.backgroundImage) css.backgroundImage = styles.backgroundImage;
  if (styles.backgroundSize) css.backgroundSize = styles.backgroundSize;
  if (styles.backgroundPosition) css.backgroundPosition = styles.backgroundPosition;

  if (styles.borderRadius != null) css.borderRadius = `${styles.borderRadius}px`;
  if (styles.borderWidth != null) css.borderWidth = `${styles.borderWidth}px`;
  if (styles.borderColor) css.borderColor = styles.borderColor;
  if (styles.borderStyle) css.borderStyle = styles.borderStyle;

  if (styles.fontSize != null) css.fontSize = `${styles.fontSize}px`;
  if (styles.fontWeight != null) css.fontWeight = styles.fontWeight;
  if (styles.color) css.color = styles.color;
  if (styles.textAlign) css.textAlign = styles.textAlign;
  if (styles.lineHeight != null) css.lineHeight = styles.lineHeight;
  if (styles.letterSpacing != null) css.letterSpacing = `${styles.letterSpacing}px`;

  if (styles.opacity != null) css.opacity = styles.opacity;
  if (styles.boxShadow) css.boxShadow = styles.boxShadow;
  if (styles.overflow) css.overflow = styles.overflow;

  return css;
}

// ── Section Renderer ──

export function SectionRendererComponent({
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
    <div
      className="relative overflow-hidden flex flex-col items-center justify-center text-center"
      style={{
        borderRadius: compact ? 8 : 12,
        minHeight: compact ? 120 : 240,
        padding: compact ? '12px 8px' : '24px 12px',
      }}
    >
      {tournament.banner_url && (
        <img
          src={tournament.banner_url}
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          alt=""
        />
      )}
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 0%, ${config.theme.backgroundColor} 100%)` }} />

      <div className="relative z-10">
        {showLogo && tournament.logo_url && (
          <img
            src={tournament.logo_url}
            alt={tournament.name}
            style={{
              height: compact ? 40 : 80,
              maxWidth: compact ? 100 : 200,
              objectFit: 'contain',
              marginBottom: compact ? 4 : 8,
            }}
          />
        )}
        {showName && (
          <h2 className="font-bold mb-1" style={{ fontSize: compact ? '1.25rem' : '1.875rem' }}>
            {tournament.name}
          </h2>
        )}
        {showStatus && (
          <span
            className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full text-white"
            style={{
              backgroundColor:
                tournament.status === 'live' ? '#ef4444'
                : tournament.status === 'completed' ? '#22c55e'
                : config.theme.primaryColor,
            }}
          >
            {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Announcements ──

function AnnouncementsSection({ tournament, props }: { tournament: Tournament; props: Record<string, unknown> }) {
  const limit = typeof props.limit === 'number' ? props.limit : 5;
  const announcements = (tournament.announcements || []).slice(0, limit);

  if (announcements.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-bold mb-2">Announcements</h3>
      <div className="flex flex-col gap-1.5">
        {announcements.map((a) => (
          <div key={a.id} className="border rounded-lg">
            <div className="py-1.5 px-2">
              <p className="text-sm font-semibold">{a.title}</p>
              <span className="text-xs opacity-60">
                {new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {(a.body || a.image) && <Separator className="my-1" />}
              {a.image && (
                <img src={a.image} className="w-full rounded mb-1" alt="" />
              )}
              {a.body && (
                <p className="text-sm opacity-70 whitespace-pre-wrap">{a.body}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Players ──

function PlayersSection({ players, props, config, compact }: { players: Player[]; props: Record<string, unknown>; config: SiteConfig; compact?: boolean }) {
  const showSeeds = props.showSeeds !== false;
  const showAvatars = props.showAvatars !== false;

  if (players.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-bold mb-2">Players</h3>
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: compact
            ? '1fr 1fr'
            : 'repeat(auto-fill, minmax(200px, 1fr))',
        }}
      >
        {players.map((p) => (
          <div
            key={p.id}
            className="flex items-center border rounded-lg"
            style={{
              gap: compact ? 4 : 6,
              padding: compact ? '3px 4px' : '6px 8px',
            }}
          >
            {showAvatars && (
              <img
                src={`https://a.ppy.sh/${p.osu_id}`}
                className="rounded-full"
                style={{ width: compact ? 24 : 36, height: compact ? 24 : 36 }}
                alt=""
              />
            )}
            <div className="flex-1 min-w-0">
              <p className={`font-semibold truncate ${compact ? 'text-[11px]' : 'text-sm'}`}>{p.name}</p>
            </div>
            {showSeeds && (
              <span
                className="text-[11px] font-bold px-1.5 rounded-full"
                style={{
                  height: compact ? 18 : 22,
                  lineHeight: compact ? '18px' : '22px',
                  fontSize: compact ? 9 : 11,
                  backgroundColor: p.seed <= 2 ? config.theme.primaryColor : 'rgba(255,255,255,0.08)',
                  color: p.seed <= 2 ? '#fff' : 'inherit',
                  opacity: p.seed <= 2 ? 1 : 0.6,
                }}
              >
                #{p.seed}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bracket ──

function BracketSection({ players, bracketData, config }: { players: Player[]; bracketData: BracketData; config: SiteConfig }) {
  if (!bracketData.generated || bracketData.matches.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 mx-auto mb-1 rounded-full flex items-center justify-center bg-white/5">
          <Trophy className="size-6 opacity-30" />
        </div>
        <p className="text-sm opacity-40">Bracket not yet generated</p>
      </div>
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
    <div>
      <h3 className="text-lg font-bold mb-2">Bracket</h3>

      {champion !== null && (
        <div
          className="mb-3 rounded-lg border overflow-hidden"
          style={{
            borderColor: 'rgba(245,200,66,0.4)',
            background: 'linear-gradient(135deg, rgba(245,200,66,0.12) 0%, rgba(245,200,66,0.03) 100%)',
          }}
        >
          <div className="text-center py-3 relative">
            <Star className="absolute top-3 left-[20%] size-3.5 text-[rgba(245,200,66,0.3)] -rotate-15" />
            <Star className="absolute top-5 right-[25%] size-2.5 text-[rgba(245,200,66,0.25)] rotate-20" />
            <div className="relative inline-block">
              <div
                className="w-14 h-14 mx-auto rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: 'rgba(245,200,66,0.15)',
                  border: '2px solid rgba(245,200,66,0.4)',
                }}
              >
                <Trophy className="size-7 text-[#f5c842]" />
              </div>
              <Medal className="absolute -bottom-1 -right-1 size-[18px] text-[#f5c842]" />
            </div>
            <h3 className="text-lg font-bold mt-1.5">{getPlayerName(champion)}</h3>
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border mt-0.5"
              style={{ borderColor: 'rgba(245,200,66,0.4)', color: '#f5c842' }}
            >
              <Trophy className="size-3.5 text-[#f5c842]" />
              Champion
            </span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto pb-2">
        <div className="flex" style={{ minWidth: totalRounds * 240 }}>
          {Array.from({ length: totalRounds }, (_, round) => {
            const roundMatches = bracketData.matches
              .filter((m) => m.round === round)
              .sort((a, b) => a.position - b.position);
            const isLast = round === totalRounds - 1;

            return (
              <div key={round} className="flex-1 px-1" style={{ minWidth: 220 }}>
                <span
                  className="flex items-center gap-1 w-fit mx-auto mb-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                  style={isLast
                    ? { backgroundColor: config.theme.primaryColor, color: 'white', borderColor: 'transparent' }
                    : { borderColor: adjustAlpha(config.theme.textColor, 0.12) }
                  }
                >
                  {isLast && <Trophy className="size-3.5" />}
                  {roundLabels(round)}
                </span>
                <div
                  className="flex flex-col justify-around"
                  style={{
                    height: Math.max(roundMatches.length * 100, bracketData.matches.filter((m) => m.round === 0).length * 100),
                  }}
                >
                  {roundMatches.map((match) => {
                    const isBye = (match.player1 === null || match.player2 === null) && match.winner !== null && match.round === 0;
                    const isFinished = match.winner !== null;

                    return (
                      <div
                        key={match.id}
                        className="border rounded-lg overflow-hidden mb-1"
                        style={{
                          borderColor: isFinished ? config.theme.primaryColor : adjustAlpha(config.theme.textColor, 0.12),
                          opacity: isBye ? 0.35 : 1,
                        }}
                      >
                        {!isBye && match.player1 && match.player2 && (
                          <div
                            className="h-0.5"
                            style={{
                              background: isFinished ? config.theme.primaryColor : adjustAlpha(config.theme.textColor, 0.3),
                              width: isFinished ? '100%' : `${((match.score1 + match.score2) / bracketData.bestOf) * 100}%`,
                            }}
                          />
                        )}
                        <BracketSlot name={getPlayerName(match.player1)} seed={getPlayerSeed(match.player1)}
                          score={match.score1} isWinner={match.winner === match.player1 && match.winner !== null}
                          isTBD={match.player1 === null} winsNeeded={winsNeeded} primaryColor={config.theme.primaryColor} />
                        <Separator />
                        <BracketSlot name={getPlayerName(match.player2)} seed={getPlayerSeed(match.player2)}
                          score={match.score2} isWinner={match.winner === match.player2 && match.winner !== null}
                          isTBD={match.player2 === null} winsNeeded={winsNeeded} primaryColor={config.theme.primaryColor} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BracketSlot({ name, seed, score, isWinner, isTBD, winsNeeded, primaryColor }: {
  name: string; seed: number | null; score: number; isWinner: boolean; isTBD: boolean; winsNeeded: number; primaryColor: string;
}) {
  return (
    <div
      className="flex items-center gap-[3px] px-1.5 py-[3px]"
      style={{ backgroundColor: isWinner ? adjustAlpha(primaryColor, 0.1) : 'transparent' }}
    >
      {seed !== null && (
        <span
          className="inline-flex items-center justify-center rounded-full text-[9px] font-bold"
          style={{
            width: 20,
            height: 20,
            backgroundColor: seed <= 2 ? primaryColor : 'rgba(255,255,255,0.08)',
            color: seed <= 2 ? 'white' : 'rgba(255,255,255,0.4)',
          }}
        >
          {seed}
        </span>
      )}
      <span
        className="flex-1 min-w-0 truncate text-[13px]"
        style={{
          fontWeight: isWinner ? 700 : 400,
          color: isTBD ? 'rgba(255,255,255,0.3)' : isWinner ? primaryColor : 'inherit',
        }}
      >
        {name}
      </span>
      {!isTBD && (
        <span
          className="inline-flex items-center justify-center rounded-full text-xs font-bold"
          style={{
            height: 22,
            minWidth: 22,
            backgroundColor: score >= winsNeeded ? primaryColor : 'rgba(255,255,255,0.08)',
            color: score >= winsNeeded ? 'white' : 'inherit',
            opacity: score >= winsNeeded ? 1 : 0.6,
          }}
        >
          {score}
        </span>
      )}
    </div>
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
    <div>
      {stages.map((stage) => {
        if (!stage.maps?.length) return null;

        const grouped: Record<string, TournamentMap[]> = {};
        for (const map of stage.maps) {
          const key = map.slot_type;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(map);
        }

        return (
          <div key={stage.id} className="mb-3">
            <h3 className="text-lg font-bold mb-2">{stage.name}</h3>
            {Object.entries(grouped).map(([slotType, maps]) => (
              <div key={slotType} className="mb-2">
                <span
                  className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full text-white mb-1"
                  style={{ backgroundColor: getSlotColor(slotType) }}
                >
                  {slotConfigs[slotType]?.label || slotType}
                </span>
                <div className="flex flex-col gap-0.5">
                  {maps.map((map) => (
                    <div key={map.id} className="flex items-center gap-1.5 px-2 py-1 border rounded-lg">
                      <img
                        src={`https://assets.ppy.sh/beatmaps/${map.beatmapset_id}/covers/list.jpg`}
                        className="rounded object-cover shrink-0"
                        style={{ width: 48, height: 36 }}
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
                        alt=""
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{map.title}</p>
                        <p className="text-xs opacity-60 truncate">
                          {map.artist} &bull; {map.creator}
                          {map.difficulty_name && ` [${map.difficulty_name}]`}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {map.mod && map.mod !== 'NM' && (
                          <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/10">
                            {map.mod}
                          </span>
                        )}
                        {map.star_rating && (
                          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full border border-white/20">
                            {map.star_rating.toFixed(2)}★
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── Rich Text ──

function RichTextSection({ props }: { props: Record<string, unknown> }) {
  const content = (props.content as string) || '';
  if (!content) return null;

  return (
    <p className="text-base whitespace-pre-wrap" style={{ lineHeight: 1.7 }}>
      {content}
    </p>
  );
}

// ── Image ──

function ImageSection({ props }: { props: Record<string, unknown> }) {
  const url = (props.url as string) || '';
  const alt = (props.alt as string) || '';
  const fullWidth = props.fullWidth !== false;

  if (!url) return null;

  return (
    <img
      src={url}
      alt={alt}
      className="block max-w-full rounded-lg"
      style={{
        width: fullWidth ? '100%' : 'auto',
        margin: fullWidth ? 0 : '0 auto',
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
