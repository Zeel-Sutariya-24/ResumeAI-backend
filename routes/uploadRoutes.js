import express from "express";
import multer from "multer";
import { extractResumeText } from "../controllers/extractController.js";

const router = express.Router();
const upload = multer();

router.post("/extract-text", upload.single("file"), extractResumeText);

export default router;
