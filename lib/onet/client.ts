import type {
  ONetQuestionsResponse,
  ONetResultsResponse,
  ONetCareersResponse,
  RIASECScores,
} from "@/types/onet";

export const ONET_ATTRIBUTION =
  "This product uses the O*NET Web Services by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license.";

const BASE_URL = "https://services.onetcenter.org/ws";

// Maps full RIASEC key names to single-letter Holland codes
const RIASEC_CODES: Record<keyof RIASECScores, string> = {
  realistic: "R",
  investigative: "I",
  artistic: "A",
  social: "S",
  enterprising: "E",
  conventional: "C",
};

// Maps single-letter Holland codes to RIASECScores keys
const AREA_ID_TO_KEY: Record<string, keyof RIASECScores> = {
  R: "realistic",
  I: "investigative",
  A: "artistic",
  S: "social",
  E: "enterprising",
  C: "conventional",
};

function apiKey(): string {
  const key = process.env.ONET_API_KEY;
  if (!key) {
    throw new Error("ONET_API_KEY environment variable is required");
  }
  return key;
}

async function onetFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: "Basic " + Buffer.from(`${apiKey()}:`).toString("base64"),
      ...options?.headers,
    },
    // Disable Next.js caching for live O*NET data
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `O*NET API error: ${res.status} ${res.statusText} (${path})`
    );
  }

  return res.json() as Promise<T>;
}

export async function getQuestions(): Promise<ONetQuestionsResponse> {
  console.log('[onet] API key exists:', !!process.env.ONET_API_KEY)
  console.log('[onet] API key prefix:', process.env.ONET_API_KEY?.substring(0, 8))
  return onetFetch<ONetQuestionsResponse>(
    "/mnm/interestprofiler/questions?start=1&end=60"
  );
}

export async function getResults(answers: number[]): Promise<RIASECScores> {
  if (answers.length !== 60) {
    throw new Error(`Expected 60 answers, got ${answers.length}`);
  }
  if (answers.some((a) => a < 1 || a > 5 || !Number.isInteger(a))) {
    throw new Error("Each answer must be an integer between 1 and 5");
  }

  const params = new URLSearchParams({ answers: answers.join(",") });
  const raw = await onetFetch<ONetResultsResponse>(
    `/mnm/interestprofiler/results?${params}`
  );

  const scores: Partial<RIASECScores> = {};
  for (const area of raw.result.area) {
    const key = AREA_ID_TO_KEY[area.id];
    if (key) scores[key] = area.score;
  }

  return scores as RIASECScores;
}

export async function getOccupations(
  riasecScores: RIASECScores,
  { start = 1, end = 20 }: { start?: number; end?: number } = {}
): Promise<ONetCareersResponse> {
  // Sort by score descending and take the top 3 Holland codes
  const topAreas = (Object.entries(riasecScores) as [keyof RIASECScores, number][])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key]) => RIASEC_CODES[key])
    .join(",");

  const params = new URLSearchParams({
    area: topAreas,
    start: String(start),
    end: String(end),
  });

  // Note: v2.0 docs also show a ?answers= variant on this endpoint that skips
  // the RIASEC step entirely. Verify ?area= is supported with a live key; if not,
  // restructure to pass raw answers through from getResults() instead.
  return onetFetch<ONetCareersResponse>(
    `/mnm/interestprofiler/careers?${params}`
  );
}
