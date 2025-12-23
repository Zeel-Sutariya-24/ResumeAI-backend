import mongoose from "mongoose";

const ResumeVersionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },

    company: { type: String, required: true },
    role: { type: String, required: true },
    jobDescription: { type: String, required: true },

    resumeData: { type: Object, required: true },

    atsScore: { type: Number },
    matchedSkills: [String],
    missingSkills: [String],

    aiOptimized: { type: Boolean, default: false },

    version: { type: Number, default: 1 }
  },
  { timestamps: true }
);

export default mongoose.model("ResumeVersion", ResumeVersionSchema);
