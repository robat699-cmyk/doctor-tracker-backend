import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Patient } from '../models/Patient.js';
import { Doctor } from '../models/Doctor.js';
import { PatientTest } from '../models/PatientTest.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const patientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  age: z.coerce.number().min(0).max(130),
  gender: z.enum(['Male', 'Female', 'Other']),
  condition: z.enum(['Stable', 'Critical', 'Under Observation', 'Discharged']),
  diseaseType: z.string().optional().default('General Medicine'),
  doctorId: z.string().nullable().optional(),
  contactNumber: z.string().min(6, 'Valid contact number required'),
  admissionDate: z.string().min(4, 'Valid admission date required'),
});

// GET /api/v1/patients - List, search, filter, paginate
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const { search, condition, doctorId, startDate, endDate } = req.query;

    const filter: Record<string, any> = {};

    if (search && typeof search === 'string' && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { diseaseType: { $regex: search.trim(), $options: 'i' } },
        { contactNumber: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    if (condition && typeof condition === 'string' && condition.trim() && condition !== 'All') {
      filter.condition = condition.trim();
    }

    if (doctorId && typeof doctorId === 'string' && doctorId.trim() && doctorId !== 'All') {
      if (mongoose.Types.ObjectId.isValid(doctorId)) {
        filter.doctorId = new mongoose.Types.ObjectId(doctorId);
      }
    }

    if (startDate || endDate) {
      filter.admissionDate = {};
      if (startDate) filter.admissionDate.$gte = startDate as string;
      if (endDate) filter.admissionDate.$lte = endDate as string;
    }

    const [patients, total] = await Promise.all([
      Patient.find(filter)
        .populate('doctorId', 'name specialization hospital email')
        .sort({ admissionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Patient.countDocuments(filter),
    ]);

    const formattedPatients = patients.map((p: any) => ({
      ...p,
      id: p._id,
      doctor: p.doctorId
        ? {
            id: p.doctorId._id,
            name: p.doctorId.name,
            specialization: p.doctorId.specialization,
            hospital: p.doctorId.hospital,
          }
        : null,
      doctorId: p.doctorId?._id || null,
    }));

    res.json({
      items: formattedPatients,
      data: formattedPatients,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch patients' });
  }
});

// POST /api/v1/patients - Create new patient
router.post('/', async (req, res) => {
  try {
    const validated = patientSchema.parse(req.body);

    let docId = null;
    if (validated.doctorId && mongoose.Types.ObjectId.isValid(validated.doctorId)) {
      const doc = await Doctor.findById(validated.doctorId);
      if (doc) docId = doc._id;
    }

    const patient = await Patient.create({
      ...validated,
      doctorId: docId,
    });

    const populated = await Patient.findById(patient._id).populate('doctorId', 'name specialization hospital');

    res.status(201).json({
      patient: { ...populated?.toObject(), id: patient._id },
      message: 'Patient registered successfully.',
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: err.errors[0]?.message || 'Validation error' });
      return;
    }
    res.status(500).json({ message: err.message || 'Failed to create patient' });
  }
});

// PUT /api/v1/patients/:id - Edit patient
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid patient ID format' });
      return;
    }

    const validated = patientSchema.parse(req.body);

    let docId = null;
    if (validated.doctorId && mongoose.Types.ObjectId.isValid(validated.doctorId)) {
      docId = new mongoose.Types.ObjectId(validated.doctorId);
    }

    const updated = await Patient.findByIdAndUpdate(
      id,
      { ...validated, doctorId: docId },
      { new: true, runValidators: true }
    )
      .populate('doctorId', 'name specialization hospital')
      .lean();

    if (!updated) {
      res.status(404).json({ message: 'Patient record not found.' });
      return;
    }

    res.json({
      patient: { ...updated, id: updated._id },
      message: 'Patient record updated successfully.',
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: err.errors[0]?.message || 'Validation error' });
      return;
    }
    res.status(500).json({ message: err.message || 'Failed to update patient' });
  }
});

// DELETE /api/v1/patients/:id - Delete patient
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid patient ID format' });
      return;
    }

    const patient = await Patient.findByIdAndDelete(id);
    if (!patient) {
      res.status(404).json({ message: 'Patient record not found.' });
      return;
    }

    // Clean up lab tests
    await PatientTest.deleteMany({ patientId: id });

    res.json({ message: 'Patient record deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to delete patient' });
  }
});

// GET /api/v1/patients/:id/report - Clinical report
router.get('/:id/report', async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id).populate('doctorId').lean();
    if (!patient) {
      res.status(404).json({ message: 'Patient not found' });
      return;
    }

    const tests = await PatientTest.find({ patientId: id }).sort({ createdAt: -1 }).lean();

    res.json({
      patient: { ...patient, id: patient._id },
      tests: tests.map((t) => ({ ...t, id: t._id })),
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch clinical report' });
  }
});

// POST /api/v1/patients/:id/tests - Add lab test
router.post('/:id/tests', async (req, res) => {
  try {
    const { id } = req.params;
    const { testType, resultValue, status, notes } = req.body;

    const test = await PatientTest.create({
      patientId: id,
      testType: testType || 'Diagnostic Panel',
      resultValue: resultValue || 'Recorded',
      status: status || 'Normal',
      notes: notes || '',
    });

    res.status(201).json({
      test: { ...test.toObject(), id: test._id },
      message: 'Test recorded successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to add test' });
  }
});

// DELETE /api/v1/patients/:id/tests/:testId - Delete test
router.delete('/:id/tests/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    await PatientTest.findByIdAndDelete(testId);
    res.json({ message: 'Test entry removed.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to delete test' });
  }
});

export default router;
