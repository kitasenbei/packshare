import { useState } from 'react';
import { Trophy, X, Palette, ChevronRight, List, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  createTournament,
  type Tournament,
  type CreateTournamentInput,
} from '../api/tournaments';
import ImageUpload from '../../../shared/components/ImageUpload';

const FORMATS = ['1v1', '2v2', '3v3', '4v4'];

const DEFAULT_STAGES = [
  'Qualifiers', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Finals', 'Grand Finals',
];

interface TournamentCreateSectionProps {
  onBack: () => void;
  onCreated: (t: Tournament) => void;
}

export default function TournamentCreateSection({
  onBack,
  onCreated,
}: TournamentCreateSectionProps) {
  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [format, setFormat] = useState('1v1');
  const [bannerUrl, setBannerUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [stages, setStages] = useState<string[]>([...DEFAULT_STAGES]);
  const [newStageName, setNewStageName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAddStage = () => {
    const trimmed = newStageName.trim();
    if (!trimmed) return;
    if (stages.length >= 20) { setError('Maximum 20 stages'); return; }
    setStages((prev) => [...prev, trimmed]);
    setNewStageName('');
  };

  const handleRemoveStage = (index: number) => {
    setStages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveStage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= stages.length) return;
    setStages((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError('Tournament name is required'); return; }
    if (!abbreviation.trim()) { setError('Abbreviation is required'); return; }
    if (stages.length === 0) { setError('At least one stage is required'); return; }

    setSaving(true);
    setError('');
    try {
      const input: CreateTournamentInput = {
        name: name.trim(),
        abbreviation: abbreviation.trim().toLowerCase(),
        format,
        banner_url: bannerUrl || undefined,
        logo_url: logoUrl || undefined,
        stages: stages.map((s) => ({ name: s })),
      };
      const created = await createTournament(input);
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tournament');
    }
    setSaving(false);
  };

  return (
    <>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm mb-2">
        <button
          className="text-muted-foreground hover:text-primary cursor-pointer"
          onClick={onBack}
        >
          Tournaments
        </button>
        <ChevronRight className="size-3.5 text-muted-foreground" />
        <span className="font-semibold">Create</span>
      </nav>

      <div className="flex gap-3 flex-col md:flex-row">
        {/* Left: Form */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-3">
            {/* Basic Info Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-[34px] rounded-full bg-muted">
                    <Trophy className="size-[18px] text-muted-foreground" />
                  </div>
                  <CardTitle className="text-sm font-bold">Basic Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="tournament-name">Tournament Name</Label>
                    <Input
                      id="tournament-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. osu!mania World Cup 2025"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="abbreviation">Abbreviation</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">/t/</span>
                      <Input
                        id="abbreviation"
                        className="pl-8"
                        value={abbreviation}
                        onChange={(e) => setAbbreviation(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                        placeholder="e.g. MWC-2025"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {abbreviation ? `URL: /t/${abbreviation.toLowerCase()}` : 'Used in the tournament URL'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Format</Label>
                    <Select value={format} onValueChange={(v) => v && setFormat(v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMATS.map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stages Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="flex items-center justify-center size-[34px] rounded-full bg-muted">
                      <List className="size-[18px] text-muted-foreground" />
                    </div>
                    <Badge className="absolute -top-1.5 -right-2.5 h-[18px] min-w-[18px] px-1 text-[10px]">
                      {stages.length}
                    </Badge>
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Stages</CardTitle>
                    <CardDescription className="text-xs">Define the rounds of your tournament</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border border-border rounded-md overflow-hidden mb-2">
                  {stages.map((stage, i) => (
                    <div
                      key={i}
                      className={`flex items-center py-1 px-2 ${i < stages.length - 1 ? 'border-b border-border' : ''}`}
                    >
                      <div className="flex items-center justify-center size-[22px] rounded-full bg-muted text-muted-foreground text-[10px] font-bold mr-2">
                        {i + 1}
                      </div>
                      <span className="flex-1 text-sm">{stage}</span>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon-xs" onClick={() => handleMoveStage(i, -1)} disabled={i === 0}>
                          <ArrowUp className="size-3" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => handleMoveStage(i, 1)} disabled={i === stages.length - 1}>
                          <ArrowDown className="size-3" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => handleRemoveStage(i)} className="text-muted-foreground hover:text-destructive">
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {stages.length === 0 && (
                    <div className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">No stages added</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Add stage..."
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
                  />
                  <Button variant="outline" size="sm" onClick={handleAddStage} disabled={!newStageName.trim()}>
                    <Plus data-icon="inline-start" />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                size="lg"
                onClick={handleCreate}
                disabled={saving}
                className="font-bold"
              >
                {saving ? <Spinner className="size-4" /> : <Trophy data-icon="inline-start" />}
                {saving ? 'Creating...' : 'Create Tournament'}
              </Button>
              <Button variant="outline" onClick={onBack} disabled={saving}>Cancel</Button>
            </div>
          </div>
        </div>

        {/* Right: Branding Card */}
        <div className="w-full md:w-[300px] flex-shrink-0">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center size-[34px] rounded-full bg-muted">
                  <Palette className="size-[18px] text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Branding</CardTitle>
                  <CardDescription className="text-xs">Optional — can be added later</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold mb-1">Banner Image</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Recommended: 1200x300px
                  </p>
                  <ImageUpload
                    value={bannerUrl || undefined}
                    onChange={(url) => setBannerUrl(url || '')}
                    aspectRatio="4/1"
                  />
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-semibold mb-1">Logo</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Recommended: 256x256px
                  </p>
                  <div className="max-w-[150px]">
                    <ImageUpload
                      value={logoUrl || undefined}
                      onChange={(url) => setLogoUrl(url || '')}
                      aspectRatio="1/1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
