import { createClient } from "@/lib/supabase/server";

export interface CatalogCourse {
  id: string;
  title: string;
  provider: string;
  topic: string;
  format: string;
  duration_estimate: string | null;
  cost: string | null;
  url: string | null;
  description: string;
}

const COLS = "id,title,provider,topic,format,duration_estimate,cost,url,description";

export async function searchCatalog(
  query: string,
  topics: string[],
  limit = 6
): Promise<CatalogCourse[]> {
  const supabase = await createClient();

  // Narrowest: FTS + topic filter
  if (query && topics.length > 0) {
    const { data } = await supabase
      .from("ed_units_catalog")
      .select(COLS)
      .eq("is_active", true)
      .in("topic", topics)
      .textSearch("fts", query, { type: "websearch" })
      .limit(limit);
    if (data?.length) return data as CatalogCourse[];
  }

  // Widen: FTS across all topics
  if (query) {
    const { data } = await supabase
      .from("ed_units_catalog")
      .select(COLS)
      .eq("is_active", true)
      .textSearch("fts", query, { type: "websearch" })
      .limit(limit);
    if (data?.length) return data as CatalogCourse[];
  }

  // Widen: topic filter, no query
  if (topics.length > 0) {
    const { data } = await supabase
      .from("ed_units_catalog")
      .select(COLS)
      .eq("is_active", true)
      .in("topic", topics)
      .limit(limit);
    if (data?.length) return data as CatalogCourse[];
  }

  // Last resort: any active courses
  const { data } = await supabase
    .from("ed_units_catalog")
    .select(COLS)
    .eq("is_active", true)
    .limit(limit);
  return (data ?? []) as CatalogCourse[];
}
