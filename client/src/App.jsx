import { useEffect, useRef, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const ALLOWED_MIME = [
  'audio/wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/x-m4a',
  'audio/x-wav',
  'audio/aac',
]
const MAX_FILE_BYTES = 40 * 1024 * 1024 // 40MB

function App() {
  const [file, setFile] = useState(null)
  const [transcription, setTranscription] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState(() => localStorage.getItem('auth_token') || '')
  const [userEmail, setUserEmail] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordedURL, setRecordedURL] = useState('')

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)

  useEffect(() => {
    fetchHistory()
    // try to decode minimal user info from token
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUserEmail(payload.email || '')
      } catch (e) {
        // ignore
      }
    }
  }, [])

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/transcriptions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const data = await response.json()
      if (response.ok) setHistory(data.transcriptions || [])
    } catch (err) {
      // silent: history is optional
    }
  }

  const handleFileChange = (event) => {
    setError('')
    const selected = event.target.files?.[0]
    if (!selected) return

    if (!ALLOWED_MIME.includes(selected.type)) {
      setError('Unsupported file type. Please upload WAV/MP3/WEBM/M4A files.')
      return
    }

    if (selected.size > MAX_FILE_BYTES) {
      setError('File too large. Maximum allowed size is 40MB.')
      return
    }

    setFile(selected)
  }

  const handleUpload = async (event) => {
    event.preventDefault()
    if (!file) {
      setError('Please select or record an audio file before uploading.')
      return
    }

    setLoading(true)
    setError('')
    setTranscription('')

    const formData = new FormData()
    formData.append('audio', file)

    try {
      const response = await fetch(`${API_BASE}/api/transcribe`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Upload failed')

      setTranscription(data.transcription)
      setFile(null)
      setRecordedURL('')
      await fetchHistory()
    } catch (uploadError) {
      setError(uploadError.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  /* Authentication handlers */
  const handleRegister = async (e) => {
    e.preventDefault()
    const email = e.target.email.value
    const password = e.target.password.value
    if (!email || !password) return setError('Email and password are required.')
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      localStorage.setItem('auth_token', data.token)
      setToken(data.token)
      setUserEmail(data.user.email)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const email = e.target.email.value
    const password = e.target.password.value
    if (!email || !password) return setError('Email and password are required.')
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      localStorage.setItem('auth_token', data.token)
      setToken(data.token)
      setUserEmail(data.user.email)
      await fetchHistory()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    setToken('')
    setUserEmail('')
  }

  const handleRecordStart = async () => {
    setError('')
    setTranscription('')
    setRecordedURL('')

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Audio recording is not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      audioChunksRef.current = []

      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setRecordedURL(url)
        setFile(new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' }))
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch (recordError) {
      setError('Unable to access microphone. Please allow permission and try again.')
    }
  }

  const handleRecordStop = () => {
    if (mediaRecorderRef.current?.state !== 'recording') return

    mediaRecorderRef.current.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    setIsRecording(false)
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto app-container px-4 py-10 sm:px-6 lg:px-8">
        <div className="card">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-600">Speech-to-Text</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Upload or record audio and convert it to text
            </h1>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              Upload an audio file or record directly. Results are transcribed using the backend provider and saved.
            </p>
          </div>

          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {token ? (
                <div className="text-sm text-slate-700">Signed in as <strong>{userEmail}</strong></div>
              ) : (
                <div className="text-sm text-slate-500">Not signed in</div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {token ? (
                <button onClick={handleLogout} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">Logout</button>
              ) : (
                <>
                  <form onSubmit={handleLogin} className="flex items-center gap-2">
                    <input name="email" placeholder="email" className="rounded-xl border px-2 py-1 text-sm" />
                    <input name="password" type="password" placeholder="password" className="rounded-xl border px-2 py-1 text-sm" />
                    <button type="submit" className="rounded-xl bg-sky-600 px-3 py-1 text-white text-sm">Login</button>
                  </form>
                  <form onSubmit={handleRegister} className="flex items-center gap-2">
                    <input name="email" placeholder="new email" className="rounded-xl border px-2 py-1 text-sm" />
                    <input name="password" type="password" placeholder="new password" className="rounded-xl border px-2 py-1 text-sm" />
                    <button type="submit" className="rounded-xl border border-slate-300 bg-white px-3 py-1 text-sm">Register</button>
                  </form>
                </>
              )}
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleUpload}>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">Upload audio</label>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500"
              />
              <p className="mt-2 text-xs text-slate-500">Allowed: WAV, MP3, WEBM, M4A — max 40MB</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-4">
                <button type="button" onClick={isRecording ? handleRecordStop : handleRecordStart} className={`btn-primary ${isRecording ? 'bg-rose-600 hover:bg-rose-700' : ''}`}>
                  {isRecording ? 'Stop recording' : 'Start recording'}
                </button>
                {recordedURL ? (
                  <audio controls src={recordedURL} className="rounded-xl border border-slate-200 bg-white px-3 py-2" />
                ) : (
                  <p className="text-sm text-slate-500">Record audio and submit the generated file to transcribe.</p>
                )}
              </div>
            </div>

            {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

            {transcription ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-4 text-slate-800 whitespace-pre-wrap">{transcription}</div> : null}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Transcribing…' : 'Upload and transcribe'}
            </button>
          </form>

          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Transcript history</h2>
                <p className="text-sm text-slate-500">Saved transcription records from previous uploads.</p>
              </div>
              <button type="button" onClick={fetchHistory} className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                Refresh
              </button>
            </div>

            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">No transcriptions yet. Upload audio to start.</div>
              ) : (
                history.map((item) => (
                  <article key={item._id} className="card">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-medium text-slate-900">{item.filename}</p>
                      <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-slate-700">{item.text}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          {loading ? (
            <div className="loading-overlay">
              <div className="flex items-center gap-3">
                <svg className="h-6 w-6 animate-spin text-sky-600" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" className="opacity-75" />
                </svg>
                <span className="text-sm font-medium text-slate-900">Transcribing…</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default App
