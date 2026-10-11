/*
 * DVAGO mailer — sends email via SMTP if configured, otherwise saves to data/emails/
 * Required env vars for real email:
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS, SMTP_FROM
 *   SMTP_SECURE=true for port 465
 * Without SMTP, emails are saved as JSON files for the admin to inspect.
 */
const fs = require('fs');
const path = require('path');

const EMAILS_DIR = path.join(__dirname, 'data', 'emails');
fs.mkdirSync(EMAILS_DIR, { recursive: true });

let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch (e) { /* optional */ }

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!nodemailer || !process.env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
  return transporter;
}

function fromAddress() {
  return process.env.SMTP_FROM || 'DVAGO HR <no-reply@dvago.com>';
}

function sanitize(s) {
  return String(s || '').replace(/[/\\?%*:|"<>]/g, '').slice(0, 60);
}

async function send({ to, subject, html, text, meta }) {
  const email = {
    to, from: fromAddress(), subject,
    html, text,
    meta: meta || {},
    createdAt: new Date().toISOString(),
    status: 'queued',
    deliveredBy: null,
    error: null
  };
  const t = getTransporter();
  if (t) {
    try {
      const info = await t.sendMail({ from: email.from, to, subject, text, html });
      email.status = 'sent';
      email.deliveredBy = 'smtp';
      email.messageId = info.messageId;
      email.response = info.response;
    } catch (e) {
      email.status = 'failed';
      email.error = e.message;
    }
  } else {
    email.deliveredBy = 'file';
    email.status = nodemailer ? 'not-configured' : 'nodemailer-not-installed';
  }
  try {
    const stamp = email.createdAt.replace(/[:.]/g, '-');
    const fname = `${stamp}_${sanitize(to)}_${sanitize(subject)}.json`;
    fs.writeFileSync(path.join(EMAILS_DIR, fname), JSON.stringify(email, null, 2));
    const htmlName = fname.replace(/\.json$/, '.html');
    fs.writeFileSync(path.join(EMAILS_DIR, htmlName), html || `<pre>${text || ''}</pre>`);
  } catch (e) {
    console.warn('mailer: could not save local copy', e.message);
  }
  console.log(`[mail] ${email.status === 'sent' ? 'SENT' : email.status.toUpperCase()} → ${to} · ${subject}`);
  return email;
}

function listEmails(limit) {
  try {
    const files = fs.readdirSync(EMAILS_DIR).filter((f) => f.endsWith('.json')).sort().reverse();
    const items = (limit ? files.slice(0, limit) : files).map((f) => {
      try { const d = JSON.parse(fs.readFileSync(path.join(EMAILS_DIR, f), 'utf8')); return Object.assign({ file: f }, d); } catch (e) { return null; }
    }).filter(Boolean);
    return items;
  } catch (e) { return []; }
}

// ---------- Templates ----------
const BRAND = { primary: '#78B943', dark: '#0E2A12' };

function wrap(title, body, cta) {
  return `<!doctype html><html><body style="margin:0;background:#F5F7F2;font-family:Inter,Arial,sans-serif;color:#1A1A1A">
<div style="max-width:560px;margin:0 auto;padding:40px 20px">
  <div style="background:${BRAND.dark};color:#fff;padding:28px 32px;border-radius:14px 14px 0 0;text-align:center">
    <div style="font-size:32px;font-weight:800;letter-spacing:3px;font-family:Arial,sans-serif">DVAGO</div>
    <div style="font-size:11px;letter-spacing:2px;opacity:.75;margin-top:4px">PHARMACY &amp; WELLNESS EXPERTS</div>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 14px 14px;box-shadow:0 2px 10px rgba(0,0,0,.05);line-height:1.6">
    <h2 style="margin:0 0 16px;font-size:22px;color:${BRAND.dark}">${title}</h2>
    ${body}
    ${cta ? `<div style="text-align:center;margin:28px 0 8px"><a href="${cta.url}" style="display:inline-block;background:${BRAND.primary};color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px">${cta.label}</a></div>` : ''}
  </div>
  <div style="text-align:center;color:#8A9387;font-size:12px;margin-top:16px">
    DVAGO Human Resources · careers@dvago.pk<br>
    This is an automated message. Please do not reply directly.
  </div>
</div>
</body></html>`;
}

async function sendScheduleConfirmation({ to, name, scheduleLabel, link }) {
  const first = (name || '').split(/\s+/)[0] || 'there';
  const html = wrap('Your DVAGO interview is scheduled',
    `<p>Dear ${first},</p>
     <p>Thank you for choosing to interview with DVAGO. Your AI-powered interview with SARAH, our recruiter agent, has been scheduled for:</p>
     <div style="background:#F0F7E8;border-left:4px solid ${BRAND.primary};padding:16px 20px;border-radius:8px;margin:16px 0;font-weight:600;font-size:16px;color:${BRAND.dark}">${scheduleLabel}</div>
     <p>At your scheduled time, open your interview link and SARAH will guide you through the full process. The interview takes about <b>40 minutes</b>.</p>
     <p><b>Before you start:</b></p>
     <ul style="padding-left:20px;color:#4A5560">
       <li>Find a quiet place with stable internet</li>
       <li>Use a laptop or desktop (Chrome or Edge works best)</li>
       <li>Keep your microphone and speakers ready</li>
       <li>Have your resume handy</li>
     </ul>
     <p>Best of luck! We look forward to meeting you.</p>`,
    link ? { url: link, label: 'Open my interview link' } : null);
  const text = `Dear ${first},\n\nYour DVAGO AI interview is scheduled for ${scheduleLabel}.\n\nOpen your interview link at your scheduled time: ${link || '(link in previous email)'}\n\nIt takes about 40 minutes.\n\nBest of luck!\nDVAGO Human Resources`;
  return send({ to, subject: 'Your DVAGO interview is scheduled', html, text, meta: { kind: 'schedule-confirmation' } });
}

async function sendCompletionConfirmation({ to, name, roleTitle, positionTitle, refId }) {
  const first = (name || '').split(/\s+/)[0] || 'there';
  const html = wrap('We received your interview, ' + first + '!',
    `<p>Dear ${first},</p>
     <p>Thank you for completing your DVAGO AI interview for the <b>${positionTitle || roleTitle}</b> role. Your submission has been received and your evaluation report is being prepared.</p>
     <div style="background:#F7FAF4;border:1px solid #E1EBD6;padding:14px 18px;border-radius:10px;margin:16px 0;font-size:13px;color:#4A5560">
       <div style="margin-bottom:4px"><b>Reference</b></div>
       <div style="font-family:monospace;font-size:15px;color:${BRAND.dark};letter-spacing:1px">${refId}</div>
     </div>
     <p><b>What happens next</b></p>
     <ol style="padding-left:20px;color:#4A5560">
       <li>SARAH has prepared your detailed interview report for the DVAGO recruitment team.</li>
       <li>A human recruiter will personally review your interview within <b>3–5 working days</b>.</li>
       <li>You'll hear from us by email or phone at the contact details you provided.</li>
     </ol>
     <p>We appreciate the time and effort you put into your interview today. Best of luck!</p>`);
  const text = `Dear ${first},\n\nThank you for completing your DVAGO AI interview for ${positionTitle || roleTitle}.\n\nReference: ${refId}\n\nOur recruitment team will review your interview within 3-5 working days.\n\nBest of luck!\nDVAGO Human Resources`;
  return send({ to, subject: 'We received your DVAGO interview — ' + refId, html, text, meta: { kind: 'completion', refId } });
}

async function sendInvite({ to, name, link, roleTitle }) {
  const first = (name || '').split(/\s+/)[0] || 'there';
  const html = wrap("You're invited to interview with DVAGO",
    `<p>Dear ${first},</p>
     <p>You are invited to complete your DVAGO interview with <b>SARAH</b>, our AI recruiter agent${roleTitle ? ', for the <b>' + roleTitle + '</b> position' : ''}.</p>
     <p>SARAH will guide you through a short conversation, scenarios and a case study — tailored to the role. The whole experience takes about <b>40 minutes</b> and you can start whenever you're ready in the next 7 days.</p>
     <p><b>Tips for your best interview:</b></p>
     <ul style="padding-left:20px;color:#4A5560">
       <li>Pick a quiet place with stable internet</li>
       <li>Use Chrome or Edge on a laptop/desktop</li>
       <li>Keep your resume handy to upload</li>
     </ul>`,
    { url: link, label: 'Start my interview' });
  const text = `Dear ${first},\n\nYou are invited to interview with DVAGO for ${roleTitle || 'a position'}.\n\nStart here: ${link}\n\nIt takes about 40 minutes.\n\nBest of luck!\nDVAGO HR`;
  return send({ to, subject: "You're invited to interview with DVAGO" + (roleTitle ? ' — ' + roleTitle : ''), html, text, meta: { kind: 'invite' } });
}

module.exports = { send, sendScheduleConfirmation, sendCompletionConfirmation, sendInvite, listEmails, isConfigured: () => !!getTransporter() };
