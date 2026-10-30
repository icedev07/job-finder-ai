import type { CloseReason, JobStage } from '@/lib/format';

export type BoardCard = {
  id: number;
  userId: number;
  title: string;
  company: string;
  location: string | null;
  platform: string;
  aiScore: number | null;
  stage: JobStage;
  closeReason: CloseReason | null;
  stageUpdatedAt: string | null;
  appliedAt: string | null;
  followUpAt: string | null;
  url: string;
  manualApplyUrl: string | null;
  applyMethod: string | null;
  createdAt: string;
};

export type BoardColumn = { stage: JobStage; total: number; cards: BoardCard[] };

/** A user in view: Applications on or off, and their whole pipeline's numbers. */
export type BoardUser = {
  id: number;
  on: boolean;
  saved: number;
  applied: number;
  interview: number;
  offer: number;
  followUpsDue: number;
};

export type Board = { columns: BoardColumn[]; users: BoardUser[]; sources: { platform: string; count: number }[] };

/** Where cards go: a stage, and for Archived the reason (null: none). */
export type Destination = { stage: JobStage; closeReason?: CloseReason | null };
