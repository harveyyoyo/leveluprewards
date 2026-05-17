import PDFDocument from 'pdfkit';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import path from 'path';

const SITE_CONTACT_EMAIL = 'contact@leveluprewards.app';
const SITE_LEGAL_UMBRELLA =
  'LevelUp Rewards is proudly developed, owned, and operated by LevelUp EdTech Enterprises LLC.';

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function writePdf({ title, subtitle, sections, outFile }) {
  ensureDir(outFile);

  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 54, bottom: 54, left: 54, right: 54 },
    info: { Title: title },
  });
  doc.pipe(createWriteStream(outFile));

  doc.font('Helvetica-Bold').fontSize(18).text(title);
  if (subtitle) {
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(11).fillColor('#444').text(subtitle);
    doc.fillColor('#000');
  }
  doc.moveDown(1.0);

  for (const section of sections) {
    if (section.type === 'heading') {
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(12).text(section.text);
      doc.moveDown(0.2);
      continue;
    }
    if (section.type === 'bullets') {
      doc.font('Helvetica').fontSize(10.5);
      for (const item of section.items) {
        doc.text(`• ${item}`, { indent: 14 });
      }
      doc.moveDown(0.4);
      continue;
    }
    // paragraph
    doc.font('Helvetica').fontSize(10.5).text(section.text, { lineGap: 2 });
    doc.moveDown(0.4);
  }

  doc.end();
}

const outDir = path.join(process.cwd(), 'public');

writePdf({
  title: 'Terms of Service',
  subtitle: 'Effective Date: May 6, 2026',
  outFile: path.join(outDir, 'terms', 'LevelUp-EdTech-Enterprises-LLC-Terms-of-Service-2026.pdf'),
  sections: [
    {
      type: 'paragraph',
      text:
        'Welcome to LevelUp Rewards, operated by LevelUp EdTech Enterprises LLC ("we," "us," or "our"). By accessing or using our website, platform, and behavioral incentive services (the "Service"), you agree to be bound by these Terms of Service ("Terms").',
    },
    { type: 'heading', text: '1. Use of the Service' },
    {
      type: 'paragraph',
      text:
        'LevelUp Rewards is designed for educational use by schools, teachers, and students. You agree to use the Service only for lawful purposes and in accordance with these Terms. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.',
    },
    { type: 'heading', text: '2. Eligibility and Authority' },
    {
      type: 'paragraph',
      text:
        'If you are an individual teacher or administrator using this Service on behalf of a school or district, you represent that you have the authority to bind that entity to these Terms. Use by students must be overseen by an authorized educational professional.',
    },
    { type: 'heading', text: '3. Intellectual Property Rights' },
    {
      type: 'paragraph',
      text:
        'The Service, including its source code (Next.js/Firebase architecture), user interface design, logos, and original content, is the exclusive property of LevelUp EdTech Enterprises LLC and is protected by United States and international copyright, trademark, and other intellectual property laws.',
    },
    {
      type: 'bullets',
      items: [
        'License: We grant you a limited, non-exclusive, non-transferable license to access the Service for educational purposes.',
        'Restrictions: You may not reverse engineer, decompile, or attempt to extract the source code of the Service.',
      ],
    },
    { type: 'heading', text: '4. User Content' },
    {
      type: 'paragraph',
      text:
        'You retain ownership of any data or content you upload to the Service ("User Content"). However, by using the Service, you grant us the right to process this content solely for the purpose of providing the rewards and incentive features to you and your students.',
    },
    { type: 'heading', text: '5. Termination' },
    {
      type: 'paragraph',
      text:
        "We reserve the right to suspend or terminate your access to the Service at any time, without notice, for conduct that we believe violates these Terms or is harmful to other users or the Service's integrity.",
    },
    { type: 'heading', text: '6. Limitation of Liability' },
    {
      type: 'paragraph',
      text:
        'To the maximum extent permitted by law, LevelUp EdTech Enterprises LLC shall not be liable for any indirect, incidental, or consequential damages arising out of your use of the Service. The Service is provided "as is" without warranties of any kind.',
    },
    { type: 'heading', text: '7. Governing Law' },
    {
      type: 'paragraph',
      text:
        'These Terms are governed by the laws of the State of New York, without regard to its conflict of law principles. Any legal action related to these Terms shall be brought in the courts located in Kings County, New York.',
    },
    { type: 'heading', text: '8. Changes to Terms' },
    {
      type: 'paragraph',
      text:
        'We may update these Terms from time to time. We will notify you of any significant changes by posting the new Terms on this page and updating the "Effective Date."',
    },
    { type: 'heading', text: 'Contact Us' },
    {
      type: 'paragraph',
      text: `If you have questions about these Terms, please contact us at ${SITE_CONTACT_EMAIL}.`,
    },
    {
      type: 'paragraph',
      text: SITE_LEGAL_UMBRELLA,
    },
  ],
});

writePdf({
  title: 'Privacy Policy',
  subtitle: 'Data Privacy and Security Agreement (DPSA)',
  outFile: path.join(outDir, 'privacy', 'LevelUp-EdTech-Enterprises-LLC-Data-Privacy-Agreement-DPSA-2026.pdf'),
  sections: [
    {
      type: 'paragraph',
      text:
        'This Data Privacy and Security Agreement ("Agreement") is entered into by and between LevelUp EdTech Enterprises LLC ("Provider") and the school, district, or educational organization listed in the signature block ("Subscriber"). This document establishes the protocols for the protection of Student Data and Personally Identifiable Information (PII) in accordance with 2026 industry standards and legal requirements.',
    },
    { type: 'heading', text: '1. Scope of Service' },
    {
      type: 'paragraph',
      text:
        'Provider provides a behavioral incentive and student rewards platform ("LevelUp Rewards"). To provide this service, certain data elements must be processed to track student progress, manage point ledgers, and facilitate check-ins.',
    },
    { type: 'heading', text: '2. Data Collection and Usage Rubric' },
    {
      type: 'paragraph',
      text:
        'The following outlines the data elements collected and the specific purpose for each as required by FERPA and COPPA guidelines.',
    },
    {
      type: 'bullets',
      items: [
        'Student Identity: First Name, Last Initial, Grade Level — to identify participants in the rewards ledger.',
        'Behavioral Records: Points Earned, Reward Redemptions — core functional data for the incentive system.',
        'Technical Logs: IP Address, Browser Type, Login Timestamps — security monitoring and platform optimization.',
      ],
    },
    { type: 'heading', text: '3. 2026 Artificial Intelligence (AI) Compliance' },
    {
      type: 'paragraph',
      text:
        'LevelUp EdTech Enterprises LLC adheres to the 1EdTech Generative AI Data Rubric. We provide the following explicit guarantees:',
    },
    {
      type: 'bullets',
      items: [
        'No Model Training: Student PII, behavioral logs, and teacher comments are NEVER used to train, fine-tune, or iterate upon any Large Language Models (LLMs) or generative AI systems.',
        'Data Isolation: All student data is stored in isolated environments. AI features (such as automated reward descriptions) are processed via "Zero-Retention" APIs where data is deleted immediately after the specific task is completed.',
      ],
    },
    { type: 'heading', text: '4. New York Education Law 2-d Supplemental Information' },
    {
      type: 'paragraph',
      text:
        "As a Brooklyn-based entity, Provider complies with New York State Education Law 2-d and the Parents' Bill of Rights.",
    },
    {
      type: 'bullets',
      items: [
        'Storage Location: Google Cloud / Firebase (US-East Multi-Region).',
        'Encryption Standards: AES-256 at rest; TLS 1.3 in transit.',
        'Data Deletion Policy: Data is purged within 90 days of contract termination or upon written request.',
        'Authorized Sub-processors: Google Cloud Platform, Cloudflare Inc.',
      ],
    },
    { type: 'heading', text: '5. Breach Notification' },
    {
      type: 'paragraph',
      text:
        "In the event of an unauthorized release of Student Data, Provider will notify the Subscriber within seven (7) days of discovery and will cooperate fully with the Subscriber's data protection officer to mitigate any impact.",
    },
    { type: 'heading', text: '6. Execution' },
    { type: 'paragraph', text: 'By signing below, the parties agree to be bound by the terms of this Agreement.' },
    {
      type: 'bullets',
      items: [
        'Provider: LevelUp EdTech Enterprises LLC',
        'Signature: ____________________________________   Date: May 6, 2026',
        'Name: Dovid Teitelbaum   Title: Managing Member',
        'Subscriber: [School/District Name]',
        'Signature: ____________________________________   Date: ___________',
        'Name: ____________________________________   Title: ________________',
      ],
    },
    { type: 'heading', text: 'Contact Us' },
    {
      type: 'paragraph',
      text: `If you have questions about this Agreement or data privacy practices, please contact us at ${SITE_CONTACT_EMAIL}.`,
    },
    {
      type: 'paragraph',
      text: SITE_LEGAL_UMBRELLA,
    },
  ],
});

console.log('Generated legal PDFs from text.');

