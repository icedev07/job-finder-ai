'use client';

import { api } from '@/lib/clientApi';
import type { CandidateProfile } from '@/lib/profileModel';

// The resume requests the admin UI makes (Profile & resumes, Add user).

export type ResumeItem = {
  id: number;
  name: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  tags: string | null;
  isDefault: boolean;
  parsed: boolean;
  createdAt: string;
  updatedAt: string;
};

/** What Claude found in a resume; `model` is null when an earlier reading came back (`reused`). */
export type ResumeReading = { profile: CandidateProfile; model: string | null; costUsd: number | null; reused?: boolean };

export type UploadedResume = { id: number; isDefault: boolean; readable: boolean; read: boolean; filled: string[] };

export async function listResumes(): Promise<{ resumes: ResumeItem[]; error?: string }> {
  return api<{ resumes: ResumeItem[]; error?: string }>('/api/admin/resumes');
}

/**
 * Uploads a resume for the user being viewed, or for `userId` (Add user). `reading` (done before, with
 * readResumeFile) is stored with it, and `fillProfile` copies its facts into that user's profile.
 */
export async function uploadResume(
  file: File,
  opts: {
    name?: string;
    tags?: string;
    makeDefault?: boolean;
    reading?: { profile: CandidateProfile; text: string };
    fillProfile?: boolean;
    userId?: number;
  } = {},
): Promise<UploadedResume> {
  const form = new FormData();
  form.set('file', file);
  if (opts.name?.trim()) form.set('name', opts.name.trim());
  if (opts.tags?.trim()) form.set('tags', opts.tags.trim());
  if (opts.makeDefault) form.set('makeDefault', 'true');
  if (opts.reading) form.set('reading', JSON.stringify(opts.reading));
  if (opts.fillProfile) form.set('fillProfile', 'replace');
  return api<UploadedResume>('/api/admin/resumes', {
    method: 'POST',
    body: form,
    headers: opts.userId ? { 'X-JF-View': String(opts.userId) } : undefined,
  });
}

/** Claude reads a stored resume; with `reuse`, an earlier reading comes back at once. */
export async function readStoredResume(id: number, reuse: boolean): Promise<ResumeReading> {
  return api<ResumeReading>(`/api/admin/resumes/${id}/parse`, { method: 'POST', json: { reuse } });
}

/** Claude reads a file that is not stored yet (Add user). */
export async function readResumeFile(file: File): Promise<ResumeReading & { text: string }> {
  const form = new FormData();
  form.set('file', file);
  return api<ResumeReading & { text: string }>('/api/admin/resumes/read', { method: 'POST', body: form });
}
