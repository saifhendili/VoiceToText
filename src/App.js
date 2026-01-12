import { useState, useRef } from 'react'
import './App.css'
import { jsPDF } from 'jspdf'

function App() {
  // State management
  const [file, setFile] = useState(null)
  const [text, setText] = useState('')
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 })
  const [showCopyNotification, setShowCopyNotification] = useState(false)
  const fileInputRef = useRef(null)

  // File selection handler
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0]

    if (!selectedFile) return

    if (!selectedFile.type.startsWith('audio/')) {
      setError('Please select a valid audio file (MP3, WAV, M4A, etc.)')
      setFile(null)
      return
    }

    setFile(selectedFile)
    setText('')
    setAnalysis('')
    setError('')
    setProgress({ current: 0, total: 0, percentage: 0 })
  }

  // Split long audio into smaller chunks
  const splitAudioIntoChunks = async (audioFile) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const arrayBuffer = await audioFile.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    const CHUNK_DURATION = 120 // 2 minutes per chunk
    const SAMPLE_RATE = 16000 // 16kHz (optimized for speech)
    const totalDuration = audioBuffer.duration

    // If audio is short, just convert and return
    if (totalDuration <= CHUNK_DURATION) {
      const processedBuffer = await processAudio(audioBuffer, SAMPLE_RATE)
      const wavBlob = convertToWav(processedBuffer)
      await audioContext.close()
      return [new File([wavBlob], 'audio.wav', { type: 'audio/wav' })]
    }

    // Split into chunks
    const chunks = []
    const samplesPerChunk = CHUNK_DURATION * audioBuffer.sampleRate
    const numChunks = Math.ceil(totalDuration / CHUNK_DURATION)

    for (let i = 0; i < numChunks; i++) {
      const startSample = i * samplesPerChunk
      const endSample = Math.min((i + 1) * samplesPerChunk, audioBuffer.length)
      const chunkLength = endSample - startSample

      // Create chunk buffer
      const chunkBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        chunkLength,
        audioBuffer.sampleRate
      )

      // Copy audio data
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const sourceData = audioBuffer.getChannelData(channel)
        const chunkData = chunkBuffer.getChannelData(channel)
        chunkData.set(sourceData.slice(startSample, endSample))
      }

      // Process and convert
      const processedBuffer = await processAudio(chunkBuffer, SAMPLE_RATE)
      const wavBlob = convertToWav(processedBuffer)
      chunks.push(new File([wavBlob], `chunk_${i}.wav`, { type: 'audio/wav' }))
    }

    await audioContext.close()
    return chunks
  }

  // Convert audio to mono and resample
  const processAudio = async (audioBuffer, targetSampleRate) => {
    const offlineContext = new OfflineAudioContext(
      1, // mono
      audioBuffer.duration * targetSampleRate,
      targetSampleRate
    )

    const source = offlineContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(offlineContext.destination)
    source.start(0)

    return await offlineContext.startRendering()
  }

  // Convert audio buffer to WAV format
  const convertToWav = (buffer) => {
    const numChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const bitDepth = 16
    const bytesPerSample = bitDepth / 8
    const blockAlign = numChannels * bytesPerSample

    // Convert float samples to 16-bit PCM
    const samples = []
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
        samples.push(sample < 0 ? sample * 0x8000 : sample * 0x7FFF)
      }
    }

    const dataLength = samples.length * bytesPerSample
    const bufferLength = 44 + dataLength
    const arrayBuffer = new ArrayBuffer(bufferLength)
    const view = new DataView(arrayBuffer)

    // Write WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, bufferLength - 8, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true) // PCM format
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * blockAlign, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitDepth, true)
    writeString(36, 'data')
    view.setUint32(40, dataLength, true)

    // Write PCM data
    let offset = 44
    for (const sample of samples) {
      view.setInt16(offset, sample, true)
      offset += 2
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }

  // Transcribe a single audio chunk
  const transcribeChunk = async (chunk) => {
    const formData = new FormData()
    formData.append('audio', chunk)

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || data.details || 'Transcription failed')
    }

    return data.text || ''
  }

  // Main transcription handler
  const handleTranscribe = async (e) => {
    e.preventDefault()

    if (!file) {
      setError('Please select an audio file first')
      return
    }

    setLoading(true)
    setText('')
    setAnalysis('')
    setError('')
    setProgress({ current: 0, total: 0, percentage: 0 })

    try {
      // Split audio into manageable chunks
      const chunks = await splitAudioIntoChunks(file)
      setProgress({ current: 0, total: chunks.length, percentage: 0 })

      // Transcribe each chunk
      const transcriptions = []
      for (let i = 0; i < chunks.length; i++) {
        const chunkText = await transcribeChunk(chunks[i])
        transcriptions.push(chunkText)

        const current = i + 1
        const percentage = Math.round((current / chunks.length) * 100)
        setProgress({ current, total: chunks.length, percentage })

        // Prevent rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      // Combine all transcriptions
      const fullText = transcriptions.join(' ').trim()

      if (!fullText) {
        throw new Error('No text transcribed. Audio might be silent or too short.')
      }

      setText(fullText)
    } catch (err) {
      setError(err.message || 'Transcription failed. Please try again.')
    } finally {
      setLoading(false)
      setTimeout(() => setProgress({ current: 0, total: 0, percentage: 0 }), 2000)
    }
  }

  // AI Analysis handler
  const handleAnalyze = async () => {
    if (!text?.trim()) {
      setError('No text to analyze. Please transcribe audio first.')
      return
    }

    setAnalyzing(true)
    setError('')
    setAnalysis('')

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Analysis failed')
      }

      setAnalysis(data.analysis || 'No analysis generated')
    } catch (err) {
      setError(err.message || 'Analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  // PDF Export handler
  const handleExportPDF = () => {
    if (!analysis?.trim()) {
      setError('No analysis to export. Please analyze the text first.')
      return
    }

    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 20
      const maxWidth = pageWidth - 2 * margin
      let yPosition = margin

      const lines = analysis.split('\n')
      doc.setFont('helvetica')

      lines.forEach((line) => {
        // Add new page if needed
        if (yPosition > pageHeight - margin) {
          doc.addPage()
          yPosition = margin
        }

        // Format different markdown elements
        if (line.startsWith('# ')) {
          doc.setFontSize(18)
          doc.setFont('helvetica', 'bold')
          doc.text(line.replace('# ', ''), margin, yPosition, { maxWidth })
          yPosition += 12
        } else if (line.startsWith('## ')) {
          doc.setFontSize(14)
          doc.setFont('helvetica', 'bold')
          doc.text(line.replace('## ', ''), margin, yPosition, { maxWidth })
          yPosition += 10
        } else if (line.startsWith('### ')) {
          doc.setFontSize(12)
          doc.setFont('helvetica', 'bold')
          doc.text(line.replace('### ', ''), margin, yPosition, { maxWidth })
          yPosition += 8
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          const text = '  • ' + line.substring(2)
          const splitText = doc.splitTextToSize(text, maxWidth)
          doc.text(splitText, margin, yPosition)
          yPosition += splitText.length * 6
        } else if (line.match(/^\d+\. /)) {
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          const splitText = doc.splitTextToSize(line, maxWidth)
          doc.text(splitText, margin, yPosition)
          yPosition += splitText.length * 6
        } else if (line.trim()) {
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          const cleanText = line.replace(/\*\*/g, '')
          const splitText = doc.splitTextToSize(cleanText, maxWidth)
          doc.text(splitText, margin, yPosition)
          yPosition += splitText.length * 6
        } else {
          yPosition += 4
        }
      })

      const timestamp = new Date().toISOString().split('T')[0]
      doc.save(`business-report-${timestamp}.pdf`)
    } catch (err) {
      setError('Failed to generate PDF. Please try again.')
    }
  }

  // Copy text to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setShowCopyNotification(true)
      setTimeout(() => setShowCopyNotification(false), 3000)
    } catch (err) {
      setError('Failed to copy text')
    }
  }

  // Clear all data
  const handleClear = () => {
    setFile(null)
    setText('')
    setAnalysis('')
    setError('')
    setProgress({ current: 0, total: 0, percentage: 0 })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>Audio to Text Converter</h1>
          <p>Upload audio, get instant transcription and AI-powered business reports</p>
        </header>

        <main className="main">
          {/* Upload Form */}
          <form onSubmit={handleTranscribe} className="upload-form">
            <div className="file-input-container">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                disabled={loading}
                className="file-input"
                id="audio-file"
              />
              <label htmlFor="audio-file" className="file-label">
                {file ? `Selected: ${file.name}` : 'Choose Audio File'}
              </label>
            </div>

            {file && (
              <div className="file-info">
                <span>{file.name}</span>
                <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
            )}

            <div className="button-group">
              <button
                type="submit"
                disabled={!file || loading}
                className="submit-button"
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Transcribing...
                  </>
                ) : (
                  'Transcribe Audio'
                )}
              </button>

              {(file || text || error) && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="clear-button"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Progress Bar */}
            {loading && progress.percentage > 0 && (
              <div className="progress-container">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress.percentage}%` }}
                  ></div>
                </div>
                <span className="progress-text">
                  {progress.total > 1
                    ? `Processing chunk ${progress.current}/${progress.total} (${progress.percentage}%)`
                    : `${progress.percentage}%`
                  }
                </span>
              </div>
            )}
          </form>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Transcription Result */}
          {text && (
            <div className="result-container">
              <div className="result-header">
                <h3>Transcription Result</h3>
                <div className="header-buttons">
                  <button
                    onClick={handleCopy}
                    className="copy-button"
                    title="Copy to clipboard"
                  >
                    Copy
                  </button>
                  <button
                    onClick={handleAnalyze}
                    className="analyze-button"
                    disabled={analyzing}
                    title="Analyze with AI"
                  >
                    {analyzing ? (
                      <>
                        <div className="spinner-small"></div>
                        Analyzing...
                      </>
                    ) : (
                      'Analyze with AI'
                    )}
                  </button>
                </div>
              </div>
              <div className="transcription-text">{text}</div>
              <div className="text-stats">
                {text.length} characters • {text.split(/\s+/).length} words
              </div>
            </div>
          )}

          {/* AI Analysis Result */}
          {analysis && (
            <div className="result-container analysis-container">
              <div className="result-header">
                <h3>AI Analysis Report</h3>
                <button
                  onClick={handleExportPDF}
                  className="pdf-button"
                  title="Download as PDF"
                >
                  Download PDF
                </button>
              </div>
              <div className="analysis-text">
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                  {analysis}
                </pre>
              </div>
            </div>
          )}
        </main>

        <footer className="footer">
          <p>
            Supported formats: MP3, WAV, M4A, OGG, FLAC
            <br />
            Long audio files are automatically split into chunks
          </p>
        </footer>
      </div>

      {/* Copy Notification */}
      {showCopyNotification && (
        <div className="toast-notification">
          Text copied to clipboard!
        </div>
      )}
    </div>
  )
}

export default App
