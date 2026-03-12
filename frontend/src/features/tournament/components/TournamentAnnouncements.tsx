import { useState, useRef } from 'react';
import { Plus, Trash2, Pencil, Megaphone, ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
    <div className="flex flex-col gap-3">
      {isOwner && (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleOpenNew}>
            <Plus data-icon="inline-start" />
            New Announcement
          </Button>
        </div>
      )}

      {announcements.length === 0 ? (
        <div className="py-8 text-center">
          <Megaphone className="size-10 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground/50">
            No announcements yet
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardContent className="py-2.5 px-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{a.title}</p>
                    <span className="text-xs text-muted-foreground/50">{formatDate(a.createdAt)}</span>
                  </div>
                  {isOwner && (
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon-xs" onClick={() => handleOpenEdit(a)} className="text-muted-foreground hover:text-primary">
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => setDeleteConfirm(a.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
                {(a.body || a.image) && <Separator className="my-2" />}
                {a.image && (
                  <img
                    src={a.image}
                    className={`w-full rounded ${a.body ? 'mb-2' : ''}`}
                    alt=""
                  />
                )}
                {a.body && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {a.body}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
            <DialogDescription className="sr-only">
              {editingId ? 'Edit an existing announcement.' : 'Create a new announcement.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ann-title">Title</Label>
              <Input
                id="ann-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ann-body">Body (optional)</Label>
              <Textarea
                id="ann-body"
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your announcement..."
              />
            </div>
            {image ? (
              <div className="relative">
                <img src={image} className="w-full rounded" alt="" />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setImage(undefined)}
                  className="absolute top-1 right-1 bg-black/50 text-white hover:bg-black/70"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <>
                <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading}
                  className="self-start"
                >
                  <ImageIcon data-icon="inline-start" />
                  {uploading ? 'Uploading...' : 'Upload Eyecatcher'}
                </Button>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!title.trim() || saving}>
              {editingId ? 'Save' : 'Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
            <DialogDescription>
              Are you sure? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
