import { useRef, useState, type DragEvent } from 'react';
import { FileText, Loader2, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UploadsApi, type UploadedDocument } from '@/api/endpoints';
import { apiErrorMessage } from '@/api/client';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024;

interface FileUploadFieldProps {
  value: UploadedDocument | null;
  onChange: (doc: UploadedDocument | null) => void;
  invalid?: boolean;
  /** Endpoint de upload a usar — por omissão o documento de identificação do cliente. */
  uploadFn?: (file: File) => Promise<UploadedDocument>;
}

export function FileUploadField({ value, onChange, invalid, uploadFn = UploadsApi.uploadClientDocument }: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Formato não suportado. Envie uma imagem (JPG, PNG, WEBP) ou PDF.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('O ficheiro excede o limite de 5MB.');
      return;
    }

    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }

    setUploading(true);
    try {
      const uploaded = await uploadFn(file);
      onChange(uploaded);
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível enviar o ficheiro.'));
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const remove = () => {
    setPreviewUrl(null);
    setError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        {previewUrl ? (
          <img src={previewUrl} alt="Pré-visualização do documento" className="h-14 w-14 rounded-lg object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <FileText className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{value.originalName}</p>
          <p className="text-xs text-slate-400">{(value.size / 1024).toFixed(0)} KB, anexado com sucesso</p>
        </div>
        <button
          type="button"
          onClick={remove}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
          aria-label="Remover ficheiro"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-slate-50/50 p-6 text-center transition-all',
          dragActive ? 'border-emerald-700 bg-emerald-50/60' : 'border-slate-200 hover:border-emerald-700',
          (invalid || error) && 'border-rose-300 bg-rose-50/40',
        )}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
        ) : (
          <Upload className="h-6 w-6 text-slate-400" />
        )}
        <p className="text-sm font-medium text-slate-600">
          {uploading ? 'A enviar ficheiro...' : 'Clique para anexar ou arraste o ficheiro aqui'}
        </p>
        <p className="text-xs text-slate-500">JPG, PNG, WEBP ou PDF (máximo 5MB)</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
      {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}
