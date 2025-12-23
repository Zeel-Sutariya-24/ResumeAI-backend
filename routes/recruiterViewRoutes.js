import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractStrictJson } from "../utils/strictJson.js";

const router = express.Router();
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

router.post("/recruiter-view", async (req, res) => {
  try {
    const { resumeText } = req.body;

    if (!resumeText || resumeText.trim().length < 80) {
      return res.status(400).json({
        success: false,
        error: "Resume text is too short"
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `
You are a senior technical recruiter.

Analyze the resume from a REAL recruiter perspective.

Return STRICT JSON only:

{
  "skimmability": "low | medium | high",
  "sixSecondImpression": "1–2 sentence honest recruiter impression",
  "keywordDensity": "low | medium | high",
  "atsReadiness": "poor | average | strong",
  "topIssues": [
    "short issue 1",
    "short issue 2"
  ]
}

Rules:
- Be honest, not nice
- No markdown
- No explanations outside JSON
- If resume is good, say so

RESUME TEXT:
${resumeText}
`;

    const result = await model.generateContent(prompt);
    const raw = result?.response?.text?.() || "";

    const parsed = extractStrictJson(raw);

    if (!parsed) {
      return res.json({
        success: true,
        data: null
      });
    }

    return res.json({
      success: true,
      data: parsed
    });

  } catch (err) {
    console.error("❌ Recruiter view failed:", err.message);
    return res.json({
      success: true,
      data: null
    });
  }
});

export default router;
