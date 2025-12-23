import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

router.post("/generate-summary", async (req, res) => {
  try {
    const { personalInfo, currentSummary } = req.body;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `
You are a professional resume writer.

TASK:
Rewrite or generate a PROFESSIONAL SUMMARY for a resume.

RULES:
1. Output ONLY plain text.
2. 3–5 concise sentences.
3. Professional, confident tone.
4. ATS-friendly keywords.
5. No bullet points.
6. No headings.
7. No fluff.
8. If an existing summary is provided, IMPROVE it.
9. If empty, GENERATE one from personal info.

Personal Info:
${JSON.stringify(personalInfo, null, 2)}

Existing Summary (may be empty):
"${currentSummary}"
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    if (!text || text.length < 30) {
      return res.status(500).json({
        error: "Generated summary is too short"
      });
    }

    res.json({ summary: text });

  } catch (err) {
    console.error("SUMMARY AI ERROR:", err);
    res.status(500).json({ error: "AI summary generation failed" });
  }
});

export default router;
