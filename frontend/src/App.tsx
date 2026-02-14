import { useState, useEffect, useMemo } from 'react';
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
} from '@mui/material';
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import PackCreator from './components/PackCreator';
import PackViewer from './components/PackViewer';
import SharedPack from './components/SharedPack';
import MyPacks from './components/MyPacks';
import Home from './components/Home';
import Explore from './components/Explore';
import Tournaments from './components/Tournaments';
import TournamentMappool from './components/TournamentMappool';
import KeyManager from './components/KeyManager';
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';
import ExploreIcon from '@mui/icons-material/Explore';
import HomeIcon from '@mui/icons-material/Home';
import FavoriteIcon from '@mui/icons-material/Favorite';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import {
  initAuth,
  getLoginUrl,
  logout as authLogout,
  loginWithKey,
  getAuthError,
  type User,
  type AuthMode,
} from './api/auth';

const PINK = '#ff66ab';
const PINK_HOVER = '#ff4499';
const BLUE = '#4a9eff';
const BLUE_HOVER = '#3a8eef';

function makeTheme(accent: string) {
  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: accent,
      },
      background: {
        default: '#f0f2f5',
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
    },
  });
}

interface BottomNavProps {
  user: User | null;
  authMode: AuthMode;
  keyName: string | null;
  permissions: string[];
  onLogout: () => void;
  onKeyLogin: (key: string) => Promise<void>;
}

function BottomNav({ user, authMode, keyName, permissions, onLogout, onKeyLogin }: BottomNavProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [supporterAnchor, setSupporterAnchor] = useState<null | HTMLElement>(null);
  const [loginAnchor, setLoginAnchor] = useState<null | HTMLElement>(null);
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [keyError, setKeyError] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isKey = authMode === 'key';
  const accent = isKey ? BLUE : PINK;
  const accentHover = isKey ? BLUE_HOVER : PINK_HOVER;

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

  const isActive = (path: string) => location.pathname === path;

  const NavButton = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
    <Button
      component={Link}
      to={to}
      sx={{
        flexDirection: 'column',
        minWidth: 70,
        color: isActive(to) ? accent : 'white',
        '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
      }}
    >
      {icon}
      <Typography variant="caption" sx={{ mt: 0.5 }}>{label}</Typography>
    </Button>
  );

  return (
    <>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#1a1a2e',
          borderRadius: 4,
          px: 3,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          zIndex: 1000,
        }}
      >
        {/* Logo */}
        <Typography
          component={Link}
          to="/"
          sx={{
            fontWeight: 'bold',
            textDecoration: 'none',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            mr: 2,
          }}
        >
          pack
          <Box
            component="span"
            sx={{
              backgroundColor: accent,
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

        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />

        {/* Nav Items */}
        <NavButton to="/" icon={<HomeIcon />} label="Home" />
        <NavButton to="/explore" icon={<ExploreIcon />} label="Explore" />
        <Box
          sx={{
            flexDirection: 'column',
            minWidth: 70,
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            opacity: 0.4,
            cursor: 'not-allowed',
          }}
        >
          <EmojiEventsIcon sx={{ color: 'white' }} />
          <Typography variant="caption" sx={{ mt: 0.5, color: 'white' }}>Tournaments</Typography>
          <Box
            sx={{
              position: 'absolute',
              top: -4,
              right: 2,
              backgroundColor: accent,
              color: 'white',
              fontSize: 8,
              fontWeight: 'bold',
              px: 0.5,
              py: 0.15,
              borderRadius: 0.5,
              textTransform: 'uppercase',
            }}
          >
            Soon
          </Box>
        </Box>
        {user && <NavButton to="/my-packs" icon={<FolderIcon />} label="My Packs" />}

        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />

        {/* Create Button */}
        {(!isKey || permissions.includes('create')) && (
          <Button
            component={Link}
            to="/create"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              backgroundColor: accent,
              color: 'white',
              '&:hover': { backgroundColor: accentHover },
              px: 2,
            }}
          >
            Add Pack
          </Button>
        )}

        {/* Supporter - subtle heart */}
        <Box
          onClick={(e) => setSupporterAnchor(e.currentTarget)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            opacity: 0.4,
            transition: 'all 0.2s',
            '&:hover': { opacity: 1 },
          }}
        >
          <FavoriteIcon sx={{ fontSize: 16, color: accent }} />
        </Box>
        <Menu
          anchorEl={supporterAnchor}
          open={Boolean(supporterAnchor)}
          onClose={() => setSupporterAnchor(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          slotProps={{ paper: { sx: { minWidth: 240, p: 1 } } }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="body2" fontWeight="bold">Support packshare</Typography>
            <Typography variant="caption" color="text.secondary">Help keep the project alive</Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <MenuItem
            onClick={() => { setSupporterAnchor(null); }}
            sx={{ borderRadius: 1, mx: 0.5 }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" fontWeight="bold">Early Supporter</Typography>
                <Typography variant="caption" color="text.secondary">Limited badge + name on wall</Typography>
              </Box>
              <Typography variant="body2" fontWeight="bold" sx={{ color: accent }}>$5</Typography>
            </Box>
          </MenuItem>
          <MenuItem
            onClick={() => { setSupporterAnchor(null); }}
            sx={{ borderRadius: 1, mx: 0.5 }}
          >
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

        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />

        {/* User */}
        {user ? (
          <>
            <Box
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 1, px: 1 }}
            >
              <Avatar src={user.avatar_url} sx={{ width: 32, height: 32, border: `2px solid ${accent}` }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold', lineHeight: 1.2 }}>
                  {user.username}
                </Typography>
                {isKey && keyName && (
                  <Chip
                    icon={<VpnKeyIcon sx={{ fontSize: 12 }} />}
                    label={keyName}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: 9,
                      backgroundColor: BLUE,
                      color: 'white',
                      '& .MuiChip-icon': { color: 'white' },
                    }}
                  />
                )}
              </Box>
            </Box>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
              transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
              {isKey ? (
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="body2">
                    Signed in via <b>{keyName}</b>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Using <b>{user.username}</b>'s account
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
                <MenuItem disabled>
                  <Typography variant="body2">Signed in as <b>{user.username}</b></Typography>
                </MenuItem>
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
          </>
        ) : (
          <>
            <Button
              variant="outlined"
              size="small"
              onClick={(e) => setLoginAnchor(e.currentTarget)}
              startIcon={
                <Box
                  component="img"
                  src="https://upload.wikimedia.org/wikipedia/commons/1/1e/Osu%21_Logo_2016.svg"
                  sx={{ width: 16, height: 16 }}
                />
              }
              sx={{ borderColor: 'white', color: 'white', '&:hover': { borderColor: accent } }}
            >
              Sign in
            </Button>
            <Menu
              anchorEl={loginAnchor}
              open={Boolean(loginAnchor)}
              onClose={() => setLoginAnchor(null)}
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
              transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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
          </>
        )}
      </Paper>

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
}

function PackPage() {
  const { packId } = useParams();
  return <PackViewer packId={packId} />;
}

function SharedPackPage() {
  const { packId } = useParams();
  return <SharedPack packId={packId} />;
}

function TournamentMappoolPage() {
  const { tournamentId } = useParams();
  return <TournamentMappool tournamentId={tournamentId} />;
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
      }}
    >
      <Typography variant="h1" sx={{ fontSize: 120, fontWeight: 'bold', color: 'primary.main', mb: 2 }}>
        404
      </Typography>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>
        Page not found
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        The page you're looking for doesn't exist or has been moved.
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate('/')}
        sx={{ px: 4, py: 1.5 }}
      >
        Go Home
      </Button>
    </Box>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('oauth');
  const [keyName, setKeyName] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const accent = authMode === 'key' ? BLUE : PINK;

  const theme = useMemo(() => makeTheme(accent), [accent]);

  useEffect(() => {
    // Check for auth error in URL
    const authError = getAuthError();
    if (authError) {
      setError(authError);
    }

    // Initialize auth (check URL token or stored token)
    initAuth().then((authState) => {
      setUser(authState.user);
      setAuthMode(authState.authMode);
      setKeyName(authState.keyName);
      setPermissions(authState.permissions);
      setLoading(false);
    });
  }, []);

  const handleLogout = () => {
    authLogout();
    setUser(null);
    setAuthMode('oauth');
    setKeyName(null);
    setPermissions([]);
  };

  const handleKeyLogin = async (key: string) => {
    const authState = await loginWithKey(key);
    setUser(authState.user);
    setAuthMode(authState.authMode);
    setKeyName(authState.keyName);
    setPermissions(authState.permissions);
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: 'background.default',
          }}
        >
          <CircularProgress sx={{ color: accent }} />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* Clean pages without checkerboard */}
          <Route path="/s/:packId" element={<SharedPackPage />} />
          <Route path="/t/:tournamentId" element={<TournamentMappoolPage />} />

          {/* Main app with checkerboard */}
          <Route path="*" element={
            <Box sx={{
              minHeight: '100vh',
              backgroundColor: 'background.default',
              pb: 12,
              backgroundImage: `
                linear-gradient(45deg, rgba(0,0,0,0.02) 25%, transparent 25%),
                linear-gradient(-45deg, rgba(0,0,0,0.02) 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.02) 75%),
                linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.02) 75%)
              `,
              backgroundSize: '40px 40px',
              backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px',
            }}>
              <Container maxWidth="lg" sx={{ py: 4 }}>
                <Routes>
                  <Route path="/" element={<Home user={user} />} />
                  <Route path="/create" element={<PackCreator user={user} permissions={permissions} isKeySession={authMode === 'key'} />} />
                  <Route path="/my-packs" element={<MyPacks user={user} permissions={permissions} isKeySession={authMode === 'key'} />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/tournaments" element={<Tournaments />} />
                  <Route path="/keys" element={<KeyManager user={user} authMode={authMode} />} />
                  <Route path="/pack/:packId" element={<PackPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Container>
              <BottomNav
                user={user}
                authMode={authMode}
                keyName={keyName}
                permissions={permissions}
                onLogout={handleLogout}
                onKeyLogin={handleKeyLogin}
              />
            </Box>
          } />
        </Routes>
      </BrowserRouter>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;
