import type { JobStatus } from '@/lib/format';

export type ReviewJob = {
  id: number;
  userId: number;
  platform: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  manualApplyUrl: string | null;
  applyMethod: string | null;
  salary: string | null;
  techStack: string | null;
  status: JobStatus;
  aiScore: number | null;
  aiReason: string | null;
  eligibility: string | null;
  /** Only Focus mode loads it; the list opens the job panel instead. */
  description?: string | null;
  createdAt: string;
};

/** A user in view: their score band, whether Review is on for them and how many close calls wait. */
export type ReviewUser = { id: number; review: boolean; band: { min: number; max: number }; waiting: number };

export type ReviewAction = 'approve' | 'reject' | 'keep';
