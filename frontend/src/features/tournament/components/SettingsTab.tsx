import { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Trash2,
  Link,
  X,
  ExternalLink,
  Trophy,
  Users,
  List,
  Info,
  Image as ImageIcon,
} from 'lucide-react';
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
      const img = new window.Image();
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

  const infoRows = [
    { icon: <Link className="size-4" />, label: 'Abbreviation', value: tournament.abbreviation, mono: true },
    { icon: <Users className="size-4" />, label: 'Format', value: tournament.format, mono: false },
    { icon: <List className="size-4" />, label: 'Stages', value: stages.length.toString(), mono: false },
    { icon: <Trophy className="size-4" />, label: 'Total Maps', value: totalMaps.toString(), mono: false },
    { icon: <ExternalLink className="size-4" />, label: 'Public URL', value: `${window.location.origin}/t/${tournament.abbreviation}`, mono: true },
  ];

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Status */}
        {isOwner && (
          <TournamentStatus value={tournament.status as 'upcoming' | 'live' | 'completed'} onChange={handleStatusChange} />
        )}

        {/* Branding */}
        {isOwner && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => bannerInputRef.current?.click()}
            >
              <ImageIcon className="size-4" />
              {tournament.banner_url ? 'Change Banner' : 'Upload Banner'}
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => logoInputRef.current?.click()}
            >
              <ImageIcon className="size-4" />
              {tournament.logo_url ? 'Change Logo' : 'Upload Logo'}
            </Button>
          </div>
        )}

        {/* Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm font-bold">Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {infoRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{row.icon}</span>
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                  </div>
                  <span className={cn('text-sm font-medium', row.mono && 'font-mono text-xs')}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Danger zone */}
        {isOwner && (
          <Card className="border-dashed border-destructive">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trash2 className="size-4 text-destructive" />
                <CardTitle className="text-sm font-bold text-destructive">Danger Zone</CardTitle>
              </div>
              <CardDescription>Permanently delete this tournament and all associated data</CardDescription>
            </CardHeader>
            <CardContent>
              {!confirmDelete ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="size-4" />
                  Delete Tournament
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Yes, delete permanently'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Hidden file inputs */}
      <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => { const f = e.target.files?.[0]; if (f) { startCrop(f); setImageModal('banner'); } e.target.value = ''; }} className="hidden" />
      <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => { const f = e.target.files?.[0]; if (f) { startCrop(f); setImageModal('logo'); } e.target.value = ''; }} className="hidden" />

      {/* Image crop modal */}
      <Dialog open={!!imageModal} onOpenChange={(o) => { if (!o) { setImageModal(null); setCropImage(null); } }}>
        <DialogContent className="sm:max-w-md p-0" showCloseButton={false}>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => { setImageModal(null); setCropImage(null); }}
              className="absolute right-2 top-2 z-10 bg-black/50 text-white hover:bg-black/70"
            >
              <X className="size-4" />
            </Button>
            {cropImage ? (
              <div className="relative w-full" style={{ height: imageModal === 'banner' ? 300 : 350 }}>
                <Cropper
                  image={cropImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={imageModal === 'banner' ? 4 : 1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
            ) : (
              <>
                {imageModal === 'banner' && (
                  <img
                    src={tournament.banner_url || placeholderBanner}
                    alt="Banner"
                    className="block w-full"
                  />
                )}
                {imageModal === 'logo' && (
                  <div className="flex justify-center p-6">
                    <img
                      src={tournament.logo_url || placeholderLogo}
                      alt="Logo"
                      className="max-h-64 max-w-64"
                    />
                  </div>
                )}
              </>
            )}
          </div>
          {isOwner && (
            <DialogFooter>
              {cropImage ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setCropImage(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={applyCrop} disabled={cropUploading}>
                    {cropUploading ? 'Uploading...' : 'Save'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
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
                    size="sm"
                    onClick={() => {
                      if (imageModal === 'banner') bannerInputRef.current?.click();
                      else logoInputRef.current?.click();
                    }}
                  >
                    <ImageIcon className="size-4" />
                    {imageModal === 'banner' ? 'Upload Banner' : 'Upload Logo'}
                  </Button>
                </>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
