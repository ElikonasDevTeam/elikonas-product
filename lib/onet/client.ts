import type {
  ONetQuestionsResponse,
  ONetResultsResponse,
  ONetCareersResponse,
  RIASECScores,
} from "@/types/onet";

export const ONET_ATTRIBUTION =
  "This product uses the O*NET Web Services by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license.";

const BASE_URL = "https://api-v2.onetcenter.org";

const RIASEC_KEYS: (keyof RIASECScores)[] = [
  "realistic",
  "investigative",
  "artistic",
  "social",
  "enterprising",
  "conventional",
];

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
      "X-API-Key": apiKey(),
      ...options?.headers,
    },
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

  // v2 API requires answers as a concatenated digit string (no separators)
  const params = new URLSearchParams({ answers: answers.join("") });
  const raw = await onetFetch<ONetResultsResponse>(
    `/mnm/interestprofiler/results?${params}`
  );

  // v2 returns scores embedded in the careers URL query params
  const careersUrl = new URL(raw.careers);
  const scores: Partial<RIASECScores> = {};
  for (const key of RIASEC_KEYS) {
    const val = careersUrl.searchParams.get(key);
    if (val !== null) scores[key] = Number(val);
  }

  return scores as RIASECScores;
}

export async function getOccupations(
  riasecScores: RIASECScores,
  { start = 1, end = 20 }: { start?: number; end?: number } = {}
): Promise<ONetCareersResponse> {
  // v2 API takes individual RIASEC score params
  const params = new URLSearchParams({
    realistic:     String(riasecScores.realistic),
    investigative: String(riasecScores.investigative),
    artistic:      String(riasecScores.artistic),
    social:        String(riasecScores.social),
    enterprising:  String(riasecScores.enterprising),
    conventional:  String(riasecScores.conventional),
    start:         String(start),
    end:           String(end),
  });

  return onetFetch<ONetCareersResponse>(
    `/mnm/interestprofiler/careers?${params}`
  );
}
