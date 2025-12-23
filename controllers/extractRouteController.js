import { extractResumeText } from "./extractController.js";

export const extractTextRoute = async (req, res) => {
  try {
    const file = req.files?.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const text = await extractResumeText(file.data, file.mimetype);

    res.json({ text });
  } catch (error) {
    console.error("EXTRACTION ROUTE ERROR:", error);
    res.status(500).json({ error: "Failed to extract resume text" });
  }
};
