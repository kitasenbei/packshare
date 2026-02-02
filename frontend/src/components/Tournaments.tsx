import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PeopleIcon from '@mui/icons-material/People';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LinkIcon from '@mui/icons-material/Link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ImageUpload from './ImageUpload';

interface Tournament {
  id: string;
  name: string;
  banner: string;
  logo: string;
  stages: string[];
  currentStage: string;
  teams: number;
  format: string;
  status: 'live' | 'upcoming' | 'completed';
  isUserCreated?: boolean;
}

const defaultTournaments: Tournament[] = [
  {
    id: 'owc2024',
    name: 'osu! World Cup 2024',
    banner: 'https://picsum.photos/seed/owc/800/200',
    logo: 'https://picsum.photos/seed/owclogo/100/100',
    stages: ['Qualifiers', 'RO32', 'RO16', 'Quarterfinals', 'Semifinals', 'Finals', 'Grand Finals'],
    currentStage: 'Grand Finals',
    teams: 32,
    format: '4v4',
    status: 'live',
  },
  {
    id: 'mwc2024',
    name: '4K Mania World Cup 2024',
    banner: 'https://picsum.photos/seed/mwc/800/200',
    logo: 'https://picsum.photos/seed/mwclogo/100/100',
    stages: ['Qualifiers', 'RO16', 'Quarterfinals', 'Semifinals', 'Finals'],
    currentStage: 'Semifinals',
    teams: 24,
    format: '3v3',
    status: 'live',
  },
  {
    id: 'community-cup',
    name: 'Community Cup #12',
    banner: 'https://picsum.photos/seed/cc/800/200',
    logo: 'https://picsum.photos/seed/cclogo/100/100',
    stages: ['Qualifiers', 'RO16', 'Quarterfinals', 'Finals'],
    currentStage: 'Qualifiers',
    teams: 16,
    format: '1v1',
    status: 'upcoming',
  },
];

const STORAGE_KEY = 'packshare_tournaments';

const steps = ['Tournament Info', 'Stages', 'Extras', 'Payment'];

interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  popular?: boolean;
}

const addOns: AddOn[] = [
  { id: 'white-label', name: 'White Label', description: 'Remove "hosted on packshare" branding', price: 10, popular: true },
  { id: 'custom-url', name: 'Custom URL', description: 'packshare.io/your-tournament-name', price: 3 },
  { id: 'animated-banner', name: 'Animated Banner', description: 'Support for GIF/video banners', price: 5 },
  { id: 'stats', name: 'Stats Dashboard', description: 'Track views, downloads, and engagement', price: 3, popular: true },
  { id: 'priority-support', name: 'Priority Support', description: 'Direct Discord support channel', price: 5 },
  { id: 'supporter-badge', name: 'Supporter Badge', description: 'Show your support on your profile', price: 5 },
];

export default function Tournaments() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return [...JSON.parse(saved), ...defaultTournaments];
      } catch {
        return defaultTournaments;
      }
    }
    return defaultTournaments;
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [tournamentName, setTournamentName] = useState('');
  const [format, setFormat] = useState('1v1');
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [selectedStages, setSelectedStages] = useState(['Qualifiers', 'RO16', 'Quarterfinals', 'Semifinals', 'Finals', 'Grand Finals']);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [createdId, setCreatedId] = useState('');

  const basePrice = 5;
  const addOnsTotal = selectedAddOns.reduce((sum, id) => {
    const addon = addOns.find(a => a.id === id);
    return sum + (addon?.price || 0);
  }, 0);
  const totalPrice = basePrice + addOnsTotal;

  const saveUserTournaments = (allTournaments: Tournament[]) => {
    const userTournaments = allTournaments.filter(t => t.isUserCreated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userTournaments));
  };

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      // Mock payment success
      const newId = tournamentName.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(2, 6);

      const newTournament: Tournament = {
        id: newId,
        name: tournamentName,
        banner: bannerUrl || `https://picsum.photos/seed/${newId}/800/200`,
        logo: logoUrl || `https://picsum.photos/seed/${newId}logo/100/100`,
        stages: selectedStages,
        currentStage: selectedStages[0],
        teams: 0,
        format,
        status: 'upcoming',
        isUserCreated: true,
      };

      const updated = [newTournament, ...tournaments];
      setTournaments(updated);
      saveUserTournaments(updated);

      setCreatedId(newId);
      setActiveStep(activeStep + 1);
    } else {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setActiveStep(0);
    setTournamentName('');
    setBannerUrl(null);
    setLogoUrl(null);
    setSelectedAddOns([]);
    setCreatedId('');
  };

  const toggleAddOn = (id: string) => {
    if (selectedAddOns.includes(id)) {
      setSelectedAddOns(selectedAddOns.filter(a => a !== id));
    } else {
      setSelectedAddOns([...selectedAddOns, id]);
    }
  };

  const handleOpenTournament = (id: string) => {
    navigate(`/t/${id}`);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Tournament Mappools
          </Typography>
          <Typography color="text.secondary">
            Host and share professional tournament mappools
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ backgroundColor: '#ff66ab', '&:hover': { backgroundColor: '#ff4499' } }}
        >
          Create Tournament
        </Button>
      </Box>

      {/* Pricing Banner */}
      <Paper
        sx={{
          p: 3,
          mb: 4,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: 'white',
          borderRadius: 3,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Tournament Hosting
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Custom branding, all stages, shareable links, download stats
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h5" fontWeight="bold">
                $5
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.6 }}>
                per tournament
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={() => setDialogOpen(true)}
              sx={{ backgroundColor: '#ff66ab', '&:hover': { backgroundColor: '#ff4499' } }}
            >
              Get Started
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Tournament List */}
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
        Active Tournaments
      </Typography>
      <Stack spacing={2}>
        {tournaments.map((tournament) => (
          <Card
            key={tournament.id}
            onClick={() => handleOpenTournament(tournament.id)}
            sx={{
              overflow: 'hidden',
              cursor: 'pointer',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
              transition: 'all 0.2s',
            }}
          >
            {/* Banner */}
            <Box
              sx={{
                height: 100,
                backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.3)), url(${tournament.banner})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                px: 3,
                gap: 2,
              }}
            >
              <Avatar
                src={tournament.logo}
                sx={{ width: 64, height: 64, border: '3px solid white' }}
              />
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {tournament.name}
                  </Typography>
                  {tournament.status === 'live' && (
                    <Chip
                      label="LIVE"
                      size="small"
                      sx={{ backgroundColor: '#ff4444', color: 'white', fontWeight: 'bold', fontSize: 10 }}
                    />
                  )}
                  {tournament.status === 'upcoming' && (
                    <Chip
                      label="UPCOMING"
                      size="small"
                      sx={{ backgroundColor: '#4488ff', color: 'white', fontWeight: 'bold', fontSize: 10 }}
                    />
                  )}
                </Stack>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  {tournament.format} · {tournament.teams} teams
                </Typography>
              </Box>
              <Chip
                label={tournament.currentStage}
                sx={{ backgroundColor: '#ff66ab', color: 'white', fontWeight: 'bold' }}
              />
            </Box>

            {/* Stages */}
            <CardContent sx={{ py: 2 }}>
              <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                {tournament.stages.map((stage) => (
                  <Chip
                    key={stage}
                    label={stage}
                    size="small"
                    variant={stage === tournament.currentStage ? 'filled' : 'outlined'}
                    sx={stage === tournament.currentStage ? {
                      backgroundColor: '#ff66ab',
                      color: 'white',
                    } : {}}
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Features */}
      <Typography variant="h6" fontWeight="bold" sx={{ mt: 4, mb: 2 }}>
        What's Included
      </Typography>
      <Stack direction="row" spacing={2}>
        {[
          { icon: <EmojiEventsIcon />, title: 'Custom Branding', desc: 'Your logo, colors, banner' },
          { icon: <PeopleIcon />, title: 'Team Access', desc: 'Let staff manage pools' },
          { icon: <CalendarTodayIcon />, title: 'All Stages', desc: 'Qualifiers to Grand Finals' },
        ].map((feature) => (
          <Paper key={feature.title} sx={{ p: 2, flex: 1, textAlign: 'center' }}>
            <Box sx={{ color: '#ff66ab', mb: 1 }}>{feature.icon}</Box>
            <Typography fontWeight="bold">{feature.title}</Typography>
            <Typography variant="body2" color="text.secondary">{feature.desc}</Typography>
          </Paper>
        ))}
      </Stack>

      {/* Create Tournament Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {activeStep < steps.length ? 'Create Tournament' : 'Tournament Created!'}
        </DialogTitle>
        <DialogContent>
          {activeStep < steps.length && (
            <Stepper activeStep={activeStep} sx={{ mt: 2, mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          )}

          {activeStep === 0 && (
            <Stack spacing={3}>
              <TextField
                label="Tournament Name"
                fullWidth
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="e.g. Community Cup 2024"
              />
              <FormControl fullWidth>
                <InputLabel>Format</InputLabel>
                <Select value={format} label="Format" onChange={(e) => setFormat(e.target.value)}>
                  <MenuItem value="1v1">1v1</MenuItem>
                  <MenuItem value="2v2">2v2</MenuItem>
                  <MenuItem value="3v3">3v3</MenuItem>
                  <MenuItem value="4v4">4v4</MenuItem>
                </Select>
              </FormControl>
              <ImageUpload
                label="Banner Image (optional)"
                value={bannerUrl || undefined}
                onChange={(url) => setBannerUrl(url)}
                aspectRatio="4/1"
              />
              <ImageUpload
                label="Logo (optional)"
                value={logoUrl || undefined}
                onChange={(url) => setLogoUrl(url)}
                aspectRatio="1/1"
              />
            </Stack>
          )}

          {activeStep === 1 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select the stages for your tournament:
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {['Qualifiers', 'Group Stage', 'RO64', 'RO32', 'RO16', 'Quarterfinals', 'Semifinals', 'Finals', 'Grand Finals'].map((stage) => (
                  <Chip
                    key={stage}
                    label={stage}
                    onClick={() => {
                      if (selectedStages.includes(stage)) {
                        setSelectedStages(selectedStages.filter(s => s !== stage));
                      } else {
                        setSelectedStages([...selectedStages, stage]);
                      }
                    }}
                    color={selectedStages.includes(stage) ? 'primary' : 'default'}
                    variant={selectedStages.includes(stage) ? 'filled' : 'outlined'}
                    sx={selectedStages.includes(stage) ? { backgroundColor: '#ff66ab' } : {}}
                  />
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {selectedStages.length} stages selected
              </Typography>
            </Stack>
          )}

          {activeStep === 2 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Power up your tournament with extras:
              </Typography>
              {addOns.map((addon) => (
                <Paper
                  key={addon.id}
                  onClick={() => toggleAddOn(addon.id)}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: selectedAddOns.includes(addon.id) ? '#ff66ab' : 'transparent',
                    backgroundColor: selectedAddOns.includes(addon.id) ? 'rgba(255,102,171,0.05)' : '#f5f5f5',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: '#ff66ab' },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight="bold">{addon.name}</Typography>
                        {addon.popular && (
                          <Chip label="Popular" size="small" sx={{ backgroundColor: '#ff66ab', color: 'white', fontSize: 10, height: 20 }} />
                        )}
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {addon.description}
                      </Typography>
                    </Box>
                    <Typography fontWeight="bold" sx={{ color: '#ff66ab', ml: 2 }}>
                      +${addon.price}
                    </Typography>
                  </Box>
                </Paper>
              ))}
              {selectedAddOns.length > 0 && (
                <Box sx={{ textAlign: 'right', mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {selectedAddOns.length} extra{selectedAddOns.length > 1 ? 's' : ''} selected (+${addOnsTotal})
                  </Typography>
                </Box>
              )}
            </Stack>
          )}

          {activeStep === 3 && (
            <Stack spacing={3}>
              <Paper sx={{ p: 3, backgroundColor: '#f5f5f5' }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Order Summary
                </Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Tournament Hosting</Typography>
                    <Typography>${basePrice}.00</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary" variant="body2">{tournamentName} · {format} · {selectedStages.length} stages</Typography>
                  </Box>
                  {selectedAddOns.length > 0 && (
                    <>
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                        <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>Extras</Typography>
                      </Box>
                      {selectedAddOns.map(id => {
                        const addon = addOns.find(a => a.id === id);
                        return addon ? (
                          <Box key={id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">{addon.name}</Typography>
                            <Typography variant="body2">${addon.price}.00</Typography>
                          </Box>
                        ) : null;
                      })}
                    </>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '1px solid #ddd' }}>
                    <Typography fontWeight="bold">Total</Typography>
                    <Typography fontWeight="bold" sx={{ color: '#ff66ab', fontSize: 20 }}>${totalPrice}.00</Typography>
                  </Box>
                </Stack>
              </Paper>
              <Typography variant="caption" color="text.secondary" textAlign="center">
                This is a demo - no actual payment will be processed
              </Typography>
            </Stack>
          )}

          {activeStep === steps.length && (
            <Stack spacing={3} alignItems="center" sx={{ py: 2 }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: '#4caf50' }} />
              <Typography variant="h6" textAlign="center">
                Your tournament is ready!
              </Typography>
              <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', width: '100%' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Share this link with your players:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinkIcon color="action" />
                  <Typography sx={{ fontFamily: 'monospace', flex: 1 }}>
                    {window.location.origin}/t/{createdId}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/t/${createdId}`)}
                  >
                    Copy
                  </Button>
                </Box>
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          {activeStep < steps.length ? (
            <>
              <Button onClick={handleClose}>Cancel</Button>
              <Box sx={{ flex: 1 }} />
              {activeStep > 0 && (
                <Button onClick={handleBack}>Back</Button>
              )}
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={activeStep === 0 && !tournamentName.trim()}
                sx={{ backgroundColor: '#ff66ab', '&:hover': { backgroundColor: '#ff4499' } }}
              >
                {activeStep === steps.length - 1 ? `Pay $${totalPrice}` : activeStep === 2 ? (selectedAddOns.length > 0 ? `Continue with ${selectedAddOns.length} extra${selectedAddOns.length > 1 ? 's' : ''}` : 'Skip Extras') : 'Next'}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleClose}>Close</Button>
              <Button
                variant="contained"
                component={Link}
                to={`/t/${createdId}`}
                sx={{ backgroundColor: '#ff66ab', '&:hover': { backgroundColor: '#ff4499' } }}
              >
                View Tournament
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
