export interface ONetQuestion {
  index: number;
  area: string; // "realistic" | "investigative" | "artistic" | "social" | "enterprising" | "conventional"
  text: string;
}

export interface ONetQuestionsResponse {
  total: number;
  start: number;
  end: number;
  question: ONetQuestion[];
}

// v2 API: scores are returned embedded in the careers URL query params
export interface ONetResultsResponse {
  careers: string; // URL with ?realistic=N&investigative=N&... — used to extract scores
  result: Array<{
    href: string;
    code: string;  // e.g. "realistic"
    title: string;
    description: string;
  }>;
}

export interface RIASECScores {
  realistic: number;
  investigative: number;
  artistic: number;
  social: number;
  enterprising: number;
  conventional: number;
}

export interface ONetCareerTags {
  bright_outlook?: boolean;
  green?: boolean;
  apprenticeship?: boolean;
}

export interface ONetCareer {
  code: string;
  title: string;
  tags: ONetCareerTags;
  href: string;
  fit?: string; // e.g. "Best", "Great" — present in v2
}

export interface ONetCareersResponse {
  career: ONetCareer[];
  total: number;
  start: number;
  end: number;
}
