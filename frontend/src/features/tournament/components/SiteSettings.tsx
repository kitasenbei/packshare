import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Avatar,
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import PublishIcon from '@mui/icons-material/Publish';
import UnpublishedIcon from '@mui/icons-material/Unpublished';
import SaveIcon from '@mui/icons-material/Save';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WebIcon from '@mui/icons-material/Web';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import {
  getSite,
  saveSite,
  publishSite,
  deleteSite,
  type Tournament,
  type TournamentSite,
} from '../api/tournaments';

interface SiteSettingsProps {
  tournament: Tournament;
}

export default function SiteSettings({ tournament }: SiteSettingsProps) {
  const navigate = useNavigate();
  const [site, setSite] = useState<TournamentSite | null>(null);
  const [subdomain, setSubdomain] = useState(tournament.abbreviation.toLowerCase());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [subdomainDirty, setSubdomainDirty] = useState(false);

  useEffect(() => {
    getSite(tournament.abbreviation).then((s) => {
      if (s) {
        setSite(s);
        setSubdomain(s.subdomain || tournament.abbreviation.toLowerCase());
      }
    }).finally(() => setLoading(false));
  }, [tournament.abbreviation]);

  const handleSaveSubdomain = async () => {
    setSaving(true);
    setError('');
    try {
      const config = site?.config || JSON.stringify({
        theme: { primaryColor: '#52796f', backgroundColor: '#2f3e46', textColor: '#cad2c5', fontFamily: 'Inter, sans-serif' },
        pages: [
          { id: 'home', name: 'Home', path: '/', sections: [
            { id: 's1', type: 'hero', props: { showLogo: true, showName: true, showStatus: true } },
            { id: 's2', type: 'announcements', props: { limit: 5 } },
          ]},
          { id: 'players', name: 'Players', path: '/players', sections: [
            { id: 's3', type: 'players', props: { showSeeds: true, showAvatars: true } },
          ]},
          { id: 'mappool', name: 'Mappool', path: '/mappool', sections: [
            { id: 's4', type: 'mappool', props: { stage: '' } },
          ]},
        ],
      });
      const saved = await saveSite(tournament.abbreviation, { subdomain, config });
      setSite(saved);
      setSubdomainDirty(false);
      setSuccess('Subdomain saved!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!site) {
      await handleSaveSubdomain();
    }
    setPublishing(true);
    setError('');
    try {
      const updated = await publishSite(tournament.abbreviation, !site?.published);
      setSite(updated);
      setSuccess(updated.published ? 'Site published!' : 'Site unpublished');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete your site? This removes all pages and sections.')) return;
    setDeleting(true);
    setError('');
    try {
      await deleteSite(tournament.abbreviation);
      setSite(null);
      setSubdomain(tournament.abbreviation.toLowerCase());
      setSuccess('Site deleted');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  const hasSite = !!site;
  const pageCount = (() => {
    if (!site?.config) return 0;
    try { return JSON.parse(site.config).pages?.length || 0; } catch { return 0; }
  })();
  const sectionCount = (() => {
    if (!site?.config) return 0;
    try {
      const cfg = JSON.parse(site.config);
      return (cfg.pages || []).reduce((sum: number, p: { sections?: unknown[] }) => sum + (p.sections?.length || 0), 0);
    } catch { return 0; }
  })();

  return (
    <Stack spacing={2.5}>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Hero card */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
              <WebIcon sx={{ fontSize: 22 }} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">Tournament Website</Typography>
              <Typography variant="body2" color="text.secondary">
                {hasSite ? 'Your site is configured' : 'Create a website for your tournament'}
              </Typography>
            </Box>
            {site?.published && (
              <Chip
                icon={<LanguageIcon sx={{ fontSize: '14px !important' }} />}
                label="Live"
                size="small"
                color="success"
                sx={{ height: 24, fontSize: 11, fontWeight: 600 }}
              />
            )}
          </Box>

          {/* Stats row */}
          {hasSite && (
            <>
              <Divider />
              <Box sx={{ display: 'flex', gap: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Pages</Typography>
                  <Typography variant="h6" fontWeight="bold">{pageCount}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Sections</Typography>
                  <Typography variant="h6" fontWeight="bold">{sectionCount}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Typography variant="h6" fontWeight="bold" color={site?.published ? 'success.main' : 'text.secondary'}>
                    {site?.published ? 'Published' : 'Draft'}
                  </Typography>
                </Box>
              </Box>
            </>
          )}

          <Divider />

          {/* Subdomain */}
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Subdomain</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                size="small"
                value={subdomain}
                onChange={(e) => { setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSubdomainDirty(true); }}
                sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: 13, fontFamily: 'monospace' } }}
                placeholder={tournament.abbreviation.toLowerCase()}
              />
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: 12, flexShrink: 0 }}>
                .packshare.gg
              </Typography>
              {subdomainDirty && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<SaveIcon sx={{ fontSize: 14 }} />}
                  onClick={handleSaveSubdomain}
                  disabled={saving || !subdomain.trim()}
                  sx={{ fontSize: 11, flexShrink: 0 }}
                >
                  {saving ? '...' : 'Save'}
                </Button>
              )}
            </Box>
          </Box>

          {/* Actions */}
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/tournaments/${tournament.abbreviation}/editor`)}
            >
              {hasSite ? 'Open Editor' : 'Create Site'}
            </Button>

            {hasSite && (
              <Button
                variant={site?.published ? 'outlined' : 'contained'}
                color={site?.published ? 'warning' : 'success'}
                startIcon={site?.published ? <UnpublishedIcon /> : <PublishIcon />}
                onClick={handlePublish}
                disabled={publishing}
              >
                {publishing ? '...' : site?.published ? 'Unpublish' : 'Publish'}
              </Button>
            )}

            {site?.published && site.subdomain && (
              <Button
                variant="outlined"
                startIcon={<OpenInNewIcon />}
                href={`/site/${site.subdomain}`}
                target="_blank"
              >
                View Site
              </Button>
            )}

            {hasSite && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
                disabled={deleting}
                sx={{ ml: 'auto !important' }}
              >
                {deleting ? '...' : 'Delete Site'}
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
