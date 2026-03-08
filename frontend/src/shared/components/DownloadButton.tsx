import { useState } from 'react';
import { Button, Snackbar, Alert, CircularProgress, LinearProgress, Box } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CheckIcon from '@mui/icons-material/Check';
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
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'info' | 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const handleClick = async () => {
    if (loading) return;

    const name = downloadName || 'beatmap';
    setLoading(true);
    setProgress(null);
    setSnackbar({ open: true, message: `Downloading ${name}...`, severity: 'info' });

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
          setProgress(Math.round((received / total) * 100));
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
      setSnackbar({ open: true, message: `Downloaded ${name}`, severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: `Failed to download ${name}`, severity: 'error' });
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
    <>
      <Button
        size="small"
        color="success"
        variant="text"
        startIcon={
          loading ? (
            <CircularProgress size={14} color="success" />
          ) : (
            <DownloadIcon sx={{ fontSize: 16 }} />
          )
        }
        onClick={handleClick}
        disabled={loading}
        sx={{
          textTransform: 'none',
          fontSize: 12,
          fontWeight: 600,
          minWidth: 'auto',
          px: 1,
          py: 0.25,
        }}
      >
        {loading ? `${progressLabel || 'Downloading...'}` : 'Download'}
      </Button>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.severity === 'info' ? null : 3000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          severity={snackbar.severity}
          icon={snackbar.severity === 'success' ? <CheckIcon /> : undefined}
          sx={{ width: '100%' }}
        >
          <Box>
            {snackbar.message}
            {snackbar.severity === 'info' && (
              <LinearProgress
                variant={progress != null ? 'determinate' : 'indeterminate'}
                value={progress ?? undefined}
                sx={{ mt: 1, borderRadius: 1 }}
              />
            )}
          </Box>
        </Alert>
      </Snackbar>
    </>
  );
}
