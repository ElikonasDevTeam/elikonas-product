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
}
