import express from "express";
import { atsCheck } from "../controllers/atsController.js";
import { extractTextRoute } from "../controllers/extractRouteController.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractStrictJson, normalizeFlags } from "../utils/strictJson.js";

const router = express.Router();
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

router.post("/ats-check", atsCheck);

// THIS is the correct route for file uploads
router.post("/extract-text", extractTextRoute);


router.post("/red-flags", async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || String(resumeText).trim().length < 50) {
      return res.status(400).json({
        success: false,
        error: "resumeText is required"
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });


    const prompt = `
You are a senior recruiter and resume reviewer.

Analyze the RESUME TEXT (and optional JOB DESCRIPTION) and identify recruiter red flags.
Do NOT be generic. Only include issues that could realistically hurt callback chances.
If no meaningful red flags exist, return an empty flags array.

Return STRICT JSON only with this schema:

{
  "flags": [
    {
      "type": "buzzwords|metrics|verbs|dates|phrases|format|clarity|other",
      "severity": "low|medium|high",
      "message": "Short recruiter-style red flag",
      "example": "A short quote from the resume that demonstrates the issue (optional)",
      "whyItMatters": "Why recruiters care (1 sentence)",
      "fix": "Specific fix suggestion (1 sentence)"
    }
  ]
}

Rules:
- max 8 flags
- examples must be short (<= 120 chars)
- don't invent facts not present in the resume
- prefer actionable, recruiter-realistic advice
- output JSON ONLY (no markdown)

JOB DESCRIPTION (optional):
${jobDescription ? jobDescription : "(none)"}

RESUME TEXT:
${resumeText}
`;

    const result = await model.generateContent(prompt);
    const raw = result?.response?.text?.() || "";

    const parsed = extractStrictJson(raw);
    console.log("🧠 RAW GEMINI OUTPUT:\n", raw);

    // ✅ FAIL-SAFE: Gemini sometimes returns garbage
    if (!parsed || !Array.isArray(parsed.flags)) {
    console.warn("⚠️ Gemini returned invalid JSON. Returning empty flags.");
    return res.json({
        success: true,
        flags: []
    });
    }

    const flags = normalizeFlags(parsed.flags);

    return res.json({
    success: true,
    flags
    });

  } catch (err) {
    console.error("❌ Red flags generation failed:", err.message);

    // Never break UX — return empty flags instead
    return res.json({
        success: true,
        flags: []
    });
}

});


export default router;
