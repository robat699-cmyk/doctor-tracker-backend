import { Router } from 'express';
import { Booking, Reminder } from '../models/Booking.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('doctorId', 'name specialization')
      .sort({ appointmentDate: -1 })
      .lean();

    res.json({
      data: bookings.map((b: any) => ({
        ...b,
        id: b._id,
        doctorName: b.doctorId ? `Dr. ${b.doctorId.name}` : 'Unassigned',
      })),
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
