// Which resume files the app takes. Pure module (no server imports): the upload forms check a file with the same
// rules before sending it.

export const MAX_RESUME_BYTES = 4 * 1024 * 1024; // Vercel's request body limit is 4.5 MB

export const RESUME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "text/plain": "txt",
  "text/markdown": "md",
};

const TYPE_OF_EXTENSION: Record<string, string> = Object.fromEntries(Object.entries(RESUME_TYPES).map(([type, ext]) => [ext, type]));

/** For a file input's accept attribute. */
export const RESUME_ACCEPT = [...Object.keys(TYPE_OF_EXTENSION).map((ext) => `.${ext}`), ...Object.keys(RESUME_TYPES)].join(",");

/** The type to store: the browser's when it is one the app takes, else the file name's (Windows often sends none for .md or .docx). */
export function resumeType(type: string, fileName: string): string | null {
  if (RESUME_TYPES[type]) return type;
  const ext = /\.([a-z0-9]+)$/i.exec(fileName)?.[1]?.toLowerCase() ?? "";
  return TYPE_OF_EXTENSION[ext] ?? null;
}

/** Why this file cannot be a resume, or null when it can. */
export function resumeFileProblem(file: { name: string; size: number; type: string }): string | null {
  if (file.size === 0) return `${file.name} is empty.`;
  if (file.size > MAX_RESUME_BYTES) return `${file.name} is larger than 4 MB.`;
  if (!resumeType(file.type, file.name)) return `${file.name} is not a PDF, Word (.docx) or text file.`;
  return null;
}

/** A variant name from a file name: "Jane_Doe_CV.pdf" → "Jane Doe CV". */
export function resumeNameOf(fileName: string): string {
  return (
    fileName
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "Resume"
  );
}
