export const GROUP_TOPICS = [
  "Data & AI",
  "Technology",
  "Business",
  "Healthcare",
  "Trades & Skilled Work",
  "Education",
  "Creative Arts",
  "Public Service",
] as const;

export type GroupTopic = (typeof GROUP_TOPICS)[number];
