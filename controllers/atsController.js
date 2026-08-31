import { GoogleGenAI, Type } from "@google/genai";

export const atsCheck = async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    // Validate input
    if (!resumeText || !jobDescription) {
      return res.status(400).json({
        error: "resumeText and jobDescription are required.",
      });
    }

    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is missing.");

      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured.",
      });
    }

    // Initialize Gemini
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const prompt = `
You are an expert ATS resume evaluator and a strict HR recruiter.

Analyze the candidate's resume against the provided job description.

Your job is to determine how well the resume matches the job.

EVALUATION CRITERIA:

1. Skills match
2. Relevant experience
3. Job-specific keywords
4. Resume structure
5. Achievements and measurable results
6. Certifications and training
7. Overall ATS compatibility

SCORING RULES:

Give an ATS compatibility score from 0 to 100.

Do NOT inflate the score.

A score of 90 or higher should only be given when the resume has very strong alignment with the job description, including relevant skills, experience, keywords, achievements, and qualifications.

MATCHED SKILLS:

Only include skills that are actually present in the resume and relevant to the job description.

MISSING KEYWORDS:

Include important skills, technologies, qualifications, responsibilities, tools, methodologies, or keywords from the job description that are missing from the resume.

RECOMMENDATIONS:

Return between 3 and 6 recommendation paragraphs.

Each paragraph must contain 2 to 4 sentences.

Each paragraph must focus on ONE improvement area.

Possible improvement areas:

Missing skills
Resume restructuring
Achievements and metrics
Keyword optimization
Certifications and training
Score improvement strategy

Every recommendation must include a concrete example of something the candidate could add or change.

Do not use bullet points, markdown, symbols, or numbered lists inside the recommendation paragraphs.

HR FINAL VERDICT:

Act like a harsh, strict, no-nonsense HR manager.

The verdict MUST begin with exactly one of these:

DECISION: SHORTLIST

OR

DECISION: REJECT

After the decision, write 3 to 5 sentences explaining the decision.

Do not mention the opposite decision.

Do not use both "SHORTLIST" and "REJECT" in the same verdict.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}
`;

    // Generate structured JSON response
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",

      contents: prompt,

      config: {
        responseMimeType: "application/json",

        responseSchema: {
          type: Type.OBJECT,

          properties: {
            score: {
              type: Type.NUMBER,
              description:
                "ATS compatibility score from 0 to 100.",
            },

            matchedSkills: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description:
                "Skills present in the resume that match the job description.",
            },

            missingKeywords: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description:
                "Important job-related keywords, skills, tools, qualifications, or concepts missing from the resume.",
            },

            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description:
                "Three to six recommendation paragraphs. Each paragraph should contain 2 to 4 sentences and a concrete example.",
            },

            HrFinalVerdict: {
              type: Type.STRING,
              description:
                "Strict HR verdict beginning with exactly DECISION: SHORTLIST or DECISION: REJECT.",
            },
          },

          required: [
            "score",
            "matchedSkills",
            "missingKeywords",
            "recommendations",
            "HrFinalVerdict",
          ],

          additionalProperties: false,
        },

        temperature: 0.2,

        maxOutputTokens: 4000,
      },
    });

    const text = result.text;

    console.log("RAW GEMINI RESPONSE:", text);

    // Parse JSON
    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch (jsonErr) {
      console.error("JSON PARSE ERROR:", jsonErr);
      console.error("RAW RESPONSE:", text);

      return res.status(500).json({
        error: "Gemini returned invalid JSON.",
        raw: text,
      });
    }

    // -----------------------------
    // SAFETY VALIDATION
    // -----------------------------

    // Score
    const score = Number(parsed.score);

    parsed.score = Number.isFinite(score)
      ? Math.min(100, Math.max(0, score))
      : 0;

    // Matched skills
    parsed.matchedSkills = Array.isArray(parsed.matchedSkills)
      ? parsed.matchedSkills.filter(
          (skill) => typeof skill === "string"
        )
      : [];

    // Missing keywords
    parsed.missingKeywords = Array.isArray(
      parsed.missingKeywords
    )
      ? parsed.missingKeywords.filter(
          (keyword) => typeof keyword === "string"
        )
      : [];

    // Recommendations
    parsed.recommendations = Array.isArray(
      parsed.recommendations
    )
      ? parsed.recommendations.filter(
          (recommendation) =>
            typeof recommendation === "string"
        )
      : [];

    // HR verdict
    if (
      typeof parsed.HrFinalVerdict !== "string" ||
      !parsed.HrFinalVerdict.trim()
    ) {
      parsed.HrFinalVerdict =
        "DECISION: REJECT. No valid HR verdict was provided.";
    }

    // -----------------------------
    // ATTACH ORIGINAL INPUT
    // -----------------------------

    parsed.resumeText = resumeText;
    parsed.jobDescription = jobDescription;

    // -----------------------------
    // RETURN RESPONSE
    // -----------------------------

    return res.json(parsed);
  } catch (err) {
    console.error("ATS ERROR:", err);

    return res.status(500).json({
      error: "ATS internal server error.",
      details:
        process.env.NODE_ENV === "development"
          ? err.message
          : undefined,
    });
  }
};
