import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Doctor } from '../models/Doctor.js';
import { Patient } from '../models/Patient.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const doctorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  specialization: z.string().min(2, 'Specialization is required'),
  hospital: z.string().min(2, 'Hospital is required'),
  phone: z.string().min(6, 'Valid phone number required'),
  email: z.string().email('Valid email address required'),
});

// GET /api/v1/doctors - List, search, filter, paginate
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 9));
    const skip = (page - 1) * limit;

    const { search, specialization, startDate, endDate } = req.query;

    const filter: Record<string, any> = {};

    if (search && typeof search === 'string' && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { specialization: { $regex: search.trim(), $options: 'i' } },
        { hospital: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    if (specialization && typeof specialization === 'string' && specialization.trim() && specialization !== 'All') {
      filter.specialization = specialization.trim();
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const [doctors, total] = await Promise.all([
      Doctor.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Doctor.countDocuments(filter),
    ]);

    // Aggregate patient counts per doctor
    const doctorIds = doctors.map((d) => d._id);
    const patientCounts = await Patient.aggregate([
      { $match: { doctorId: { $in: doctorIds } } },
      { $group: { _id: '$doctorId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(patientCounts.map((p) => [p._id.toString(), p.count]));

    const doctorsWithCounts = doctors.map((doc) => ({
      ...doc,
      id: doc._id,
      patientCount: countMap.get(doc._id.toString()) || 0,
    }));

    res.json({
      data: doctorsWithCounts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch doctors' });
  }
});

// POST /api/v1/doctors - Create new doctor
router.post('/', async (req, res) => {
  try {
    const validated = doctorSchema.parse(req.body);

    const existing = await Doctor.findOne({ email: validated.email.toLowerCase() });
    if (existing) {
      res.status(409).json({ message: 'A doctor with this email address already exists.' });
      return;
    }

    const doctor = await Doctor.create({
      ...validated,
      email: validated.email.toLowerCase(),
    });

    res.status(201).json({
      doctor: { ...doctor.toObject(), id: doctor._id, patientCount: 0 },
      message: 'Doctor created successfully.',
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: err.errors[0]?.message || 'Validation error' });
      return;
    }
    res.status(500).json({ message: err.message || 'Failed to create doctor' });
  }
});

// GET /api/v1/doctors/:id - Doctor detail with corresponding patients
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid doctor ID format' });
      return;
    }

    const doctor = await Doctor.findById(id).lean();
    if (!doctor) {
      res.status(404).json({ message: 'Doctor not found.' });
      return;
    }

    const patients = await Patient.find({ doctorId: doctor._id })
      .sort({ admissionDate: -1 })
      .lean();

    res.json({
      doctor: {
        ...doctor,
        id: doctor._id,
        patientCount: patients.length,
      },
      patients: patients.map((p) => ({ ...p, id: p._id })),
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to load doctor' });
  }
});

// PUT /api/v1/doctors/:id - Update doctor
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid doctor ID format' });
      return;
    }

    const validated = doctorSchema.parse(req.body);

    const existingEmail = await Doctor.findOne({
      email: validated.email.toLowerCase(),
      _id: { $ne: id },
    });
    if (existingEmail) {
      res.status(409).json({ message: 'Email is already in use by another doctor.' });
      return;
    }

    const updated = await Doctor.findByIdAndUpdate(
      id,
      { ...validated, email: validated.email.toLowerCase() },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      res.status(404).json({ message: 'Doctor not found.' });
      return;
    }

    res.json({
      doctor: { ...updated, id: updated._id },
      message: 'Doctor updated successfully.',
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: err.errors[0]?.message || 'Validation error' });
      return;
    }
    res.status(500).json({ message: err.message || 'Failed to update doctor' });
  }
});

// DELETE /api/v1/doctors/:id - Delete doctor
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid doctor ID format' });
      return;
    }

    const doctor = await Doctor.findByIdAndDelete(id);
    if (!doctor) {
      res.status(404).json({ message: 'Doctor not found.' });
      return;
    }

    // Unlink associated patients
    await Patient.updateMany({ doctorId: id }, { $set: { doctorId: null } });

    res.json({ message: 'Doctor deleted and associated patients unlinked successfully.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to delete doctor' });
  }
});

// POST /api/v1/doctors/:id/patients - Add patient under doctor
router.post('/:id/patients', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid doctor ID format' });
      return;
    }

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      res.status(404).json({ message: 'Doctor not found.' });
      return;
    }

    const patient = await Patient.create({
      ...req.body,
      doctorId: doctor._id,
      admissionDate: req.body.admissionDate || new Date().toISOString().split('T')[0],
    });

    res.status(201).json({
      patient: { ...patient.toObject(), id: patient._id },
      message: `Patient assigned to Dr. ${doctor.name} successfully.`,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to assign patient to doctor' });
  }
});

// DELETE /api/v1/doctors/:id/patients/:patientId - Remove patient from doctor
router.delete('/:id/patients/:patientId', async (req, res) => {
  try {
    const { id, patientId } = req.params;
    const patient = await Patient.findOneAndUpdate(
      { _id: patientId, doctorId: id },
      { $set: { doctorId: null } },
      { new: true }
    );

    if (!patient) {
      res.status(404).json({ message: 'Patient not found under this doctor.' });
      return;
    }

    res.json({ message: 'Patient unlinked from doctor successfully.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to remove patient' });
  }
});

export default router;
