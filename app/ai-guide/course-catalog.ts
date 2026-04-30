export interface SuggestedCourse {
  name: string;
  provider: string;
  duration: string;
  category: string;
}

const CATALOG: Record<string, SuggestedCourse[]> = {
  "Data & AI": [
    { name: "Google Data Analytics Certificate", provider: "Coursera", duration: "~6 months", category: "Data & AI" },
    { name: "IBM Data Science Professional Certificate", provider: "Coursera", duration: "~10 months", category: "Data & AI" },
    { name: "SQL for Data Science", provider: "UC Davis / Coursera", duration: "~4 weeks", category: "Data & AI" },
    { name: "Machine Learning Specialization", provider: "DeepLearning.AI / Coursera", duration: "~3 months", category: "Data & AI" },
  ],
  "Technology": [
    { name: "CS50: Introduction to Computer Science", provider: "Harvard / edX", duration: "~11 weeks", category: "Technology" },
    { name: "Google IT Support Professional Certificate", provider: "Coursera", duration: "~6 months", category: "Technology" },
    { name: "The Odin Project (Full Stack)", provider: "The Odin Project", duration: "Self-paced", category: "Technology" },
    { name: "AWS Cloud Practitioner Essentials", provider: "AWS Skill Builder", duration: "~6 hours", category: "Technology" },
  ],
  "Business": [
    { name: "Google Project Management Certificate", provider: "Coursera", duration: "~6 months", category: "Business" },
    { name: "HubSpot Marketing Certification", provider: "HubSpot Academy", duration: "~4–8 hours", category: "Business" },
    { name: "Financial Markets", provider: "Yale / Coursera", duration: "~7 weeks", category: "Business" },
    { name: "The Strategy of Content Marketing", provider: "UC Davis / Coursera", duration: "~4 weeks", category: "Business" },
  ],
  "Healthcare": [
    { name: "Healthcare Administration Specialization", provider: "Rutgers / Coursera", duration: "~5 months", category: "Healthcare" },
    { name: "Patient Safety", provider: "Johns Hopkins / Coursera", duration: "~4 weeks", category: "Healthcare" },
    { name: "Health Informatics Specialization", provider: "Johns Hopkins / Coursera", duration: "~5 months", category: "Healthcare" },
  ],
  "Trades & Skilled Work": [
    { name: "OSHA 10-Hour General Industry Safety", provider: "Coursera", duration: "~10 hours", category: "Trades & Skilled Work" },
    { name: "Construction Management Specialization", provider: "Columbia / Coursera", duration: "~5 months", category: "Trades & Skilled Work" },
    { name: "Electrical Systems Fundamentals", provider: "LinkedIn Learning", duration: "Self-paced", category: "Trades & Skilled Work" },
  ],
  "Education": [
    { name: "Foundations of Teaching for Learning", provider: "Commonwealth Ed Trust / Coursera", duration: "~4 weeks", category: "Education" },
    { name: "Learning How to Learn", provider: "UC San Diego / Coursera", duration: "~4 weeks", category: "Education" },
    { name: "Instructional Design Specialization", provider: "UC San Diego / Coursera", duration: "~5 months", category: "Education" },
  ],
  "Creative Arts": [
    { name: "Google UX Design Certificate", provider: "Coursera", duration: "~6 months", category: "Creative Arts" },
    { name: "Graphic Design Specialization", provider: "CalArts / Coursera", duration: "~5 months", category: "Creative Arts" },
    { name: "Adobe Photoshop — The Complete Guide", provider: "Udemy", duration: "~14 hours", category: "Creative Arts" },
  ],
  "Public Service": [
    { name: "Social Impact Strategy", provider: "UPenn / Coursera", duration: "~4 weeks", category: "Public Service" },
    { name: "Advocacy and Policy Change", provider: "University of Maryland / Coursera", duration: "~4 weeks", category: "Public Service" },
    { name: "Nonprofit Management Certificate", provider: "LinkedIn Learning", duration: "Self-paced", category: "Public Service" },
  ],
};

// Round-robins through the user's interests so suggestions are varied across categories.
export function getSuggestionsForInterests(
  interests: string[],
  maxTotal = 5
): SuggestedCourse[] {
  if (interests.length === 0) return [];

  const suggestions: SuggestedCourse[] = [];
  const seen = new Set<string>();
  let round = 0;

  while (suggestions.length < maxTotal) {
    let addedThisRound = false;
    for (const interest of interests) {
      if (suggestions.length >= maxTotal) break;
      const courses = CATALOG[interest] ?? [];
      if (round < courses.length) {
        const course = courses[round];
        if (!seen.has(course.name)) {
          seen.add(course.name);
          suggestions.push(course);
          addedThisRound = true;
        }
      }
    }
    if (!addedThisRound) break;
    round++;
  }

  return suggestions;
}
