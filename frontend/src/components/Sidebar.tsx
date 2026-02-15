import { useState } from 'react';
import {
  Box,
  Button,
  Avatar,
  Menu,
  MenuItem,
  Typography,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import ExploreIcon from '@mui/icons-material/Explore';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FolderIcon from '@mui/icons-material/Folder';
import AddIcon from '@mui/icons-material/Add';
import FavoriteIcon from '@mui/icons-material/Favorite';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import MenuIcon from '@mui/icons-material/Menu';
import type { User, AuthMode } from '../api/auth';
import { getLoginUrl } from '../api/auth';

const PINK = '#ff66ab';
const PINK_HOVER = '#ff4499';
const BLUE = '#4a9eff';
const BLUE_HOVER = '#3a8eef';

export const TOPNAV_HEIGHT = 56;

interface SidebarProps {
  user: User | null;
  authMode: AuthMode;
  keyName: string | null;
  permissions: string[];
  onLogout: () => void;
  onKeyLogin: (key: string) => Promise<void>;
}

export default function Sidebar({ user, authMode, keyName, permissions, onLogout, onKeyLogin }: SidebarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [supporterAnchor, setSupporterAnchor] = useState<null | HTMLElement>(null);
  const [loginAnchor, setLoginAnchor] = useState<null | HTMLElement>(null);
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [keyError, setKeyError] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState(false);

  const isKey = authMode === 'key';
  const accent = isKey ? BLUE : PINK;
  const accentHover = isKey ? BLUE_HOVER : PINK_HOVER;

  const isActive = (path: string) => location.pathname === path;

  const handleLogin = () => {
    setLoginAnchor(null);
    window.location.href = getLoginUrl();
  };

  const handleKeyLoginSubmit = async () => {
    if (!keyInput.trim()) return;
    setKeyLoading(true);
    setKeyError('');
    try {
      await onKeyLogin(keyInput.trim());
      setKeyDialogOpen(false);
      setKeyInput('');
    } catch (err: unknown) {
      setKeyError(err instanceof Error ? err.message : 'Invalid access key');
    } finally {
      setKeyLoading(false);
    }
  };

  const navItems = [
    { path: '/', label: 'HOME', icon: <HomeIcon /> },
    { path: '/explore', label: 'EXPLORE', icon: <ExploreIcon /> },
    { path: '/tournaments', label: 'TOURNAMENTS', icon: <EmojiEventsIcon />, disabled: true, soon: true },
    ...(user ? [{ path: '/my-packs', label: 'MY PACKS', icon: <FolderIcon /> }] : []),
  ];

  // Shared menus & dialogs (rendered once)
  const menusAndDialogs = (
    <>
      {/* Supporter Menu */}
      <Menu
        anchorEl={supporterAnchor}
        open={Boolean(supporterAnchor)}
        onClose={() => setSupporterAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 240, p: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="body2" fontWeight="bold">Support packshare</Typography>
          <Typography variant="caption" color="text.secondary">Help keep the project alive</Typography>
        </Box>
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={() => setSupporterAnchor(null)} sx={{ borderRadius: 1, mx: 0.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <Box>
              <Typography variant="body2" fontWeight="bold">Early Supporter</Typography>
              <Typography variant="caption" color="text.secondary">Limited badge + name on wall</Typography>
            </Box>
            <Typography variant="body2" fontWeight="bold" sx={{ color: accent }}>$5</Typography>
          </Box>
        </MenuItem>
        <MenuItem onClick={() => setSupporterAnchor(null)} sx={{ borderRadius: 1, mx: 0.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <Box>
              <Typography variant="body2" fontWeight="bold">Supporter Badge</Typography>
              <Typography variant="caption" color="text.secondary">Show your support on profile</Typography>
            </Box>
            <Typography variant="body2" fontWeight="bold" sx={{ color: accent }}>$3</Typography>
          </Box>
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem
          component="a"
          href="https://ko-fi.com/packshare"
          target="_blank"
          onClick={() => setSupporterAnchor(null)}
          sx={{ borderRadius: 1, mx: 0.5, color: 'text.secondary' }}
        >
          <Typography variant="body2">Or donate any amount →</Typography>
        </MenuItem>
      </Menu>

      {/* User Account Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {isKey ? (
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="body2">
              Signed in via <b>{keyName}</b>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Using <b>{user?.username}</b>'s account
            </Typography>
            {permissions.length > 0 && (
              <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {permissions.map((p) => (
                  <Chip key={p} label={p} size="small" sx={{ height: 20, fontSize: 10 }} />
                ))}
              </Box>
            )}
          </Box>
        ) : (
          user && (
            <MenuItem disabled>
              <Typography variant="body2">Signed in as <b>{user.username}</b></Typography>
            </MenuItem>
          )
        )}
        <Divider />
        <MenuItem onClick={() => { setAnchorEl(null); navigate('/my-packs'); }}>My Packs</MenuItem>
        {!isKey && (
          <MenuItem onClick={() => { setAnchorEl(null); navigate('/keys'); }}>
            <VpnKeyIcon sx={{ fontSize: 16, mr: 1 }} />
            Access Keys
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={() => { setAnchorEl(null); onLogout(); }} sx={{ color: 'error.main' }}>
          Sign Out
        </MenuItem>
      </Menu>

      {/* Login Menu */}
      <Menu
        anchorEl={loginAnchor}
        open={Boolean(loginAnchor)}
        onClose={() => setLoginAnchor(null)}
      >
        <MenuItem onClick={handleLogin}>
          <Box
            component="img"
            src="https://upload.wikimedia.org/wikipedia/commons/1/1e/Osu%21_Logo_2016.svg"
            sx={{ width: 16, height: 16, mr: 1 }}
          />
          Sign in with osu!
        </MenuItem>
        <MenuItem onClick={() => { setLoginAnchor(null); setKeyDialogOpen(true); }}>
          <VpnKeyIcon sx={{ fontSize: 16, mr: 1 }} />
          Use access key
        </MenuItem>
      </Menu>

      {/* Key Login Dialog */}
      <Dialog
        open={keyDialogOpen}
        onClose={() => { setKeyDialogOpen(false); setKeyInput(''); setKeyError(''); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Sign in with Access Key</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter an access key to sign in under someone's account with limited permissions.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Access Key"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            error={!!keyError}
            helperText={keyError}
            placeholder="Paste your access key here"
            onKeyDown={(e) => { if (e.key === 'Enter') handleKeyLoginSubmit(); }}
            slotProps={{ input: { sx: { fontFamily: 'monospace' } } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setKeyDialogOpen(false); setKeyInput(''); setKeyError(''); }}>
            Cancel
          </Button>
          <Button
            onClick={handleKeyLoginSubmit}
            variant="contained"
            disabled={keyLoading || !keyInput.trim()}
            sx={{ backgroundColor: BLUE, '&:hover': { backgroundColor: BLUE_HOVER } }}
          >
            {keyLoading ? <CircularProgress size={20} /> : 'Sign In'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );

  // --- MOBILE: hamburger + drawer ---
  if (isMobile) {
    return (
      <>
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: TOPNAV_HEIGHT,
            backgroundColor: 'white',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            px: 1.5,
            zIndex: 1100,
          }}
        >
          <IconButton onClick={() => setMobileDrawer(true)} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>
          <Logo accent={accent} />
          <Box sx={{ flex: 1 }} />
          {user ? (
            <Avatar
              src={user.avatar_url}
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ width: 32, height: 32, border: `2px solid ${accent}`, cursor: 'pointer' }}
            />
          ) : (
            <Button
              size="small"
              onClick={(e) => setLoginAnchor(e.currentTarget)}
              sx={{ color: 'text.primary', fontWeight: 600, fontSize: 13 }}
            >
              SIGN IN
            </Button>
          )}
        </Box>

        <Drawer
          open={mobileDrawer}
          onClose={() => setMobileDrawer(false)}
          slotProps={{ paper: { sx: { width: 260, pt: 2 } } }}
          ModalProps={{ keepMounted: true }}
        >
          <Box sx={{ px: 2, pb: 2 }}>
            <Logo accent={accent} />
          </Box>
          <Divider />
          <List>
            {navItems.map((item) => (
              <ListItemButton
                key={item.path}
                onClick={() => { if (!item.disabled) { navigate(item.path); setMobileDrawer(false); } }}
                disabled={item.disabled}
                selected={isActive(item.path)}
              >
                <ListItemIcon sx={{ minWidth: 36, color: isActive(item.path) ? accent : 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
                {item.soon && (
                  <Chip label="Soon" size="small" sx={{ height: 18, fontSize: 9, backgroundColor: accent, color: 'white' }} />
                )}
              </ListItemButton>
            ))}
          </List>
          <Divider />
          {(!isKey || permissions.includes('create')) && (
            <Box sx={{ p: 2 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => { navigate('/create'); setMobileDrawer(false); }}
                sx={{ backgroundColor: accent, '&:hover': { backgroundColor: accentHover } }}
              >
                Create Pack
              </Button>
            </Box>
          )}
        </Drawer>

        {menusAndDialogs}
      </>
    );
  }

  // --- DESKTOP: horizontal top bar ---
  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: TOPNAV_HEIGHT,
          backgroundColor: 'white',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          px: 3,
          zIndex: 1100,
        }}
      >
        {/* Left: logo */}
        <Logo accent={accent} />

        {/* Center: nav links */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 4 }}>
          {navItems.map((item) => (
            <Box key={item.path} sx={{ position: 'relative' }}>
              <Button
                component={item.disabled ? 'button' : Link}
                {...(!item.disabled ? { to: item.path } : {})}
                disabled={item.disabled}
                sx={{
                  color: isActive(item.path) ? accent : 'text.primary',
                  fontWeight: 600,
                  fontSize: 13,
                  letterSpacing: 0.5,
                  px: 1.5,
                  borderBottom: isActive(item.path) ? `2px solid ${accent}` : '2px solid transparent',
                  borderRadius: 0,
                  '&:hover': {
                    backgroundColor: 'transparent',
                    borderBottom: `2px solid ${accent}`,
                  },
                }}
              >
                {item.label}
              </Button>
              {item.soon && (
                <Chip
                  label="SOON"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: -2,
                    right: -8,
                    height: 14,
                    fontSize: 8,
                    fontWeight: 'bold',
                    backgroundColor: accent,
                    color: 'white',
                    '& .MuiChip-label': { px: 0.5 },
                  }}
                />
              )}
            </Box>
          ))}
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* Right: create, supporter, account */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Supporter heart */}
          <Box
            onClick={(e) => setSupporterAnchor(e.currentTarget)}
            sx={{
              cursor: 'pointer',
              opacity: 0.35,
              transition: 'opacity 0.2s',
              display: 'flex',
              '&:hover': { opacity: 1 },
            }}
          >
            <FavoriteIcon sx={{ fontSize: 18, color: accent }} />
          </Box>

          {/* Create Pack */}
          {(!isKey || permissions.includes('create')) && (
            <Button
              component={Link}
              to="/create"
              variant="contained"
              startIcon={<AddIcon />}
              size="small"
              sx={{
                backgroundColor: accent,
                color: 'white',
                '&:hover': { backgroundColor: accentHover },
                px: 2,
              }}
            >
              Create Pack
            </Button>
          )}

          {/* User / Sign in */}
          {user ? (
            <Box
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                border: '1px solid #e0e0e0',
                '&:hover': { borderColor: accent },
              }}
            >
              <Typography variant="body2" fontWeight={600} sx={{ color: 'text.primary' }}>
                {user.username}
              </Typography>
              {isKey && keyName && (
                <Chip
                  icon={<VpnKeyIcon sx={{ fontSize: 12 }} />}
                  label={keyName}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: 9,
                    backgroundColor: BLUE,
                    color: 'white',
                    '& .MuiChip-icon': { color: 'white' },
                  }}
                />
              )}
              <Avatar src={user.avatar_url} sx={{ width: 28, height: 28 }} />
            </Box>
          ) : (
            <Button
              size="small"
              onClick={(e) => setLoginAnchor(e.currentTarget)}
              startIcon={
                <Box
                  component="img"
                  src="https://upload.wikimedia.org/wikipedia/commons/1/1e/Osu%21_Logo_2016.svg"
                  sx={{ width: 16, height: 16 }}
                />
              }
              sx={{
                color: 'text.primary',
                fontWeight: 600,
                fontSize: 13,
                border: '1px solid #e0e0e0',
                px: 2,
                '&:hover': { borderColor: accent },
              }}
            >
              Sign in
            </Button>
          )}
        </Box>
      </Box>

      {menusAndDialogs}
    </>
  );
}

function Logo({ accent }: { accent: string }) {
  return (
    <Typography
      component={Link}
      to="/"
      sx={{
        fontWeight: 'bold',
        textDecoration: 'none',
        color: 'text.primary',
        display: 'flex',
        alignItems: 'center',
        fontSize: 18,
      }}
    >
      pack
      <Box
        component="span"
        sx={{
          backgroundColor: accent,
          color: 'white',
          px: 0.75,
          py: 0.25,
          borderRadius: 0.5,
          ml: 0.5,
          fontSize: 14,
        }}
      >
        share
      </Box>
    </Typography>
  );
}
