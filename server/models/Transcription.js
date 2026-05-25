import mongoose from 'mongoose'

const transcriptionSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    text: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  },
  {
    timestamps: true,
  }
)

const Transcription = mongoose.models.Transcription || mongoose.model('Transcription', transcriptionSchema)

export default Transcription
