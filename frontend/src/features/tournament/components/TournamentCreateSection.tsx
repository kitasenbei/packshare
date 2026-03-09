import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  CircularProgress,
  Alert,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  InputAdornment,
  Divider,
  Avatar,
  Breadcrumbs,
  Card,
  CardHeader,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Badge,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CloseIcon from '@mui/icons-material/Close';
import PaletteIcon from '@mui/icons-material/Palette';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ViewListIcon from '@mui/icons-material/ViewList';
import {
  createTournament,
  type Tournament,
  type CreateTournamentInput,
} from '../api/tournaments';
import ImageUpload from '../../../shared/components/ImageUpload';

const FORMATS = ['1v1', '2v2', '3v3', '4v4'];

const DEFAULT_STAGES = [
  'Qualifiers', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Finals', 'Grand Finals',
];

interface TournamentCreateSectionProps {
  onBack: () => void;
  onCreated: (t: Tournament) => void;
}

export default function TournamentCreateSection({
  onBack,
  onCreated,
}: TournamentCreateSectionProps) {
  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [format, setFormat] = useState('1v1');
  const [bannerUrl, setBannerUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [stages, setStages] = useState<string[]>([...DEFAULT_STAGES]);
  const [newStageName, setNewStageName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAddStage = () => {
    const trimmed = newStageName.trim();
    if (!trimmed) return;
    if (stages.length >= 20) { setError('Maximum 20 stages'); return; }
    setStages((prev) => [...prev, trimmed]);
    setNewStageName('');
  };

  const handleRemoveStage = (index: number) => {
    setStages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveStage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= stages.length) return;
    setStages((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError('Tournament name is required'); return; }
    if (!abbreviation.trim()) { setError('Abbreviation is required'); return; }
    if (stages.length === 0) { setError('At least one stage is required'); return; }

    setSaving(true);
    setError('');
    try {
      const input: CreateTournamentInput = {
        name: name.trim(),
        abbreviation: abbreviation.trim().toLowerCase(),
        format,
        banner_url: bannerUrl || undefined,
        logo_url: logoUrl || undefined,
        stages: stages.map((s) => ({ name: s })),
      };
      const created = await createTournament(input);
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tournament');
    }
    setSaving(false);
  };

  return (
    <>
      {/* Breadcrumb */}
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
          Create
        </Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Left: Form */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack spacing={2.5}>
            {/* Basic Info Card */}
            <Card variant="outlined">
              <CardHeader
                avatar={<Avatar sx={{ width: 34, height: 34, bgcolor: 'action.hover' }}><EmojiEventsIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></Avatar>}
                title="Basic Information"
                slotProps={{ title: { variant: 'subtitle2', fontWeight: 'bold' } }}
                sx={{ pb: 0 }}
              />
              <CardContent>
                <Stack spacing={2}>
                  <TextField
                    label="Tournament Name"
                    fullWidth
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. osu!mania World Cup 2025"
                  />
                  <TextField
                    label="Abbreviation"
                    fullWidth
                    value={abbreviation}
                    onChange={(e) => setAbbreviation(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                    placeholder="e.g. MWC-2025"
                    helperText={abbreviation ? `URL: /t/${abbreviation.toLowerCase()}` : 'Used in the tournament URL'}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">/t/</InputAdornment>,
                      },
                    }}
                  />
                  <FormControl fullWidth>
                    <InputLabel>Format</InputLabel>
                    <Select value={format} label="Format" onChange={(e) => setFormat(e.target.value)}>
                      {FORMATS.map((f) => (
                        <MenuItem key={f} value={f}>{f}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </CardContent>
            </Card>

            {/* Stages Card */}
            <Card variant="outlined">
              <CardHeader
                avatar={
                  <Badge badgeContent={stages.length} color="primary" showZero
                    sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 18, minWidth: 18 } }}>
                    <Avatar sx={{ width: 34, height: 34, bgcolor: 'action.hover' }}>
                      <ViewListIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    </Avatar>
                  </Badge>
                }
                title="Stages"
                subheader="Define the rounds of your tournament"
                slotProps={{
                  title: { variant: 'subtitle2', fontWeight: 'bold' },
                  subheader: { variant: 'caption' },
                }}
                sx={{ pb: 0 }}
              />
              <CardContent>
                <List dense disablePadding sx={{
                  border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', mb: 1.5,
                }}>
                  {stages.map((stage, i) => (
                    <ListItem
                      key={i}
                      divider={i < stages.length - 1}
                      sx={{ py: 0.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Avatar sx={{ width: 22, height: 22, fontSize: 10, fontWeight: 'bold', bgcolor: 'action.hover', color: 'text.secondary' }}>
                          {i + 1}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText primary={stage} slotProps={{ primary: { variant: 'body2' } }} />
                      <Stack direction="row" spacing={0.25}>
                        <IconButton size="small" onClick={() => handleMoveStage(i, -1)} disabled={i === 0}>
                          <Typography variant="caption">↑</Typography>
                        </IconButton>
                        <IconButton size="small" onClick={() => handleMoveStage(i, 1)} disabled={i === stages.length - 1}>
                          <Typography variant="caption">↓</Typography>
                        </IconButton>
                        <IconButton size="small" onClick={() => handleRemoveStage(i)}
                          sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                          <CloseIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Stack>
                    </ListItem>
                  ))}
                  {stages.length === 0 && (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.disabled">No stages added</Typography>
                    </Box>
                  )}
                </List>
                <Stack direction="row" spacing={1}>
                  <TextField
                    size="small"
                    placeholder="Add stage..."
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
                    sx={{ flex: 1 }}
                  />
                  <Button size="small" variant="outlined" onClick={handleAddStage} disabled={!newStageName.trim()}
                    startIcon={<AddIcon />}>
                    Add
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                size="large"
                onClick={handleCreate}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <EmojiEventsIcon />}
                sx={{ fontWeight: 'bold' }}
              >
                {saving ? 'Creating...' : 'Create Tournament'}
              </Button>
              <Button variant="outlined" onClick={onBack} disabled={saving}>Cancel</Button>
            </Stack>
          </Stack>
        </Box>

        {/* Right: Branding Card */}
        <Box sx={{ width: { xs: '100%', md: 300 }, flexShrink: 0 }}>
          <Card variant="outlined">
            <CardHeader
              avatar={<Avatar sx={{ width: 34, height: 34, bgcolor: 'action.hover' }}><PaletteIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></Avatar>}
              title="Branding"
              subheader="Optional — can be added later"
              slotProps={{
                title: { variant: 'subtitle2', fontWeight: 'bold' },
                subheader: { variant: 'caption' },
              }}
              sx={{ pb: 0 }}
            />
            <CardContent>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>Banner Image</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Recommended: 1200x300px
                  </Typography>
                  <ImageUpload
                    value={bannerUrl || undefined}
                    onChange={(url) => setBannerUrl(url || '')}
                    aspectRatio="4/1"
                  />
                </Box>
                <Divider />
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>Logo</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Recommended: 256x256px
                  </Typography>
                  <Box sx={{ maxWidth: 150 }}>
                    <ImageUpload
                      value={logoUrl || undefined}
                      onChange={(url) => setLogoUrl(url || '')}
                      aspectRatio="1/1"
                    />
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </>
  );
}
