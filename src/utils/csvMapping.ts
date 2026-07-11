export const AUTO_MATCH_RULES = [
  { keywords: ["name", "full name", "fullname"], field: "full_name" },
  { keywords: ["first"], field: "first_name" },
  { keywords: ["last", "surname"], field: "last_name" },
  { keywords: ["email", "mail", "e-mail"], field: "email" },
  { keywords: ["phone", "mobile", "number", "contact", "tel"], field: "phone" },
  { keywords: ["company", "business", "brand", "biz", "org"], field: "company" },
  { keywords: ["instagram", "insta", "ig"], field: "instagram_url" },
  { keywords: ["linkedin"], field: "linkedin_url" },
  { keywords: ["twitter", "twit", "x handle"], field: "twitter_url" },
  { keywords: ["website", "url", "site", "web"], field: "website" },
  { keywords: ["priority", "temp", "tier", "hot", "warm"], field: "priority" },
  { keywords: ["status", "stage", "pipeline"], field: "status" },
  { keywords: ["action", "task", "next step"], field: "action_to_take" },
  { keywords: ["niche", "category", "industry", "type"], field: "niche" },
  { keywords: ["note", "notes", "comment", "desc"], field: "notes" },
  { keywords: ["platform"], field: "platform" }
];

export function autoMatchHeaders(headers: string[]): Record<number, string> {
  const mapping: Record<number, string> = {};

  headers.forEach((header, index) => {
    const lowerHeader = header.toLowerCase().trim();
    let matched = false;

    for (const rule of AUTO_MATCH_RULES) {
      if (rule.keywords.some(kw => lowerHeader.includes(kw))) {
        mapping[index] = rule.field;
        matched = true;
        break;
      }
    }

    if (!matched) {
      mapping[index] = "skip";
    }
  });

  return mapping;
}

export function splitFullName(fullName: string): { first_name: string; last_name: string } {
  if (!fullName) return { first_name: "", last_name: "" };
  
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: "" };
  }
  
  const first_name = parts[0];
  const last_name = parts.slice(1).join(" ");
  
  return { first_name, last_name };
}

export function normalizePriority(value: string, defaultPriority: string): string {
  if (!value) return defaultPriority;
  
  const lower = value.toLowerCase().trim();
  
  if (lower === "hot" || lower === "🔥" || lower === "🔥 hot") return "Hot";
  if (lower === "warm" || lower === "⚡" || lower === "⚡ warm") return "Warm";
  if (lower === "cold" || lower === "🧊" || lower === "🧊 cold") return "Cold";
  
  return defaultPriority;
}
