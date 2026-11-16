import { Schema, model, type Document } from 'mongoose';

export interface IDoctor extends Document {
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const doctorSchema = new Schema<IDoctor>(
  {
    name: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    hospital: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

// Indexes specified in SRS & Technical Evaluation criteria
doctorSchema.index({ name: 'text', specialization: 'text', hospital: 'text' }, { weights: { name: 3, specialization: 2, hospital: 1 } });
doctorSchema.index({ createdAt: -1 });

export const Doctor = model<IDoctor>('Doctor', doctorSchema);
