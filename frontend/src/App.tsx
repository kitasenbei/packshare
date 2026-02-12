import { useState, useEffect } from 'react';
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
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';
import ExploreIcon from '@mui/icons-material/Explore';
import HomeIcon from '@mui/icons-material/Home';
import FavoriteIcon from '@mui/icons-material/Favorite';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import {
  initAuth,
  getLoginUrl,
  logout as authLogout,
  getAuthError,
  type User,
} from './api/auth';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#ff66ab',
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

function BottomNav({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [supporterAnchor, setSupporterAnchor] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = () => {
    // Redirect to osu! OAuth
    window.location.href = getLoginUrl();
  };

  const isActive = (path: string) => location.pathname === path;

  const NavButton = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
    <Button
      component={Link}
      to={to}
      sx={{
        flexDirection: 'column',
        minWidth: 70,
        color: isActive(to) ? '#ff66ab' : 'white',
        '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
      }}
    >
      {icon}
      <Typography variant="caption" sx={{ mt: 0.5 }}>{label}</Typography>
    </Button>
  );

  return (
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
            backgroundColor: '#ff66ab',
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
            backgroundColor: '#ff66ab',
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
      <Button
        component={Link}
        to="/create"
        variant="contained"
        startIcon={<AddIcon />}
        sx={{
          backgroundColor: '#ff66ab',
          color: 'white',
          '&:hover': { backgroundColor: '#ff4499' },
          px: 2,
        }}
      >
        Add Pack
      </Button>

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
        <FavoriteIcon sx={{ fontSize: 16, color: '#ff66ab' }} />
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
            <Typography variant="body2" fontWeight="bold" sx={{ color: '#ff66ab' }}>$5</Typography>
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
            <Typography variant="body2" fontWeight="bold" sx={{ color: '#ff66ab' }}>$3</Typography>
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
            <Avatar src={user.avatar_url} sx={{ width: 32, height: 32, border: '2px solid #ff66ab' }} />
            <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
              {user.username}
            </Typography>
          </Box>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <MenuItem disabled>
              <Typography variant="body2">Signed in as <b>{user.username}</b></Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/my-packs'); }}>My Packs</MenuItem>
            <Divider />
            <MenuItem onClick={() => { setAnchorEl(null); onLogout(); }} sx={{ color: 'error.main' }}>
              Sign Out
            </MenuItem>
          </Menu>
        </>
      ) : (
        <Button
          variant="outlined"
          size="small"
          onClick={handleLogin}
          startIcon={
            <Box
              component="img"
              src="https://upload.wikimedia.org/wikipedia/commons/1/1e/Osu%21_Logo_2016.svg"
              sx={{ width: 16, height: 16 }}
            />
          }
          sx={{ borderColor: 'white', color: 'white', '&:hover': { borderColor: '#ff66ab' } }}
        >
          Sign in
        </Button>
      )}
    </Paper>
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
      <Typography variant="h1" sx={{ fontSize: 120, fontWeight: 'bold', color: '#ff66ab', mb: 2 }}>
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
        sx={{
          backgroundColor: '#ff66ab',
          '&:hover': { backgroundColor: '#ff4499' },
          px: 4,
          py: 1.5,
        }}
      >
        Go Home
      </Button>
    </Box>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for auth error in URL
    const authError = getAuthError();
    if (authError) {
      setError(authError);
    }

    // Initialize auth (check URL token or stored token)
    initAuth().then((authState) => {
      setUser(authState.user);
      setLoading(false);
    });
  }, []);

  const handleLogout = () => {
    authLogout();
    setUser(null);
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
          <CircularProgress sx={{ color: '#ff66ab' }} />
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
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            }}>
              <Container maxWidth="lg" sx={{ py: 4 }}>
                <Routes>
                  <Route path="/" element={<Home user={user} />} />
                  <Route path="/create" element={<PackCreator user={user} />} />
                  <Route path="/my-packs" element={<MyPacks user={user} />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/tournaments" element={<Tournaments />} />
                  <Route path="/pack/:packId" element={<PackPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Container>
              <BottomNav user={user} onLogout={handleLogout} />
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
