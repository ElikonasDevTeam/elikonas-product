export interface ONetQuestion {
  index: number;
  area: string; // R | I | A | S | E | C
  text: string;
}

export interface ONetQuestionsResponse {
  total: number;
  start: number;
  end: number;
  question: ONetQuestion[];
}

export interface ONetResultArea {
  id: string; // R | I | A | S | E | C
  score: number;
}

export interface ONetResultsResponse {
  result: {
    area: ONetResultArea[];
  };
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
  bright_outlook: boolean;
  green: boolean;
  apprenticeship: boolean;
}

export interface ONetCareer {
  code: string;
  title: string;
  tags: ONetCareerTags;
  href: string;
}

export interface ONetCareersResponse {
  career: ONetCareer[];
  total: number;
  start: number;
  end: number;
}
