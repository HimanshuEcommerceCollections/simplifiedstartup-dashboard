/**
 * Copied from simplifiedstartup-server/src/contracts — the server repo is the
 * source of truth. Keep in sync when the contract changes.
 */

export const ROLES = ["ADMIN", "EDITOR", "CONTENT_WRITER", "RECRUITER", "VIEWER"] as const;
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

export const APPLICATION_STATUSES = ["new", "reviewed", "shortlisted", "hired", "rejected"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type CareerRoleDto = {
  id: string;
  title: string;
  type: string;
  location: string | null;
  description: string;
  body: string | null;
  published: boolean;
  sortOrder: number;
  applicationCount?: number;
  createdAt: string;
  updatedAt: string;
};

// ---------- content collections ----------

export const CATEGORY_COLLECTIONS = ["blog", "faq"] as const;
export type CategoryCollection = (typeof CATEGORY_COLLECTIONS)[number];

export type ContentCategoryDto = {
  id: string;
  collection: CategoryCollection;
  key: string;
  label: string;
  sortOrder: number;
  itemCount: number;
};

export type ArticleImageDto = { id: string; url: string; alt: string; isCover: boolean; sortOrder: number };

export type ArticleDto = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  readTime: string;
  artwork: string;
  body: string | null;
  featured: boolean;
  published: boolean;
  sortOrder: number;
  categoryId: string;
  categoryKey: string;
  categoryLabel: string;
  images: ArticleImageDto[];
  updatedAt: string;
};

export type FaqDto = {
  id: string;
  question: string;
  answer: string;
  categoryId: string;
  categoryKey: string;
  categoryLabel: string;
  published: boolean;
  sortOrder: number;
};

export type GlossaryTermDto = { id: string; term: string; definition: string; published: boolean; sortOrder: number };

/** Card-art presets — the actual SVGs live in the website's registry. */
export const ARTWORK_PRESETS = [
  { key: "agency-checklist", label: "Checklist & badge" },
  { key: "cost-bars", label: "Cost bars ($)" },
  { key: "seo-scope", label: "SEO magnifier" },
  { key: "social-chat", label: "Chat bubbles" },
] as const;

export type JobApplicationDto = {
  id: string;
  roleId: string | null;
  roleTitle: string | null;
  name: string;
  email: string;
  phone: string | null;
  portfolioUrl: string | null;
  hasCv: boolean;
  message: string | null;
  status: ApplicationStatus;
  createdAt: string;
};

export type PublishStatusDto = { hookConfigured: boolean; lastPublishedAt: string | null; lastPublishedBy: string | null };
