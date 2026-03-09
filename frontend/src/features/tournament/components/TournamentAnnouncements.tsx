import { useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  IconButton,
  Card,
  CardContent,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CampaignIcon from '@mui/icons-material/Campaign';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';
import { uploadImage } from '../api/tournaments';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  image?: string;
  createdAt: string;
}

const STORAGE_PREFIX = 'packshare_announcements_';

function loadAnnouncements(abbrev: string): Announcement[] {
  const saved = localStorage.getItem(`${STORAGE_PREFIX}${abbrev}`);
  if (saved) {
    try { return JSON.parse(saved); } catch { /* fall through */ }
  }
  return [];
}

function saveAnnouncements(abbrev: string, data: Announcement[]) {
  localStorage.setItem(`${STORAGE_PREFIX}${abbrev}`, JSON.stringify(data));
}

interface TournamentAnnouncementsProps {
  tournamentAbbrev: string;
  isOwner: boolean;
}

export default function TournamentAnnouncements({ tournamentAbbrev, isOwner }: TournamentAnnouncementsProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => loadAnnouncements(tournamentAbbrev));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const persist = useCallback((next: Announcement[]) => {
    setAnnouncements(next);
    saveAnnouncements(tournamentAbbrev, next);
  }, [tournamentAbbrev]);

  const handleOpenNew = () => {
    setEditingId(null);
    setTitle('');
    setBody('');
    setImage(undefined);
    setDialogOpen(true);
  };

  const handleOpenEdit = (a: Announcement) => {
    setEditingId(a.id);
    setTitle(a.title);
    setBody(a.body);
    setImage(a.image);
    setDialogOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setImage(url);
    } catch {
      // silently fail
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle) return;

    if (editingId) {
      persist(announcements.map((a) =>
        a.id === editingId ? { ...a, title: trimmedTitle, body: trimmedBody, image } : a
      ));
    } else {
      const newAnnouncement: Announcement = {
        id: `ann_${Date.now()}`,
        title: trimmedTitle,
        body: trimmedBody,
        image,
        createdAt: new Date().toISOString(),
      };
      persist([newAnnouncement, ...announcements]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    persist(announcements.filter((a) => a.id !== id));
    setDeleteConfirm(null);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Stack spacing={2}>
      {isOwner && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleOpenNew}>
            New Announcement
          </Button>
        </Box>
      )}

      {announcements.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <CampaignIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.disabled">
            No announcements yet
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {announcements.map((a) => (
            <Card key={a.id} variant="outlined">
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={600}>{a.title}</Typography>
                    <Typography variant="caption" color="text.disabled">{formatDate(a.createdAt)}</Typography>
                  </Box>
                  {isOwner && (
                    <Stack direction="row" spacing={0.25}>
                      <IconButton size="small" onClick={() => handleOpenEdit(a)}
                        sx={{ color: 'text.disabled', '&:hover': { color: 'primary.main' } }}>
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => setDeleteConfirm(a.id)}
                        sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Stack>
                  )}
                </Box>
                {(a.body || a.image) && <Divider sx={{ my: 1 }} />}
                {a.image && (
                  <Box
                    component="img"
                    src={a.image}
                    sx={{ width: '100%', borderRadius: 1, mb: a.body ? 1 : 0 }}
                  />
                )}
                {a.body && (
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                    {a.body}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              size="small"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <TextField
              label="Body (optional)"
              size="small"
              fullWidth
              multiline
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your announcement..."
            />
            {image ? (
              <Box sx={{ position: 'relative' }}>
                <Box component="img" src={image} sx={{ width: '100%', borderRadius: 1 }} />
                <IconButton
                  size="small"
                  onClick={() => setImage(undefined)}
                  sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            ) : (
              <>
                <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                  style={{ display: 'none' }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ImageIcon />}
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading}
                  sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                >
                  {uploading ? 'Uploading...' : 'Upload Eyecatcher'}
                </Button>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!title.trim()}>
            {editingId ? 'Save' : 'Post'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs">
        <DialogTitle>Delete Announcement</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Are you sure? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
