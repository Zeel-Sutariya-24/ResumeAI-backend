import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

router.post("/generate-skills", async (req, res) => {
  try {
    console.log("Generate skills request received");

    const { resumeData } = req.body;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    //  USE SAME MODEL AS ATS
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `
You are an ATS resume expert.

TASK:
Extract and generate professional SKILLS from the resume data.

RULES (MANDATORY):
1. Return ONLY a valid JSON array of strings.
2. Each string must be a non-empty skill name.
3. Minimum 8 skills, maximum 15 skills.
4. Skills must be concrete (tools, technologies, competencies).
5. NO empty strings.
6. NO markdown.
7. NO explanation.
8. NO duplicates.


BAD EXAMPLES:
["","skill","N/A"]

Resume Data:
${JSON.stringify(resumeData, null, 2)}
`;


    const result = await model.generateContent(prompt);
    const text = result.response.text();

    console.log("RAW SKILLS RESPONSE:", text);

    const clean = text.replace(/```json|```/g, "").trim();

    let skills;
    try {
      skills = JSON.parse(clean);
    } catch (err) {
      console.error("SKILLS JSON PARSE ERROR:", err);
      return res.status(500).json({
        error: "Model returned invalid JSON",
        raw: clean
      });
    }

    skills = skills
        .map(s => s.trim())
        .filter(s => s.length > 0);

        if (skills.length === 0) {
        return res.status(500).json({
            error: "AI returned empty skills list"
        });
    }


    if (!Array.isArray(skills)) {
      return res.status(500).json({
        error: "Invalid skills format",
        raw: clean
      });
    }

    res.json({ skills });

  } catch (error) {
    console.error("SKILLS AI ERROR:", error);
    res.status(500).json({ error: "AI skill generation failed" });
  }
});

export default router;
