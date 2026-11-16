import { Router } from 'express';
import { Reminder } from '../models/Booking.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (_req, res) => {
  try {
    const reminders = await Reminder.find().sort({ createdAt: -1 }).limit(50).lean();
    const formatted = reminders.map((r: any) => ({
      ...r,
      id: r._id,
      patientPhone: r.contactNumber,
      timestamp: r.sentAt || r.createdAt,
    }));

    res.json({
      logs: formatted,
      data: formatted,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch reminders' });
  }
});

export default router;
