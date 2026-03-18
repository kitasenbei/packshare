import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import PackViewer from './features/pack/components/PackViewer';
import PackCreator from './features/pack/components/PackCreator';
import SharedPack from './features/pack/components/SharedPack';
import MyPacks from './features/pack/components/MyPacks';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Tournaments from './features/tournament/components/Tournaments';
import TournamentMappool from './features/tournament/components/TournamentMappool';
import SiteRenderer from './features/tournament/components/SiteRenderer';
import SiteBuilder from './features/tournament/components/SiteBuilder';
import KeyManager from './features/auth/components/KeyManager';
import Dashboard from './features/dashboard/components/Dashboard';
import Sidebar, { TOPNAV_HEIGHT } from './pages/Sidebar';
import { loadSavedTheme } from './features/dashboard/components/PaletteEditor';

// Apply saved theme before first paint
loadSavedTheme();
import {
  initAuth,
  logout as authLogout,
  loginWithKey,
  getAuthError,
  type User,
  type AuthMode,
} from './features/auth/api/auth';

const DARK_MODE_KEY = 'packshare_dark_mode';

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

function SitePage() {
  const { subdomain } = useParams();
  if (!subdomain) return <NotFound />;
  return <SiteRenderer subdomain={subdomain} />;
}

function SiteEditorPage() {
  const { abbreviation } = useParams();
  if (!abbreviation) return <NotFound />;
  return <SiteBuilder abbreviation={abbreviation} />;
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="mb-2 text-[120px] font-bold leading-none text-primary">404</h1>
      <h2 className="mb-1 text-xl font-bold">Page not found</h2>
      <p className="mb-8 text-muted-foreground">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button onClick={() => navigate('/')} className="px-8 py-3">
        Go Home
      </Button>
    </div>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(DARK_MODE_KEY);
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('oauth');
  const [keyName, setKeyName] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [createPackOpen, setCreatePackOpen] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem(DARK_MODE_KEY, String(next));
      return next;
    });
  };

  // Apply dark class to html element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const authError = getAuthError();
    if (authError) {
      toast.error(authError);
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Clean pages without sidebar */}
        <Route path="/s/:packId" element={<SharedPackPage />} />
        <Route path="/t/:abbreviation" element={<TournamentMappoolPage user={user} />} />
        <Route path="/site/:subdomain" element={<SitePage />} />
        <Route path="/tournaments/:abbreviation/editor" element={<SiteEditorPage />} />

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
              onOpenCreatePack={() => setCreatePackOpen(true)}
            />
            <main
              className="min-h-screen bg-background"
              style={{ paddingTop: `${TOPNAV_HEIGHT}px` }}
            >
              <Routes>
                <Route path="/dashboard" element={
                  <>
                    <div className="overflow-hidden bg-[repeating-linear-gradient(-45deg,#000,#000_10px,#f5c842_10px,#f5c842_20px)] text-center">
                      <div className="bg-black/70 px-4 py-1.5">
                        <span className="text-xs font-bold text-[#f5c842]">
                          This part of the website is in beta — features may be incomplete or change without notice
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-1">
                      <Dashboard user={user} permissions={permissions} isKeySession={authMode === 'key'} onOpenCreatePack={() => setCreatePackOpen(true)} />
                    </div>
                  </>
                } />
                <Route path="*" element={
                  <div className="mx-auto max-w-5xl px-4 py-4">
                    <Routes>
                      <Route path="/" element={<Home user={user} onOpenCreatePack={() => setCreatePackOpen(true)} />} />
                      <Route path="/my-packs" element={<MyPacks user={user} permissions={permissions} isKeySession={authMode === 'key'} onOpenCreatePack={() => setCreatePackOpen(true)} />} />
                      <Route path="/explore" element={<Explore />} />
                      <Route path="/tournaments" element={user?.username === 'Kaiinu' ? <Tournaments user={user} /> : <NotFound />} />
                      <Route path="/keys" element={<KeyManager user={user} authMode={authMode} />} />
                      <Route path="/pack/:packId" element={<PackPage />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </div>
                } />
              </Routes>
            </main>
          </>
        } />
      </Routes>

      <PackCreator
        open={createPackOpen}
        onOpenChange={setCreatePackOpen}
        user={user}
        permissions={permissions}
        isKeySession={authMode === 'key'}
      />
      <Toaster richColors position="top-center" />
    </BrowserRouter>
  );
}

export default App;
