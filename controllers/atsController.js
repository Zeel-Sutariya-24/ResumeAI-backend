import { GoogleGenerativeAI } from "@google/generative-ai";

export const atsCheck = async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash"
    });

    const prompt = `
You MUST return exactly and only a valid JSON object.
NO markdown formatting.
NO explanation.
NO commentary.
NO text outside of JSON.

Your output MUST follow THIS EXACT SCHEMA:

{
  "score": 0,
  "matchedSkills": [],
  "missingKeywords": [],
  "recommendations": [
    "Paragraph 1 ...",
    "Paragraph 2 ...",
    "Paragraph 3 ...",
    "Paragraph 4 ...",
    "Paragraph 5 ..."
  ],
  "HrFinalVerdict": ""
}

STRICT RULES:
1. All 5 fields MUST be present.
2. "score" MUST be a number (0–100).
3. "matchedSkills" MUST be an array of strings.
4. "missingKeywords" MUST be an array of strings.

5. recommendations MUST:
   - Be returned as an ARRAY of paragraphs.
   - Each paragraph should be 2–4 sentences. Include an example that can be added.
   - There MUST be 3–6 total paragraphs.
   - NO bullet points, NO markdown, NO symbols like *, -, •.
   - Each paragraph should focus on ONE improvement area only:
       1) Missing skills
       2) Resume restructuring
       3) Achievements & metrics
       4) Keyword optimization
       5) Certifications & training
       6) Score improvement strategy (how to reach 90+ ATS) is MUST.

6. "HrFinalVerdict" MUST:
    - Start with EXACTLY one of the following:
      "DECISION: SHORTLIST"
      "DECISION: REJECT"
    - Sound like a harsh, STRICT, no-nonsense HR manager.
    - Then 3–5 sentences explaining why.
    - MUST NOT mention the opposite decision.
    - MUST NOT contain both 'shortlist' and 'reject'.

7. NO additional fields allowed.
8. If unsure, make your best judgment but still fill all fields.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    console.log("RAW GEMINI RESPONSE:", text);

    // Strip accidental markdown formatting
    const clean = text.replace(/```json|```/g, "").trim();

    let parsed = {};
    try {
      parsed = JSON.parse(clean);
    } catch (jsonErr) {
      console.error("JSON PARSE ERROR:", jsonErr);
      return res.status(500).json({
        error: "Model returned invalid JSON.",
        raw: clean
      });
    }

    // Apply safe fallbacks
    parsed.score = parsed.score || 0;
    parsed.matchedSkills = parsed.matchedSkills || [];
    parsed.missingKeywords = parsed.missingKeywords || [];

    parsed.recommendations = Array.isArray(parsed.recommendations)
      ? parsed.recommendations
      : ["No recommendations provided."];

    parsed.HrFinalVerdict =
      parsed.HrFinalVerdict || "DECISION: REJECT. Model failed to provide a verdict.";

    // Attach original text
    parsed.resumeText = resumeText;
    parsed.jobDescription = jobDescription;

    res.json(parsed);

  } catch (err) {
    console.error("ATS ERROR:", err);
    res.status(500).json({ error: "ATS internal server error." });
  }
};
