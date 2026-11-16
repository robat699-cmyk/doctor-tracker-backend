import { Schema, model, type Document, Types } from 'mongoose';

export type PatientCondition = 'Stable' | 'Critical' | 'Under Observation' | 'Discharged';

export interface IPatient extends Document {
  doctorId?: Types.ObjectId | null;
  name: string;
  age: number;
  gender: string;
  condition: PatientCondition;
  diseaseType: string;
  lastCheckIn?: string;
  contactNumber: string;
  admissionDate: string;
  createdAt: Date;
  updatedAt: Date;
}

const patientSchema = new Schema<IPatient>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', default: null, index: true },
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0, max: 130 },
    gender: { type: String, required: true, enum: ['Male', 'Female', 'Other'] },
    condition: {
      type: String,
      required: true,
      enum: ['Stable', 'Critical', 'Under Observation', 'Discharged'],
      default: 'Stable',
      index: true,
    },
    diseaseType: { type: String, default: 'General Medicine', trim: true },
    lastCheckIn: { type: String, default: null },
    contactNumber: { type: String, required: true, trim: true },
    admissionDate: { type: String, required: true },
  },
  { timestamps: true }
);

// Indexes specified in SRS & Technical Evaluation criteria
patientSchema.index({ name: 'text' });
patientSchema.index({ condition: 1, createdAt: -1 });
patientSchema.index({ doctorId: 1, condition: 1 });
patientSchema.index({ admissionDate: -1 });

export const Patient = model<IPatient>('Patient', patientSchema);
