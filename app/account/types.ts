export type PrivacyField =
  | "show_interests"
  | "show_edunits_count"
  | "show_progress_pct"
  | "show_planned_units"
  | "show_learning_record";

export interface PrivacySettings {
  show_interests: boolean;
  show_edunits_count: boolean;
  show_progress_pct: boolean;
  show_planned_units: boolean;
  show_learning_record: boolean;
}

export const DEFAULT_PRIVACY: PrivacySettings = {
  show_interests: false,
  show_edunits_count: false,
  show_progress_pct: false,
  show_planned_units: false,
  show_learning_record: false,
};
