/*
 * Builds org-seed.json (the company tree shown in admin > Org structure) from the "Updated New Organogram 2026" PowerPoint (slides 5-19).
 *   node tools/build-org-seed.js
 * Edit the tree below and re-run it when the organogram changes. The server loads org-seed.json once (db.hierarchy.v = 2);
 * after that the master edits people in the portal, so a new seed only replaces data if you bump SEED_V in server.js.
 *
 * Builders: P(name, title, grade, location, kids, opts)  person        V(title, grade, location, kids, opts)  vacant position (yellow)
 *           U(label, kids, opts)                          team / unit   I(text)                                note box (headcount etc.)
 * opts: dept (department id, inherited by the children), head (head of that department), flag ('consultant' | 'alert' = red in the PPT), note.
 */
const fs = require('fs');
const path = require('path');

const P = (name, title, grade, loc, kids, o) => ({ kind: 'person', name, title, grade: grade || '', loc: loc || '', kids: kids || [], o: o || {} });
const V = (title, grade, loc, kids, o) => ({ kind: 'person', name: '', title, grade: grade || '', loc: loc || '', kids: kids || [], o: Object.assign({ vacant: true }, o || {}) });
const U = (label, kids, o) => ({ kind: 'unit', name: label, title: '', grade: '', loc: '', kids: kids || [], o: o || {} });
const I = (text) => ({ kind: 'info', name: text, title: '', grade: '', loc: '', kids: [], o: {} });
const C = { flag: 'consultant' }, R = { flag: 'alert' };
const K = 'Karachi', M = 'Multan', H = 'Hyderabad';
const rider = (name, loc, o) => P(name, 'Rider - Delivery Ops', 'J5', loc || K, [], o);

const tree = P('Wasif Khan', 'Chief Executive Officer, DVAGO', '', K, [

  // ---------- Operations (slides 16-18) ----------
  P('Masood Ahmed Khan', 'Head of Operations', 'S1', K, [
    P('Muhammad Usman Khalid', 'Sr. Manager - Business Operations & Key Account', 'S2', 'South 1', [
      P('Muhammad Usman', 'Associate Manager - Corporate Sales', 'J2', K, [P('Abeer Taj', 'Officer - Corporate Sales', 'J3', K)]),
      P('Syed Waqar Ali Shah', 'Regional Manager', 'S4', 'South 1', [I('Hospitals: BM = 10 actual, 2 in IJP, 2 Vacant & 1 N/A · Hospitals = 15')]),
      V('Deputy Manager - Corporate Sales', 'M1', K, [], { note: 'Hospitals' })
    ], { dept: 'corporate-sales', head: true }),
    P('Aziz Ahmed', 'Sr. Manager - Branch Operations', 'S3', 'South 1', [
      I('SBMs = 1 · BMs = 2, & 1 in IJP · Branches = 4'),
      P('Summaya Saghir', 'Regional Manager', 'S4', 'South 1', [
        I('SBMs = 3 · BMs = 7, 4 in IJP & 1 Vacant · Branches = 15'),
        P('Muzammil Ibrahim', 'Area Manager', 'M1', 'South 1', [I('SBMs = 1 · BMs = 4, 3 in IJP & 2 Vacant · Branches = 10')])
      ])
    ]),
    P('Sana Haseeb', 'Sr. Manager - Branch Operations', 'S3', 'South 2', [
      P('Zain Amir Ejaz Butt', 'Area Manager', 'M1', 'South 2', [I('SBMs = 3 · BMs = 13, 3 in IJP · Branches = 19')]),
      P('M Sufyan', 'Area Manager', 'M1', 'South 2', [I('SBMs = 1 · BMs = 4, 5 in IJP & 2 Vacant · Branches = 12')])
    ]),
    P('Amir Iqbal', 'Sr. Manager - Branch Operations', 'S3', 'DNC', [
      P('Measum Abbas', 'Area Manager', 'M1', 'DNC', [I('SBMs = 3 · BMs = 10 · SS = 5 · Branches = 18')])
    ]),
    P('Aqsa Kanwal', 'Assistant Manager - Capability', 'M3', '', [P('Saira', 'Executive - Capability', 'M3', '', [], R)], R),
    U('Maintenance', [
      P('Muhammad Yousuf', 'Officer', 'J3'), P('M. Ahmer', 'Officer', 'J3'), P('Hammad Ali', 'Officer', 'J3'),
      P('Muhammad Umar', 'Assistant', 'J4'), P('Moiz Ahmed', 'Assistant', 'J4'), P('M. Salman', 'Assistant', 'J4'),
      P('Muhammad Unaib', 'Assistant', 'J4'), P('Arif Ahmed', 'Assistant', 'J4')
    ]),
    U('Projects', [P('Waheed Ahmed', 'Executive - Maintenance', 'J2', K)])
  ], { dept: 'operations', head: true }),

  // ---------- E-Commerce (slide 14) ----------
  P('Salman Hanif', 'Deputy Head of E-Commerce', 'S2', K, [
    P('Taha Ali', 'Deputy Manager, Customer Services', 'M1', K, [
      P('Naveed Alam', 'Sr. Executive, CS', 'J1', '', [], { note: 'Team Lead' }),
      P('Muzammil Sabir', 'Officer, CS', 'J3', '', [], { note: 'OB' }), P('Ibad Ahmed', 'Officer, CS', 'J3', '', [], { note: 'OB' }),
      P('Ujala Qudoos', 'Officer, CS', 'J2', '', [], { note: 'OB' }), P('Arees', 'Officer, CS', 'J3', '', [], { note: 'OB' }),
      P('Zahid Hussain', 'Officer, CS', 'J3', '', [], { note: 'OB' }),
      P('Haseeb Ali', 'Officer, CS', 'J3', '', [], { note: 'IB' }), P('Anum Majeed', 'Officer, CS', 'J3', '', [], { note: 'IB' }),
      P('Abdul Sami Farooqi', 'OCF - CS', 'J3', '', [], { note: 'IB' }), P('M Hammad', 'CS', 'J3'),
      P('Zainab Zakria', 'Officer, CS', 'J3', '', [], { note: 'IB' }), P('Hafiz M Tayyab', 'Officer, CS', 'J1', '', [], { note: 'IB' }),
      P('Syed Hassan Jaffery', 'Officer, CS', 'J3', '', [], { note: 'IB' }), P('Hamza', 'Officer, CS', 'J3', '', [], { note: 'IB' }),
      P('M. Hassan', 'Officer, CS', 'J3', '', [], { note: 'IB' }), P('Laraib Jawaid', 'Officer, CS', 'J3', '', [], { note: 'IB' }),
      P('Muhammad Arbaz', 'Officer, CS', 'J3', '', [], { note: 'IB' }), P('Rafia Quaim', 'OCF, CS', 'J3', '', [], { note: 'IB' }),
      P('Azhan Shaikh', 'CS', 'J3'), P('M Hassan', 'CS', 'J3')
    ]),
    P('Mirza Kashaf Baig', 'Assistant Manager - E-com Commercial', 'M3', K, [
      P('Farishta Tahir', 'Executive - E-com Commercial / Content', 'J2', K),
      P('Amna Zubair', 'Executive - E-com Commercial', 'J2', K),
      P('Naseema', 'Intern - E-com Commercial', 'J5', K)
    ]),
    P('Aman Mansoor', 'Manager - Product Dev', 'S4', K, [
      P('M Usman', 'Assistant Manager - Product Dev', 'M3', K),
      P('Noman', 'Sr. Executive - Product Dev', 'J1', K),
      P('Adnan', 'Consultant, SEO', '', '', [], C), P('Danish Tariq', 'Consultant', '', '', [], C),
      P('M Taha', 'Consultant', '', '', [], C), P('Danish Muhaymin Bin Mehmood', 'Consultant', '', '', [], C)
    ]),
    P('M. Basit Junaid', 'Associate Manager - Delivery Ops', 'M2', K, [
      P('Ahsan Riaz', 'Executive - Delivery Ops', 'J2', K), P('Mudassir', 'Officer - Delivery Ops', 'J3', K),
      P('Umair', 'Sr. Executive - Delivery Ops', 'J1', K), P('Sajawal', 'Sr. Executive - Delivery Ops', 'J1', K),
      U('Hyderabad', [rider('Hamza', H), rider('Shahmeer', H), rider('Zakir', H), rider('Syed Samiullah', H)]),
      ...['M. Noman', 'Muzaffar Ali', 'Raja Asim', 'Kamran', 'Javaid Iqbal', 'Hamza Ahmed', 'Irfan Hussain', 'Anas Tahir',
        'Zohaib Ahmed', 'Usama Ahmed Khan', 'Hammad', 'Naeem', 'M. Rizwan', 'Muhammad Taha Khalid', 'Sohail Ahmed', 'Siraj Ud Din',
        'Shoaib Ahmed Rasheed', 'Aijaz', 'Atta', 'Maaz Ahmed', 'M. Mateen', 'Syed Modood Alam', 'M Faisal', 'Umair', 'Abdal Hussain'].map((n) => rider(n)),
      P('Adnan', 'Cleaner - Delivery Ops', 'J5', K)
    ])
  ], { dept: 'ecommerce', head: true }),

  // ---------- Commercial (slide 13) ----------
  P('Ali Haider', 'Head of Commercial', 'E3', K, [
    P('Shaikh Fahad Saleem', 'Sr. Manager Procurement, Non-Pharma', 'S3', K, [
      P('Shahmeer Shahid', 'Sr. Executive - Non-Pharma', 'J1', K), P('Muhammad Taha', 'Associate Manager - Non-Pharma', 'M2', K)
    ]),
    P('Syed Shahnawaz Akhter', 'Head of Procurement - Pharma', 'S1', K, [
      P('Ayaz Qamar', 'Associate Manager - Commercial Pharma', 'M2', K),
      P('Muhammad Shayan', 'Assistant Manager - Procurement Pharma', 'M3', K),
      P('Abeera', 'Executive - Procurement Pharma', 'J1', K),
      P('Muhammad Rashid', 'Assistant Manager - Commercial Pharma', 'M3', K, [
        P('Awais', 'Officer - GRN', 'J4', H, [], R), P('Abdul Bari', 'Assistant - Purchaser', 'J4', H)
      ]),
      P('Muhammad Faaiz', 'Purchase Officer - Local', 'J3', K, [], R),
      P('Abid', 'Rider - Planning & Distribution', 'J5', K), P('Raza Habib', 'Rider - Planning & Distribution', 'J5', K, [], R)
    ]),
    P('Muhammad Arqam', 'Executive - NTI', 'J2', K),
    P('Shoaib Ali', 'Local Purchase Officer', 'J3', '', [P('Uzair', 'Officer - Non-Pharma South Purchase', 'J3', K, [], R)], C),
    P('Muhammad Fahad Anwar', 'Assistant Manager - Procurement Pharma', 'M3', K),
    P('Mansoor Aziz', 'Sr. Executive, Procurement Pharma - South Purchase', 'J1', K, [P('Mustufa Allauddin', 'Executive - GRN', 'J2', K, [], R)]),
    P('Kashif', 'Sr. Executive - Procurement Pharma Operations', 'J1', K),
    P('Samar Abbas', 'Assistant Manager - Procurement Pharma, Multan Purchase', 'M3', M),
    P('Zia Ur Rehman', 'Executive Purchase - GRN', 'J2', M, [P('Sibghat Ullah', 'Officer - GRN', 'J3', M, [], R)]),
    P('Burhan Ahmed', 'Officer - Commercial Pharma - GRN', 'J3', K, [], R),
    P('Izhan', 'Officer - Expiry', 'J3', K, [P('Sami Ullah Khan', 'Officer - Commercial Pharma - Expiry', 'J3', M, [], R)]),
    P('Asma Naz', 'Executive', 'J2', M, [], R),
    P('Hassan Ahmed', 'Executive Commercial Ops - Non-Pharma', 'J2', K)
  ], { dept: 'commercial', head: true }),

  // ---------- Finance, Business Planning & Demand Planning (slides 9, 12) ----------
  P('Oan Hussain Ali', 'Head of Finance, Business Planning & Demand Planning', 'S2', K, [
    P('M. Nadeem', 'Manager Finance Operations', 'S4', K, [
      P('Muhammad Adnan', 'Executive - Treasury Finance', 'J2', K),
      P('Muhammad Tariq', 'D.M - Finance', 'M1', K),
      V('A.M - Finance', 'M3', 'Multan (DNC)', [P('Umm-e-Aiman', 'Officer', 'J3', M), P('Zahoor Elahi', 'Executive', 'J2', M)]),
      P('Rameez Muhammad', 'D.M - Finance & Accounts', 'M1', K, [
        P('Hannanya', 'Off', 'J5', K), P('Saddam Hussain', 'Finance Assistant - Panel Customers', 'J4', K),
        P('Alishba Jabeen', 'Finance Executive - Petty Cash', 'J2', K), P('Atfa Sajid', 'Executive - Panel Customers', 'J2', K),
        P('Fazal E Rabbi', 'Senior Executive - Payables Inventory', 'J2', K), P('Bushra Ghayoor', 'Executive - Hospitals, Banks, E-Com + DSR', 'J2', K),
        P('Faizan Ahmed', 'Finance Rider', 'J5', K)
      ]),
      P('Muhammad Ibtehash Memon', 'Sr. Executive - Load Payables Finance Inventory/Non', 'J1', K, [
        P('Muhammad Shahzaib', 'Officer - Payables Inventory', 'J3', K), P('Muddasir', 'Executive - Payables Non-Inventory', 'J2', K),
        P('Sameer Alam', 'Assistant - Payables Inventory', 'J4', K), P('Hannan Siddiqui', 'Finance Assistant', 'J4', K)
      ]),
      V('Associate Manager - Financial Planning & Internal Control', 'M3', K, [
        P('Mirza Asad Abbas', 'AM - Financial Planning & Analysis - Trade Receivables, AOP & Reporting', 'M3', K)
      ]),
      P('Muneeb Khan', 'Sr. Executive - Finance', 'J1', K, [V('Assistant - Non-Inventory', 'J4', K)])
    ]),
    P('Daniel Kalani', 'Assistant Manager - Business Analytics & Insights', 'M3', K),
    P('Syed Naeem Uddin', 'Senior Manager - Demand & Planning', 'S3', K, [
      P('Abdul Basit', 'Assistant Manager - Planning & Distribution', 'M3', K),
      P('Nimra Sohail', 'Associate Manager - Planning & Distribution', 'M2', K, [P('Waqas Ahmed', 'Sr. Executive - Planning & Distribution', 'J1', M)]),
      P('Erum', 'Assistant Manager - Planning & Distribution', 'M2', K, [P('Zuhaib', 'Executive - Planning & Distribution', 'J2', K)]),
      P('Izma Jawaid', 'Executive - Planning & Distribution', 'J2', K),
      P('Asad Nasir Khan', 'Sr. Executive - Planning & Distribution', 'J1', K)
    ], { dept: 'business-planning' })
  ], { dept: 'finance', head: true }),

  // ---------- People & Culture, FM & CE (slides 6, 19) ----------
  P('Sarah Munawar', 'Head of People & Culture, FM & CE', 'E3', K, [
    P('Muhammad Jawad', 'Sr. Manager - Learning & OD', 'S3', K, [P('Sarosh', 'Assistant Manager - Learning & OD', 'M3', K)]),
    P('Rohail Malik', 'Deputy Manager - People Services', 'M1', K, [
      P('Waleed Muhammad', 'Executive - People Services', 'J2', K, [P('Mustafa Hussain', 'Intern - PS', 'J5', K)]),
      P('Muhammad Ali Hassan', 'Executive - People Services', 'J2', K)
    ]),
    P('Qundeel Jamal', 'Officer - People & Culture', 'J3', K, [P('Shazaib', 'Sr. Executive - Graphic & Motion Designer - P&C', 'J1', K)]),
    P('Muhammad Ashir Siddiqui', 'Deputy Manager - Sr. Lead HR Business Partner - Enabling Function & Branch Ops', 'M1', K, [
      P('Kiran Zia', 'Sr. Executive - Business Partner - TA', 'J1', 'Multan (DNC)'),
      P('M. Dawood Saad', 'Assistant Manager - HR Business Partner - Branch Ops', 'M3', K, [P('Kashish', 'Officer HR - TA', 'J3', K, [], R)])
    ]),
    P('Zia Ul Hassan Aftab', 'Assistant Manager, FM', 'M3', K, [
      P('Hira Khan', 'Receptionist', 'J3', K), P('Ahsan Ahmed', 'Receptionist', 'J3', K),
      P('Salman', 'Office Boy', 'J5'), P('Amjad', 'Office Boy', 'J5'), P('Anwar Khan', 'Gate Keeper', 'J5')
    ], { dept: 'fm-ce' }),
    U('Administration & Gov. Affairs', [
      P('Javed Ahmed Shaikh', 'Manager - FM & GA', 'S4', K, [
        U('Health, Safety & Environment', [P('Zaryab', 'Executive', 'J2', K, [P('Salman', 'Executive Admin', 'J2', M)])])
      ])
    ], { dept: 'fm-ce', note: 'Also reports to Masood Ahmed Khan (Head of Operations)' })
  ], { dept: 'people-culture', head: true }),

  // ---------- Internal Audit, CCTV & Security (slide 10) ----------
  P('Rezwan Uddin', 'Head of Internal Audit, CCTV & Security', 'E3', K, [
    U('Functional Audit', [
      P('Arsalan Saeed', 'Deputy Manager - Internal Audit', 'M1', K, [
        P('Farukh Ahmed', 'Sr. Executive - Internal Audit', 'J1'), P('Taha Ahmed', 'AM - Internal Audit', 'M3'),
        P('Muzammil Raza', 'Assistant Manager', 'M3', M, [P('M. Ahmed', 'Executive - Internal Audit', 'J2', M), P('M. Sulaman', 'Executive - Internal Audit', 'J2', M)])
      ])
    ]),
    U('Surveillance'), U('Compliance'),
    U('Inventory', [
      P('Sajid Channa', 'Associate Manager - Internal Audit', 'M2', K, [P('Azam Aijaz', 'Assistant Manager', 'M3', K)], { note: 'Hospital' }),
      P('Muhammad Faraz', 'Assistant Manager - Internal Audit', 'M3', K, [
        P('Muhammad Moiz Khan', 'Officer - Internal Audit', 'J3', K), P('Muhammad Muzammil Asif', 'Officer - Internal Audit', 'J3', K),
        P('Muhammad Kanwar Azan', 'Officer - Internal Audit', 'J3', K), P('Muhammad Asif', 'Executive - Internal Audit', 'J2', K),
        P('Mujtaba Ahmed', 'Officer - Internal Audit', 'J3', K), P('Osama Ilyas', 'Executive - Internal Audit', 'J2', K)
      ], { note: 'Retail' })
    ]),
    U('CCTV', [P('Syed Bilal Nasar', 'Officer', 'J3'), P('Waqas Hussain', 'Officer', 'J3'), P('Kashan Waheed', 'Officer', 'J3'), P('Ramzan', 'Officer', 'J3')])
  ], { dept: 'audit-security', head: true }),

  // ---------- Business Application & IT (slide 7) ----------
  P('Rehan Jawaid', 'Head of Business Application & IT', 'S1', K, [
    U('IT - Network & Security', [
      P('Zain ul Abdin', 'Associate Manager - IT Network', 'M2', K, [P('Muhammad Ahtisham', 'Sr. Executive', 'J1', K)])
    ]),
    U('Data Center / Hardware and Software', [
      P('Sufyan Khan', 'Assistant Manager - IT Network & Infrastructure', 'M3', K, [
        P('Ahsan', 'Sr. Executive', 'J1', K), P('M. Arif', 'IT Executive', 'J2', 'Multan (DNC)'), P('Aziz Siddiqui', 'Executive', 'J2', H)
      ])
    ]),
    U('SAP', [
      P('Daniyal Ahmed Khan', 'Assistant Manager - Business Application', 'M3', K, [
        P('Jamal', 'Consultant (SuperNova)', '', '', [], C), P('Babar Hussain', 'Senior Executive', 'J1', K)
      ])
    ]),
    U('Business Application', [
      V('Consultant - Business App (Core Development)', '', '', [], C),
      P('Sylvester Alphonso', 'Assistant Manager - Business Application (Retail Pro)', 'M3', K, [
        U('Shift 1 (09:00 AM - 05:30 PM)', [P('M. Masharib Raza', 'Officer', 'J3', K)]),
        U('Shift 2 (05:00 PM - 01:30 AM) · 12:00 PM - 8:30 PM', [P('M. Muneeb', 'Executive', 'J2', K, [], { note: 'Evening Shift' }), P('Uwamir Ahmed', 'Officer', 'J3', K)]),
        U('Shift 3 (01:00 AM - 09:30 AM)', [P('Asif Ali', 'Executive', 'J2', K, [], { note: 'Night Shift' })])
      ])
    ])
  ], { dept: 'it', head: true }),

  // ---------- Marketing (slide 8) ----------
  P('Syed M. Salman', 'Head of Marketing (Sr. Manager Marketing)', 'S', K, [
    P('Hamza Shahid Ali', 'Assistant Manager - Marketing', 'M3', K),
    P('Rehma Tariq', 'Associate Manager, Marketing', 'J2', M),
    P('Sharjeel', 'Senior Executive - UI/UX & Graphic Designer', 'J1', K)
  ], { dept: 'marketing', head: true })
], { dept: '' });

// ---- flatten ----
const nodes = [];
let n = 0;
const walk = (t, parentId, dept) => {
  n++;
  const id = 'o' + String(n).padStart(4, '0');
  const d = t.o.dept !== undefined ? t.o.dept : dept;
  nodes.push({
    id, parentId, deptId: d, kind: t.kind, name: t.name, designation: t.title, grade: t.grade, location: t.loc,
    flag: t.o.flag || '', note: t.o.note || '', status: t.o.vacant ? 'Vacant' : 'Active', isHead: !!t.o.head, order: n
  });
  t.kids.forEach((k) => walk(k, id, d));
};
walk(tree, '', '');
fs.writeFileSync(path.join(__dirname, '..', 'org-seed.json'), JSON.stringify({ v: 2, source: 'Updated New Organogram 2026 (PPT slides 5-19)', nodes }));
const ppl = nodes.filter((x) => x.kind === 'person');
console.log(`org-seed.json: ${nodes.length} nodes · ${ppl.filter((x) => x.status !== 'Vacant').length} people · ${ppl.filter((x) => x.status === 'Vacant').length} vacant · ${nodes.filter((x) => x.kind === 'unit').length} units`);
