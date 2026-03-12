import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { CloudUpload, CheckCircle, CircleAlert } from 'lucide-react';
import { uploadImage } from '../../features/tournament/api/tournaments';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface ImageUploadProps {
  label?: string;
  value?: string;
  onChange: (url: string | null) => void;
  aspectRatio?: string; // e.g. "16/9" for banners, "1/1" for logos
}

export default function ImageUpload({ label = 'Upload Image', value, onChange, aspectRatio = '16/9' }: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Invalid file type. Allowed: JPG, PNG, WebP, GIF`;
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File too large. Maximum size: ${MAX_SIZE_MB}MB`;
    }
    return null;
  };

  const handleFile = async (file: File) => {
    setError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const fileUrl = await uploadImage(file);
      onChange(fileUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    onChange(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <p className="mb-1 text-sm text-muted-foreground">
        {label}
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !value && inputRef.current?.click()}
        className={cn(
          'relative overflow-hidden rounded-lg border-2 border-dashed transition-all',
          error ? 'border-destructive' : dragOver ? 'border-primary' : 'border-border',
          dragOver ? 'bg-primary/5' : 'bg-background',
          value ? 'cursor-default' : 'cursor-pointer hover:border-primary',
        )}
        style={{ aspectRatio }}
      >
        {value ? (
          <>
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
              <Button
                size="sm"
                onClick={handleRemove}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                Remove
              </Button>
            </div>
            <CheckCircle className="absolute right-2 top-2 size-5 rounded-full bg-white text-green-500" />
          </>
        ) : loading ? (
          <div className="flex h-full flex-col items-center justify-center">
            <Spinner className="size-8 text-primary" />
            <p className="mt-1 text-sm text-muted-foreground">
              Uploading...
            </p>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-2">
            <CloudUpload className="mb-1 size-10 text-muted-foreground/50" />
            <p className="text-center text-sm text-muted-foreground">
              Drag & drop or click to upload
            </p>
            <p className="text-xs text-muted-foreground/50">
              JPG, PNG, WebP, GIF · Max {MAX_SIZE_MB}MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-1 flex items-center gap-1">
          <CircleAlert className="size-4 text-destructive" />
          <p className="text-xs text-destructive">
            {error}
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}
