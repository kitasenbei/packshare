import {
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  Dialog,
  DialogContent,
  DialogActions,
  Divider,
  Paper,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import StarIcon from '@mui/icons-material/Star';
import BoltIcon from '@mui/icons-material/Bolt';
import DiamondIcon from '@mui/icons-material/Diamond';
import GroupIcon from '@mui/icons-material/Group';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PaletteIcon from '@mui/icons-material/Palette';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import BarChartIcon from '@mui/icons-material/BarChart';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CodeIcon from '@mui/icons-material/Code';
import DnsIcon from '@mui/icons-material/Dns';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';

interface PaywallDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function PaywallDialog({ open, onClose }: PaywallDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: 3, overflow: 'hidden' } },
      }}
    >
      <Box sx={{
        background: 'linear-gradient(0deg, rgba(132,169,140,0.15) 0%, rgba(132,169,140,0.03) 100%)',
        px: 4, pt: 4, pb: 2, textAlign: 'center',
      }}>
        <RocketLaunchIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
          Upgrade to go Live
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your tournament is ready. Choose a plan to publish it and make it accessible to players.
        </Typography>
      </Box>
      <DialogContent sx={{ px: 4, py: 3 }}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
          gap: 2,
        }}>
          {/* Free tier */}
          <Paper sx={{
            p: 2.5, border: '1px solid', borderColor: 'divider',
            display: 'flex', flexDirection: 'column',
          }}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>Starter</Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
              <Typography variant="h4" fontWeight="bold">Free</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>For casual tournaments</Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1} sx={{ flex: 1, mb: 2 }}>
              {['Up to 8 players', '1 active tournament', 'Basic bracket', 'Community support'].map((f) => (
                <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  <Typography variant="body2">{f}</Typography>
                </Box>
              ))}
              {['Custom branding', 'Live streaming', 'Analytics'].map((f) => (
                <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.4 }}>
                  <CloseIcon sx={{ fontSize: 16 }} />
                  <Typography variant="body2">{f}</Typography>
                </Box>
              ))}
            </Stack>
            <Button variant="outlined" fullWidth sx={{ textTransform: 'none' }}>
              Current Plan
            </Button>
          </Paper>

          {/* Pro tier */}
          <Paper sx={{
            p: 2.5,
            border: '2px solid', borderColor: 'primary.main',
            display: 'flex', flexDirection: 'column',
            position: 'relative',
          }}>
            <Chip
              label="POPULAR"
              size="small"
              sx={{
                position: 'absolute', top: -12, right: 16,
                backgroundColor: 'primary.main', color: 'white',
                fontWeight: 'bold', fontSize: 10, height: 22,
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <BoltIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="overline" color="primary.main" sx={{ letterSpacing: 1.5, fontWeight: 'bold' }}>Pro</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
              <Typography variant="h4" fontWeight="bold">$100</Typography>
              <Typography variant="body2" color="text.secondary">/mo</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>For serious organizers</Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1} sx={{ flex: 1, mb: 2 }}>
              {([
                { icon: <GroupIcon sx={{ fontSize: 16 }} />, text: 'Up to 64 players' },
                { icon: <EmojiEventsIcon sx={{ fontSize: 16 }} />, text: '5 active tournaments' },
                { icon: <AccountTreeIcon sx={{ fontSize: 16 }} />, text: 'Single & double elimination' },
                { icon: <PaletteIcon sx={{ fontSize: 16 }} />, text: 'Custom branding' },
                { icon: <SupportAgentIcon sx={{ fontSize: 16 }} />, text: 'Priority support' },
                { icon: <BarChartIcon sx={{ fontSize: 16 }} />, text: 'Mappool analytics' },
              ] as const).map((f) => (
                <Box key={f.text} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ color: 'primary.main', display: 'flex' }}>{f.icon}</Box>
                  <Typography variant="body2">{f.text}</Typography>
                </Box>
              ))}
            </Stack>
            <Button
              variant="contained"
              fullWidth
              startIcon={<StarIcon />}
              sx={{ fontWeight: 'bold' }}
            >
              Upgrade to Pro
            </Button>
          </Paper>

          {/* Enterprise tier */}
          <Paper sx={{
            p: 2.5, border: '1px solid', borderColor: 'divider',
            display: 'flex', flexDirection: 'column',
            background: 'linear-gradient(180deg, rgba(245,200,66,0.04) 0%, transparent 100%)',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <DiamondIcon sx={{ fontSize: 18, color: '#f5c842' }} />
              <Typography variant="overline" sx={{ letterSpacing: 1.5, fontWeight: 'bold', color: '#f5c842' }}>Enterprise</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
              <Typography variant="h4" fontWeight="bold">$500</Typography>
              <Typography variant="body2" color="text.secondary">/mo</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>For leagues & organizations</Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1} sx={{ flex: 1, mb: 2 }}>
              {([
                { icon: <AllInclusiveIcon sx={{ fontSize: 16 }} />, text: 'Unlimited players' },
                { icon: <EmojiEventsIcon sx={{ fontSize: 16 }} />, text: 'Unlimited tournaments' },
                { icon: <AccountTreeIcon sx={{ fontSize: 16 }} />, text: 'All bracket formats' },
                { icon: <WorkspacePremiumIcon sx={{ fontSize: 16 }} />, text: 'White-label branding' },
                { icon: <LiveTvIcon sx={{ fontSize: 16 }} />, text: 'Live streaming overlay' },
                { icon: <CodeIcon sx={{ fontSize: 16 }} />, text: 'API access' },
                { icon: <SupportAgentIcon sx={{ fontSize: 16 }} />, text: 'Dedicated support' },
                { icon: <DnsIcon sx={{ fontSize: 16 }} />, text: 'Custom domain' },
              ] as const).map((f) => (
                <Box key={f.text} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ color: '#f5c842', display: 'flex' }}>{f.icon}</Box>
                  <Typography variant="body2">{f.text}</Typography>
                </Box>
              ))}
            </Stack>
            <Button
              variant="outlined"
              fullWidth
              sx={{
                fontWeight: 'bold',
                borderColor: '#f5c842', color: '#f5c842',
                '&:hover': { backgroundColor: 'rgba(245,200,66,0.08)', borderColor: '#f5c842' },
              }}
            >
              Contact Sales
            </Button>
          </Paper>
        </Box>

        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 2.5 }}>
          All plans include SSL, 99.9% uptime SLA, and automatic backups. Cancel anytime.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 4, pb: 3, justifyContent: 'center' }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>
          Maybe later
        </Button>
      </DialogActions>
    </Dialog>
  );
}
