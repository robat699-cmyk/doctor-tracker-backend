import { Schema, model, type Document, Types } from 'mongoose';

export interface IBooking extends Document {
  doctorId: Types.ObjectId;
  patientId?: Types.ObjectId | null;
  patientName: string;
  appointmentDate: string;
  timeSlot: string;
  status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';
  visitType: string;
  chiefComplaint: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', default: null },
    patientName: { type: String, required: true, trim: true },
    appointmentDate: { type: String, required: true, index: true },
    timeSlot: { type: String, required: true },
    status: {
      type: String,
      enum: ['Confirmed', 'Pending', 'Completed', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    visitType: { type: String, default: 'In-Person Consultation' },
    chiefComplaint: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Booking = model<IBooking>('Booking', bookingSchema);

export interface IReminder extends Document {
  bookingId?: Types.ObjectId | null;
  patientName: string;
  contactNumber: string;
  scheduledFor: string;
  channel: string;
  message: string;
  status: 'Queued' | 'Sent' | 'Failed';
  sentAt?: string | null;
}

const reminderSchema = new Schema<IReminder>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', default: null },
    patientName: { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true, trim: true },
    scheduledFor: { type: String, required: true },
    channel: { type: String, default: 'SMS / WhatsApp' },
    message: { type: String, required: true },
    status: { type: String, enum: ['Queued', 'Sent', 'Failed'], default: 'Queued' },
    sentAt: { type: String, default: null },
  },
  { timestamps: true }
);

export const Reminder = model<IReminder>('Reminder', reminderSchema);
