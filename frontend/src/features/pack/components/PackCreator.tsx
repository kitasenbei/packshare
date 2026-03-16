import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Share, Music, Eye, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Spinner } from '@/components/ui/spinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type User, getBeatmapset, type BeatmapsetInfo } from '../../auth/api/auth';
import { createPack } from '../api/packs';
import BeatmapRow from '../../../shared/components/BeatmapRow';
import RemoveButton from '../../../shared/components/RemoveButton';

interface PackCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  permissions?: string[];
  isKeySession?: boolean;
}

interface PackBeatmap {
  beatmapset_id: number;
  beatmap_id?: number;
  title: string;
  artist: string;
  creator: string;
  keys?: number;
  star_rating?: number;
  difficulty_name?: string;
}

const STEPS = ['Details', 'Beatmaps', 'Review'];

export default function PackCreator({ open, onOpenChange, user, permissions, isKeySession }: PackCreatorProps) {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [packName, setPackName] = useState('');
  const [packDescription, setPackDescription] = useState('');
  const [beatmapInput, setBeatmapInput] = useState('');
  const [beatmaps, setBeatmaps] = useState<PackBeatmap[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  // For inline difficulty selection
  const [pendingBeatmapset, setPendingBeatmapset] = useState<BeatmapsetInfo | null>(null);
  const [selectedDiffs, setSelectedDiffs] = useState<Set<number>>(new Set());

  // Reset all state when dialog closes
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep(0);
      setPackName('');
      setPackDescription('');
      setBeatmapInput('');
      setBeatmaps([]);
      setLoading(false);
      setCreating(false);
      setError('');
      setPendingBeatmapset(null);
      setSelectedDiffs(new Set());
    }
    onOpenChange(nextOpen);
  };

  const extractBeatmapId = (input: string): string | null => {
    if (/^\d+$/.test(input.trim())) {
      return input.trim();
    }
    const match = input.match(/osu\.ppy\.sh\/beatmapsets\/(\d+)/);
    if (match) return match[1];
    const nerinyanMatch = input.match(/nerinyan\.moe.*?(\d+)/);
    if (nerinyanMatch) return nerinyanMatch[1];
    return null;
  };

  const handleAddBeatmap = async (input?: string) => {
    const value = input ?? beatmapInput;
    const id = extractBeatmapId(value);
    if (!id) {
      setError('Invalid beatmap ID or URL');
      return;
    }

    if (beatmaps.some((b) => b.beatmapset_id === parseInt(id))) {
      setError('Beatmapset already in pack');
      return;
    }

    setLoading(true);
    setError('');

    const beatmapset = await getBeatmapset(parseInt(id));
    if (!beatmapset) {
      setError('Beatmapset not found or has no mania difficulties');
      setLoading(false);
      return;
    }

    if (beatmapset.beatmaps.length === 0) {
      setError('No mania difficulties found in this beatmapset');
      setLoading(false);
      return;
    }

    // If multiple difficulties, show selection dialog
    if (beatmapset.beatmaps.length > 1) {
      setPendingBeatmapset(beatmapset);
      setSelectedDiffs(new Set(beatmapset.beatmaps.map((d) => d.beatmap_id)));
    } else {
      // Single difficulty, add directly
      const diff = beatmapset.beatmaps[0];
      setBeatmaps((prev) => [...prev, {
        beatmapset_id: beatmapset.beatmapset_id,
        beatmap_id: diff.beatmap_id,
        title: beatmapset.title,
        artist: beatmapset.artist,
        creator: beatmapset.creator,
        keys: diff.keys,
        star_rating: diff.star_rating,
        difficulty_name: diff.difficulty_name,
      }]);
      setBeatmapInput('');
    }
    setLoading(false);
  };

  const handleToggleDiff = (id: number) => {
    setSelectedDiffs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmDifficulty = () => {
    if (!pendingBeatmapset || selectedDiffs.size === 0) return;

    const newBeatmaps = pendingBeatmapset.beatmaps
      .filter((d) => selectedDiffs.has(d.beatmap_id))
      .map((diff) => ({
        beatmapset_id: pendingBeatmapset.beatmapset_id,
        beatmap_id: diff.beatmap_id,
        title: pendingBeatmapset.title,
        artist: pendingBeatmapset.artist,
        creator: pendingBeatmapset.creator,
        keys: diff.keys,
        star_rating: diff.star_rating,
        difficulty_name: diff.difficulty_name,
      }));
    setBeatmaps((prev) => [...prev, ...newBeatmaps]);

    setBeatmapInput('');
    setPendingBeatmapset(null);
  };

  const handleRemoveBeatmap = (index: number) => {
    setBeatmaps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateLink = async () => {
    if (!packName.trim()) {
      setError('Please enter a pack name');
      return;
    }
    if (beatmaps.length === 0) {
      setError('Add at least one beatmap');
      return;
    }
    if (!user) {
      setError('Please sign in to create packs');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const pack = await createPack({
        name: packName.trim(),
        description: packDescription.trim() || undefined,
        beatmaps: beatmaps.map((b) => ({
          beatmapset_id: b.beatmapset_id,
          title: b.title,
          artist: b.artist,
          creator: b.creator,
          keys: b.keys,
          star_rating: b.star_rating,
          difficulty_name: b.difficulty_name,
        })),
      });

      const link = `${window.location.origin}/s/${pack.share_code}`;
      setGeneratedLink(link);
      handleOpenChange(false);
      setShareDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pack');
    }
    setCreating(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && beatmapInput.trim() && !loading) {
      handleAddBeatmap();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').trim();
    if (pasted && extractBeatmapId(pasted) && !loading) {
      e.preventDefault();
      setBeatmapInput(pasted);
      handleAddBeatmap(pasted);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.getData('text').trim();
    if (dropped && extractBeatmapId(dropped) && !loading) {
      setBeatmapInput(dropped);
      handleAddBeatmap(dropped);
    }
  };

  const canAdvance = (s: number) => {
    if (s === 0) return packName.trim().length > 0;
    if (s === 1) return beatmaps.length > 0;
    return true;
  };

  useEffect(() => {
    if (!open) return;
    const handleCtrlEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (step < 2 && canAdvance(step)) {
          setError('');
          setStep((s) => s + 1);
        } else if (step === 2 && !creating && user) {
          handleGenerateLink();
        }
      }
    };
    window.addEventListener('keydown', handleCtrlEnter);
    return () => window.removeEventListener('keydown', handleCtrlEnter);
  });

  const stepDescription = step === 0
    ? 'Step 1 of 3 — Enter pack details'
    : step === 1
      ? 'Step 2 of 3 — Add beatmaps to your pack'
      : 'Step 3 of 3 — Review and create';

  const renderStepDetails = () => (
    <div className="flex flex-col gap-2">
      <h5 className="text-xl font-bold mb-1">Pack Details</h5>
      <Input
        placeholder="Pack name..."
        value={packName}
        onChange={(e) => setPackName(e.target.value)}
        className="text-2xl font-bold h-12"
      />
      <Textarea
        placeholder="Description (optional)..."
        rows={2}
        value={packDescription}
        onChange={(e) => setPackDescription(e.target.value)}
      />
    </div>
  );

  const renderStepBeatmaps = () => (
    <div className="overflow-hidden">
      {/* Add Beatmap Section */}
      <Card className="mb-3">
        <CardHeader>
          <CardTitle className="text-sm font-bold">Add Beatmaps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1">
            <div className="relative flex-1">
              <Music className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Paste beatmap ID or osu! URL..."
                value={beatmapInput}
                onChange={(e) => setBeatmapInput(e.target.value)}
                onKeyDown={handleKeyPress}
                onPaste={handlePaste}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                disabled={loading}
                className="pl-8"
              />
            </div>
            <Button
              onClick={() => handleAddBeatmap()}
              disabled={!beatmapInput.trim() || loading}
              className="min-w-[100px]"
            >
              {loading ? <Spinner className="size-5" /> : 'Add'}
            </Button>
          </div>
          {error && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription className="flex items-center justify-between">
                {error}
                <Button variant="ghost" size="icon-xs" onClick={() => setError('')}>
                  <X className="size-3" />
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Supports osu.ppy.sh and nerinyan.moe links, or direct beatmapset IDs
          </p>
        </CardContent>
      </Card>

      {/* Inline Difficulty Selection */}
      {pendingBeatmapset && (
        <Card className="mb-3">
          <CardHeader>
            <CardTitle>Select Difficulties</CardTitle>
            <CardDescription>{pendingBeatmapset.artist} - {pendingBeatmapset.title}</CardDescription>
            <CardAction>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const allIds = pendingBeatmapset.beatmaps.map((d) => d.beatmap_id);
                  setSelectedDiffs((prev) =>
                    prev.size === allIds.length ? new Set() : new Set(allIds),
                  );
                }}
              >
                {selectedDiffs.size === pendingBeatmapset.beatmaps.length ? 'Deselect all' : 'Select all'}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {pendingBeatmapset.beatmaps.map((diff) => (
              <BeatmapRow
                key={diff.beatmap_id}
                beatmapsetId={pendingBeatmapset.beatmapset_id}
                title={pendingBeatmapset.title}
                artist={pendingBeatmapset.artist}
                keys={diff.keys}
                creator={pendingBeatmapset.creator}
                creatorPrefix="mapped by"
                difficultyName={diff.difficulty_name}
                starRating={diff.star_rating}
                density="compact"
                onClick={() => handleToggleDiff(diff.beatmap_id)}
                checkbox={{
                  checked: selectedDiffs.has(diff.beatmap_id),
                  onChange: () => handleToggleDiff(diff.beatmap_id),
                }}
              />
            ))}
          </CardContent>
          <div className="px-4 pb-4 flex justify-end gap-1">
            <Button variant="outline" onClick={() => setPendingBeatmapset(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDifficulty}
              disabled={selectedDiffs.size === 0}
            >
              Add {selectedDiffs.size > 0 ? `(${selectedDiffs.size})` : ''}
            </Button>
          </div>
        </Card>
      )}

      {/* Beatmap List */}
      <Card>
        <CardHeader>
          <CardTitle>Beatmaps</CardTitle>
          <CardDescription>{beatmaps.length} {beatmaps.length === 1 ? 'map' : 'maps'} added</CardDescription>
        </CardHeader>

        {beatmaps.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Music className="size-16 text-muted-foreground/50 mb-2 mx-auto" />
            <h6 className="text-base font-medium text-muted-foreground">
              No beatmaps yet
            </h6>
            <p className="text-sm text-muted-foreground">
              Paste a beatmap ID or osu! URL above to get started
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[40vh]">
            <CardContent>
              {beatmaps.map((beatmap, index) => (
                <BeatmapRow
                  key={`${beatmap.beatmapset_id}-${beatmap.beatmap_id || index}`}
                  beatmapsetId={beatmap.beatmapset_id}
                  title={beatmap.title}
                  artist={beatmap.artist}
                  keys={beatmap.keys}
                  creator={beatmap.creator}
                  creatorPrefix="mapped by"
                  difficultyName={beatmap.difficulty_name}
                  starRating={beatmap.star_rating}
                  density="compact"
                  actions={
                    <RemoveButton onClick={() => handleRemoveBeatmap(index)} />
                  }
                />
              ))}
            </CardContent>
          </ScrollArea>
        )}
      </Card>
    </div>
  );

  const renderStepReview = () => {
    const uniqueArtists = new Set(beatmaps.map((b) => b.artist)).size;
    const keysCounts = beatmaps.reduce<Record<number, number>>((acc, b) => {
      if (b.keys) acc[b.keys] = (acc[b.keys] || 0) + 1;
      return acc;
    }, {});

    return (
      <ScrollArea className="max-h-[60vh]">
        <Alert className="mb-3">
          <Eye className="size-4" />
          <AlertDescription>
            Review your pack before creating. You can go back to make changes.
          </AlertDescription>
        </Alert>

        {/* Summary table */}
        <Card className="mb-3">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardAction>
              <Button size="sm" variant="ghost" onClick={() => setStep(0)}>
                Edit
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <div className="flex py-2 border-b border-border">
                <div className="w-[120px] font-semibold text-muted-foreground">Name</div>
                <div>{packName}</div>
              </div>
              <div className="flex py-2 border-b border-border">
                <div className="w-[120px] font-semibold text-muted-foreground">Description</div>
                <div className={packDescription ? '' : 'text-muted-foreground/50 italic'}>
                  {packDescription || 'None'}
                </div>
              </div>
              <div className="flex py-2 border-b border-border">
                <div className="w-[120px] font-semibold text-muted-foreground">Beatmaps</div>
                <div>{beatmaps.length}</div>
              </div>
              <div className="flex py-2 border-b border-border">
                <div className="w-[120px] font-semibold text-muted-foreground">Artists</div>
                <div>{uniqueArtists}</div>
              </div>
              <div className="flex py-2">
                <div className="w-[120px] font-semibold text-muted-foreground">Keys</div>
                <div>
                  {Object.entries(keysCounts)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([k, count]) => `${k}K (${count})`)
                    .join(', ')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Beatmap list */}
        <Card>
          <CardHeader>
            <CardTitle>Beatmaps ({beatmaps.length})</CardTitle>
            <CardAction>
              <Button size="sm" variant="ghost" onClick={() => setStep(1)}>
                Edit
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {beatmaps.map((beatmap, index) => (
              <BeatmapRow
                key={`${beatmap.beatmapset_id}-${beatmap.beatmap_id || index}`}
                beatmapsetId={beatmap.beatmapset_id}
                title={beatmap.title}
                artist={beatmap.artist}
                keys={beatmap.keys}
                creator={beatmap.creator}
                creatorPrefix="mapped by"
                difficultyName={beatmap.difficulty_name}
                starRating={beatmap.star_rating}
                density="compact"
              />
            ))}
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription className="flex items-center justify-between">
              {error}
              <Button variant="ghost" size="icon-xs" onClick={() => setError('')}>
                <X className="size-3" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </ScrollArea>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Create New Pack</DialogTitle>
            <DialogDescription>{stepDescription}</DialogDescription>
          </DialogHeader>

          {/* Not logged in warning */}
          {!user && (
            <Alert>
              <AlertDescription>
                You need to sign in to create and save packs.
              </AlertDescription>
            </Alert>
          )}

          {/* Key session permission check */}
          {isKeySession && !permissions?.includes('create') && (
            <Alert>
              <AlertDescription>
                Your access key doesn't have permission to create packs.
              </AlertDescription>
            </Alert>
          )}

          {/* Stepper */}
          <div className="flex items-center">
            {STEPS.map((label, index) => (
              <div key={label} className="flex items-center flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex items-center justify-center size-7 rounded-full text-xs font-bold ${
                      index < step
                        ? 'bg-primary text-primary-foreground'
                        : index === step
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      index <= step ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-3 ${
                      index < step ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          {step === 0 && renderStepDetails()}
          {step === 1 && renderStepBeatmaps()}
          {step === 2 && renderStepReview()}

          {/* Navigation Buttons */}
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => { setError(''); setStep((s) => s - 1); }}
              disabled={step === 0}
            >
              <ChevronLeft />
              Back
            </Button>

            {step < 2 ? (
              <Button
                onClick={() => { setError(''); setStep((s) => s + 1); }}
                disabled={!canAdvance(step)}
              >
                Next
                <ChevronRight />
              </Button>
            ) : (
              <Button
                onClick={handleGenerateLink}
                disabled={creating || !user || (isKeySession && !permissions?.includes('create'))}
              >
                <Share />
                {creating ? 'Creating...' : 'Create & Share'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold">Pack Created!</DialogTitle>
            <DialogDescription>
              Your pack "{packName}" with {beatmaps.length} maps is ready to share!
            </DialogDescription>
          </DialogHeader>
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Share this link:
            </p>
            <div className="flex items-center gap-1 p-3 bg-muted rounded-md">
              <span className="flex-1 font-mono text-sm overflow-hidden text-ellipsis">
                {generatedLink}
              </span>
              <Tooltip>
                <TooltipTrigger render={
                  <Button variant="ghost" size="icon-xs" onClick={handleCopyLink} />
                }>
                  <Copy className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>
                  {copied ? 'Copied!' : 'Copy link'}
                </TooltipContent>
              </Tooltip>
            </div>
            {copied && (
              <p className="text-xs text-green-500 mt-1">
                Copied to clipboard!
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Close
            </DialogClose>
            <Button
              onClick={() => {
                setShareDialogOpen(false);
                navigate(`/s/${generatedLink.split('/').pop()}`);
              }}
            >
              View Pack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
