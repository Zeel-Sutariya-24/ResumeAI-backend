import express from "express";
import { atsCheck } from "../controllers/atsController.js";
import { extractTextRoute } from "../controllers/extractRouteController.js";
import { GoogleGenAI, Type } from "@google/genai";
import { normalizeFlags } from "../utils/strictJson.js";

const router = express.Router();

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-flash";

// ATS check route
router.post("/ats-check", atsCheck);

// Resume file extraction route
router.post("/extract-text", extractTextRoute);

// Red flags route
router.post("/red-flags", async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    // Validate resume text
    if (
      !resumeText ||
      String(resumeText).trim().length < 50
    ) {
      return res.status(400).json({
        success: false,
        error: "resumeText is required",
      });
    }

    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is missing.");

      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY is not configured.",
      });
    }

    // Initialize Gemini
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const prompt = `
You are a senior recruiter and resume reviewer.

Analyze the RESUME TEXT and optional JOB DESCRIPTION.

Identify recruiter red flags that could realistically hurt the candidate's callback chances.

Do NOT be generic.

Only identify meaningful issues that are actually supported by the resume.

Do NOT invent facts.

If there are no meaningful red flags, return an empty flags array.

RED FLAG CATEGORIES:

type must be one of:

buzzwords
metrics
verbs
dates
phrases
format
clarity
other

SEVERITY:

Use:
low
medium
high

RULES:

1. Return a maximum of 8 flags.

2. Each flag must be specific and actionable.

3. "message" must be a short recruiter-style explanation of the problem.

4. "example" should contain a short quote from the resume demonstrating the issue when possible.

5. "example" must be no longer than 120 characters.

6. Do not invent resume content.

7. "whyItMatters" must explain in one sentence why the issue matters to recruiters.

8. "fix" must provide one specific improvement in one sentence.

9. Focus on issues that could realistically reduce callback chances.

10. Avoid generic advice such as "make your resume better."

11. If a potential issue is not clearly supported by the resume, do not include it.

JOB DESCRIPTION:

${
  jobDescription
    ? jobDescription
    : "(none provided)"
}

RESUME TEXT:

${resumeText}
`;

    // Generate structured JSON response
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,

      contents: prompt,

      config: {
        responseMimeType: "application/json",

        responseSchema: {
          type: Type.OBJECT,

          properties: {
            flags: {
              type: Type.ARRAY,

              items: {
                type: Type.OBJECT,

                properties: {
                  type: {
                    type: Type.STRING,
                    enum: [
                      "buzzwords",
                      "metrics",
                      "verbs",
                      "dates",
                      "phrases",
                      "format",
                      "clarity",
                      "other",
                    ],
                  },

                  severity: {
                    type: Type.STRING,
                    enum: [
                      "low",
                      "medium",
                      "high",
                    ],
                  },

                  message: {
                    type: Type.STRING,
                  },

                  example: {
                    type: Type.STRING,
                  },

                  whyItMatters: {
                    type: Type.STRING,
                  },

                  fix: {
                    type: Type.STRING,
                  },
                },

                required: [
                  "type",
                  "severity",
                  "message",
                  "example",
                  "whyItMatters",
                  "fix",
                ],

                additionalProperties: false,
              },
            },
          },

          required: ["flags"],

          additionalProperties: false,
        },

        temperature: 0.2,

        maxOutputTokens: 3000,
      },
    });

    const raw = result?.text || "";

    console.log(
      "🧠 GEMINI RED FLAGS OUTPUT:\n",
      raw
    );

    // Parse structured JSON
    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch (jsonErr) {
      console.error(
        "⚠️ RED FLAGS JSON PARSE ERROR:",
        jsonErr
      );

      console.error(
        "RAW GEMINI RESPONSE:",
        raw
      );

      return res.json({
        success: true,
        flags: [],
      });
    }

    // Fail-safe
    if (
      !parsed ||
      !Array.isArray(parsed.flags)
    ) {
      console.warn(
        "⚠️ Gemini returned invalid red flags."
      );

      return res.json({
        success: true,
        flags: [],
      });
    }

    // Normalize flags using your existing utility
    const flags = normalizeFlags(parsed.flags);

    return res.json({
      success: true,
      flags,
    });
  } catch (err) {
    console.error(
      "❌ Red flags generation failed:",
      err
    );

    // Never break the frontend UX
    return res.json({
      success: true,
      flags: [],
    });
  }
});

export default router;
