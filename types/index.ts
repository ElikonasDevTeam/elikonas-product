export type UserRole = "learner" | "provider" | "admin";

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  provider_id: string;
  title: string;
  description: string;
  price_cents: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  learner_id: string;
  course_id: string;
  stripe_payment_intent_id: string | null;
  status: "pending" | "active" | "completed" | "refunded";
  enrolled_at: string;
}

export type EdUnitStatus = "completed" | "in_progress" | "planned";

export type NotificationType =
  | "new_like"
  | "new_comment"
  | "new_connection"
  | "connection_accepted"
  | "system";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  created_at: string;
}

export const CATEGORIES = [
  "Data & AI",
  "Healthcare",
  "Technology",
  "Business",
  "Trades & Skilled Work",
  "Education",
  "Creative Arts",
  "Public Service",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface EdUnit {
  id: string;
  user_id: string;
  name: string;
  provider: string;
  category: Category;
  status: EdUnitStatus;
  progress_pct: number;
  created_at: string;
  updated_at: string;
}

// Independent flags, not a single either/or classification — a credential
// can be both self_attest and cert_upload at once (a learner's own upload),
// or accredited and cert_upload (an institution-issued document uploaded as
// evidence). open_cred/accredited/blockchain have no automated flow yet —
// the schema supports them (e.g. for a manually-entered historical degree),
// but only self_attest + cert_upload are set by any code path today.
export interface Credential {
  id: string;
  ed_unit_id: string;
  user_id: string;
  self_attest: boolean;
  cert_upload: boolean;
  open_cred: boolean;
  accredited: boolean;
  blockchain: boolean;
  file_url: string | null;
  course_url: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
