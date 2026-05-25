import express from 'express'
import cors from 'cors'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import OpenAI from 'openai'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import Transcription from './models/Transcription.js'
import User from './models/User.js'

dotenv.config()

const PORT = process.env.PORT || 4000
const MONGODB_URI = process.env.MONGODB_URI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

const app = express()
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

if (!OPENAI_API_KEY) {
  console.warn('WARNING: OPENAI_API_KEY is not set. Transcription requests will fail until it is provided.')
}

if (!MONGODB_URI) {
  console.warn('WARNING: MONGODB_URI is not set. Database connection will fail until it is provided.')
}

mongoose.set('strictQuery', true)
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error.message))

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_prod'

const allowedMimeTypes = [
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

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 40 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, allowedMimeTypes.includes(file.mimetype))
  },
})

const removeUploadedFile = (filePath) => {
  fs.unlink(filePath, (error) => {
    if (error) {
      console.error('Failed to remove uploaded file:', error.message)
    }
  })
}

app.get('/health', (req, res) => {
  res.json({ ok: true })
})

// --- Authentication routes ---
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password are required.' })

  try {
    const existing = await User.findOne({ email })
    if (existing) return res.status(409).json({ success: false, error: 'User already exists.' })

    const hashed = await bcrypt.hash(password, 10)
    const user = await User.create({ email, password: hashed })
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ success: true, token, user: { id: user._id, email: user.email } })
  } catch (err) {
    console.error('Registration failed:', err)
    res.status(500).json({ success: false, error: 'Registration failed.' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password are required.' })

  try {
    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials.' })

    const match = await bcrypt.compare(password, user.password)
    if (!match) return res.status(401).json({ success: false, error: 'Invalid credentials.' })

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ success: true, token, user: { id: user._id, email: user.email } })
  } catch (err) {
    console.error('Login failed:', err)
    res.status(500).json({ success: false, error: 'Login failed.' })
  }
})

// optional auth parser: if Authorization header present, attach req.user
const authOptional = (req, res, next) => {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return next()
  const token = auth.split(' ')[1]
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
  } catch (err) {
    // ignore invalid token for optional auth
  }
  return next()
}

app.get('/api/transcriptions', authOptional, async (req, res) => {
  try {
    const filter = req.user && req.user.id ? { user: req.user.id } : {}
    const transcriptions = await Transcription.find(filter).sort({ createdAt: -1 }).lean()
    res.json({ success: true, transcriptions })
  } catch (error) {
    console.error('Failed to fetch transcriptions:', error)
    res.status(500).json({ success: false, error: 'Unable to fetch transcription history.' })
  }
})

app.post('/api/transcribe', authOptional, upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No audio file uploaded.' })
  }

  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    // remove any rejected file just in case
    removeUploadedFile(req.file.path)
    return res.status(415).json({ success: false, error: 'Unsupported audio format.' })
  }

  if (!OPENAI_API_KEY) {
    removeUploadedFile(req.file.path)
    return res.status(503).json({ success: false, error: 'Transcription service not configured. OPENAI_API_KEY is missing.' })
  }

  const filePath = path.resolve(req.file.path)

  try {
    const transcriptionResponse = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
    })

    const text = transcriptionResponse?.text?.trim() ?? ''

    const savedRecord = await Transcription.create({
      filename: req.file.originalname,
      text,
      user: req.user?.id || undefined,
    })

    res.json({ success: true, transcription: text, record: savedRecord })
  } catch (error) {
    console.error('Transcription failed:', error)
    const message = error?.message || 'Speech-to-text transcription failed.'
    res.status(500).json({ success: false, error: message })
  } finally {
    removeUploadedFile(filePath)
  }
})

app.listen(PORT, () => {
  console.log(`Speech-to-text backend listening on http://localhost:${PORT}`)
})
