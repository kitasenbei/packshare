import { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import {
  Box,
  Typography,
  Button,
  Stack,
  IconButton,
  Dialog,
  DialogContent,
  DialogActions,
  Card,
  CardHeader,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupIcon from '@mui/icons-material/Group';
import ViewListIcon from '@mui/icons-material/ViewList';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ImageIcon from '@mui/icons-material/Image';
import {
  updateTournament,
  deleteTournament,
  uploadImage,
  type Tournament,
} from '../api/tournaments';
import { placeholderBanner, placeholderLogo } from '../utils/placeholders';
import TournamentStatus from './TournamentStatus';

interface SettingsTabProps {
  tournament: Tournament;
  isOwner: boolean;
  onTournamentChanged: (t: Tournament) => void;
  onDeleted: () => void;
  onError: (msg: string) => void;
}

export default function SettingsTab({
  tournament,
  isOwner,
  onTournamentChanged,
  onDeleted,
  onError,
}: SettingsTabProps) {
  const stages = tournament.stages ?? [];
  const totalMaps = stages.reduce((sum, s) => sum + (s.maps?.length ?? 0), 0);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Image crop state
  const [imageModal, setImageModal] = useState<'banner' | 'logo' | null>(null);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [cropUploading, setCropUploading] = useState(false);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleStatusChange = async (status: string) => {
    try {
      const updated = await updateTournament(tournament.abbreviation, { status });
      onTournamentChanged(updated);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleBannerFile = async (file: File) => {
    try {
      const url = await uploadImage(file);
      const updated = await updateTournament(tournament.abbreviation, { banner_url: url });
      onTournamentChanged(updated);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to upload banner');
    }
  };

  const handleLogoFile = async (file: File) => {
    try {
      const url = await uploadImage(file);
      const updated = await updateTournament(tournament.abbreviation, { logo_url: url });
      onTournamentChanged(updated);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to upload logo');
    }
  };

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedArea(croppedPixels);
  }, []);

  const startCrop = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedArea(null);
    };
    reader.readAsDataURL(file);
  };

  const applyCrop = async () => {
    if (!cropImage || !croppedArea || !imageModal) return;
    setCropUploading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = croppedArea.width;
      canvas.height = croppedArea.height;
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = cropImage;
      });
      ctx.drawImage(img, croppedArea.x, croppedArea.y, croppedArea.width, croppedArea.height, 0, 0, croppedArea.width, croppedArea.height);
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9));
      const croppedFile = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
      if (imageModal === 'banner') await handleBannerFile(croppedFile);
      else await handleLogoFile(croppedFile);
      setCropImage(null);
      setImageModal(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to crop image');
    } finally {
      setCropUploading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTournament(tournament.abbreviation);
      onDeleted();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete');
    }
    setDeleting(false);
  };

  return (
    <>
      <Stack spacing={2}>
        {/* Status */}
        {isOwner && (
          <TournamentStatus value={tournament.status as 'upcoming' | 'live' | 'completed'} onChange={handleStatusChange} />
        )}

        {/* Branding */}
        {isOwner && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <Box>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => bannerInputRef.current?.click()}
                startIcon={<ImageIcon />}
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              >
                {tournament.banner_url ? 'Change Banner' : 'Upload Banner'}
              </Button>
            </Box>
            <Box>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => logoInputRef.current?.click()}
                startIcon={<ImageIcon />}
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              >
                {tournament.logo_url ? 'Change Logo' : 'Upload Logo'}
              </Button>
            </Box>
          </Box>
        )}

        {/* Info */}
        <Card variant="outlined">
          <CardHeader
            avatar={<InfoOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />}
            title="Information"
            slotProps={{ title: { variant: 'subtitle2', fontWeight: 'bold' } }}
            sx={{ pb: 0 }}
          />
          <CardContent sx={{ pt: 1 }}>
            <List dense disablePadding>
              {[
                { icon: <LinkIcon sx={{ fontSize: 18 }} />, label: 'Abbreviation', value: tournament.abbreviation, mono: true },
                { icon: <GroupIcon sx={{ fontSize: 18 }} />, label: 'Format', value: tournament.format },
                { icon: <ViewListIcon sx={{ fontSize: 18 }} />, label: 'Stages', value: stages.length.toString() },
                { icon: <EmojiEventsIcon sx={{ fontSize: 18 }} />, label: 'Total Maps', value: totalMaps.toString() },
                { icon: <OpenInNewIcon sx={{ fontSize: 18 }} />, label: 'Public URL', value: `${window.location.origin}/t/${tournament.abbreviation}`, mono: true },
              ].map((row, i) => (
                <ListItem
                  key={row.label}
                  divider={i < 4}
                  sx={{ px: 0 }}
                  secondaryAction={
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      sx={{ fontFamily: row.mono ? 'monospace' : undefined, fontSize: row.mono ? 12 : undefined }}
                    >
                      {row.value}
                    </Typography>
                  }
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{row.icon}</ListItemIcon>
                  <ListItemText primary={row.label} slotProps={{ primary: { variant: 'body2', color: 'text.secondary' } }} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>

        {/* Danger zone */}
        {isOwner && (
          <Card variant="outlined" sx={{ borderColor: 'error.main', borderStyle: 'dashed' }}>
            <CardHeader
              avatar={<DeleteIcon sx={{ fontSize: 18, color: 'error.main' }} />}
              title="Danger Zone"
              subheader="Permanently delete this tournament and all associated data"
              slotProps={{
                title: { variant: 'subtitle2', fontWeight: 'bold', color: 'error' },
                subheader: { variant: 'caption' },
              }}
              sx={{ pb: 0 }}
            />
            <CardContent>
              {!confirmDelete ? (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setConfirmDelete(true)}
                  sx={{ textTransform: 'none' }}
                >
                  Delete Tournament
                </Button>
              ) : (
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleDelete}
                    disabled={deleting}
                    sx={{
                      backgroundColor: 'error.main',
                      '&:hover': { backgroundColor: 'error.dark' },
                    }}
                  >
                    {deleting ? 'Deleting...' : 'Yes, delete permanently'}
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setConfirmDelete(false)}
                    sx={{ textTransform: 'none' }}
                  >
                    Cancel
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        )}
      </Stack>

      {/* Hidden file inputs */}
      <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => { const f = e.target.files?.[0]; if (f) { startCrop(f); setImageModal('banner'); } e.target.value = ''; }} style={{ display: 'none' }} />
      <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => { const f = e.target.files?.[0]; if (f) { startCrop(f); setImageModal('logo'); } e.target.value = ''; }} style={{ display: 'none' }} />

      {/* Image crop modal */}
      <Dialog open={!!imageModal} onClose={() => { setImageModal(null); setCropImage(null); }} maxWidth="sm" fullWidth>
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            onClick={() => { setImageModal(null); setCropImage(null); }}
            sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
            size="small"
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
          {cropImage ? (
            <Box sx={{ position: 'relative', width: '100%', height: imageModal === 'banner' ? 300 : 350 }}>
              <Cropper
                image={cropImage}
                crop={crop}
                zoom={zoom}
                aspect={imageModal === 'banner' ? 4 : 1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </Box>
          ) : (
            <>
              {imageModal === 'banner' && (
                <Box
                  component="img"
                  src={tournament.banner_url || placeholderBanner}
                  sx={{ width: '100%', display: 'block' }}
                />
              )}
              {imageModal === 'logo' && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <Box
                    component="img"
                    src={tournament.logo_url || placeholderLogo}
                    sx={{ maxWidth: 256, maxHeight: 256 }}
                  />
                </Box>
              )}
            </>
          )}
        </DialogContent>
        {isOwner && (
          <DialogActions sx={{ px: 2, pb: 2 }}>
            {cropImage ? (
              <>
                <Button variant="outlined" size="small" onClick={() => setCropImage(null)}>
                  Cancel
                </Button>
                <Button variant="contained" size="small" onClick={applyCrop} disabled={cropUploading}>
                  {cropUploading ? 'Uploading…' : 'Save'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={async () => {
                    try {
                      const field = imageModal === 'banner' ? 'banner_url' : 'logo_url';
                      const updated = await updateTournament(tournament.abbreviation, { [field]: '' });
                      onTournamentChanged(updated);
                      setImageModal(null);
                    } catch (err) {
                      onError(err instanceof Error ? err.message : 'Failed to clear image');
                    }
                  }}
                >
                  Clear
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<ImageIcon />}
                  onClick={() => {
                    if (imageModal === 'banner') bannerInputRef.current?.click();
                    else logoInputRef.current?.click();
                  }}
                >
                  {imageModal === 'banner' ? 'Upload Banner' : 'Upload Logo'}
                </Button>
              </>
            )}
          </DialogActions>
        )}
      </Dialog>
    </>
  );
}
