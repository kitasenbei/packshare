import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Trash2, Copy, KeyRound } from 'lucide-react';
import { type User, type AuthMode } from '../api/auth';
import { createKey, listKeys, revokeKey, type AccessKey } from '../api/keys';

interface KeyManagerProps {
  user: User | null;
  authMode: AuthMode;
}

const PERMISSION_OPTIONS = [
  { value: 'create', label: 'Create', description: 'Create new packs' },
  { value: 'edit', label: 'Edit', description: 'Edit existing packs' },
  { value: 'delete', label: 'Delete', description: 'Delete packs' },
];

export default function KeyManager({ user, authMode }: KeyManagerProps) {
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create form
  const [name, setName] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>(['create', 'edit']);
  const [expiresInDays, setExpiresInDays] = useState('');
  const [creating, setCreating] = useState(false);

  // Newly created key display
  const [newKey, setNewKey] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<AccessKey | null>(null);

  useEffect(() => {
    if (user && authMode === 'oauth') {
      loadKeys();
    } else {
      setLoading(false);
    }
  }, [user, authMode]);

  const loadKeys = async () => {
    try {
      const data = await listKeys();
      setKeys(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || selectedPerms.length === 0) return;
    setCreating(true);
    setError('');
    try {
      const days = expiresInDays ? parseInt(expiresInDays) : undefined;
      const result = await createKey(name.trim(), selectedPerms, days);
      setNewKey(result.key);
      setName('');
      setExpiresInDays('');
      await loadKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (key: AccessKey) => {
    setDeleteTarget(null);
    try {
      await revokeKey(key.id);
      setKeys((prev) => prev.filter((k) => k.id !== key.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to revoke key');
    }
  };

  const handleCopy = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      toast.success('Key copied!');
    }
  };

  const togglePerm = (perm: string) => {
    setSelectedPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!user) {
    return (
      <div className="py-16 text-center">
        <KeyRound className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h2 className="text-lg text-muted-foreground">Sign in to manage access keys</h2>
      </div>
    );
  }

  if (authMode === 'key') {
    return (
      <div className="py-16 text-center">
        <KeyRound className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h2 className="text-lg text-muted-foreground">Key management requires OAuth sign-in</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You're currently signed in with an access key. Sign in with osu! to manage keys.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">Access Keys</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Create access keys to let others act under your account with limited permissions.
        Keys can be used to sign in from other devices or shared with tournament staff.
      </p>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* New key display */}
      {newKey && (
        <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold">Key created! Copy it now — it won't be shown again.</p>
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon-xs" onClick={handleCopy} />}>
                <Copy className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Copy key</TooltipContent>
            </Tooltip>
          </div>
          <code className="block break-all rounded bg-black/5 p-2 text-sm dark:bg-white/5">
            {newKey}
          </code>
          <button
            onClick={() => setNewKey(null)}
            className="mt-2 text-xs text-muted-foreground hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      <Card className="mb-6 p-6">
        <h3 className="mb-4 font-bold">Create New Key</h3>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Key Name</label>
          <Input
            placeholder="e.g. Tournament Staff, Work PC"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="mb-2 block text-sm font-bold">Permissions</label>
          <div className="flex flex-wrap gap-4">
            {PERMISSION_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedPerms.includes(opt.value)}
                  onCheckedChange={() => togglePerm(opt.value)}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-sm">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground">{opt.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Expires in (days)</label>
          <Input
            placeholder="Leave empty for no expiry"
            value={expiresInDays}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpiresInDays(e.target.value.replace(/\D/g, ''))}
            className="w-[200px]"
          />
        </div>
        <Button
          onClick={handleCreate}
          disabled={creating || !name.trim() || selectedPerms.length === 0}
        >
          {creating ? <Spinner className="size-4" /> : <KeyRound className="size-4" />}
          Create Key
        </Button>
      </Card>

      {/* Key list */}
      <h3 className="mb-4 font-bold">Your Keys ({keys.length})</h3>
      {keys.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">No access keys yet</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {keys.map((key) => (
            <Card key={key.id} className="flex items-center gap-3 p-4">
              <KeyRound className="size-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-bold">{key.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {key.permissions.map((p) => (
                    <Badge key={p} variant="secondary" className="h-5 text-[10px]">{p}</Badge>
                  ))}
                </div>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Created {formatDate(key.created_at)}
                  {key.last_used_at && ` · Last used ${formatDate(key.last_used_at)}`}
                  {key.expires_at && ` · Expires ${formatDate(key.expires_at)}`}
                </span>
              </div>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setDeleteTarget(key)}
                      className="text-destructive"
                    />
                  }
                >
                  <Trash2 className="size-4" />
                </TooltipTrigger>
                <TooltipContent>Revoke key</TooltipContent>
              </Tooltip>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Revoke Access Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke <b>{deleteTarget?.name}</b>? Anyone using this key will immediately lose access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleRevoke(deleteTarget)}
            >
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
