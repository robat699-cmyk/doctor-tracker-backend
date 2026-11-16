import bcrypt from 'bcryptjs';
import { User } from './models/User.js';
import { Doctor } from './models/Doctor.js';
import { Patient } from './models/Patient.js';
import { PatientTest } from './models/PatientTest.js';
import { Booking } from './models/Booking.js';

export async function seedDatabaseIfEmpty(): Promise<void> {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log('Seeding administrative user...');
    const hash = bcrypt.hashSync('Admin@2026!', 10);
    await User.create({
      name: 'Dr. Tariq Rahman',
      email: 'admin@careguidebd.com',
      passwordHash: hash,
      role: 'Clinical Operations Admin',
    });
  }

  const docCount = await Doctor.countDocuments();
  if (docCount === 0) {
    console.log('Seeding clinical doctors and patient records...');
    const doctorsData = [
      {
        name: 'Prof. Dr. M. A. Hasan',
        specialization: 'Cardiology',
        hospital: 'National Heart Foundation & Research Institute',
        phone: '+880 1711-234567',
        email: 'hasan.cardio@careguidebd.com',
      },
      {
        name: 'Dr. Nusrat Jahan',
        specialization: 'Neurology',
        hospital: 'Evercare Hospital Dhaka',
        phone: '+880 1819-345678',
        email: 'nusrat.neuro@careguidebd.com',
      },
      {
        name: 'Dr. Tanvir Ahmed',
        specialization: 'Orthopedics',
        hospital: 'Square Hospital Dhaka',
        phone: '+880 1912-456789',
        email: 'tanvir.ortho@careguidebd.com',
      },
      {
        name: 'Dr. Farhana Yasmin',
        specialization: 'Pediatrics',
        hospital: 'Dhaka Shishu (Children) Hospital',
        phone: '+880 1613-567890',
        email: 'farhana.ped@careguidebd.com',
      },
      {
        name: 'Dr. Rafiqul Islam',
        specialization: 'General Medicine',
        hospital: 'Dhaka Medical College Hospital',
        phone: '+880 1714-678901',
        email: 'rafiqul.med@careguidebd.com',
      },
      {
        name: 'Dr. Sharmin Akter',
        specialization: 'Dermatology',
        hospital: 'United Hospital Limited',
        phone: '+880 1815-789012',
        email: 'sharmin.derma@careguidebd.com',
      },
      {
        name: 'Dr. Kamal Hossain',
        specialization: 'Oncology',
        hospital: 'National Institute of Cancer Research & Hospital',
        phone: '+880 1916-890123',
        email: 'kamal.onco@careguidebd.com',
      },
      {
        name: 'Dr. Sabina Yeasmin',
        specialization: 'Nephrology',
        hospital: 'Kidney Foundation Hospital',
        phone: '+880 1517-901234',
        email: 'sabina.nephro@careguidebd.com',
      },
    ];

    const createdDoctors = await Doctor.insertMany(doctorsData);

    const conditions: Array<'Stable' | 'Critical' | 'Under Observation' | 'Discharged'> = [
      'Stable',
      'Critical',
      'Under Observation',
      'Discharged',
    ];

    const patientsData = [
      {
        name: 'Karim Uddin',
        age: 58,
        gender: 'Male',
        condition: 'Critical',
        diseaseType: 'Acute Myocardial Infarction',
        contactNumber: '+880 1712-111222',
        daysAgo: 2,
        docIdx: 0,
      },
      {
        name: 'Rokeya Begum',
        age: 64,
        gender: 'Female',
        condition: 'Under Observation',
        diseaseType: 'Ischemic Heart Failure',
        contactNumber: '+880 1813-222333',
        daysAgo: 5,
        docIdx: 0,
      },
      {
        name: 'Jasim Uddin',
        age: 49,
        gender: 'Male',
        condition: 'Stable',
        diseaseType: 'Arrhythmia Management',
        contactNumber: '+880 1914-333444',
        daysAgo: 12,
        docIdx: 0,
      },
      {
        name: 'Amina Khatun',
        age: 42,
        gender: 'Female',
        condition: 'Critical',
        diseaseType: 'Ischemic Stroke',
        contactNumber: '+880 1615-444555',
        daysAgo: 1,
        docIdx: 1,
      },
      {
        name: 'Belal Hossain',
        age: 36,
        gender: 'Male',
        condition: 'Under Observation',
        diseaseType: 'Refractory Epilepsy',
        contactNumber: '+880 1716-555666',
        daysAgo: 4,
        docIdx: 1,
      },
      {
        name: 'Salma Parvin',
        age: 51,
        gender: 'Female',
        condition: 'Discharged',
        diseaseType: 'Chronic Migraine',
        contactNumber: '+880 1817-666777',
        daysAgo: 18,
        docIdx: 1,
      },
      {
        name: 'Mostafa Kamal',
        age: 29,
        gender: 'Male',
        condition: 'Stable',
        diseaseType: 'Femur Fracture Post-OP',
        contactNumber: '+880 1918-777888',
        daysAgo: 7,
        docIdx: 2,
      },
      {
        name: 'Nasrin Sultana',
        age: 62,
        gender: 'Female',
        condition: 'Under Observation',
        diseaseType: 'Total Knee Arthroplasty',
        contactNumber: '+880 1519-888999',
        daysAgo: 3,
        docIdx: 2,
      },
      {
        name: 'Baby Arham',
        age: 4,
        gender: 'Male',
        condition: 'Critical',
        diseaseType: 'Severe Bronchopneumonia',
        contactNumber: '+880 1720-999000',
        daysAgo: 2,
        docIdx: 3,
      },
      {
        name: 'Marium Nisa',
        age: 7,
        gender: 'Female',
        condition: 'Stable',
        diseaseType: 'Enteric Fever Recovery',
        contactNumber: '+880 1821-000111',
        daysAgo: 9,
        docIdx: 3,
      },
      {
        name: 'Habibur Rahman',
        age: 47,
        gender: 'Male',
        condition: 'Stable',
        diseaseType: 'Type 2 Diabetes Mellitus',
        contactNumber: '+880 1922-111222',
        daysAgo: 14,
        docIdx: 4,
      },
      {
        name: 'Fatema Tuz Zohra',
        age: 33,
        gender: 'Female',
        condition: 'Discharged',
        diseaseType: 'Acute Viral Gastroenteritis',
        contactNumber: '+880 1623-222333',
        daysAgo: 22,
        docIdx: 4,
      },
      {
        name: 'Sazzadul Islam',
        age: 26,
        gender: 'Male',
        condition: 'Stable',
        diseaseType: 'Psoriasis Vulgaris',
        contactNumber: '+880 1724-333444',
        daysAgo: 11,
        docIdx: 5,
      },
      {
        name: 'Monowara Begum',
        age: 55,
        gender: 'Female',
        condition: 'Under Observation',
        diseaseType: 'Breast Carcinoma Chemotherapy',
        contactNumber: '+880 1825-444555',
        daysAgo: 6,
        docIdx: 6,
      },
      {
        name: 'Enamul Haque',
        age: 68,
        gender: 'Male',
        condition: 'Critical',
        diseaseType: 'End Stage Renal Disease',
        contactNumber: '+880 1926-555666',
        daysAgo: 1,
        docIdx: 7,
      },
    ];

    const now = new Date();

    const createdPatients = await Promise.all(
      patientsData.map((p) => {
        const admission = new Date(now.getTime() - p.daysAgo * 24 * 60 * 60 * 1000);
        const admissionDateStr = admission.toISOString().split('T')[0];
        const assignedDoc = createdDoctors[p.docIdx];

        return Patient.create({
          doctorId: assignedDoc._id,
          name: p.name,
          age: p.age,
          gender: p.gender,
          condition: p.condition as any,
          diseaseType: p.diseaseType,
          contactNumber: p.contactNumber,
          admissionDate: admissionDateStr,
          lastCheckIn: new Date(admission.getTime() + 12 * 60 * 60 * 1000).toISOString(),
        });
      })
    );

    // Seed sample lab tests for critical patients
    for (const pat of createdPatients) {
      if (pat.condition === 'Critical') {
        await PatientTest.create({
          patientId: pat._id,
          testType: 'Cardiac Troponin-I / High Sensitivity',
          resultValue: '1.42 ng/mL (High)',
          status: 'Critical',
          notes: 'Immediate cardiology re-evaluation required. Continuous telemetry monitoring active.',
        });
      } else {
        await PatientTest.create({
          patientId: pat._id,
          testType: 'Complete Blood Count (CBC)',
          resultValue: 'WBC: 7.2 x10^3/uL, Hb: 13.8 g/dL',
          status: 'Normal',
          notes: 'Within baseline normal physiological reference ranges.',
        });
      }
    }

    // Seed sample bookings
    await Booking.create({
      doctorId: createdDoctors[0]._id,
      patientId: createdPatients[0]._id,
      patientName: createdPatients[0].name,
      appointmentDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      timeSlot: '10:30 AM',
      status: 'Confirmed',
      visitType: 'Emergency In-Person Review',
      chiefComplaint: 'Chest tightness, radiating pain',
      notes: 'Priority clinical slot assigned',
    });

    console.log(`Seeded ${createdDoctors.length} doctors and ${createdPatients.length} patients successfully.`);
  }
}

// Standalone runner
if (process.argv[1]?.endsWith('seed.ts')) {
  import('./config/db.js').then(async ({ connectDB }) => {
    await connectDB();
    await seedDatabaseIfEmpty();
    console.log('Database seeding process completed.');
    process.exit(0);
  });
}
