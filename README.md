# ResumeAI Backend - AI Resume Processing API

This repository contains the backend services for ResumeAI, an AI-powered resume analysis platform.

The backend handles:
- Resume uploads
- Document extraction
- AI analysis workflows
- User-related operations
- API communication with the frontend

## Tech Stack

### Backend
- Node.js
- Express.js

### Database
- MongoDB

### AI Integration
- Gemini API (In USE)
- OpenAI API (NOT in use anymore)

### Document Processing
- pdf.js-extract
- mammoth
- Tesseract.js
- Sharp

## Features

## Resume Processing Pipeline

The backend processes resumes through multiple stages:
Resume Upload
|
↓
File Validation
|
↓
Document Extraction
|
├── PDF → pdf.js-extract
|
├── DOCX → mammoth
|
└── Images → Tesseract OCR
|
↓
Extracted Resume Content
|
↓
AI Analysis
|
↓
ATS Feedback

## Supported Documents

The processing pipeline supports:

- PDF documents
- DOCX documents
- Image-based resumes

Different extraction methods are used depending on the input format.

## API Responsibilities

The backend provides APIs for:

- Resume upload handling
- File processing
- Resume content extraction
- AI-powered analysis
- User data management

## Handling AI Responses

LLM responses can sometimes vary in structure.

To improve reliability, the backend includes:
- Response validation
- Error handling
- Processing safeguards
- Structured data handling


## Local Development

Install dependencies:

```bash
npm install
