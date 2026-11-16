import { Router } from 'express';
import { Doctor } from '../models/Doctor.js';
import { Patient } from '../models/Patient.js';
import { Booking } from '../models/Booking.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/v1/analytics/dashboard - Flat structure matching DashboardPage.tsx
router.get('/dashboard', async (_req, res) => {
  try {
    // 1. Multi-Faceted Patient Metrics Aggregation
    const [patientAggregation] = await Patient.aggregate([
      {
        $facet: {
          totalCount: [{ $count: 'count' }],
          conditionBreakdown: [
            { $group: { _id: '$condition', count: { $sum: 1 } } },
          ],
          admissionsTrend: [
            {
              $group: {
                _id: '$admissionDate',
                admissions: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    const totalDoctors = await Doctor.countDocuments();
    const totalPatients = patientAggregation?.totalCount[0]?.count || 0;

    // Condition breakdown mapping
    const conditionMap = new Map<string, number>(
      (patientAggregation?.conditionBreakdown || []).map((c: any) => [c._id, Number(c.count) || 0])
    );
    const criticalCount = conditionMap.get('Critical') || 0;
    const stableCount = conditionMap.get('Stable') || 0;
    const observationCount = conditionMap.get('Under Observation') || 0;
    const dischargedCount = conditionMap.get('Discharged') || 0;

    // Formatted Condition Distribution matching DashboardPage.tsx
    const conditionDistribution = [
      { condition: 'Stable', count: stableCount, color: '#059669' },
      { condition: 'Under Observation', count: observationCount, color: '#D97706' },
      { condition: 'Critical', count: criticalCount, color: '#DC2626' },
      { condition: 'Discharged', count: dischargedCount, color: '#64748B' },
    ];

    // 2. Patients per Doctor Aggregation using $lookup
    const patientsPerDoctor = await Doctor.aggregate([
      {
        $lookup: {
          from: 'patients',
          localField: '_id',
          foreignField: 'doctorId',
          as: 'assignedPatients',
        },
      },
      {
        $project: {
          doctorId: '$_id',
          doctorName: '$name',
          specialization: '$specialization',
          patientsCount: { $size: '$assignedPatients' },
        },
      },
      { $sort: { patientsCount: -1, doctorName: 1 } },
      { $limit: 8 },
    ]);

    // 3. Admission trend for AreaChart (last 14 days)
    const cutoff14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const admissionMap = new Map<string, number>(
      (patientAggregation?.admissionsTrend || []).map((t: any) => [t._id, Number(t.admissions) || 0])
    );

    const admissionTrend = Array.from({ length: 14 }, (_, idx) => {
      const d = new Date(Date.now() - (13 - idx) * 24 * 60 * 60 * 1000);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        date: iso,
        label,
        admissions: admissionMap.get(iso) ?? 0,
      };
    });

    // 4. Recent Patients
    const recentPatients = await Patient.find()
      .populate('doctorId', 'name specialization hospital')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const formattedRecent = recentPatients.map((p: any) => ({
      ...p,
      id: p._id,
      doctor: p.doctorId ? { name: p.doctorId.name } : null,
      admissionDate: p.admissionDate,
    }));

    // 5. Bookings Count
    const upcomingBookingsCount = await Booking.countDocuments({
      status: { $nin: ['Completed', 'Cancelled'] },
    });

    // 6. Average Load
    const avgPatientsPerDoctor = totalDoctors > 0 ? totalPatients / totalDoctors : 0;

    // Return the exact flat shape DashboardPage.tsx expects
    res.json({
      totalDoctors,
      totalPatients,
      avgPatientsPerDoctor,
      criticalCount,
      upcomingBookingsCount,
      doctorsDeltaPercent: 8,
      patientsDeltaPercent: 14,
      avgLoadDeltaPercent: 5,
      criticalDeltaPercent: -2,
      conditionDistribution,
      patientsPerDoctor,
      admissionTrend,
      recentPatients: formattedRecent,
      alerts: [],
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to aggregate dashboard analytics' });
  }
});

export default router;
