import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  IconButton,
  Tabs,
  Tab,
  Snackbar,
  Avatar,
  Tooltip,
  Breadcrumbs,
  Card,
  CardHeader,
  ButtonGroup,
} from '@mui/material';
import { Link } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import GroupIcon from '@mui/icons-material/Group';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CodeIcon from '@mui/icons-material/Code';
import DnsIcon from '@mui/icons-material/Dns';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ViewListIcon from '@mui/icons-material/ViewList';
import SettingsIcon from '@mui/icons-material/Settings';
import CampaignIcon from '@mui/icons-material/Campaign';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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
  upcoming: <ScheduleIcon />,
  live: <LiveTvIcon />,
  completed: <CheckCircleIcon />,
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
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
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
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to update' });
    }
    setSavingName(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/t/${tournament.abbreviation}`);
    setSnackbar({ open: true, message: 'Link copied!' });
  };

  const handleTournamentChanged = (updated: Tournament) => {
    setTournament(updated);
    onUpdated(updated);
  };

  const handleError = (msg: string) => {
    setSnackbar({ open: true, message: msg });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <>
      {/* Breadcrumb nav */}
      <Breadcrumbs separator={<NavigateNextIcon sx={{ fontSize: 14 }} />} sx={{ mb: 2 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
          onClick={onBack}
        >
          Tournaments
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {tournament.name}
        </Typography>
      </Breadcrumbs>

      {/* Hero card */}
      <Card variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box sx={{ background: `linear-gradient(180deg, ${palette.mid}15 0%, ${palette.light}08 100%)` }}>
        {/* Banner */}
        <Box
          sx={{ aspectRatio: '4/1', position: 'relative', cursor: isOwner ? 'pointer' : 'default' }}
        >
          <Box
            component="img"
            src={tournament.banner_url || placeholderBanner}
            sx={{
              width: '100%', height: '100%', objectFit: 'cover',
              maskImage: 'linear-gradient(180deg, black 40%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(180deg, black 40%, transparent 100%)',
            }}
          />
        </Box>
        <CardHeader
          avatar={
            <Avatar
              src={tournament.logo_url || placeholderLogo}
              variant="rounded"
              sx={{ width: 48, height: 48 }}
            />
          }
          title={
            editingName ? (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <TextField
                  size="small"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  sx={{ flex: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: 16, fontWeight: 'bold' } }}
                  autoFocus
                />
                <IconButton size="small" onClick={handleSaveName} disabled={savingName}>
                  <CheckIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton size="small" onClick={() => { setEditingName(false); setEditName(tournament.name); }}>
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Stack>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography variant="subtitle1" fontWeight="bold">{tournament.name}</Typography>
                {isOwner && (
                  <Tooltip title="Rename">
                    <IconButton size="small" onClick={() => setEditingName(true)} sx={{ p: 0.25 }}>
                      <EditIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                    </IconButton>
                  </Tooltip>
                )}
                <Chip
                  icon={statusIcons[tournament.status]}
                  label={tournament.status}
                  size="small"
                  sx={{
                    height: 22, fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize', ml: 0.5,
                    backgroundColor: `${statusColors[tournament.status]}dd`,
                    color: 'white',
                    '& .MuiChip-icon': { color: 'white', fontSize: 12, ml: 0.5 },
                  }}
                />
              </Box>
            )
          }
          action={
            <ButtonGroup size="small" variant="outlined" sx={{ mt: 0.5 }}>
              <Tooltip title="Copy link">
                <Button onClick={handleCopyLink} sx={{ minWidth: 36, px: 1 }}>
                  <ContentCopyIcon sx={{ fontSize: 16 }} />
                </Button>
              </Tooltip>
              <Tooltip title="Open public page">
                <Button component={Link} to={`/t/${tournament.abbreviation}`} target="_blank" sx={{ minWidth: 36, px: 1 }}>
                  <OpenInNewIcon sx={{ fontSize: 16 }} />
                </Button>
              </Tooltip>
            </ButtonGroup>
          }
          sx={{ pb: 0 }}
        />

        {error && <Alert severity="error" sx={{ mx: 2, mt: 1 }}>{error}</Alert>}

        {/* Tab bar */}
        <Tabs
          value={detailTab}
          onChange={(_, v) => setDetailTab(v as typeof detailTab)}
          sx={{
            minHeight: 40, px: 2,
            '& .MuiTab-root': {
              fontWeight: 600, fontSize: 13,
              minHeight: 40, py: 0, px: 2,
              gap: 0.75,
            },
          }}
        >
          <Tab icon={<ViewListIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Mappool" value="mappool" />
          <Tab icon={<GroupIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Players" value="players" />
          <Tab icon={<AccountTreeIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Bracket" value="bracket" />
          <Tab icon={<DnsIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Slots" value="slots" />
          <Tab icon={<CampaignIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="News" value="news" />
          {isOwner && <Tab icon={<CodeIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Website (Soon)" value="website" disabled sx={{ opacity: 0.4 }} />}
          <Tab icon={<SettingsIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Settings" value="details" />
        </Tabs>

        {/* Tab content */}
        <Box sx={{ p: 2.5 }}>
        {/* Mappool */}
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

        {/* Players */}
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

        {/* Bracket */}
        {detailTab === 'bracket' && (
          <TournamentBracket
            tournamentAbbrev={tournament.abbreviation}
            isOwner={isOwner}
            players={players}
            bracketData={bracketData}
            onBracketChanged={setBracketData}
          />
        )}

        {/* Slots */}
        {detailTab === 'slots' && (
          <SlotsEditor
            tournament={tournament}
            slotConfigs={slotConfigs}
            isOwner={isOwner}
            onUpdated={handleTournamentChanged}
            onError={handleError}
          />
        )}

        {/* News */}
        {detailTab === 'news' && (
          <TournamentAnnouncements
            tournamentAbbrev={tournament.abbreviation}
            isOwner={isOwner}
            announcements={announcements}
            onAnnouncementsChanged={setAnnouncements}
          />
        )}

        {/* Website */}
        {detailTab === 'website' && isOwner && (
          <SiteSettings tournament={tournament} />
        )}

        {/* Settings */}
        {detailTab === 'details' && (
          <SettingsTab
            tournament={tournament}
            isOwner={isOwner}
            onTournamentChanged={handleTournamentChanged}
            onDeleted={onDeleted}
            onError={handleError}
          />
        )}
      </Box>
      </Box>
      </Card>

      {/* Paywall */}
      <PaywallDialog open={showPaywall} onClose={() => setShowPaywall(false)} />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity="info" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
