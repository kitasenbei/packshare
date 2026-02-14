import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  FormGroup,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
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
  const [copied, setCopied] = useState(false);

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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <VpnKeyIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Sign in to manage access keys
        </Typography>
      </Box>
    );
  }

  if (authMode === 'key') {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <VpnKeyIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Key management requires OAuth sign-in
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          You're currently signed in with an access key. Sign in with osu! to manage keys.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Access Keys
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Create access keys to let others act under your account with limited permissions.
        Keys can be used to sign in from other devices or shared with tournament staff.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* New key display */}
      {newKey && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          onClose={() => { setNewKey(null); setCopied(false); }}
          action={
            <Tooltip title={copied ? 'Copied!' : 'Copy key'}>
              <IconButton size="small" onClick={handleCopy}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          }
        >
          <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
            Key created! Copy it now — it won't be shown again.
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              backgroundColor: 'rgba(0,0,0,0.05)',
              p: 1,
              borderRadius: 1,
            }}
          >
            {newKey}
          </Typography>
        </Alert>
      )}

      {/* Create form */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          Create New Key
        </Typography>
        <TextField
          fullWidth
          label="Key Name"
          placeholder="e.g. Tournament Staff, Work PC"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
          size="small"
        />
        <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
          Permissions
        </Typography>
        <FormGroup row sx={{ mb: 2 }}>
          {PERMISSION_OPTIONS.map((opt) => (
            <FormControlLabel
              key={opt.value}
              control={
                <Checkbox
                  checked={selectedPerms.includes(opt.value)}
                  onChange={() => togglePerm(opt.value)}
                  size="small"
                />
              }
              label={
                <Box>
                  <Typography variant="body2">{opt.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{opt.description}</Typography>
                </Box>
              }
            />
          ))}
        </FormGroup>
        <TextField
          label="Expires in (days)"
          placeholder="Leave empty for no expiry"
          value={expiresInDays}
          onChange={(e) => setExpiresInDays(e.target.value.replace(/\D/g, ''))}
          size="small"
          sx={{ mb: 2, width: 200 }}
        />
        <Box>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !name.trim() || selectedPerms.length === 0}
            startIcon={creating ? <CircularProgress size={16} /> : <VpnKeyIcon />}
          >
            Create Key
          </Button>
        </Box>
      </Paper>

      {/* Key list */}
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
        Your Keys ({keys.length})
      </Typography>
      {keys.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">No access keys yet</Typography>
        </Paper>
      ) : (
        keys.map((key) => (
          <Paper key={key.id} sx={{ p: 2, mb: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <VpnKeyIcon sx={{ color: 'text.secondary' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" fontWeight="bold">
                {key.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                {key.permissions.map((p) => (
                  <Chip key={p} label={p} size="small" sx={{ height: 20, fontSize: 10 }} />
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Created {formatDate(key.created_at)}
                {key.last_used_at && ` · Last used ${formatDate(key.last_used_at)}`}
                {key.expires_at && ` · Expires ${formatDate(key.expires_at)}`}
              </Typography>
            </Box>
            <Tooltip title="Revoke key">
              <IconButton
                color="error"
                onClick={() => setDeleteTarget(key)}
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Paper>
        ))
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Revoke Access Key</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to revoke <b>{deleteTarget?.name}</b>? Anyone using this key will immediately lose access.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteTarget && handleRevoke(deleteTarget)}
          >
            Revoke
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
