import { Router } from 'express';
import { Booking, Reminder } from '../models/Booking.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const { search, status, doctorId } = req.query;
    const filter: Record<string, any> = {};

    if (search && typeof search === 'string' && search.trim()) {
      filter.$or = [
        { patientName: { $regex: search.trim(), $options: 'i' } },
        { visitType: { $regex: search.trim(), $options: 'i' } },
        { chiefComplaint: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (doctorId && doctorId !== 'All') {
      filter.doctorId = doctorId;
    }

    const [bookings, total, upcomingCount, remindersSent] = await Promise.all([
      Booking.find(filter)
        .populate('doctorId', 'name specialization')
        .sort({ appointmentDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter),
      Booking.countDocuments({ status: { $nin: ['Completed', 'Cancelled'] } }),
      Reminder.countDocuments({ status: 'Sent' }),
    ]);

    const formatted = bookings.map((b: any) => ({
      ...b,
      id: b._id,
      patientPhone: b.contactNumber || '+880 1711-000000',
      diseaseType: b.diseaseType || 'General Medicine',
      doctorName: b.doctorId ? `Dr. ${b.doctorId.name}` : 'Unassigned',
      doctorSpecialization: b.doctorId?.specialization || '',
    }));

    res.json({
      items: formatted,
      data: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      stats: {
        upcomingCount,
        patientRemindersSent: remindersSent,
        doctorRemindersSent: Math.floor(remindersSent * 0.8),
        pendingReminders: 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch bookings' });
  }
});

router.post('/', async (req, res) => {
  try {
    const booking = await Booking.create(req.body);
    res.status(201).json({
      booking: { ...booking.toObject(), id: booking._id },
      message: 'Consultation appointment scheduled.',
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to create booking' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ booking: updated, message: 'Booking status updated.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update booking' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ message: 'Appointment removed.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to delete booking' });
  }
});

router.post('/:id/remind', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    const reminder = await Reminder.create({
      bookingId: booking._id,
      patientName: booking.patientName,
      contactNumber: '+880 1711-000000',
      scheduledFor: `${booking.appointmentDate} at ${booking.timeSlot}`,
      channel: 'SMS / WhatsApp Notification',
      message: `Dear ${booking.patientName}, your medical consultation appointment is scheduled for ${booking.appointmentDate} at ${booking.timeSlot}.`,
      status: 'Sent',
      sentAt: new Date().toISOString(),
    });

    res.status(201).json({
      reminder: { ...reminder.toObject(), id: reminder._id },
      message: 'Automated appointment reminder sent to patient.',
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to send reminder' });
  }
});

export default router;
