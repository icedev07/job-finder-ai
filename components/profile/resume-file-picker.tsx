'use client';

import { FileTextIcon, UploadIcon, XIcon } from 'lucide-react';
import { useRef, useState, type RefObject } from 'react';

import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/format';
import { RESUME_ACCEPT, resumeFileProblem } from '@/lib/resumeFiles';
import { cn } from '@/lib/utils';

/**
 * Picks a resume file: a drop zone that opens the file dialog, then the chosen file with Change and Remove. A file
 * the app does not take is refused here, with why. `inputRef` lets a form open the dialog itself (its Upload button
 * with no file chosen yet).
 */
export function ResumeFilePicker({
  file,
  onFile,
  inputRef,
  disabled,
  compact,
  label = 'Choose a resume',
}: {
  file: File | null;
  onFile: (file: File | null) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  compact?: boolean;
  label?: string;
}) {
  const ownRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? ownRef;
  const [over, setOver] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  function choose(f: File | null | undefined) {
    if (!f) return;
    const p = resumeFileProblem(f);
    setProblem(p);
    if (!p) onFile(f);
  }
  const open = () => ref.current?.click();

  return (
    <div className="space-y-1.5">
      <input
        ref={ref}
        type="file"
        accept={RESUME_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled}
        data-testid="resume-file-input"
        onChange={(e) => {
          choose(e.target.files?.[0]);
          // The same file can be picked again after Remove.
          e.target.value = '';
        }}
      />
      {file ? (
        <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/30 py-1.5 pr-1.5 pl-3 text-sm" data-testid="resume-file-chosen">
          <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate font-medium" title={file.name}>
            {file.name}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span>
          <Button type="button" size="sm" variant="ghost" onClick={open} disabled={disabled}>
            Change
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Remove ${file.name}`}
            onClick={() => {
              setProblem(null);
              onFile(null);
            }}
            disabled={disabled}
          >
            <XIcon />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={open}
          disabled={disabled}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            choose(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input px-4 text-center text-sm transition-colors outline-none hover:border-ring hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
            compact ? 'py-3' : 'py-6',
            over && 'border-primary bg-primary/5',
          )}
        >
          <UploadIcon className="size-5 text-muted-foreground" />
          <span>
            <span className="font-medium text-primary">{label}</span> or drop it here
          </span>
          <span className="text-xs text-muted-foreground">PDF, Word (.docx) or text, up to 4 MB</span>
        </button>
      )}
      {problem ? (
        <p className="text-sm text-destructive" role="alert">
          {problem}
        </p>
      ) : null}
    </div>
  );
}
