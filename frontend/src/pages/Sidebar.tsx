import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
  NavigationMenuContent,
} from '@/components/ui/navigation-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import {
  Home,
  Compass,
  Trophy,
  Folder,
  Plus,
  Heart,
  KeyRound,
  Menu,
  Moon,
  Sun,
  Palette,
} from 'lucide-react';
import PaletteEditor from '../features/dashboard/components/PaletteEditor';
import type { User, AuthMode } from '../features/auth/api/auth';
import { getLoginUrl } from '../features/auth/api/auth';

export const TOPNAV_HEIGHT = 56;

interface SidebarProps {
  user: User | null;
  authMode: AuthMode;
  keyName: string | null;
  permissions: string[];
  onLogout: () => void;
  onKeyLogin: (key: string) => Promise<void>;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenCreatePack: () => void;
}

export default function Sidebar({ user, authMode, keyName, permissions, onLogout, onKeyLogin, darkMode, onToggleDarkMode, onOpenCreatePack }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [keyError, setKeyError] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const isKey = authMode === 'key';

  const isActive = (path: string) => location.pathname === path;

  const handleLogin = () => {
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
    { path: '/', label: 'HOME', icon: <Home className="size-4" /> },
    { path: '/explore', label: 'EXPLORE', icon: <Compass className="size-4" /> },
    { path: '/tournaments', label: 'TOURNAMENTS', icon: <Trophy className="size-4" />, disabled: user?.username !== 'Kaiinu', soon: user?.username !== 'Kaiinu' },
    ...(user ? [{ path: '/my-packs', label: 'MY PACKS', icon: <Folder className="size-4" /> }] : []),
  ];

  // Key Login Dialog
  const keyDialog = (
    <Dialog open={keyDialogOpen} onOpenChange={(o) => { if (!o) { setKeyDialogOpen(false); setKeyInput(''); setKeyError(''); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign in with Access Key</DialogTitle>
          <DialogDescription>
            Enter an access key to sign in under someone's account with limited permissions.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Input
            autoFocus
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Paste your access key here"
            onKeyDown={(e) => { if (e.key === 'Enter') handleKeyLoginSubmit(); }}
            className="font-mono"
          />
          {keyError && <p className="text-sm text-destructive">{keyError}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setKeyDialogOpen(false); setKeyInput(''); setKeyError(''); }}>
            Cancel
          </Button>
          <Button onClick={handleKeyLoginSubmit} disabled={keyLoading || !keyInput.trim()}>
            {keyLoading ? <Spinner className="size-4" /> : 'Sign In'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // User account dropdown
  const userDropdown = user && (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5 px-1.5">
            <span className="text-sm font-semibold">{user.username}</span>
            {isKey && keyName && (
              <Badge className="h-[18px] text-[9px]">
                <KeyRound className="size-3" />
                {keyName}
              </Badge>
            )}
            <Avatar size="sm">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback>{user.username[0]}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-[200px]">
        {isKey ? (
          <>
            <div className="px-2 py-1.5">
              <p className="text-sm">Signed in via <b>{keyName}</b></p>
              <p className="text-xs text-muted-foreground">Using <b>{user.username}</b>'s account</p>
              {permissions.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {permissions.map((p) => (
                    <Badge key={p} variant="secondary" className="h-5 text-[10px]">{p}</Badge>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <DropdownMenuGroup>
            <DropdownMenuLabel>Signed in as <b>{user.username}</b></DropdownMenuLabel>
          </DropdownMenuGroup>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/dashboard')}>My Page</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/my-packs')}>My Packs</DropdownMenuItem>
        {!isKey && (
          <DropdownMenuItem onClick={() => navigate('/keys')}>
            <KeyRound className="size-4" />
            Access Keys
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => setPaletteOpen(true)}>
          <Palette className="size-4" />
          Theme
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onLogout}>
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Login dropdown
  const loginDropdown = !user && (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5 px-2">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/1/1e/Osu%21_Logo_2016.svg"
              alt=""
              className="size-4"
            />
            Sign in
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleLogin}>
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/1/1e/Osu%21_Logo_2016.svg"
            alt=""
            className="size-4"
          />
          Sign in with osu!
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setKeyDialogOpen(true)}>
          <KeyRound className="size-4" />
          Use access key
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Supporter dropdown
  const supporterDropdown = (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-xs" className="text-muted-foreground" />
              }
            >
              <Heart className="size-4" />
            </DropdownMenuTrigger>
          }
        >
          <Heart className="size-4" />
        </TooltipTrigger>
        <TooltipContent>Support packshare</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="min-w-[240px]">
        <div className="px-2 py-1.5">
          <p className="text-sm font-bold">Support packshare</p>
          <p className="text-xs text-muted-foreground">Help keep the project alive</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <div className="flex w-full items-center justify-between">
            <div>
              <p className="text-sm font-bold">Early Supporter</p>
              <p className="text-xs text-muted-foreground">Limited badge + name on wall</p>
            </div>
            <span className="text-sm font-bold text-primary">$5</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <div className="flex w-full items-center justify-between">
            <div>
              <p className="text-sm font-bold">Supporter Badge</p>
              <p className="text-xs text-muted-foreground">Show your support on profile</p>
            </div>
            <span className="text-sm font-bold text-primary">$3</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<a href="https://ko-fi.com/packshare" target="_blank" rel="noreferrer" />}
          className="text-muted-foreground"
        >
          Or donate any amount →
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Dark mode toggle
  const darkModeToggle = (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-xs" onClick={onToggleDarkMode} className="text-muted-foreground" />}>
        {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </TooltipTrigger>
      <TooltipContent>{darkMode ? 'Light mode' : 'Dark mode'}</TooltipContent>
    </Tooltip>
  );

  // --- MOBILE: hamburger + sheet ---
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (isMobile) {
    return (
      <>
        <div
          className="fixed inset-x-0 top-0 z-50 flex items-center border-b bg-background px-3"
          style={{ height: TOPNAV_HEIGHT }}
        >
          <Button variant="ghost" size="icon-xs" onClick={() => setMobileDrawer(true)} className="mr-2">
            <Menu className="size-5" />
          </Button>
          <Logo />
          <div className="flex-1" />
          {darkModeToggle}
          {user ? (
            <Button variant="ghost" size="icon-xs" onClick={() => {}}>
              <Avatar size="sm">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback>{user.username[0]}</AvatarFallback>
              </Avatar>
            </Button>
          ) : (
            loginDropdown
          )}
        </div>

        <Sheet open={mobileDrawer} onOpenChange={setMobileDrawer}>
          <SheetContent side="left" className="w-[260px] p-0">
            <div className="px-4 pt-4 pb-2">
              <Logo />
            </div>
            <Separator />
            <div className="flex flex-col py-1">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => { if (!item.disabled) { navigate(item.path); setMobileDrawer(false); } }}
                  disabled={item.disabled}
                  className={`flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  } ${item.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <span className={isActive(item.path) ? 'text-primary' : 'text-muted-foreground'}>
                    {item.icon}
                  </span>
                  {item.label}
                  {item.soon && (
                    <Badge className="ml-auto h-[18px] text-[9px]">Soon</Badge>
                  )}
                </button>
              ))}
            </div>
            <Separator />
            {(!isKey || permissions.includes('create')) && (
              <div className="p-4">
                <Button className="w-full" onClick={() => { onOpenCreatePack(); setMobileDrawer(false); }}>
                  <Plus className="size-4" />
                  Create Pack
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {userDropdown}
        {keyDialog}
      </>
    );
  }

  // --- DESKTOP: horizontal top bar ---
  return (
    <>
      <div
        className="fixed inset-x-0 top-0 z-50 flex items-center border-b bg-background px-6"
        style={{ height: TOPNAV_HEIGHT }}
      >
        {/* Left: logo */}
        <Logo />

        {/* Center: nav links */}
        <NavigationMenu className="ml-8">
          <NavigationMenuList>
            {/* Home — simple link */}
            <NavigationMenuItem>
              <NavigationMenuLink render={<Link to="/" />} active={isActive('/')}>
                HOME
              </NavigationMenuLink>
            </NavigationMenuItem>

            {/* Explore — dropdown */}
            <NavigationMenuItem>
              <NavigationMenuTrigger>EXPLORE</NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavigationMenuLink render={<Link to="/explore" />}>
                  <Compass />
                  Browse Packs
                </NavigationMenuLink>
                {(!isKey || permissions.includes('create')) && (
                  <NavigationMenuLink onClick={onOpenCreatePack} className="cursor-pointer">
                    <Plus />
                    Create Pack
                  </NavigationMenuLink>
                )}
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Tournaments — dropdown */}
            {user?.username === 'Kaiinu' && (
              <NavigationMenuItem>
                <NavigationMenuTrigger>TOURNAMENTS</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <NavigationMenuLink render={<Link to="/tournaments" />}>
                    <Trophy />
                    Browse Tournaments
                  </NavigationMenuLink>
                  <NavigationMenuLink render={<Link to="/dashboard" />} onClick={() => {}}>
                    <Plus />
                    Create Tournament
                  </NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>
            )}

            {/* My Packs — simple link */}
            {user && (
              <NavigationMenuItem>
                <NavigationMenuLink render={<Link to="/my-packs" />} active={isActive('/my-packs')}>
                  MY PACKS
                </NavigationMenuLink>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex-1" />

        {/* Right: actions */}
        <div className="flex items-center gap-1">
          {darkModeToggle}
          {supporterDropdown}

          {/* Create Pack — primary CTA */}
          {(!isKey || permissions.includes('create')) && (
            <Button size="sm" onClick={onOpenCreatePack} className="gap-1.5 px-3">
              <Plus className="size-4" />
              Create Pack
            </Button>
          )}

          {userDropdown}
          {loginDropdown}
        </div>
      </div>

      {keyDialog}
      <PaletteEditor open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}

function Logo() {
  return (
    <Link to="/" className="flex items-center text-lg font-bold no-underline">
      pack
      <span className="ml-1 rounded bg-primary px-1.5 py-0.5 text-sm text-primary-foreground">
        share
      </span>
    </Link>
  );
}
