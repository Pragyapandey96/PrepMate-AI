import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  createdAt: { type: Date, default: Date.now },
});

const resumeSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  filename: String,
  extracted: Schema.Types.Mixed, // { name, skills[], experience[], projects[], education[], certifications[] }
  sourceText: String,
  createdAt: { type: Date, default: Date.now },
});

const jdSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: String,
  company: String,
  raw: String,
  extracted: Schema.Types.Mixed, // { required[], preferred[], responsibilities[], experience }
  createdAt: { type: Date, default: Date.now },
});

const interviewSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  resumeId: { type: Schema.Types.ObjectId, ref: 'Resume' },
  jdId:     { type: Schema.Types.ObjectId, ref: 'JobDescription' },
  type: { type: String, enum: ['HR', 'Technical', 'Behavioral', 'Mixed'], default: 'Mixed' },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  questionsPlanned: Number,
  status: { type: String, enum: ['created', 'in_progress', 'ended', 'evaluated', 'failed'], default: 'created' },
  startedAt: Date,
  endedAt: Date,
  transcript: [{ speaker: String, text: String, ts: Date }],
  evaluation: Schema.Types.Mixed,
  compatibility: Schema.Types.Mixed,
  overallScore: Number,
  createdAt: { type: Date, default: Date.now },
});

interviewSchema.index({ userId: 1, createdAt: -1 });

export const User = model('User', userSchema);
export const Resume = model('Resume', resumeSchema);
export const JobDescription = model('JobDescription', jdSchema);
export const Interview = model('Interview', interviewSchema);
