import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

/* =========================
   Helpers
========================= */

// Remove duplicates (case-insensitive)
const uniq = (arr) => {
  const seen = new Set();
  return arr.filter((x) => {
    const v = (x || "").trim();
    if (!v) return false;
    const k = v.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

// Escape regex safely
const escapeRegex = (s) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Count phrase occurrences
const countInText = (phrase, text = "") => {
  const re = new RegExp(`\\b${escapeRegex(phrase)}\\b`, "gi");
  const m = text.match(re);
  return m ? m.length : 0;
};

// Detect JD sections (works for any industry)
const splitJDSections = (jd = "") => {
  const lower = jd.toLowerCase();

  const zones = [
    { weight: 3, keys: ["requirements", "qualifications", "must have", "required"] },
    { weight: 3, keys: ["skills", "technical skills", "key skills"] },
    { weight: 2, keys: ["responsibilities", "duties", "what you will do"] },
    { weight: 1, keys: ["preferred", "nice to have", "assets"] }
  ];

  const blocks = [];

  zones.forEach((z) => {
    z.keys.forEach((k) => {
      const idx = lower.indexOf(k);
      if (idx !== -1) {
        blocks.push({
          weight: z.weight,
          text: jd.slice(idx)
        });
      }
    });
  });

  // fallback: whole JD
  if (!blocks.length) {
    return [{ weight: 1, text: jd }];
  }

  return blocks;
};

// Generic "is this a skill" heuristic
const looksLikeSkill = (s) => {
  if (!s) return false;
  if (s.length > 40) return false;
  if (s.split(" ").length > 6) return false;
  if (/[.,;:]/.test(s)) return false;
  return true;
};

// Rank missing keywords based on JD importance
const rankMissingKeywords = (missing, jobDescription) => {
  const blocks = splitJDSections(jobDescription);

  return missing
    .map((kw) => {
      const skill = kw.trim();
      if (!skill) return null;

      const base = countInText(skill, jobDescription);

      const zoneBoost = blocks.reduce((sum, b) => {
        return sum + countInText(skill, b.text) * b.weight;
      }, 0);

      const shapeBonus = looksLikeSkill(skill) ? 2 : -3;

      return {
        skill,
        score: base * 2 + zoneBoost + shapeBonus
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.skill);
};

/* =========================
   ROUTE
========================= */

router.post("/optimize-resume", async (req, res) => {
  try {
    const {
      personalInfo,
      currentSummary,
      currentSkills,
      atsResult,
      jobDescription
    } = req.body;

    /* ---------- Normalize skills ---------- */
    const currentSkillStrings = Array.isArray(currentSkills)
      ? currentSkills
          .map((s) => (typeof s === "string" ? s : s?.name))
          .filter(Boolean)
      : [];

    const matched = Array.isArray(atsResult?.matchedSkills)
      ? atsResult.matchedSkills
      : [];

    const missing = Array.isArray(atsResult?.missingKeywords)
      ? atsResult.missingKeywords
      : [];

    /* ---------- Rank missing keywords (DOMAIN-AGNOSTIC) ---------- */
    const prioritizedMissing = rankMissingKeywords(missing, jobDescription);

    /* ---------- Merge skills intelligently ---------- */
    const mergedSkills = uniq([
      ...currentSkillStrings,
      ...matched,
      ...prioritizedMissing
    ]).slice(0, 20);

    const skillsToAddAll = mergedSkills.filter(
      (s) =>
        !currentSkillStrings.some(
          (x) => x.toLowerCase() === s.toLowerCase()
        )
    );

    const skillsToAdd = skillsToAddAll.slice(0, 12);
    const extraMissingCount = Math.max(
      0,
      skillsToAddAll.length - skillsToAdd.length
    );

    /* ---------- AI Summary Rewrite ---------- */
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `
You are a strict ATS resume writer.

Return ONLY valid JSON. No markdown.

Schema:
{
  "optimizedSummary": ""
}

Rules:
- 3–5 sentences
- ATS-friendly, professional tone
- Rewrite existing summary without changing meaning
- Naturally include important keywords
- No placeholders, no brackets, no bullet points
- Do NOT mention ATS or job description

Personal Info:
${JSON.stringify(personalInfo, null, 2)}

Current Summary:
${currentSummary || ""}

Important Keywords:
${JSON.stringify(prioritizedMissing.slice(0, 10), null, 2)}

Job Description:
${jobDescription || ""}
`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(500).json({
        error: "Invalid JSON from Gemini",
        raw
      });
    }

    const optimizedSummary = (parsed.optimizedSummary || "").trim();

    /* ---------- Response ---------- */
    return res.json({
      optimizedSummary,
      mergedSkills,
      skillsToAdd,
      extraMissingCount
    });

  } catch (err) {
    console.error("OPTIMIZE ERROR:", err);
    return res.status(500).json({ error: "Optimize resume failed" });
  }
});

export default router;
