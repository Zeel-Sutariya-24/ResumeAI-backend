import express from "express";
import ResumeVersion from "../models/ResumeVersion.js";

const router = express.Router();

/**
 * SAVE RESUME FOR A JOB
 */
router.post("/save", async (req, res) => {
  try {
    const {
      userId,
      company,
      role,
      jobDescription,
      resumeData,
      atsScore,
      matchedSkills,
      missingSkills,
      aiOptimized
    } = req.body;

    // 1️⃣ Find latest version for same job
    const last = await ResumeVersion.findOne({
      userId,
      company,
      role
    }).sort({ version: -1 });

    const nextVersion = last ? last.version + 1 : 1;

    // 2️⃣ Save new version
    const saved = await ResumeVersion.create({
      userId,
      company,
      role,
      jobDescription,
      resumeData,
      atsScore,
      matchedSkills,
      missingSkills,
      aiOptimized,
      version: nextVersion
    });

    res.json({ success: true, saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to save resume" });
  }
});

/**
 * GET ALL RESUMES FOR A USER (My Resumes Page)
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const resumes = await ResumeVersion
      .find({ userId })
      .sort({ createdAt: -1 });

    res.json({ success: true, resumes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch resumes" });
  }
});

/**
 * GET SINGLE RESUME VERSION BY ID (for Load into Builder)
 */
router.get("/version/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const resume = await ResumeVersion.findById(id);

    if (!resume) {
      return res.status(404).json({ success: false, error: "Resume not found" });
    }

    res.json({ success: true, resume });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch resume" });
  }
});

/**
 * DELETE RESUME VERSION
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await ResumeVersion.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Resume not found"
      });
    }

    res.json({ success: true, deleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Failed to delete resume"
    });
  }
});

export default router;
