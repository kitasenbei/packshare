import { useState, useRef } from 'react';
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
import {
  uploadImage,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  type TournamentAnnouncement,
} from '../api/tournaments';

export interface Announcement {
  id: number;
  title: string;
  body: string;
  image?: string;
  createdAt: string;
}

export function toAnnouncements(apiAnnouncements?: TournamentAnnouncement[]): Announcement[] {
  return (apiAnnouncements || []).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    image: a.image,
    createdAt: a.created_at,
  }));
}

interface TournamentAnnouncementsProps {
  tournamentAbbrev: string;
  isOwner: boolean;
  announcements: Announcement[];
  onAnnouncementsChanged: (announcements: Announcement[]) => void;
}

export default function TournamentAnnouncements({
  tournamentAbbrev,
  isOwner,
  announcements,
  onAnnouncementsChanged,
}: TournamentAnnouncementsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle) return;

    setSaving(true);
    try {
      if (editingId) {
        const updated = await updateAnnouncement(tournamentAbbrev, editingId, {
          title: trimmedTitle,
          body: trimmedBody,
          image,
        });
        onAnnouncementsChanged(announcements.map((a) =>
          a.id === editingId ? { id: updated.id, title: updated.title, body: updated.body, image: updated.image, createdAt: updated.created_at } : a
        ));
      } else {
        const created = await createAnnouncement(tournamentAbbrev, {
          title: trimmedTitle,
          body: trimmedBody,
          image,
        });
        onAnnouncementsChanged([
          { id: created.id, title: created.title, body: created.body, image: created.image, createdAt: created.created_at },
          ...announcements,
        ]);
      }
      setDialogOpen(false);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAnnouncement(tournamentAbbrev, id);
      onAnnouncementsChanged(announcements.filter((a) => a.id !== id));
    } catch {
      // silently fail
    }
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
          <Button variant="contained" onClick={handleSave} disabled={!title.trim() || saving}>
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
