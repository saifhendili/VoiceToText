import express from 'express';
import cors from 'cors';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure file upload (max 35MB audio files only)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 35 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Transcription endpoint - converts audio to text using Groq Whisper API
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    // Validate audio file
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Check API key
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(500).json({
        error: 'Missing GROQ_API_KEY. Get one free at https://console.groq.com'
      });
    }

    console.log(`Processing audio: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Prepare form data for Groq API
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname || 'audio.mp3',
      contentType: req.file.mimetype
    });
    formData.append('model', 'whisper-large-v3');
    formData.append('response_format', 'json');

    // Call Groq Whisper API
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const text = data.text?.trim() || '';

    if (!text) {
      return res.status(400).json({
        error: 'No text extracted. Audio might be silent or too short.'
      });
    }

    console.log(`Transcription complete: ${text.length} characters`);
    res.json({
      text: text,
      service: 'Groq Whisper',
      characters: text.length
    });

  } catch (error) {
    console.error('Transcription error:', error.message);

    // Handle common errors
    if (error.message.includes('401')) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    if (error.message.includes('413')) {
      return res.status(413).json({ error: 'Audio file too large. Try splitting into smaller chunks.' });
    }
    if (error.message.includes('429')) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment.' });
    }

    res.status(500).json({ error: 'Transcription failed', details: error.message });
  }
});

// AI Analysis endpoint - generates French business report using Google Gemini
app.post('/api/analyze', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    const { text } = req.body;

    // Validate input
    if (!text?.trim()) {
      return res.status(400).json({ error: 'No text provided for analysis' });
    }

    // Check API key
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey || geminiApiKey === 'your_gemini_api_key_here') {
      return res.status(500).json({
        error: 'Missing GEMINI_API_KEY. Get one free at https://aistudio.google.com/app/apikey'
      });
    }

    console.log(`Analyzing text: ${text.length} characters`);

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });

    // Generate structured French business report
    const prompt = `You are a professional Business Analyst. Analyze the following text and create a structured French business report.

Format the report in Markdown with these sections:

# [DATE] [TITLE]

**Date et heure:** [Extract or "À préciser"]
**Lieu:** [Extract or "À préciser"]
**Client:** [Extract or "À préciser"]

## Aperçu
[Brief summary of the project scope and value proposition]

## Contexte
[Background, current situation, timeline, and key stakeholders]

## Points sensibles
[For each problem identified:]
### [Problem Title]
[Description]
- **Impact:** [Consequences]
- **Situation actuelle:** [Current state with examples]
- **Parties prenantes:** [Who is affected]

## Attentes
[For each objective:]
### [Goal Title]
[Description of what needs to be achieved]
- **Objectif/Délai:** [Goal and timeline]
- **Ressources/KPI:** [Tools and success metrics]
- **Parties prenantes:** [Responsible parties]

## Résumé des autres informations
- [Key secondary information as bullet points]

## Listes de tâches
1. [Task] – **Deadline:** [Date] – **Owner:** [Name/Role]

## Suggestion IA
[4-5 strategic recommendations to address the biggest pain points]

---

Text to analyze:

${text}`;

    const result = await model.generateContent(prompt);
    const analysis = result.response.text();

    console.log(`Analysis complete: ${analysis.length} characters`);
    res.json({
      analysis: analysis,
      service: 'Google Gemini',
      characters: analysis.length
    });

  } catch (error) {
    console.error('Analysis error:', error.message);

    // Handle common errors
    if (error.message?.includes('API_KEY_INVALID') || error.status === 400) {
      return res.status(401).json({ error: 'Invalid Gemini API key' });
    }
    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment.' });
    }

    res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`\n📝 Endpoints:`);
  console.log(`   - POST /api/transcribe (Audio → Text)`);
  console.log(`   - POST /api/analyze (Text → French Business Report)`);
  console.log(`   - GET  /api/health`);
  console.log(`\n🆓 Free APIs used:`);
  console.log(`   - Groq Whisper: https://console.groq.com`);
  console.log(`   - Google Gemini: https://aistudio.google.com/app/apikey\n`);
});
