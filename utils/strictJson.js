export const extractStrictJson = (text) => {
  if (!text) return null;

  // Remove ```json ... ``` wrappers if Gemini adds them
  const cleaned = text
    .replace(/```json/gi, "```")
    .replace(/```/g, "")
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Try to extract the first {...} block
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;

    const maybeJson = cleaned.slice(start, end + 1);
    try {
      return JSON.parse(maybeJson);
    } catch {
      return null;
    }
  }
};

export const normalizeFlags = (flags) => {
  if (!Array.isArray(flags)) return [];

  const allowedSeverity = new Set(["low", "medium", "high"]);
  return flags
    .filter(Boolean)
    .map((f) => ({
      type: String(f.type || "other"),
      severity: allowedSeverity.has(String(f.severity).toLowerCase())
        ? String(f.severity).toLowerCase()
        : "medium",
      message: String(f.message || "Potential issue detected"),
      example: f.example ? String(f.example).slice(0, 140) : "",
      fix: f.fix ? String(f.fix).slice(0, 220) : "",
      whyItMatters: f.whyItMatters ? String(f.whyItMatters).slice(0, 220) : ""
    }))
    .slice(0, 10);
};
