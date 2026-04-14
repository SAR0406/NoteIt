import { TemplateType } from '@/types';

export const TEMPLATES: Record<TemplateType, { name: string; icon: string; content: string }> = {
  blank: {
    name: 'Blank Note',
    icon: '📄',
    content: '',
  },
  soap: {
    name: 'SOAP Note',
    icon: '🩺',
    content: `<h2>SOAP Note</h2>
<h3>S — Subjective</h3>
<p><em>Chief complaint, history of present illness, past medical history, medications, allergies, social history, family history, review of systems</em></p>
<p></p>
<h3>O — Objective</h3>
<p><em>Vital signs, physical examination findings, lab results, imaging</em></p>
<ul><li>BP: </li><li>HR: </li><li>RR: </li><li>Temp: </li><li>SpO2: </li></ul>
<p></p>
<h3>A — Assessment</h3>
<p><em>Diagnosis / differential diagnoses</em></p>
<ol><li></li><li></li><li></li></ol>
<p></p>
<h3>P — Plan</h3>
<p><em>Investigations, management, medications, follow-up</em></p>
<ul><li>Investigations: </li><li>Management: </li><li>Medications: </li><li>Follow-up: </li></ul>`,
  },
  'case-sheet': {
    name: 'Case Sheet',
    icon: '📋',
    content: `<h2>Clinical Case Sheet</h2>
<h3>Patient Information</h3>
<ul><li><strong>Name:</strong> </li><li><strong>Age/Sex:</strong> </li><li><strong>Ward/Bed:</strong> </li><li><strong>Date of Admission:</strong> </li></ul>
<h3>Chief Complaint</h3><p></p>
<h3>History of Present Illness</h3><p></p>
<h3>Past Medical History</h3><p></p>
<h3>Family History</h3><p></p>
<h3>Personal History</h3><p></p>
<h3>Systemic Examination</h3>
<ul><li><strong>CVS:</strong> </li><li><strong>RS:</strong> </li><li><strong>CNS:</strong> </li><li><strong>Abdomen:</strong> </li></ul>
<h3>Investigations</h3><p></p>
<h3>Diagnosis</h3><p></p>
<h3>Treatment</h3><p></p>`,
  },
  anatomy: {
    name: 'Anatomy Note',
    icon: '🫀',
    content: `<h2>Anatomy Notes</h2>
<h3>Structure</h3><p></p>
<h3>Location</h3><p></p>
<h3>Relations</h3>
<ul><li><strong>Anterior:</strong> </li><li><strong>Posterior:</strong> </li><li><strong>Superior:</strong> </li><li><strong>Inferior:</strong> </li><li><strong>Medial:</strong> </li><li><strong>Lateral:</strong> </li></ul>
<h3>Blood Supply</h3>
<ul><li><strong>Arterial:</strong> </li><li><strong>Venous:</strong> </li></ul>
<h3>Nerve Supply</h3><p></p>
<h3>Lymphatic Drainage</h3><p></p>
<h3>Functions</h3><p></p>
<h3>Clinical Relevance</h3><p></p>
<h3>High-Yield Points</h3><ul><li></li></ul>`,
  },
  pharmacology: {
    name: 'Pharmacology Note',
    icon: '💊',
    content: `<h2>Pharmacology Notes</h2>
<h3>Drug Name</h3><p></p>
<h3>Drug Class</h3><p></p>
<h3>Mechanism of Action</h3><p></p>
<h3>Pharmacokinetics</h3>
<ul><li><strong>Absorption:</strong> </li><li><strong>Distribution:</strong> </li><li><strong>Metabolism:</strong> </li><li><strong>Excretion:</strong> </li><li><strong>Half-life:</strong> </li></ul>
<h3>Indications</h3><ul><li></li></ul>
<h3>Contraindications</h3><ul><li></li></ul>
<h3>Side Effects</h3><ul><li></li></ul>
<h3>Drug Interactions</h3><ul><li></li></ul>
<h3>Dosage</h3><p></p>
<h3>High-Yield Points</h3><ul><li></li></ul>`,
  },
};

export const MEDICAL_TAGS = [
  '#Anatomy', '#Physiology', '#Biochemistry', '#Pathology',
  '#Pharmacology', '#Microbiology', '#Forensic', '#Medicine',
  '#Surgery', '#Pediatrics', '#OBG', '#PSM', '#ENT', '#Ophthalmology',
  '#Orthopedics', '#Radiology', '#Anesthesia', '#Psychiatry',
];

export const NOTEBOOK_COLORS = [
  '#3b5bdb', '#4c6ef5', '#7c3aed', '#0f9d75',
  '#0ea5a4', '#2563eb', '#6366f1', '#8b5cf6',
];
