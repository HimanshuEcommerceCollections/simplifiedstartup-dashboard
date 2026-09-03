/**
 * Copied from simplifiedstartup-server/src/contracts — the server repo is the
 * source of truth. Keep in sync when the contract changes.
 */

export const ROLES = ["ADMIN", "EDITOR", "RECRUITER", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ["invited", "active", "disabled"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const LEAD_STATUSES = ["new", "contacted", "booked", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type SessionUser = { id: string; email: string; name: string | null; role: Role };

export type UserDto = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  status: UserStatus;
  createdAt: string;
  invitedByName?: string | null;
};

export type LeadDto = {
  id: string;
  name: string;
  email: string;
  business: string | null;
  stage: string;
  need: string;
  message: string | null;
  status: LeadStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubscriberDto = { id: string; email: string; sourcePage: string | null; createdAt: string };

export type StatsDto = {
  leads: { total: number } & Record<LeadStatus, number>;
  subscribers: number;
  users: number;
};

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };
