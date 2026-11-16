import { Schema, model, type Document, Types } from 'mongoose';

export interface IPatientTest extends Document {
  patientId: Types.ObjectId;
  testType: string;
  resultValue: string;
  status: 'Normal' | 'Critical' | 'Pending';
  notes: string;
  createdAt: Date;
}

const patientTestSchema = new Schema<IPatientTest>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    testType: { type: String, required: true, trim: true },
    resultValue: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Normal', 'Critical', 'Pending'], default: 'Normal' },
    notes: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const PatientTest = model<IPatientTest>('PatientTest', patientTestSchema);
