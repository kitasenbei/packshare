import { useState, useEffect, useMemo } from 'react';
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import PackCreator from './components/PackCreator';
import PackViewer from './components/PackViewer';
import SharedPack from './components/SharedPack';
import MyPacks from './components/MyPacks';
import Home from './components/Home';
import Explore from './components/Explore';
import Tournaments from './components/Tournaments';
import TournamentMappool from './components/TournamentMappool';
import KeyManager from './components/KeyManager';
import Sidebar, { TOPNAV_HEIGHT } from './components/Sidebar';
import {
  initAuth,
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

function makeTheme(accent: string, accentHover: string) {
  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: accent,
        dark: accentHover,
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

  const accentHover = authMode === 'key' ? BLUE_HOVER : PINK_HOVER;
  const theme = useMemo(() => makeTheme(accent, accentHover), [accent, accentHover]);

  useEffect(() => {
    const authError = getAuthError();
    if (authError) {
      setError(authError);
    }

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
          {/* Clean pages without sidebar */}
          <Route path="/s/:packId" element={<SharedPackPage />} />
          <Route path="/t/:tournamentId" element={<TournamentMappoolPage />} />

          {/* Main app with top navbar */}
          <Route path="*" element={
            <>
              <Sidebar
                user={user}
                authMode={authMode}
                keyName={keyName}
                permissions={permissions}
                onLogout={handleLogout}
                onKeyLogin={handleKeyLogin}
              />
              <Box
                component="main"
                sx={{
                  pt: `${TOPNAV_HEIGHT}px`,
                  minHeight: '100vh',
                  backgroundColor: 'background.default',
                  backgroundImage: `
                    linear-gradient(45deg, rgba(0,0,0,0.02) 25%, transparent 25%),
                    linear-gradient(-45deg, rgba(0,0,0,0.02) 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.02) 75%),
                    linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.02) 75%)
                  `,
                  backgroundSize: '40px 40px',
                  backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px',
                }}
              >
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
              </Box>
            </>
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
