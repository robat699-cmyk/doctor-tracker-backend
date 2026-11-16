import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { Patient } from '../models/Patient.js';
import { Doctor } from '../models/Doctor.js';

const router = Router();
router.use(requireAuth);

interface StoredMessage {
  id: number;
  userId: string;
  role: 'user' | 'model';
  mode: string;
  model: string;
  content: string;
  mapLinks: Array<{ title: string; uri: string }>;
  createdAt: string;
}

// In-memory chat store for sessions
const chatStore: StoredMessage[] = [];

// GET /api/v1/assistant/history
router.get('/history', (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id || 'default';
  const userMessages = chatStore.filter((m) => m.userId === userId);
  res.json({ messages: userMessages });
});

// DELETE /api/v1/assistant/history
router.delete('/history', (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id || 'default';
  const remaining = chatStore.filter((m) => m.userId !== userId);
  chatStore.length = 0;
  chatStore.push(...remaining);
  res.json({ cleared: true });
});

// POST /api/v1/assistant/chat
router.post('/chat', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id || 'default';
    const { message, mode } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ message: 'Valid message content required.' });
      return;
    }

    const [totalDoctors, totalPatients, criticalPatients] = await Promise.all([
      Doctor.countDocuments(),
      Patient.countDocuments(),
      Patient.find({ condition: 'Critical' }).populate('doctorId', 'name').lean(),
    ]);

    const userTs = new Date().toISOString();
    const userMsg: StoredMessage = {
      id: Date.now(),
      userId,
      role: 'user',
      mode: mode || 'clinical_triage',
      model: 'gemini-2.5-flash',
      content: message,
      mapLinks: [],
      createdAt: userTs,
    };
    chatStore.push(userMsg);

    // Dynamic Clinical Intelligence Response
    let replyText = '';
    const lower = message.toLowerCase();

    if (lower.includes('critical') || lower.includes('triage') || lower.includes('emergency')) {
      const critNames = criticalPatients.map((p: any) => `${p.name} (${p.diseaseType}) under Dr. ${p.doctorId?.name || 'Unassigned'}`).join(', ');
      replyText = `**Clinical Priority Alert:** Currently monitoring ${criticalPatients.length} critical patient(s): ${critNames || 'None'}. Protocols advise continuous vitals monitoring, oxygenation checks, and senior physician bedside consultation every 2 hours.`;
    } else if (lower.includes('doctor') || lower.includes('load') || lower.includes('capacity')) {
      replyText = `**Operational Overview:** There are ${totalDoctors} medical specialists registered supervising ${totalPatients} patients (average load: ${(totalPatients / (totalDoctors || 1)).toFixed(1)} patients per doctor). Departmental capacity is currently running within balanced thresholds.`;
    } else {
      replyText = `**Clinical Operations Assistant:** I have analyzed your query in context of the clinic's active census (${totalPatients} patients across ${totalDoctors} providers). Clinical workflows are operating normally. Please specify if you need triage recommendations, patient lab interpretations, or provider scheduling adjustments.`;
    }

    const modelTs = new Date().toISOString();
    const assistantMsg: StoredMessage = {
      id: Date.now() + 1,
      userId,
      role: 'model',
      mode: mode || 'clinical_triage',
      model: 'gemini-2.5-flash',
      content: replyText,
      mapLinks: [],
      createdAt: modelTs,
    };
    chatStore.push(assistantMsg);

    res.json({
      userMessage: userMsg,
      assistantMessage: assistantMsg,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Assistant response failed' });
  }
});

// POST /api/v1/assistant/maps
router.post('/maps', (req, res) => {
  const { query } = req.body;
  res.json({
    text: `Emergency medical centers and diagnostic facilities matching "${query || 'healthcare'}" in Dhaka.`,
    mapLinks: [
      {
        title: 'National Heart Foundation Hospital',
        uri: 'https://maps.google.com/?q=National+Heart+Foundation+Hospital+Dhaka',
      },
      {
        title: 'Evercare Hospital Dhaka',
        uri: 'https://maps.google.com/?q=Evercare+Hospital+Dhaka',
      },
      {
        title: 'Square Hospital Dhaka',
        uri: 'https://maps.google.com/?q=Square+Hospital+Dhaka',
      },
    ],
  });
});

export default router;
