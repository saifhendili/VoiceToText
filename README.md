# Audio to Text Converter

A modern web application that converts audio files to text using Groq Whisper API, with AI-powered business report generation using Google Gemini.

## Features

- Audio transcription using Groq Whisper API (free)
- Automatic audio chunking for long files
- AI-powered French business report generation using Google Gemini
- PDF export of analysis reports
- Support for all major audio formats (MP3, WAV, M4A, OGG, FLAC)
- Client-side audio processing (no local installations needed)

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Free API keys:
  - [Groq API Key](https://console.groq.com) (for transcription)
  - [Google Gemini API Key](https://aistudio.google.com/app/apikey) (for AI analysis)

## Quick Start

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### 2. Configure API Keys

Create a `.env` file in the `server` folder:

```bash
cd server
```

Create `server/.env` file with:

```env
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```

### 3. Start the Application

Open two terminal windows:

**Terminal 1 - Start Backend Server:**
```bash
cd server
npm start
```

**Terminal 2 - Start Frontend:**
```bash
npm start
```

The application will open automatically at [http://localhost:3000](http://localhost:3000)

## How to Use

1. **Upload Audio**: Click "Choose Audio File" and select your audio file
2. **Transcribe**: Click "Transcribe Audio" to convert speech to text
3. **Analyze**: Click "Analyze with AI" to generate a French business report
4. **Export**: Click "Download PDF" to save the analysis report

## How It Works

### Audio Processing
- Long audio files are automatically split into 2-minute chunks
- Each chunk is converted to 16kHz mono WAV format
- Chunks are processed sequentially with rate limiting
- Transcriptions are combined into final text

### AI Analysis
- Transcribed text is analyzed by Google Gemini
- Generates structured French business reports
- Includes sections: Overview, Context, Pain Points, Expectations, Tasks, and AI Suggestions

## Project Structure

```
eyaproject/
├── public/           # Static files
├── src/
│   ├── App.js       # Main React component
│   ├── App.css      # Styles
│   └── index.js     # React entry point
├── server/
│   ├── index.js     # Express server
│   ├── .env         # API keys (create this)
│   └── package.json # Server dependencies
├── package.json     # Frontend dependencies
└── README.md        # This file
```

## API Endpoints

### Backend Server (Port 5000)

- `GET /api/health` - Health check
- `POST /api/transcribe` - Upload audio for transcription
- `POST /api/analyze` - Generate AI analysis from text

## Technologies Used

- **Frontend**: React, Web Audio API, jsPDF
- **Backend**: Express.js, Node.js
- **APIs**: Groq Whisper (transcription), Google Gemini (AI analysis)

## Troubleshooting

**Audio file too large error:**
- Files are automatically chunked, but very long files may take time
- Wait 1 second between chunks to avoid rate limits

**API key errors:**
- Verify your API keys in `server/.env`
- Get new keys from the respective websites

**Server not starting:**
- Check if port 5000 is already in use
- Change PORT in `server/.env` if needed

## Free API Limits

- **Groq**: Generous free tier with Whisper-large-v3
- **Google Gemini**: Free tier includes gemini-1.5-flash-8b model

## License

MIT License

## Support

For issues or questions, please open an issue on GitHub.
