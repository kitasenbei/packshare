import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { addToStash } from '../utils/stash';
import type { StashBeatmap } from '../types/beatmap';

interface DownloadButtonProps {
  downloadUrl: string;
  downloadName?: string;
  stashData?: Omit<StashBeatmap, 'addedAt'>;
  onDownloaded?: () => void;
}

export default function DownloadButton({ downloadUrl, downloadName, stashData, onDownloaded }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const handleClick = async () => {
    if (loading) return;

    const name = downloadName || 'beatmap';
    setLoading(true);
    setProgress(null);

    const toastId = toast.loading(`Downloading ${name}...`, {
      description: (
        <Progress value={0} className="mt-2" />
      ),
    });

    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Download failed');

      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : null;

      if (total && response.body) {
        // Stream with progress tracking
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          const pct = Math.round((received / total) * 100);
          setProgress(pct);
          toast.loading(`Downloading ${name}...`, {
            id: toastId,
            description: (
              <Progress value={pct} className="mt-2" />
            ),
          });
        }

        const blob = new Blob(chunks as BlobPart[]);
        triggerDownload(blob, name, response);
      } else {
        // No Content-Length — fall back to blob (indeterminate)
        const blob = await response.blob();
        triggerDownload(blob, name, response);
      }

      if (stashData) {
        addToStash(stashData);
      }

      onDownloaded?.();
      toast.success(`Downloaded ${name}`, { id: toastId });
    } catch {
      toast.error(`Failed to download ${name}`, { id: toastId });
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const triggerDownload = (blob: Blob, name: string, response: Response) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const disposition = response.headers.get('Content-Disposition');
    const filenameMatch = disposition?.match(/filename="?(.+?)"?$/);
    a.download = filenameMatch?.[1] || `${name}.osz`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const progressLabel = progress != null ? `${progress}%` : '';

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleClick}
      disabled={loading}
      className="gap-1 font-semibold text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
    >
      {loading ? (
        <Spinner className="size-3.5" />
      ) : (
        <Download className="size-3.5" />
      )}
      {loading ? `${progressLabel || 'Downloading...'}` : 'Download'}
    </Button>
  );
}
