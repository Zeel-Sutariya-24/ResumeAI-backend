import { PDFExtract } from "pdf.js-extract";
import mammoth from "mammoth";
import Tesseract from "tesseract.js";
import sharp from "sharp";

export const extractResumeText = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname.toLowerCase();

    let extractedText = "";

    // 1) PDF (text-based PDFs)
    if (fileName.endsWith(".pdf")) {
      const pdfExtract = new PDFExtract();
      const data = await pdfExtract.extractBuffer(fileBuffer);

      let text = "";
      data.pages.forEach((page) => {
        page.content.forEach((item) => {
          text += item.str + " ";
        });
        text += "\n\n";
      });

      extractedText = text;
    }

    // 2) DOC / DOCX
    else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      extractedText = result.value || "";
    }

    // 3) TXT
    else if (fileName.endsWith(".txt")) {
      extractedText = fileBuffer.toString("utf8");
    }

    // 4) Image files (JPG / PNG) → OCR
    else if (
      fileName.endsWith(".png") ||
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg")
    ) {
      extractedText = await doOCR(fileBuffer);
    }

    else {
      return res.status(400).json({ error: "Unsupported file format." });
    }

    return res.json({ text: extractedText });

  } catch (err) {
    console.error("EXTRACTION ERROR:", err);
    return res
      .status(500)
      .json({ error: "Failed to extract file content.", details: err.message });
  }
};

// 🔥 OCR helper for image files
async function doOCR(buffer) {
  try {
    // Normalize image -> PNG for better OCR
    const image = await sharp(buffer).png().toBuffer();

    const result = await Tesseract.recognize(image, "eng", {
      logger: (m) => console.log(m), // optional: logs OCR progress
    });

    return result.data.text || "";
  } catch (err) {
    console.error("OCR ERROR:", err);
    return "";
  }
}
