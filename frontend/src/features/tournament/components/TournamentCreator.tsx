import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, X, ChevronLeft, ChevronRight, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  createTournament,
  type CreateTournamentInput,
} from '../api/tournaments';

interface TournamentCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FORMATS = ['1v1', '2v2', '3v3', '4v4'];

const DEFAULT_STAGES = [
  'Qualifiers', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Finals', 'Grand Finals',
];

const STEPS = ['Details', 'Stages'];

export default function TournamentCreator({ open, onOpenChange }: TournamentCreatorProps) {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [format, setFormat] = useState('1v1');
  const [stages, setStages] = useState<string[]>([...DEFAULT_STAGES]);
  const [newStageName, setNewStageName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep(0);
      setName('');
      setAbbreviation('');
      setFormat('1v1');
      setStages([...DEFAULT_STAGES]);
      setNewStageName('');
      setCreating(false);
      setError('');
    }
    onOpenChange(nextOpen);
  };

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
    if (!name.trim()) { setError('Tournament name is required'); setStep(0); return; }
    if (!abbreviation.trim()) { setError('Abbreviation is required'); setStep(0); return; }
    if (stages.length === 0) { setError('At least one stage is required'); setStep(1); return; }

    setCreating(true);
    setError('');
    try {
      const input: CreateTournamentInput = {
        name: name.trim(),
        abbreviation: abbreviation.trim().toLowerCase(),
        format,
        stages: stages.map((s) => ({ name: s })),
      };
      const created = await createTournament(input);
      handleOpenChange(false);
      navigate(`/dashboard`, { state: { tournament: created.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tournament');
    }
    setCreating(false);
  };

  const canAdvance = (s: number) => {
    if (s === 0) return name.trim().length > 0 && abbreviation.trim().length > 0;
    if (s === 1) return stages.length > 0;
    return true;
  };

  const stepDescription = step === 0
    ? 'Step 1 of 2 — Basic information'
    : 'Step 2 of 2 — Define tournament stages';

  const renderStepDetails = () => (
    <div className="flex flex-col gap-3">
      <div>
        <span className="mb-1.5 block text-xs font-medium">Tournament Name</span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. osu!mania World Cup 2025"
          className="text-lg font-bold"
        />
      </div>
      <div>
        <span className="mb-1.5 block text-xs font-medium">Abbreviation</span>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">/t/</span>
          <Input
            className="pl-8"
            value={abbreviation}
            onChange={(e) => setAbbreviation(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
            placeholder="e.g. MWC-2025"
          />
        </div>
        {abbreviation && (
          <p className="mt-1 text-xs text-muted-foreground">URL: /t/{abbreviation.toLowerCase()}</p>
        )}
      </div>
      <div>
        <span className="mb-1.5 block text-xs font-medium">Format</span>
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
  );

  const renderStepStages = () => (
    <div className="flex flex-col gap-2">
      <div className="max-h-[300px] overflow-y-auto rounded-md border">
        {stages.map((stage, i) => (
          <div
            key={i}
            className={`flex items-center px-2 py-1 ${i < stages.length - 1 ? 'border-b' : ''}`}
          >
            <div className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
              {i + 1}
            </div>
            <span className="ml-2 flex-1 text-sm">{stage}</span>
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
          <div className="p-6 text-center text-sm text-muted-foreground">No stages added</div>
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
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="size-4" />
            New Tournament
          </DialogTitle>
          <DialogDescription>{stepDescription}</DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center">
          {STEPS.map((label, index) => (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                    index <= step
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
                  className={`mx-3 h-px flex-1 ${
                    index < step ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 0 && renderStepDetails()}
        {step === 1 && renderStepStages()}

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => { setError(''); setStep((s) => s - 1); }}
            disabled={step === 0}
          >
            <ChevronLeft />
            Back
          </Button>

          {step < 1 ? (
            <Button
              onClick={() => { setError(''); setStep((s) => s + 1); }}
              disabled={!canAdvance(step)}
            >
              Next
              <ChevronRight />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={creating}>
              <Trophy />
              {creating ? 'Creating...' : 'Create Tournament'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
