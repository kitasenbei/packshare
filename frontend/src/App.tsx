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
  useMediaQuery,
} from '@mui/material';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import PackCreator from './features/pack/components/PackCreator';
import PackViewer from './features/pack/components/PackViewer';
import SharedPack from './features/pack/components/SharedPack';
import MyPacks from './features/pack/components/MyPacks';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Tournaments from './features/tournament/components/Tournaments';
import TournamentMappool from './features/tournament/components/TournamentMappool';
import KeyManager from './features/auth/components/KeyManager';
import Dashboard from './features/dashboard/components/Dashboard';
import Sidebar, { TOPNAV_HEIGHT } from './pages/Sidebar';
import {
  initAuth,
  logout as authLogout,
  loginWithKey,
  getAuthError,
  type User,
  type AuthMode,
} from './features/auth/api/auth';

import {
  ACCENT, ACCENT_HOVER, KEY_ACCENT, KEY_ACCENT_HOVER,
  backgrounds, text as themeText, divider as themeDivider,
} from './shared/theme/palette';

const DARK_MODE_KEY = 'packshare_dark_mode';

function makeTheme(accent: string, accentHover: string, darkMode: boolean) {
  const mode = darkMode ? 'dark' : 'light';
  return createTheme({
    palette: {
      mode,
      primary: {
        main: accent,
        dark: accentHover,
      },
      background: backgrounds[mode],
      text: themeText[mode],
      divider: themeDivider[mode],
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
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundImage: 'none',
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

function TournamentMappoolPage({ user }: { user: User | null }) {
  const { abbreviation } = useParams();
  return <TournamentMappool abbreviation={abbreviation} user={user} />;
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
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(DARK_MODE_KEY);
    if (saved !== null) return saved === 'true';
    return prefersDark;
  });
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('oauth');
  const [keyName, setKeyName] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const accent = authMode === 'key' ? KEY_ACCENT : ACCENT;

  const accentHover = authMode === 'key' ? KEY_ACCENT_HOVER : ACCENT_HOVER;
  const theme = useMemo(() => makeTheme(accent, accentHover, darkMode), [accent, accentHover, darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem(DARK_MODE_KEY, String(next));
      return next;
    });
  };

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
          <Route path="/t/:abbreviation" element={<TournamentMappoolPage user={user} />} />

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
                darkMode={darkMode}
                onToggleDarkMode={toggleDarkMode}
              />
              <Box
                component="main"
                sx={{
                  pt: `${TOPNAV_HEIGHT}px`,
                  minHeight: '100vh',
                  backgroundColor: 'background.default',
                }}
              >
                <Routes>
                  <Route path="/dashboard" element={
                    <Box sx={{ pt: 4, pb: 4, px: { xs: 2, md: 4 }, display: 'flex', flex: 1 }}>
                      <Dashboard user={user} permissions={permissions} isKeySession={authMode === 'key'} />
                    </Box>
                  } />
                  <Route path="*" element={
                    <Container maxWidth="lg" sx={{ py: 4 }}>
                      <Routes>
                        <Route path="/" element={<Home user={user} />} />
                        <Route path="/create" element={<PackCreator user={user} permissions={permissions} isKeySession={authMode === 'key'} />} />
                        <Route path="/my-packs" element={<MyPacks user={user} permissions={permissions} isKeySession={authMode === 'key'} />} />
                        <Route path="/explore" element={<Explore />} />
                        <Route path="/tournaments" element={user?.username === 'Kaiinu' ? <Tournaments user={user} /> : <NotFound />} />
                        <Route path="/keys" element={<KeyManager user={user} authMode={authMode} />} />
                        <Route path="/pack/:packId" element={<PackPage />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Container>
                  } />
                </Routes>
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
