import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose"; // ✅ ADD THIS

import atsRoutes from "./routes/atsRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import aiRoutes from "./routes/aiSkills.js";
import aiSummaryRoutes from "./routes/aiSummary.js";
import optimizeRoutes from "./routes/optimizeRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import recruiterViewRoutes from "./routes/recruiterViewRoutes.js";

// MUST be first
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api", atsRoutes);
app.use("/upload", uploadRoutes);
app.use("/api", aiRoutes);
app.use("/api", aiSummaryRoutes);
app.use("/api", optimizeRoutes);
app.use("/api", recruiterViewRoutes);
app.use("/api/resumes", resumeRoutes);

console.log("Gemini key exists:", !!process.env.GEMINI_API_KEY);
console.log("MONGO_URI exists:", !!process.env.MONGO_URI);

// ✅ CONNECT TO MONGODB (THIS IS THE MISSING PIECE)
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    
    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
  });
