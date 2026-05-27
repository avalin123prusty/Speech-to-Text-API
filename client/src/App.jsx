import { useEffect, useRef, useState } from 'react'

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

  const getFriendlyError = (error, fallback = 'Something went wrong. Please try again.') => {
    if (!error) return fallback
    if (typeof error === 'string') return error
    if (error instanceof Error) return error.message
    return fallback
  }

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
      setError(getFriendlyError(uploadError, 'Upload failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  /* Authentication handlers */
  const handleRegister = async (e) => {
    e.preventDefault()
    const email = e.target.email.value.trim()
    const password = e.target.password.value.trim()
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
      setError(getFriendlyError(err, 'Registration failed. Please try again.'))
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
      setError(getFriendlyError(err, 'Login failed. Please check your credentials.'))
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
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="app-container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-700 via-cyan-600 to-indigo-800 px-6 py-10 text-white shadow-2xl shadow-slate-900/20 sm:px-10 sm:py-14">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-200">Speech-to-Text</p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">Record, upload, and transcribe audio with ease.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-100/90">
              Convert audio to text using the backend provider, save transcripts in MongoDB, and review your history instantly.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-white/10 px-5 py-4 shadow-inner shadow-slate-950/10 backdrop-blur">
                <p className="text-sm uppercase tracking-[0.24em] text-cyan-100/80">Supported audio</p>
                <p className="mt-2 text-sm leading-6 text-slate-100/80">WAV, MP3, WEBM, M4A, AAC and more.</p>
              </div>
              <div className="rounded-3xl bg-white/10 px-5 py-4 shadow-inner shadow-slate-950/10 backdrop-blur">
                <p className="text-sm uppercase tracking-[0.24em] text-cyan-100/80">Maximum upload</p>
                <p className="mt-2 text-sm leading-6 text-slate-100/80">40MB per file, with instant transcription history.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-8 xl:grid-cols-[1.4fr_0.95fr]">
          <div className="space-y-8">
            <section className="card relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#ffffff15,_transparent_35%)]" />
              <div className="relative">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950">Upload or record audio</h2>
                    <p className="mt-2 text-sm text-slate-600">Choose a file or record directly, then submit to transcribe.</p>
                  </div>
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 shadow-sm">Audio input</span>
                </div>

                <form className="space-y-6" onSubmit={handleUpload}>
                  <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <label className="text-sm font-medium text-slate-700">Select audio file</label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileChange}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                    />
                    <p className="text-xs text-slate-500">Allowed: WAV, MP3, WEBM, M4A, AAC. Max 40MB.</p>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <button type="button" onClick={isRecording ? handleRecordStop : handleRecordStart} className={`${isRecording ? 'bg-rose-600 hover:bg-rose-700' : 'bg-sky-600 hover:bg-sky-700'} btn-primary w-full sm:w-auto`}>
                        {isRecording ? 'Stop recording' : 'Start recording'}
                      </button>
                      <div className="text-sm text-slate-600">
                        {recordedURL ? 'Recorded audio ready to upload.' : 'Use your microphone to create a recording.'}
                      </div>
                    </div>
                    {recordedURL ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                        <audio controls src={recordedURL} className="w-full" />
                      </div>
                    ) : null}
                  </div>

                  {error ? (
                    <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
                  ) : null}

                  {transcription ? (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-4 text-slate-800 whitespace-pre-wrap">
                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Latest transcription</h3>
                      <p>{transcription}</p>
                    </div>
                  ) : null}

                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? 'Transcribing…' : 'Upload and transcribe'}
                  </button>
                </form>
              </div>
            </section>

            <section className="card">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Transcript history</h2>
                  <p className="mt-2 text-sm text-slate-600">Previous transcriptions are saved to MongoDB and displayed here.</p>
                </div>
                <button type="button" onClick={fetchHistory} className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  Refresh
                </button>
              </div>

              <div className="space-y-4">
                {history.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">No transcriptions yet. Upload audio to start.</div>
                ) : (
                  history.map((item) => (
                    <article key={item._id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{item.filename}</p>
                          <p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Saved</span>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-slate-700 whitespace-pre-wrap">{item.text}</p>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="card">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-950">Account status</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{token ? 'Signed in' : 'Guest'}</span>
              </div>
              {token ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">Signed in as <span className="font-medium text-slate-900">{userEmail}</span>.</p>
                  <button onClick={handleLogout} className="btn-primary w-full bg-slate-900 hover:bg-slate-950">Logout</button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="font-semibold text-slate-950">Login</h3>
                    <form onSubmit={handleLogin} className="mt-4 space-y-4">
                      <input disabled={loading} name="email" placeholder="Email" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200" />
                      <input disabled={loading} name="password" type="password" placeholder="Password" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200" />
                      <button disabled={loading} type="submit" className="btn-primary w-full">Login</button>
                    </form>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="font-semibold text-slate-950">Register</h3>
                    <form onSubmit={handleRegister} className="mt-4 space-y-4">
                      <input disabled={loading} name="email" placeholder="Email" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200" />
                      <input disabled={loading} name="password" type="password" placeholder="Password" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200" />
                      <button disabled={loading} type="submit" className="btn-primary w-full">Create account</button>
                    </form>
                  </div>
                </div>
              )}
            </section>

            <section className="card bg-slate-950 text-white">
              <h2 className="text-lg font-semibold">Quick tips</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
                <li className="flex gap-3">
                  <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300" />
                  Use the recorder for quick voice notes.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300" />
                  Upload clear audio for better transcription quality.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300" />
                  Refresh history after new uploads to see saved transcripts.
                </li>
              </ul>
            </section>
          </aside>
        </div>

        {loading ? (
          <div className="loading-overlay">
            <div className="flex items-center gap-3 rounded-3xl bg-white/90 px-6 py-4 shadow-2xl shadow-slate-900/10">
              <svg className="h-6 w-6 animate-spin text-sky-600" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" className="opacity-75" />
              </svg>
              <span className="text-sm font-medium text-slate-950">Transcribing audio...</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default App
