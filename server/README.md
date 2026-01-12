# Voice to Text Server

A Node.js/Express server that converts audio files to text using Groq's free Whisper API.

## Features

- 🎤 Converts MP3, WAV, M4A, and other audio formats to text
- 🆓 Uses Groq's free Whisper API (generous free tier)
- ⚡ Fast transcription with whisper-large-v3 model
- 📦 Supports files up to 25MB

## Setup Instructions

### 1. Get a Free Groq API Key

1. Go to [https://console.groq.com](https://console.groq.com)
2. Sign up for a free account (no credit card required)
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (it starts with `gsk_...`)

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Groq API key:
   ```
   GROQ_API_KEY=gsk_your_actual_api_key_here
   PORT=5000
   ```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Server

Development mode (with auto-restart):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check
```
GET /api/health
```

Returns server status.

### Transcribe Audio
```
POST /api/transcribe
```

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: Form field named `audio` with audio file

**Response:**
```json
{
  "text": "Transcribed text here...",
  "service": "Groq Whisper",
  "characters": 123
}
```

## Supported Audio Formats

- MP3
- WAV
- M4A
- OGG
- FLAC
- And other common audio formats

## Free Tier Limits

Groq offers a generous free tier:
- No credit card required
- Fast processing
- High-quality transcription with whisper-large-v3

Check [Groq's pricing page](https://groq.com/pricing) for current limits.

## Troubleshooting

### "GROQ_API_KEY not set" error
- Make sure you created a `.env` file in the server directory
- Verify your API key is correctly copied
- Restart the server after updating `.env`

### "Invalid API token" error
- Check that your API key is valid
- Make sure there are no extra spaces in the `.env` file
- Try generating a new API key from Groq console

### Audio file too large
- Maximum file size is 25MB
- Compress your audio file or use a shorter clip

## License

MIT
