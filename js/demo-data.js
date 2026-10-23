/* Demo data seeder — creates ~24 sample candidates with realistic answers for the admin dashboard */
window.DVAGO_DEMO = (function () {
  const B = window.DVAGO_BANK;
  const EVAL = window.DIA_EVAL;

  const NAMES = [
    'Ahmed Khan', 'Sara Ali', 'Hassan Raza', 'Fatima Noor', 'Usman Sheikh', 'Ayesha Malik',
    'Bilal Ahmed', 'Zainab Hussain', 'Imran Qureshi', 'Hina Tariq', 'Ali Hassan', 'Maryam Siddiqui',
    'Faisal Mahmood', 'Nadia Pervez', 'Kamran Akhtar', 'Sana Iqbal', 'Rizwan Javed', 'Amna Riaz',
    'Tariq Mehmood', 'Rabia Aslam', 'Waqar Younis', 'Mehwish Hayat', 'Junaid Safdar', 'Asma Bibi'
  ];
  const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Hyderabad'];
  const EDUS = ['Matric / O-Levels', 'Intermediate / A-Levels', "Bachelor's Degree", "Master's Degree", 'Pharm-D'];
  const EXPS = ['Fresh / No experience', 'Less than 1 year', '1 – 2 years', '3 – 5 years', '5 – 10 years'];
  const STAGES = ['New', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];
  const ROLES = Object.keys(B.ROLES);

  // Sample free-text answers for case study (varies by quality)
  const SAMPLE_ANSWERS = {
    good: [
      'First, I would stay calm and listen to the customer. I would move the conversation to a private area so other customers are not disturbed. I would call the pharmacist immediately and verify the prescription against what was dispensed. If there was an error, I would replace the medicine with the correct one, apologise sincerely, and check if the customer has taken any. We would then follow up to ensure they are safe. After the customer leaves, I would document the incident, investigate the root cause with the team, and implement a double-check process so this does not happen again.',
      'I would start by analysing the data to understand what is happening. In the first week I would meet each team member one-to-one, review stock availability reports, check shrinkage data, and look at customer feedback. For the next 30 days I would focus on fixing stock availability through better ordering, train staff on customer service, and introduce daily audits to tackle shrinkage. I would set clear KPIs and track them weekly, celebrate quick wins to rebuild morale, and partner with the nearby clinics to drive footfall.',
      'Individual POS logins for every cashier, manager approval with PIN for all refunds above a threshold, mandatory customer phone and receipt for refunds, and a daily refund report reviewed by the store manager. I would also add weekly audits and CCTV review of flagged transactions.'
    ],
    mid: [
      'I would apologise and give the customer the correct medicine. Then I would tell the manager so they can handle it. I think we should be more careful next time.',
      'I would look at the sales data and talk to the team. We need to fix the stock problem and train the staff better. I would also meet with suppliers.',
      'Better controls and more supervision. Managers should approve refunds and we should check the records every week.'
    ],
    poor: [
      'I would say sorry and give them a new medicine. These things happen sometimes.',
      'I would try my best to improve things. Maybe we need more training.',
      'Have the manager check everything.'
    ]
  };

  const VOICE_SAMPLES = {
    good: [
      "Hello, I am {name}. I have {exp} of experience in retail and customer service. I worked at a well known pharmacy where I handled customers daily, managed cash at the counter and supported the pharmacist. I am passionate about helping people, especially in healthcare. I am punctual, honest and I love working in teams. I am looking forward to growing my career with DVAGO.",
      "I want to join DVAGO because it is a trusted brand in Pakistan for pharmacy and wellness. I believe my experience in customer service and my attention to detail would help me do well in this role. I am a people person, I enjoy explaining things clearly and I always put the customer first."
    ],
    mid: [
      "My name is {name}. I have worked in retail before. I am good with customers and I want to join a bigger company. DVAGO is a good brand so I applied here.",
      "I want this job because I need work. I have some experience and I can learn quickly."
    ],
    poor: [
      "I am {name}. I need a job.",
      "I applied because my friend told me."
    ]
  };

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function makeAnswer(level, template, name, exp) {
    const t = pick(SAMPLE_ANSWERS[level]);
    return template === 'voice' ? pick(VOICE_SAMPLES[level]).replace('{name}', name.split(' ')[0]).replace('{exp}', exp.toLowerCase()) : t;
  }

  function makeOne(i) {
    const name = NAMES[i % NAMES.length];
    const email = name.toLowerCase().replace(/\s/g, '.') + (i > NAMES.length ? i : '') + '@example.com';
    const roleKey = ROLES[i % ROLES.length];
    const role = B.ROLES[roleKey];
    const rq = B.roleQuestions(roleKey);
    const quality = Math.random() < 0.3 ? 'good' : Math.random() < 0.5 ? 'mid' : Math.random() < 0.75 ? 'poor' : 'good';

    const daysAgo = Math.floor(Math.random() * 20);
    const dt = new Date(); dt.setDate(dt.getDate() - daysAgo); dt.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));
    const endDt = new Date(dt.getTime() + (20 + Math.floor(Math.random() * 15)) * 60000);

    const exp = pick(EXPS);
    const candidate = {
      fullName: name,
      email: email,
      phone: '03' + Math.floor(Math.random() * 100).toString().padStart(2, '0') + '-' + Math.floor(Math.random() * 9000000 + 1000000),
      cnic: '',
      city: pick(CITIES),
      education: pick(EDUS),
      experience: exp,
      employer: Math.random() < 0.7 ? 'Previous Company' : '',
      linkedin: ''
    };

    // Voice answers
    const voice = rq.voice.map((v, k) => ({
      id: v.id, q: v.q,
      answer: makeAnswer(quality, 'voice', name, exp),
      mode: Math.random() < 0.6 ? 'voice' : 'text',
      durationSec: 40 + Math.floor(Math.random() * 90)
    }));

    // SJT answers
    const sjt = {};
    rq.sjt.forEach(q => {
      const best = q.options.reduce((b, o, idx) => o.s > q.options[b].s ? idx : b, 0);
      sjt[q.id] = quality === 'good' ? (Math.random() < 0.75 ? best : Math.floor(Math.random() * 4)) :
                  quality === 'mid' ? (Math.random() < 0.45 ? best : Math.floor(Math.random() * 4)) :
                  Math.floor(Math.random() * 4);
    });

    // Simulation
    const ideal = rq.simulation.ideal.slice();
    const sim = ideal.slice();
    if (quality !== 'good') {
      const swaps = quality === 'mid' ? 1 : 2;
      for (let s = 0; s < swaps; s++) {
        const i1 = Math.floor(Math.random() * sim.length);
        const i2 = Math.floor(Math.random() * sim.length);
        [sim[i1], sim[i2]] = [sim[i2], sim[i1]];
      }
    }

    // Case study
    const caseAnswers = {};
    rq.caseStudy.questions.forEach(q => { caseAnswers[q.id] = makeAnswer(quality, 'case'); });

    // Reasoning
    const reasoning = {};
    rq.reasoning.forEach(q => {
      reasoning[q.id] = quality === 'good' ? (Math.random() < 0.8 ? q.answer : Math.floor(Math.random() * 4)) :
                       quality === 'mid' ? (Math.random() < 0.55 ? q.answer : Math.floor(Math.random() * 4)) :
                       Math.floor(Math.random() * 4);
    });

    // Game
    const totalTargets = 4;
    const hits = quality === 'good' ? 3 + Math.floor(Math.random() * 2) : quality === 'mid' ? 2 + Math.floor(Math.random() * 2) : Math.floor(Math.random() * 3);
    const fp = quality === 'good' ? Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 3);
    const game = { targets: totalTargets, hits, falsePositives: fp, timeUsed: 25 + Math.floor(Math.random() * 15), done: true };

    const sub = {
      id: 'DVG-' + (1000000 + i).toString(36).toUpperCase(),
      demo: true,   // sample record: can be removed again with "Remove demo data"
      sessionId: 'S' + i,
      invite: null,
      createdAt: dt.toISOString(),
      startedAt: dt.toISOString(),
      completedAt: endDt.toISOString(),
      receivedAt: endDt.toISOString(),
      candidate: candidate,
      role: roleKey,
      roleTitle: role.title,
      category: role.category,
      schedule: null,
      resume: Math.random() < 0.7 ? { name: name.replace(/\s/g, '_') + '_CV.pdf', type: 'application/pdf', size: 150000, text: `${name}\n${email}\n${candidate.phone}\n\nEducation: ${candidate.education}\nExperience: ${exp}\nSkills: customer service, communication, teamwork, retail, pos` } : null,
      voice: voice,
      voiceLang: 'en-US',
      answers: { sjt, simulation: sim, simulationTouched: true, case: caseAnswers, caseMode: {}, reasoning, game },
      integrity: {
        events: [],
        tabSwitches: quality === 'good' ? 0 : Math.floor(Math.random() * 3),
        fullscreenExits: Math.random() < 0.1 ? 1 : 0,
        pasteAttempts: Math.random() < 0.2 ? 1 : 0
      },
      timings: { assessmentSeconds: 1200 + Math.floor(Math.random() * 800), totalSeconds: 2400 + Math.floor(Math.random() * 800) },
      stage: pick(STAGES.slice(0, 3)),
      notes: '',
      rating: 0
    };

    sub.evaluation = EVAL.evaluate(sub, { weights: EVAL.DEFAULT_SETTINGS.weights, thresholds: EVAL.DEFAULT_SETTINGS.thresholds });
    return sub;
  }

  async function seed() {
    const existing = await Store.listSubmissions();
    if (existing.some((s) => s.demo)) return { skipped: existing.length };   // demo already loaded (real candidates may exist: they are left alone)
    const samples = [];
    for (let i = 0; i < 24; i++) samples.push(makeOne(i));
    // Save via import (works for both local and server mode)
    await Store.importAll({ submissions: samples, invites: [] });
    return { created: samples.length };
  }

  // Deletes only the sample candidates added by seed(); real candidates are never touched.
  async function unseed() {
    const all = await Store.listSubmissions();
    const demo = all.filter((s) => s.demo);
    for (const s of demo) { await Store.deleteSubmission(s.id); }
    return { removed: demo.length };
  }

  return { seed, unseed, makeOne };
})();
