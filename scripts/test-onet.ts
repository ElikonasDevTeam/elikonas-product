/**
 * Temporary debug script — test O*NET v2 API connectivity and endpoint paths.
 * Run with: ONET_API_KEY=xxx npx tsx scripts/test-onet.ts
 */

const BASE_URL = "https://api-v2.onetcenter.org";

const key = process.env.ONET_API_KEY;
if (!key) {
  console.error("ONET_API_KEY is not set. Run with: ONET_API_KEY=xxx npx tsx scripts/test-onet.ts");
  process.exit(1);
}

const headers = {
  "X-API-Key": key,
  Accept: "application/json",
};

const endpoints = [
  { label: "Questions",  path: "/mnm/interestprofiler/questions?start=1&end=5" },
  { label: "Results",    path: "/mnm/interestprofiler/results?answers=" + "3".repeat(60) },
  { label: "Careers",    path: "/mnm/interestprofiler/careers?realistic=30&investigative=25&artistic=20&social=30&enterprising=15&conventional=10&start=1&end=5" },
];

async function main() {
  console.log("Base URL:", BASE_URL);
  console.log("Key prefix:", key.substring(0, 8) + "...");

  for (const ep of endpoints) {
    console.log("\n" + "─".repeat(60));
    console.log(ep.label, "→", ep.path);
    console.log("─".repeat(60));
    try {
      const res = await fetch(`${BASE_URL}${ep.path}`, { headers } as RequestInit);
      console.log("Status:", res.status, res.statusText);
      const text = await res.text();
      if (res.ok) {
        console.log("Body (truncated):", text.slice(0, 400));
      } else {
        console.log("Error body:", text);
        console.log("Response headers:");
        res.headers.forEach((v, k) => console.log(`  ${k}: ${v}`));
      }
    } catch (err) {
      console.log("Fetch error:", err);
    }
  }
}

main();
