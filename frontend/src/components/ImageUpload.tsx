import { useState, useRef } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

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

    // Convert to base64 for localStorage persistence
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      onChange(base64);
      setLoading(false);
    };
    reader.onerror = () => {
      setError('Failed to read file');
      setLoading(false);
    };
    reader.readAsDataURL(file);
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
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {label}
      </Typography>

      <Box
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !value && inputRef.current?.click()}
        sx={{
          position: 'relative',
          aspectRatio,
          border: '2px dashed',
          borderColor: error ? 'error.main' : dragOver ? 'primary.main' : 'divider',
          borderRadius: 2,
          backgroundColor: dragOver ? 'rgba(255,102,171,0.05)' : 'background.paper',
          cursor: value ? 'default' : 'pointer',
          overflow: 'hidden',
          transition: 'all 0.2s',
          '&:hover': !value ? { borderColor: 'primary.main' } : {},
        }}
      >
        {value ? (
          <>
            <Box
              component="img"
              src={value}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.2s',
                '&:hover': { opacity: 1 },
              }}
            >
              <Button
                variant="contained"
                size="small"
                onClick={handleRemove}
                sx={{ backgroundColor: '#ff4444' }}
              >
                Remove
              </Button>
            </Box>
            <CheckCircleIcon
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: '#4caf50',
                backgroundColor: 'white',
                borderRadius: '50%',
              }}
            />
          </>
        ) : loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <CircularProgress size={32} sx={{ color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Uploading...
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 2 }}>
            <CloudUploadIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Drag & drop or click to upload
            </Typography>
            <Typography variant="caption" color="text.disabled">
              JPG, PNG, WebP, GIF · Max {MAX_SIZE_MB}MB
            </Typography>
          </Box>
        )}
      </Box>

      {error && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
          <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        </Box>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
    </Box>
  );
}
