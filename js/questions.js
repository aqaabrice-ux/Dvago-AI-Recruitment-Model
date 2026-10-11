/* DVAGO Assessment Bank — scenarios, case studies, simulations and voice prompts per role. */
(function (root) {
  const COMPETENCIES = {
    decision: { label: 'Decision Making', short: 'Decisions' },
    problem: { label: 'Problem Solving', short: 'Problem Solving' },
    customer: { label: 'Customer Focus', short: 'Customer' },
    communication: { label: 'Communication', short: 'Communication' },
    integrity: { label: 'Integrity & Compliance', short: 'Integrity' },
    leadership: { label: 'Ownership & Leadership', short: 'Ownership' },
    role: { label: 'Role Knowledge', short: 'Role Fit' }
  };

  const CATEGORIES = {
    retail: { label: 'Retail Stores', desc: 'Front-line roles across DVAGO pharmacies' },
    corporate: { label: 'Corporate Office', desc: 'Head office & support functions' }
  };

  const VOICE_COMMON = [
    {
      id: 'intro',
      q: "Let's start simple. Tell me about yourself — your background, your experience, and what you are really good at.",
      checks: [
        { label: 'Background / education', kw: ['study', 'studied', 'degree', 'graduat', 'matric', 'inter', 'bachelor', 'master', 'university', 'college', 'pharm', 'bba', 'bs ', 'mba'] },
        { label: 'Work experience', kw: ['experience', 'worked', 'working', 'job', 'company', 'role', 'position', 'years', 'months', 'intern'] },
        { label: 'Strengths / skills', kw: ['good at', 'strength', 'skill', 'able to', 'expert', 'confident', 'handle', 'manage', 'communicat', 'team'] },
        { label: 'Goals / motivation', kw: ['goal', 'want to', 'aim', 'future', 'grow', 'career', 'learn', 'passion', 'looking for'] }
      ]
    }
  ];

  const COMMON_SJT = [
    {
      id: 'c1', comp: ['integrity', 'decision'],
      title: 'The friendly discount',
      scenario: 'A colleague you get along with regularly gives unauthorised 15% discounts to friends and family who visit the store. They tell you "everyone does it, it is harmless".',
      question: 'What is the most effective action?',
      options: [
        { t: 'Calmly tell the colleague it is against policy and, if it continues, report it to the store manager.', s: 3 },
        { t: 'Report it to the manager immediately without speaking to the colleague.', s: 2 },
        { t: 'Ignore it — it is not your responsibility and you want to keep a good relationship.', s: 0 },
        { t: 'Start doing the same for your own family since it seems accepted.', s: 0 }
      ]
    },
    {
      id: 'c2', comp: ['customer', 'decision'],
      title: 'Rush hour, confused customer',
      scenario: 'It is 8 PM, the busiest hour. An elderly customer is confused about which of her three medicines to take in the morning, while six people are waiting in line behind her.',
      question: 'What is the most effective action?',
      options: [
        { t: 'Ask a colleague or the pharmacist to take over the queue or counsel her, so she gets proper help without the line stalling.', s: 3 },
        { t: 'Explain all three medicines to her yourself, however long it takes.', s: 1 },
        { t: 'Ask her to step aside and wait until the rush is over.', s: 1 },
        { t: 'Tell her to read the leaflets at home and call the next customer.', s: 0 }
      ]
    }
  ];

  const REASONING = [
    {
      id: 'r1', comp: ['problem'],
      q: 'A customer buys 3 strips of tablets at Rs 45 each and a syrup for Rs 230. A 10% discount applies to the total bill. How much does the customer pay?',
      options: ['Rs 328.50', 'Rs 342.00', 'Rs 365.00', 'Rs 319.50'], answer: 0,
      explain: '(3 × 45) + 230 = 365; 365 − 10% = 328.50'
    },
    {
      id: 'r2', comp: ['problem', 'role'],
      q: 'A prescription says: syrup 5 ml, three times a day, for 6 days. Each bottle holds 60 ml. How many bottles are needed?',
      options: ['1 bottle', '2 bottles', '3 bottles', '4 bottles'], answer: 1,
      explain: '5 × 3 × 6 = 90 ml → 2 bottles of 60 ml'
    },
    {
      id: 'r3', comp: ['problem', 'decision'],
      q: 'A store sells on average 24 packs of ORS per day. A new delivery takes 3 days to arrive and the store keeps a safety stock of 20 packs. At what stock level should the next order be placed?',
      options: ['44 packs', '72 packs', '92 packs', '120 packs'], answer: 2,
      explain: 'Reorder point = daily demand × lead time + safety stock = 24 × 3 + 20 = 92'
    },
    {
      id: 'r4', comp: ['problem'],
      q: 'Sales were Rs 400,000 in March and Rs 460,000 in April. If April\'s growth rate continues, what will May sales be?',
      options: ['Rs 500,000', 'Rs 520,000', 'Rs 529,000', 'Rs 560,000'], answer: 2,
      explain: 'Growth = 15%; 460,000 × 1.15 = 529,000'
    }
  ];

  const ROLES = {
    'front-staff': {
      title: 'Front Staff Representative', category: 'retail', icon: 'user',
      tagline: 'Be the first smile every customer sees.',
      skills: ['customer service', 'sales', 'communication', 'retail', 'merchandising', 'pos', 'upselling', 'inventory', 'pharmacy', 'team work', 'teamwork', 'complaint', 'english', 'urdu'],
      voice: [
        { id: 'why', q: 'Why do you want to join DVAGO as a Front Staff Representative, and what would make you great at it?', checks: [
          { label: 'Knows DVAGO / pharmacy', kw: ['dvago', 'pharmacy', 'health', 'wellness', 'medicine', 'brand', 'trusted'] },
          { label: 'Customer orientation', kw: ['customer', 'people', 'help', 'serve', 'smile', 'friendly'] },
          { label: 'Personal fit', kw: ['i am', "i'm", 'my', 'experience', 'skill', 'good at'] }
        ] },
        { id: 'star', q: 'Tell me about a time you dealt with an upset or angry customer. What happened, what did you do, and what was the result?', checks: [
          { label: 'Situation', kw: ['once', 'when', 'time', 'customer', 'situation', 'day'] },
          { label: 'Action taken', kw: ['i ', 'listened', 'apolog', 'explained', 'offered', 'checked', 'called'] },
          { label: 'Result', kw: ['result', 'happy', 'satisfied', 'resolved', 'thanked', 'came back', 'learned', 'calm'] }
        ] }
      ],
      sjt: [
        { id: 'fs1', comp: ['integrity', 'role'], title: 'No prescription, high pressure',
          scenario: 'A well-dressed customer insists on buying a strong antibiotic without a prescription. He says he takes it every time he gets a sore throat and threatens to write a bad review if refused.',
          question: 'What is the most effective response?',
          options: [
            { t: 'Politely explain that antibiotics need a prescription for his safety, suggest OTC relief for the throat and offer to involve the pharmacist.', s: 3 },
            { t: 'Call the pharmacist and let them deal with him.', s: 2 },
            { t: 'Sell a smaller pack so he leaves satisfied.', s: 0 },
            { t: 'Refuse firmly and ask him to leave the store.', s: 1 }
          ] },
        { id: 'fs2', comp: ['customer', 'decision'], title: 'Out of stock',
          scenario: 'A mother urgently needs a specific infant formula. Your store is out of stock, the next delivery is in two days and she is visibly worried.',
          question: 'What is the most effective response?',
          options: [
            { t: 'Check stock at nearby DVAGO branches, reserve it for her or arrange a transfer, and share the timeline clearly.', s: 3 },
            { t: 'Suggest a similar formula brand that is available.', s: 1 },
            { t: 'Apologise and ask her to come back in two days.', s: 1 },
            { t: 'Tell her to try another pharmacy.', s: 0 }
          ] },
        { id: 'fs3', comp: ['role', 'integrity'], title: 'Near-expiry stock',
          scenario: 'While arranging shelves you find 14 packs of a cough syrup that expire in 3 weeks, placed behind newer stock.',
          question: 'What is the most effective action?',
          options: [
            { t: 'Bring them forward (FEFO), tag them as near-expiry, and inform the manager so they can be sold, returned or discounted per policy.', s: 3 },
            { t: 'Remove them from the shelf and bin them.', s: 1 },
            { t: 'Leave them — they have not expired yet.', s: 0 },
            { t: 'Move them to the front quietly without telling anyone.', s: 2 }
          ] },
        { id: 'fs4', comp: ['customer', 'communication'], title: 'Recommending wellness products',
          scenario: 'A customer buying vitamin C asks what else would help with her low energy. She mentions she is pregnant.',
          question: 'What is the most effective response?',
          options: [
            { t: 'Avoid recommending supplements yourself; involve the pharmacist since pregnancy needs professional advice.', s: 3 },
            { t: 'Recommend the best-selling multivitamin.', s: 0 },
            { t: 'Suggest she asks her doctor and complete her purchase.', s: 2 },
            { t: 'Recommend an energy drink.', s: 0 }
          ] }
      ],
      simulation: {
        title: 'Your first 30 minutes on shift',
        brief: 'You open the store at 9:00 AM with one colleague. Rank these tasks from what you would do FIRST (top) to LAST (bottom).',
        items: [
          { id: 'a', t: 'Check the medicine fridge temperature log' },
          { id: 'b', t: 'Help the customer already waiting at the counter' },
          { id: 'c', t: 'Rearrange the cosmetics promo display' },
          { id: 'd', t: 'Count the opening cash float with your colleague' },
          { id: 'e', t: 'Reply to WhatsApp order enquiries' }
        ],
        ideal: ['b', 'a', 'd', 'e', 'c'],
        rationale: 'Customer first, then patient-safety checks (cold chain), then cash controls, then remote orders, then merchandising.'
      },
      caseStudy: {
        title: 'The Saturday complaint',
        context: 'On a busy Saturday at DVAGO Gulshan, a customer returns furious. Yesterday he was given the 500 mg strength of a blood-pressure tablet instead of the 250 mg written on his prescription. He has not taken any yet. He is shouting in front of other customers and filming on his phone, saying he will post it online.',
        exhibit: { caption: 'Store snapshot — Saturday 6:15 PM', headers: ['Metric', 'Value'], rows: [['Customers in store', '11'], ['Staff on floor', '3 (incl. pharmacist)'], ['Queue at counter', '5 people'], ['Prescription on file', 'Yes — scanned copy']] },
        questions: [
          { id: 'fsq1', comp: ['customer', 'communication', 'decision'], q: 'Step by step, how would you handle this customer in the next 10 minutes?',
            rubric: [
              { point: 'Stays calm and listens / acknowledges feelings', kw: ['calm', 'listen', 'understand', 'acknowledg', 'empath', 'feel', 'sorry', 'apolog'] },
              { point: 'Moves conversation to a private area', kw: ['private', 'side', 'aside', 'counselling', 'separate', 'room', 'corner'] },
              { point: 'Involves pharmacist / manager immediately', kw: ['pharmacist', 'manager', 'supervisor', 'senior', 'escalat'] },
              { point: 'Verifies prescription and replaces medicine', kw: ['verify', 'check', 'prescription', 'replace', 'correct', 'exchange', 'right strength', '250'] },
              { point: 'Confirms customer has not taken it / safety check', kw: ['taken', 'safety', 'safe', 'health', 'side effect', 'doctor'] },
              { point: 'Keeps the queue moving / informs colleagues', kw: ['queue', 'colleague', 'other customers', 'team', 'line'] }
            ] },
          { id: 'fsq2', comp: ['integrity', 'leadership'], q: 'After the customer leaves satisfied, what should happen so this mistake does not repeat?',
            rubric: [
              { point: 'Reports / documents the incident', kw: ['report', 'document', 'record', 'log', 'incident', 'write'] },
              { point: 'Finds the root cause', kw: ['root cause', 'why', 'how it happened', 'investigat', 'reason', 'analy'] },
              { point: 'Double-check / verification process', kw: ['double check', 'double-check', 'second check', 'verify', 'checklist', 'cross check', 'cross-check'] },
              { point: 'Training / team learning', kw: ['train', 'brief', 'team', 'meeting', 'learn', 'sop'] },
              { point: 'Separates look-alike strengths on shelves', kw: ['shelf', 'separate', 'label', 'similar', 'look alike', 'look-alike', 'strength'] }
            ] }
        ]
      }
    },

    'cashier': {
      title: 'Cashier', category: 'retail', icon: 'card',
      tagline: 'Accuracy, speed and trust at every checkout.',
      skills: ['cash handling', 'pos', 'billing', 'reconciliation', 'accuracy', 'customer service', 'retail', 'excel', 'accounts', 'mathematics', 'card payments', 'easypaisa', 'jazzcash'],
      voice: [
        { id: 'why', q: 'Why do you want to work as a Cashier at DVAGO? What makes you trustworthy with cash and numbers?', checks: [
          { label: 'Motivation for DVAGO', kw: ['dvago', 'pharmacy', 'health', 'company', 'brand'] },
          { label: 'Accuracy / honesty', kw: ['accura', 'honest', 'careful', 'detail', 'trust', 'responsib', 'count'] },
          { label: 'Evidence / experience', kw: ['experience', 'worked', 'handled', 'before', 'previous', 'years'] }
        ] },
        { id: 'star', q: 'Tell me about a time you made a mistake at work. How did you discover it and what did you do?', checks: [
          { label: 'Owns the mistake', kw: ['i made', 'my mistake', 'i forgot', 'i missed', 'i realized', 'i realised', 'wrong'] },
          { label: 'Action to fix', kw: ['told', 'informed', 'corrected', 'fixed', 'reported', 'apolog'] },
          { label: 'Learning', kw: ['learn', 'since then', 'now i', 'never', 'always', 'lesson'] }
        ] }
      ],
      sjt: [
        { id: 'ca1', comp: ['integrity', 'decision'], title: 'Short by Rs 1,500',
          scenario: 'At closing your cash drawer is short by Rs 1,500. You are tired and your shift ends in 5 minutes. Nobody else noticed yet.',
          question: 'What is the most effective action?',
          options: [
            { t: 'Recount with a witness, check card/wallet slips and voids, then report the variance honestly to the manager in the closing report.', s: 3 },
            { t: 'Put Rs 1,500 from your own pocket so the drawer balances.', s: 0 },
            { t: 'Recount once and report it tomorrow.', s: 1 },
            { t: 'Report the shortage immediately without recounting.', s: 2 }
          ] },
        { id: 'ca2', comp: ['customer', 'communication'], title: 'Card declined',
          scenario: 'A customer\'s card is declined twice for a Rs 4,800 bill. He looks embarrassed and people in the queue are watching.',
          question: 'What is the most effective response?',
          options: [
            { t: 'Discreetly tell him the payment did not go through, suggest another method (cash, wallet, another card) and offer to hold his items briefly.', s: 3 },
            { t: 'Say loudly that his card has no balance.', s: 0 },
            { t: 'Cancel the bill and call the next customer.', s: 1 },
            { t: 'Try the card a third and fourth time.', s: 1 }
          ] },
        { id: 'ca3', comp: ['integrity', 'role'], title: 'Suspicious note',
          scenario: 'A customer pays with a Rs 5,000 note that feels unusual — the security thread looks printed.',
          question: 'What is the most effective action?',
          options: [
            { t: 'Check it with the note-checking machine/security features, politely ask for another note if in doubt and inform the manager per policy.', s: 3 },
            { t: 'Accept it — refusing might insult the customer.', s: 0 },
            { t: 'Accuse the customer of fraud and call security.', s: 0 },
            { t: 'Ask a colleague what they think and accept it if they say ok.', s: 1 }
          ] },
        { id: 'ca4', comp: ['decision', 'problem'], title: 'POS goes down',
          scenario: 'The POS system freezes during the evening rush with 7 customers waiting. IT says it will take 20 minutes.',
          question: 'What is the most effective action?',
          options: [
            { t: 'Inform the queue, switch to the manual billing/backup procedure approved by the store, record every sale for later entry and keep the manager updated.', s: 3 },
            { t: 'Close the counter until the system is back.', s: 1 },
            { t: 'Accept cash only and keep sales in your head.', s: 0 },
            { t: 'Send everyone to the other counter.', s: 2 }
          ] }
      ],
      simulation: {
        title: 'Closing the counter',
        brief: 'It is 11:00 PM, closing time. Rank these steps in the order you would do them.',
        items: [
          { id: 'a', t: 'Serve the last customer in the queue' },
          { id: 'b', t: 'Print the end-of-day X/Z report' },
          { id: 'c', t: 'Count cash with a witness and match against the report' },
          { id: 'd', t: 'Record and explain any variance in the closing sheet' },
          { id: 'e', t: 'Hand over cash to the manager for the safe' }
        ],
        ideal: ['a', 'b', 'c', 'd', 'e'],
        rationale: 'Finish serving, freeze the system figure, count, document variance, then hand over custody.'
      },
      caseStudy: {
        title: 'The missing refunds',
        context: 'Over the last two weeks, your counter shows 9 refunds totalling Rs 18,400, which is three times the store average. Most refunds were processed between 9–11 PM, and 6 of them have no customer phone number recorded. You use the same POS login that the evening part-timer sometimes uses when you are on break.',
        exhibit: { caption: 'Refund log — your counter (last 14 days)', headers: ['Time band', 'Refunds', 'Amount (Rs)', 'Phone recorded'], rows: [['9 AM – 5 PM', '2', '2,150', '2 / 2'], ['5 PM – 9 PM', '1', '1,900', '1 / 1'], ['9 PM – 11 PM', '6', '14,350', '0 / 6']] },
        questions: [
          { id: 'caq1', comp: ['integrity', 'problem'], q: 'What do you think might be happening, and what would you do about it today?',
            rubric: [
              { point: 'Recognises possible misuse / fraud risk', kw: ['fraud', 'misuse', 'suspicious', 'theft', 'fake refund', 'someone else', 'part-timer', 'part timer'] },
              { point: 'Reports to manager / does not hide it', kw: ['manager', 'report', 'inform', 'tell', 'supervisor', 'escalat'] },
              { point: 'Stops sharing login / changes password', kw: ['password', 'login', 'own id', 'share', 'credentials', 'log out', 'logout'] },
              { point: 'Uses data / reviews evidence (receipts, CCTV)', kw: ['cctv', 'camera', 'receipt', 'review', 'check', 'record', 'data', 'log'] },
              { point: 'Does not accuse without evidence', kw: ['evidence', 'not accuse', 'fair', 'confirm', 'investigat', 'without proof'] }
            ] },
          { id: 'caq2', comp: ['leadership', 'role'], q: 'Suggest two or three controls that would prevent this in future.',
            rubric: [
              { point: 'Individual POS logins', kw: ['individual', 'separate login', 'own login', 'unique', 'user id', 'personal id'] },
              { point: 'Manager approval for refunds', kw: ['approval', 'authoris', 'authoriz', 'manager pin', 'sign off', 'override'] },
              { point: 'Mandatory customer details / receipt for refunds', kw: ['phone', 'customer detail', 'receipt', 'mandatory', 'proof'] },
              { point: 'Daily refund report / audit', kw: ['daily', 'report', 'audit', 'review', 'monitor', 'reconcil'] }
            ] }
        ]
      }
    },

    'store-manager': {
      title: 'Store Manager', category: 'retail', icon: 'store',
      tagline: 'Lead the team, own the numbers, delight the community.',
      skills: ['store management', 'leadership', 'team management', 'inventory', 'sales', 'kpi', 'p&l', 'merchandising', 'scheduling', 'retail', 'compliance', 'drap', 'training', 'customer experience', 'shrinkage'],
      voice: [
        { id: 'why', q: 'Why do you want to manage a DVAGO store, and what kind of leader are you?', checks: [
          { label: 'Motivation for DVAGO', kw: ['dvago', 'pharmacy', 'health', 'growth', 'brand'] },
          { label: 'Leadership style', kw: ['lead', 'team', 'coach', 'example', 'motivat', 'develop', 'empower'] },
          { label: 'Results orientation', kw: ['target', 'sales', 'result', 'kpi', 'growth', 'improv', 'percent', '%'] }
        ] },
        { id: 'star', q: 'Describe a time you turned around an under-performing team or store. What did you change and what were the results?', checks: [
          { label: 'Diagnosis', kw: ['problem', 'issue', 'analy', 'found', 'reason', 'data'] },
          { label: 'Actions', kw: ['changed', 'introduced', 'trained', 'set', 'started', 'implemented', 'scheduled'] },
          { label: 'Measured result', kw: ['increase', 'improv', 'percent', '%', 'grew', 'reduced', 'target', 'result'] }
        ] }
      ],
      sjt: [
        { id: 'sm1', comp: ['leadership', 'decision'], title: 'Your best salesperson',
          scenario: 'Your top-performing salesperson is consistently 20–30 minutes late. Others have started complaining that rules apply differently to her.',
          question: 'What is the most effective action?',
          options: [
            { t: 'Have a private conversation, understand the cause, set clear expectations with a timeline and document it — applying the same rule as for others.', s: 3 },
            { t: 'Ignore it — her sales justify the flexibility.', s: 0 },
            { t: 'Issue a written warning immediately.', s: 1 },
            { t: 'Change the team rule so everyone can come in 30 minutes late.', s: 0 }
          ] },
        { id: 'sm2', comp: ['integrity', 'role'], title: 'Surprise inspection',
          scenario: 'A DRAP inspector arrives unannounced and asks for the narcotics register. You know the last two entries were not countersigned by the pharmacist.',
          question: 'What is the most effective action?',
          options: [
            { t: 'Cooperate fully, present the register honestly, acknowledge the gap and share the corrective action you will take.', s: 3 },
            { t: 'Ask the pharmacist to quickly sign the entries before showing the register.', s: 0 },
            { t: 'Tell the inspector the register is with head office.', s: 0 },
            { t: 'Call the regional manager and ask the inspector to wait.', s: 1 }
          ] },
        { id: 'sm3', comp: ['decision', 'problem'], title: 'Footfall is falling',
          scenario: 'A new competitor opened 200 metres away. Your footfall dropped 18% in a month but average bill value is unchanged.',
          question: 'What is the most effective first step?',
          options: [
            { t: 'Analyse which customer segments and categories you are losing, visit the competitor, then build a targeted plan (service, availability, loyalty, home delivery).', s: 3 },
            { t: 'Immediately cut prices on the top 50 items.', s: 1 },
            { t: 'Wait two more months to see if it is temporary.', s: 0 },
            { t: 'Ask head office for a bigger marketing budget.', s: 1 }
          ] },
        { id: 'sm4', comp: ['leadership', 'customer'], title: 'Eid rush staffing',
          scenario: 'Two staff members call in sick on the day before Eid, your busiest day of the year.',
          question: 'What is the most effective action?',
          options: [
            { t: 'Re-plan shifts, request cover from a nearby branch or off-duty staff, move yourself to the counter at peak and prioritise critical tasks.', s: 3 },
            { t: 'Run the store with fewer people and accept the longer queues.', s: 1 },
            { t: 'Close the cosmetics section to save effort.', s: 1 },
            { t: 'Tell the sick staff they must come in anyway.', s: 0 }
          ] }
      ],
      simulation: {
        title: 'Monday morning priorities',
        brief: 'You arrive at 9 AM. Rank these items from MOST urgent to LEAST urgent.',
        items: [
          { id: 'a', t: 'Fridge alarm: vaccine fridge reads 11°C (should be 2–8°C)' },
          { id: 'b', t: 'Weekly sales report due to regional manager by 5 PM' },
          { id: 'c', t: 'Staff member asking about a leave request next month' },
          { id: 'd', t: 'Supplier delivery waiting at the back door' },
          { id: 'e', t: 'Customer complaint email from Saturday' }
        ],
        ideal: ['a', 'd', 'e', 'b', 'c'],
        rationale: 'Patient safety (cold chain) first, then time-bound operations, customer recovery, reporting, and finally non-urgent HR.'
      },
      caseStudy: {
        title: 'DVAGO Johar Town — turnaround',
        context: 'You have just taken over DVAGO Johar Town. Last quarter the store missed its sales target by 14%. Shrinkage is 2.1% (company average 0.8%). Customer complaints mention "medicine not available" and "rude staff". Staff turnover is high: 5 of 9 staff left in six months. The area has many families and two large clinics nearby.',
        exhibit: { caption: 'Johar Town vs company average (last quarter)', headers: ['KPI', 'Johar Town', 'Company avg'], rows: [['Sales vs target', '-14%', '+3%'], ['Shrinkage', '2.1%', '0.8%'], ['Stock availability', '87%', '96%'], ['Staff turnover (6 mo)', '55%', '18%'], ['Customer rating', '3.4 / 5', '4.3 / 5']] },
        questions: [
          { id: 'smq1', comp: ['problem', 'leadership', 'decision'], q: 'What would your 90-day plan be? Prioritise your actions and explain why.',
            rubric: [
              { point: 'Diagnoses first (data, listening to staff/customers)', kw: ['analy', 'data', 'understand', 'listen', 'meet', 'diagnos', 'first week', 'assess'] },
              { point: 'Fixes stock availability / ordering', kw: ['availability', 'stock', 'order', 'inventory', 'replenish', 'out of stock', 'demand'] },
              { point: 'Tackles shrinkage (audits, controls, CCTV)', kw: ['shrink', 'audit', 'loss', 'theft', 'cctv', 'control', 'count'] },
              { point: 'People: retention, training, engagement', kw: ['train', 'retention', 'turnover', 'motivat', 'recogn', 'engage', 'hire', 'team'] },
              { point: 'Customer service improvements', kw: ['customer', 'service', 'complaint', 'rating', 'experience', 'greet'] },
              { point: 'Uses local opportunity (clinics, families, delivery)', kw: ['clinic', 'doctor', 'famil', 'delivery', 'community', 'partnership', 'local'] },
              { point: 'Sets measurable targets / phases', kw: ['target', 'kpi', 'measure', 'week', 'day 30', '30 days', '60', 'phase', 'track'] }
            ] },
          { id: 'smq2', comp: ['leadership', 'communication'], q: 'How would you rebuild the team\'s morale in your first two weeks?',
            rubric: [
              { point: 'One-to-one conversations', kw: ['one to one', 'one-to-one', '1:1', 'individual', 'each person', 'personally'] },
              { point: 'Clear roles and expectations', kw: ['role', 'expectation', 'clear', 'responsibilit', 'goal'] },
              { point: 'Recognition / quick wins', kw: ['recogn', 'appreciat', 'reward', 'celebrat', 'quick win', 'praise'] },
              { point: 'Fair scheduling / workload', kw: ['schedul', 'shift', 'roster', 'workload', 'fair', 'rest'] },
              { point: 'Leads by example', kw: ['example', 'floor', 'myself', 'alongside', 'hands-on', 'hands on'] }
            ] }
        ]
      }
    },

    'pharma-assistant': {
      title: 'Pharmacy Assistant', category: 'retail', icon: 'pill',
      tagline: 'Support safe dispensing and patient care.',
      skills: ['dispensing', 'pharmacy', 'prescription', 'pharmacology', 'inventory', 'cold chain', 'fefo', 'drap', 'patient counselling', 'medicine', 'pharm-d', 'pharmacy technician', 'drug interactions', 'storage'],
      voice: [
        { id: 'why', q: 'Why do you want to be a Pharmacy Assistant at DVAGO, and what do you know about safe dispensing?', checks: [
          { label: 'Motivation', kw: ['dvago', 'patient', 'health', 'help', 'pharmacy', 'care'] },
          { label: 'Safety knowledge', kw: ['prescription', 'verify', 'check', 'dose', 'expiry', 'pharmacist', 'safe', 'storage'] },
          { label: 'Experience / training', kw: ['course', 'diploma', 'experience', 'worked', 'trained', 'technician', 'pharm'] }
        ] },
        { id: 'star', q: 'Tell me about a time you noticed something was not right — with a prescription, a medicine or a process. What did you do?', checks: [
          { label: 'Noticed the issue', kw: ['noticed', 'saw', 'found', 'realized', 'realised', 'wrong', 'error'] },
          { label: 'Escalated / acted safely', kw: ['pharmacist', 'doctor', 'informed', 'stopped', 'checked', 'reported'] },
          { label: 'Outcome', kw: ['result', 'prevented', 'safe', 'corrected', 'thanked', 'learned'] }
        ] }
      ],
      sjt: [
        { id: 'pa1', comp: ['integrity', 'role'], title: 'Unclear handwriting',
          scenario: 'A prescription has a drug name you cannot read clearly — it could be one of two medicines with very different uses. The pharmacist is on a 10-minute break.',
          question: 'What is the most effective action?',
          options: [
            { t: 'Do not dispense; tell the patient you need to verify, wait for the pharmacist or call the prescriber, and explain the short delay.', s: 3 },
            { t: 'Ask the patient what the doctor said the medicine was for and dispense accordingly.', s: 1 },
            { t: 'Dispense the more commonly prescribed of the two.', s: 0 },
            { t: 'Send the patient to another pharmacy.', s: 0 }
          ] },
        { id: 'pa2', comp: ['role', 'decision'], title: 'Fridge failure',
          scenario: 'You arrive and the medicine fridge shows 14°C. The log shows it was fine last night. It contains insulin and vaccines.',
          question: 'What is the most effective action?',
          options: [
            { t: 'Quarantine the stock (do not sell), move it to a working fridge, record the excursion and inform the pharmacist/QA for a decision.', s: 3 },
            { t: 'Move everything to another fridge and continue selling.', s: 1 },
            { t: 'Throw all the stock away.', s: 1 },
            { t: 'Wait for the temperature to come down and continue.', s: 0 }
          ] },
        { id: 'pa3', comp: ['customer', 'communication'], title: 'Interaction question',
          scenario: 'A customer on blood thinners asks whether he can take an ibuprofen painkiller for back pain.',
          question: 'What is the most effective response?',
          options: [
            { t: 'Tell him this combination can be risky and involve the pharmacist immediately for advice and a safer alternative.', s: 3 },
            { t: 'Say it is fine for a few days.', s: 0 },
            { t: 'Tell him to ask his doctor and sell the ibuprofen.', s: 1 },
            { t: 'Recommend a stronger painkiller instead.', s: 0 }
          ] },
        { id: 'pa4', comp: ['integrity', 'decision'], title: 'Controlled drug count',
          scenario: 'During the weekly count, a controlled medicine is 2 tablets short compared to the register.',
          question: 'What is the most effective action?',
          options: [
            { t: 'Recount with a witness, check recent entries/returns, and report the discrepancy to the pharmacist in writing.', s: 3 },
            { t: 'Adjust the register to match the physical count.', s: 0 },
            { t: 'Ignore it — two tablets is a small difference.', s: 0 },
            { t: 'Recount alone a few times and only report if still short tomorrow.', s: 1 }
          ] }
      ],
      simulation: {
        title: 'The dispensing checklist',
        brief: 'Put these dispensing steps in the correct safe order.',
        items: [
          { id: 'a', t: 'Check prescription validity (doctor, date, patient details)' },
          { id: 'b', t: 'Pick the medicine and match name, strength and form' },
          { id: 'c', t: 'Check the expiry date and pack condition' },
          { id: 'd', t: 'Pharmacist final check' },
          { id: 'e', t: 'Counsel the patient on dose and use' }
        ],
        ideal: ['a', 'b', 'c', 'd', 'e'],
        rationale: 'Validate → pick → quality check → professional check → counsel.'
      },
      caseStudy: {
        title: 'The recall notice',
        context: 'At 4 PM head office emails a Class II recall for a batch of a popular children\'s paracetamol syrup (Batch PX-2231) due to possible dosing-cup misprint. Your store system shows 23 bottles of this batch were sold in the last 10 days, 17 of them with customer phone numbers. 9 bottles are still on the shelf and 12 in the stock room.',
        exhibit: { caption: 'Batch PX-2231 at your store', headers: ['Location', 'Units'], rows: [['Sold (last 10 days)', '23 (17 with phone numbers)'], ['On shelf', '9'], ['Stock room', '12'], ['Recall class', 'II — moderate risk']] },
        questions: [
          { id: 'paq1', comp: ['integrity', 'role', 'decision'], q: 'What exactly would you do in the next hour?',
            rubric: [
              { point: 'Removes and quarantines all stock immediately', kw: ['remove', 'quarantine', 'pull', 'shelf', 'stock room', 'segregat', 'isolate', 'block'] },
              { point: 'Blocks the batch in POS / stops sales', kw: ['block', 'pos', 'system', 'stop sale', 'not sell', 'hold'] },
              { point: 'Informs pharmacist / manager', kw: ['pharmacist', 'manager', 'inform', 'report'] },
              { point: 'Contacts customers who bought it', kw: ['call', 'contact', 'phone', 'sms', 'message', 'customers who bought', 'notify'] },
              { point: 'Documents counts and actions', kw: ['document', 'record', 'count', 'log', 'form', 'report back'] }
            ] },
          { id: 'paq2', comp: ['customer', 'communication'], q: 'What would you say to a worried parent who calls and says her child already took two doses?',
            rubric: [
              { point: 'Calm, reassuring tone', kw: ['calm', 'reassur', 'don\'t worry', 'do not worry', 'understand', 'sorry'] },
              { point: 'Asks about child\'s condition / symptoms', kw: ['how is', 'symptom', 'condition', 'feeling', 'weight', 'age', 'how much'] },
              { point: 'Involves pharmacist / advises doctor if needed', kw: ['pharmacist', 'doctor', 'medical', 'hospital', 'clinic'] },
              { point: 'Offers replacement / refund', kw: ['replace', 'refund', 'exchange', 'new bottle'] },
              { point: 'Explains correct dosing', kw: ['correct dose', 'dosing', 'ml', 'syringe', 'measure'] }
            ] }
        ]
      }
    },

    'marketing': {
      title: 'Marketing Executive', category: 'corporate', icon: 'megaphone',
      tagline: 'Build the brand Pakistan trusts for health.',
      skills: ['digital marketing', 'social media', 'seo', 'content', 'brand', 'campaign', 'analytics', 'google ads', 'meta ads', 'crm', 'loyalty', 'market research', 'canva', 'copywriting', 'roi'],
      voice: [
        { id: 'why', q: 'Why DVAGO marketing? Tell me about a campaign you admire — or one you ran — and why it worked.', checks: [
          { label: 'Brand understanding', kw: ['dvago', 'brand', 'health', 'trust', 'pharmacy', 'wellness'] },
          { label: 'Campaign insight', kw: ['campaign', 'audience', 'message', 'channel', 'insight', 'creative'] },
          { label: 'Results / metrics', kw: ['result', 'roi', 'reach', 'engagement', 'conversion', 'sales', '%', 'percent'] }
        ] },
        { id: 'star', q: 'Tell me about a time a campaign or project did not perform as expected. What did you learn?', checks: [
          { label: 'Honest about failure', kw: ['did not', "didn't", 'failed', 'low', 'poor', 'underperform'] },
          { label: 'Analysis', kw: ['data', 'analy', 'found', 'because', 'reason', 'test'] },
          { label: 'Learning applied', kw: ['learn', 'next time', 'changed', 'improv', 'now i'] }
        ] }
      ],
      sjt: [
        { id: 'mk1', comp: ['integrity', 'decision'], title: 'The miracle claim',
          scenario: 'A supplier offers a big co-marketing budget for an immunity supplement, but wants the post to say it "prevents dengue".',
          question: 'What is the most effective action?',
          options: [
            { t: 'Decline the unsupported claim, propose compliant messaging based on approved claims and involve QA/legal before anything is published.', s: 3 },
            { t: 'Publish it — the supplier takes responsibility for the claim.', s: 0 },
            { t: 'Soften it to "helps fight dengue" and publish.', s: 0 },
            { t: 'Reject the whole partnership without discussion.', s: 1 }
          ] },
        { id: 'mk2', comp: ['problem', 'decision'], title: 'Budget cut',
          scenario: 'Your quarterly budget is cut by 40% one week before a planned Ramadan campaign.',
          question: 'What is the most effective response?',
          options: [
            { t: 'Re-prioritise using past channel ROI, keep the highest-performing channels, use owned media (app, SMS, in-store) and reset KPIs with stakeholders.', s: 3 },
            { t: 'Cancel the campaign completely.', s: 1 },
            { t: 'Cut every channel by 40% equally.', s: 1 },
            { t: 'Run it anyway and ask finance later.', s: 0 }
          ] },
        { id: 'mk3', comp: ['customer', 'communication'], title: 'Viral complaint',
          scenario: 'A customer\'s video complaining about rude staff at a DVAGO store is going viral on TikTok with 200K views.',
          question: 'What is the most effective first action?',
          options: [
            { t: 'Acknowledge quickly and empathetically, take it to DM to resolve, coordinate with Ops to investigate and update publicly once resolved.', s: 3 },
            { t: 'Report the video to get it removed.', s: 0 },
            { t: 'Stay silent until it dies down.', s: 0 },
            { t: 'Post a long statement defending the staff.', s: 1 }
          ] },
        { id: 'mk4', comp: ['problem', 'role'], title: 'Which metric?',
          scenario: 'Management asks if the new loyalty app is "working". Downloads are high but you do not know much else.',
          question: 'Which metric would best answer the question?',
          options: [
            { t: 'Repeat purchase rate and incremental spend of app users vs a comparable non-app group.', s: 3 },
            { t: 'Total number of app downloads.', s: 1 },
            { t: 'App store rating.', s: 1 },
            { t: 'Number of push notifications sent.', s: 0 }
          ] }
      ],
      simulation: {
        title: 'Launch week checklist',
        brief: 'You are launching DVAGO\'s new home-delivery service in Karachi. Rank these tasks in the order you would do them.',
        items: [
          { id: 'a', t: 'Define target audience and key message' },
          { id: 'b', t: 'Confirm Ops can actually deliver in the promised time' },
          { id: 'c', t: 'Set KPIs and tracking (UTMs, promo codes)' },
          { id: 'd', t: 'Produce creatives and copy' },
          { id: 'e', t: 'Go live on paid social' }
        ],
        ideal: ['b', 'a', 'c', 'd', 'e'],
        rationale: 'Never promise what Ops cannot deliver; then audience → measurement → content → launch.'
      },
      caseStudy: {
        title: 'Winning young families',
        context: 'DVAGO wants to grow its share of young families (parents aged 25–40) in Lahore by 20% in 6 months. Research shows they buy baby care and vitamins mostly online or from supermarkets, trust doctor recommendations, and are very active on Instagram and WhatsApp. Budget: Rs 6 million.',
        exhibit: { caption: 'Where young families buy baby & wellness products', headers: ['Channel', 'Share', 'Trend'], rows: [['Supermarkets', '38%', 'Flat'], ['Online marketplaces', '27%', '↑ fast'], ['Pharmacies', '24%', '↓ slow'], ['Other', '11%', '—']] },
        questions: [
          { id: 'mkq1', comp: ['problem', 'decision', 'role'], q: 'Outline your campaign strategy: positioning, channels, offers and budget split.',
            rubric: [
              { point: 'Clear positioning / insight (trust, expert advice)', kw: ['position', 'trust', 'expert', 'pharmacist', 'advice', 'insight', 'why dvago'] },
              { point: 'Digital channels matched to audience', kw: ['instagram', 'whatsapp', 'social', 'influencer', 'mom', 'parent', 'digital'] },
              { point: 'Doctor / clinic partnerships', kw: ['doctor', 'paediatric', 'pediatric', 'clinic', 'hospital', 'gynae'] },
              { point: 'Online ordering / delivery convenience', kw: ['online', 'delivery', 'app', 'order', 'convenien', 'subscription'] },
              { point: 'Offer / loyalty mechanic', kw: ['loyalty', 'bundle', 'discount', 'offer', 'points', 'reward', 'membership'] },
              { point: 'Budget split with rationale', kw: ['budget', 'million', '%', 'percent', 'split', 'allocat'] }
            ] },
          { id: 'mkq2', comp: ['problem', 'role'], q: 'How will you measure success and decide what to change mid-campaign?',
            rubric: [
              { point: 'Defines KPIs (share, new customers, CAC, repeat)', kw: ['kpi', 'cac', 'new customer', 'repeat', 'share', 'retention', 'conversion'] },
              { point: 'Tracking setup', kw: ['utm', 'promo code', 'tracking', 'pixel', 'crm', 'dashboard', 'analytics'] },
              { point: 'Testing / optimisation', kw: ['a/b', 'ab test', 'test', 'optimi', 'iterate', 'experiment'] },
              { point: 'Review cadence', kw: ['weekly', 'monthly', 'review', 'every', 'cadence', 'checkpoint'] }
            ] }
        ]
      }
    },

    'finance': {
      title: 'Finance & Accounts Officer', category: 'corporate', icon: 'chart',
      tagline: 'Numbers that keep 100+ stores healthy.',
      skills: ['accounting', 'financial reporting', 'reconciliation', 'excel', 'sap', 'erp', 'budgeting', 'audit', 'tax', 'ifrs', 'acca', 'ca', 'cma', 'cash flow', 'variance analysis', 'payables', 'receivables'],
      voice: [
        { id: 'why', q: 'Why do you want to join DVAGO Finance, and which part of finance do you enjoy most?', checks: [
          { label: 'Motivation', kw: ['dvago', 'retail', 'growth', 'company', 'pharmacy'] },
          { label: 'Finance depth', kw: ['reconcil', 'report', 'budget', 'audit', 'tax', 'analysis', 'ifrs', 'cash'] },
          { label: 'Evidence', kw: ['experience', 'worked', 'handled', 'responsible', 'years', 'acca', 'ca '] }
        ] },
        { id: 'star', q: 'Tell me about a time you found an error or discrepancy in financial data. How did you trace and fix it?', checks: [
          { label: 'Discovery', kw: ['found', 'noticed', 'discrepan', 'mismatch', 'error', 'variance'] },
          { label: 'Investigation method', kw: ['traced', 'checked', 'reconcil', 'ledger', 'compared', 'analy'] },
          { label: 'Resolution / control', kw: ['fixed', 'corrected', 'control', 'process', 'prevent', 'result'] }
        ] }
      ],
      sjt: [
        { id: 'fi1', comp: ['integrity', 'decision'], title: 'Close the books early',
          scenario: 'It is month-end. Your manager asks you to record next month\'s confirmed supplier rebate in this month so the region meets its profit target.',
          question: 'What is the most effective response?',
          options: [
            { t: 'Explain respectfully that it breaks accrual principles, suggest a compliant disclosure/forecast note, and escalate if pressured.', s: 3 },
            { t: 'Do it — the rebate is confirmed anyway.', s: 0 },
            { t: 'Do it but keep an email as proof that you were told to.', s: 0 },
            { t: 'Refuse without explanation.', s: 1 }
          ] },
        { id: 'fi2', comp: ['problem', 'role'], title: 'Bank reconciliation gap',
          scenario: 'A store\'s bank deposits are Rs 312,000 lower than POS cash sales for the month.',
          question: 'What is the best first step?',
          options: [
            { t: 'Match deposit slips day-by-day against daily Z-reports to find the dates of the gap, then check deposits-in-transit and cash in safe.', s: 3 },
            { t: 'Report the store manager for theft.', s: 0 },
            { t: 'Post the difference to a suspense account and move on.', s: 1 },
            { t: 'Ask the bank to explain.', s: 1 }
          ] },
        { id: 'fi3', comp: ['communication', 'customer'], title: 'Explaining to Ops',
          scenario: 'Operations managers do not understand why their store "made a loss" when sales were up 10%.',
          question: 'What is the most effective approach?',
          options: [
            { t: 'Walk them through a simple store P&L showing margin mix, discounts, wastage and rent, and agree two levers they can control.', s: 3 },
            { t: 'Email the full trial balance.', s: 0 },
            { t: 'Tell them finance numbers are final.', s: 0 },
            { t: 'Ask your manager to explain.', s: 1 }
          ] },
        { id: 'fi4', comp: ['decision', 'problem'], title: 'Supplier payment run',
          scenario: 'Cash is tight this week. You can pay only 60% of due invoices. One key supplier gives a 2% early-payment discount; another threatens to stop insulin supply if not paid.',
          question: 'What is the most effective approach?',
          options: [
            { t: 'Prioritise critical-supply and patient-impact suppliers, negotiate dates with others, communicate the plan to management.', s: 3 },
            { t: 'Pay the supplier with the discount first to save money.', s: 1 },
            { t: 'Pay oldest invoices first, no exceptions.', s: 1 },
            { t: 'Delay all payments until next week.', s: 0 }
          ] }
      ],
      simulation: {
        title: 'Month-end close',
        brief: 'Rank the month-end closing tasks in the correct order.',
        items: [
          { id: 'a', t: 'Complete bank and cash reconciliations' },
          { id: 'b', t: 'Post accruals and prepayments' },
          { id: 'c', t: 'Review trial balance and investigate variances' },
          { id: 'd', t: 'Prepare management accounts pack' },
          { id: 'e', t: 'Present results and commentary to management' }
        ],
        ideal: ['a', 'b', 'c', 'd', 'e'],
        rationale: 'Reconcile → adjust → review → report → present.'
      },
      caseStudy: {
        title: 'Should we open 15 new stores?',
        context: 'The board wants to open 15 new stores next year. Each store costs Rs 18M to set up (fit-out + inventory). An average new store reaches Rs 4.5M monthly sales by month 9 with a 22% gross margin. Monthly running costs (rent, salaries, utilities) are Rs 0.75M per store. The company has Rs 120M cash and a bank offers a loan at 18%.',
        exhibit: { caption: 'Unit economics — one mature store / month', headers: ['Line', 'Rs (M)'], rows: [['Sales', '4.50'], ['Gross margin (22%)', '0.99'], ['Running costs', '0.75'], ['Store contribution', '0.24'], ['Set-up cost (one-off)', '18.00']] },
        questions: [
          { id: 'fiq1', comp: ['problem', 'decision', 'role'], q: 'Analyse the proposal. Is it financially attractive? Show the key calculations you would make.',
            rubric: [
              { point: 'Calculates total investment (15 × 18 = 270M)', kw: ['270', 'total investment', 'capex', 'total cost'] },
              { point: 'Identifies funding gap vs cash / loan cost', kw: ['gap', '150', 'loan', 'interest', '18%', 'funding', 'debt', 'borrow'] },
              { point: 'Payback / return on store contribution', kw: ['payback', 'roi', 'return', 'irr', 'npv', 'years', '75 months', '6 years', 'break'] },
              { point: 'Considers ramp-up period losses', kw: ['ramp', 'month 9', 'first months', 'initial', 'loss'] },
              { point: 'Concludes with a reasoned recommendation', kw: ['recommend', 'not attractive', 'attractive', 'phase', 'pilot', 'fewer', 'conclusion'] }
            ] },
          { id: 'fiq2', comp: ['decision', 'leadership'], q: 'What would you recommend to make the expansion safer or more profitable?',
            rubric: [
              { point: 'Phased roll-out / pilot', kw: ['phase', 'pilot', 'batch', 'gradual', 'first 5', 'stage'] },
              { point: 'Improve margin / cost levers', kw: ['margin', 'rent', 'negotiat', 'private label', 'cost', 'mix'] },
              { point: 'Site selection with data', kw: ['location', 'site', 'footfall', 'catchment', 'data'] },
              { point: 'Reduce capex (lease, smaller format, consignment)', kw: ['lease', 'smaller', 'format', 'consignment', 'capex', 'franchise'] },
              { point: 'Sensitivity / risk analysis', kw: ['sensitiv', 'scenario', 'risk', 'worst case', 'best case'] }
            ] }
        ]
      }
    },

    'hr': {
      title: 'HR Executive', category: 'corporate', icon: 'people',
      tagline: 'Grow the people who grow DVAGO.',
      skills: ['recruitment', 'talent acquisition', 'onboarding', 'employee relations', 'payroll', 'labour law', 'performance management', 'training', 'hris', 'engagement', 'hr policies', 'compensation', 'interviewing'],
      voice: [
        { id: 'why', q: 'Why do you want to work in HR at DVAGO, and what is the biggest people challenge in retail?', checks: [
          { label: 'Motivation', kw: ['dvago', 'people', 'culture', 'employee', 'growth'] },
          { label: 'Retail HR insight', kw: ['turnover', 'retention', 'shift', 'frontline', 'front-line', 'hiring', 'training', 'engagement'] },
          { label: 'Ideas / approach', kw: ['would', 'idea', 'program', 'improve', 'solution', 'approach'] }
        ] },
        { id: 'star', q: 'Tell me about a sensitive employee situation you handled. How did you keep it fair and confidential?', checks: [
          { label: 'Situation', kw: ['employee', 'complaint', 'case', 'issue', 'conflict', 'situation'] },
          { label: 'Fair process', kw: ['both', 'listened', 'investigat', 'evidence', 'policy', 'fair', 'confidential'] },
          { label: 'Outcome', kw: ['resolved', 'outcome', 'result', 'action', 'learned'] }
        ] }
      ],
      sjt: [
        { id: 'hr1', comp: ['integrity', 'decision'], title: 'Harassment complaint',
          scenario: 'A cashier tells you her store manager makes inappropriate comments. She asks you to keep it secret and do nothing because she fears losing her job.',
          question: 'What is the most effective response?',
          options: [
            { t: 'Thank her, explain confidentiality limits and protection from retaliation, and start the formal harassment procedure while supporting her.', s: 3 },
            { t: 'Respect her wish and do nothing.', s: 0 },
            { t: 'Call the manager and warn him informally.', s: 0 },
            { t: 'Transfer her to another store quietly.', s: 1 }
          ] },
        { id: 'hr2', comp: ['decision', 'problem'], title: 'Urgent hiring',
          scenario: 'Operations needs 40 front-staff hires in 3 weeks for new stores. Your usual process takes 5 weeks.',
          question: 'What is the most effective approach?',
          options: [
            { t: 'Run walk-in hiring days with AI pre-screening and structured interviews, activate referrals, and parallelise documentation — keeping quality bars.', s: 3 },
            { t: 'Lower the requirements and hire whoever applies.', s: 0 },
            { t: 'Tell Operations it is impossible.', s: 0 },
            { t: 'Hire through an agency without any screening.', s: 1 }
          ] },
        { id: 'hr3', comp: ['leadership', 'integrity'], title: 'Termination without process',
          scenario: 'A regional manager wants to fire a pharmacist "today" for poor attitude. There are no warnings on file.',
          question: 'What is the most effective response?',
          options: [
            { t: 'Explain the legal/disciplinary process, help gather facts and document a fair improvement or disciplinary path.', s: 3 },
            { t: 'Process the termination as requested.', s: 0 },
            { t: 'Refuse and report the manager.', s: 1 },
            { t: 'Suggest the pharmacist resigns instead.', s: 0 }
          ] },
        { id: 'hr4', comp: ['problem', 'communication'], title: 'Exit data',
          scenario: 'Exit interviews show 60% of leaving cashiers cite "unpredictable shift schedules".',
          question: 'What is the most effective action?',
          options: [
            { t: 'Work with Ops to publish rosters 2 weeks ahead, allow shift swaps, and track retention of affected stores.', s: 3 },
            { t: 'Increase cashier salaries by 10%.', s: 1 },
            { t: 'Stop doing exit interviews.', s: 0 },
            { t: 'Send a reminder that schedules are a business need.', s: 0 }
          ] }
      ],
      simulation: {
        title: 'New store, new team',
        brief: 'A new store opens in 4 weeks. Rank these HR tasks in the order you would do them.',
        items: [
          { id: 'a', t: 'Agree headcount and roles with the area manager' },
          { id: 'b', t: 'Publish job posts and invite candidates to AI assessment' },
          { id: 'c', t: 'Interview shortlisted candidates' },
          { id: 'd', t: 'Issue offers and complete documentation' },
          { id: 'e', t: 'Run onboarding & SOP training before opening' }
        ],
        ideal: ['a', 'b', 'c', 'd', 'e'],
        rationale: 'Plan → source → select → hire → onboard.'
      },
      caseStudy: {
        title: 'The 55% turnover problem',
        context: 'DVAGO\'s front-line turnover is 55% a year. Each replacement costs about Rs 85,000 (hiring + training + lost productivity). There are 1,200 front-line staff. Pulse surveys show: low pay vs competitors (cited by 30%), no growth path (28%), manager behaviour (24%), long shifts (18%).',
        exhibit: { caption: 'Why front-line staff leave (exit survey)', headers: ['Reason', 'Share'], rows: [['Pay below market', '30%'], ['No career growth', '28%'], ['Manager behaviour', '24%'], ['Shift length / timing', '18%']] },
        questions: [
          { id: 'hrq1', comp: ['problem', 'decision'], q: 'Estimate the yearly cost of turnover and propose your top three interventions with reasons.',
            rubric: [
              { point: 'Calculates cost (~660 leavers × 85K ≈ Rs 56M)', kw: ['660', '56', 'million', 'cost of turnover', '1200', '1,200'] },
              { point: 'Career path / growth programme', kw: ['career', 'growth', 'promotion', 'path', 'ladder', 'development'] },
              { point: 'Manager capability / training', kw: ['manager', 'leadership', 'training', 'coach', 'behaviour', 'behavior'] },
              { point: 'Pay benchmarking / incentives', kw: ['pay', 'salary', 'benchmark', 'incentive', 'bonus', 'market'] },
              { point: 'Shift / scheduling fixes', kw: ['shift', 'roster', 'schedul', 'flexib', 'hours'] },
              { point: 'Prioritisation with rationale', kw: ['because', 'priorit', 'first', 'impact', 'cost-effective', 'quick win'] }
            ] },
          { id: 'hrq2', comp: ['leadership', 'communication'], q: 'How would you convince leadership to invest, and how will you track impact?',
            rubric: [
              { point: 'Business case / ROI', kw: ['roi', 'business case', 'saving', 'return', 'cost'] },
              { point: 'Pilot approach', kw: ['pilot', 'test', 'few stores', 'region', 'trial'] },
              { point: 'KPIs (turnover, 90-day retention, eNPS)', kw: ['turnover', 'retention', 'enps', 'engagement', 'kpi', 'dashboard'] },
              { point: 'Regular reporting', kw: ['monthly', 'quarter', 'report', 'review', 'update'] }
            ] }
        ]
      }
    },

    'it': {
      title: 'IT & Technology Officer', category: 'corporate', icon: 'chip',
      tagline: 'Keep every till, app and server running.',
      skills: ['networking', 'windows', 'linux', 'sql', 'erp', 'pos', 'cybersecurity', 'cloud', 'aws', 'azure', 'javascript', 'python', 'helpdesk', 'itil', 'backup', 'firewall', 'active directory', 'api'],
      voice: [
        { id: 'why', q: 'Why do you want to join DVAGO\'s technology team, and what technology are you strongest in?', checks: [
          { label: 'Motivation', kw: ['dvago', 'retail', 'digital', 'scale', 'impact', 'pharmacy'] },
          { label: 'Technical depth', kw: ['network', 'server', 'sql', 'cloud', 'security', 'code', 'python', 'javascript', 'erp', 'pos', 'linux'] },
          { label: 'Evidence', kw: ['built', 'managed', 'implemented', 'project', 'experience', 'certif'] }
        ] },
        { id: 'star', q: 'Tell me about the hardest technical outage or bug you solved. How did you find the root cause?', checks: [
          { label: 'Problem description', kw: ['down', 'outage', 'bug', 'issue', 'error', 'crash', 'slow'] },
          { label: 'Systematic debugging', kw: ['log', 'traced', 'isolat', 'root cause', 'tested', 'monitor', 'checked'] },
          { label: 'Fix & prevention', kw: ['fixed', 'resolved', 'patch', 'prevent', 'monitor', 'documented', 'post-mortem', 'postmortem'] }
        ] }
      ],
      sjt: [
        { id: 'it1', comp: ['decision', 'problem'], title: '50 stores offline',
          scenario: 'At 7 PM, POS in 50 stores goes offline at once. Store managers are calling non-stop.',
          question: 'What is the most effective first action?',
          options: [
            { t: 'Declare an incident, check the common dependency (network/server/central service), set up a status update channel for stores and work the fix.', s: 3 },
            { t: 'Answer each store call one by one.', s: 0 },
            { t: 'Restart all 50 POS machines remotely.', s: 1 },
            { t: 'Wait 15 minutes to see if it recovers.', s: 0 }
          ] },
        { id: 'it2', comp: ['integrity', 'role'], title: 'Phishing click',
          scenario: 'An area manager tells you he entered his password on a "Microsoft" page from an email an hour ago.',
          question: 'What is the most effective action?',
          options: [
            { t: 'Reset his credentials and revoke sessions immediately, check sign-in logs and mailbox rules, warn other users and report the incident.', s: 3 },
            { t: 'Run an antivirus scan on his laptop.', s: 1 },
            { t: 'Tell him to change his password when he gets time.', s: 0 },
            { t: 'Block the sender and do nothing else.', s: 1 }
          ] },
        { id: 'it3', comp: ['communication', 'customer'], title: 'Tickets everywhere',
          scenario: 'You have 30 open tickets. A director wants his printer fixed "right now"; a store cannot print prescriptions labels.',
          question: 'What is the most effective approach?',
          options: [
            { t: 'Prioritise by business/patient impact — fix the store label printer first, give the director a clear ETA or a workaround.', s: 3 },
            { t: 'Fix the director\'s printer first — seniority matters.', s: 0 },
            { t: 'Handle tickets strictly by the time they arrived.', s: 1 },
            { t: 'Ask both to raise a formal ticket and wait.', s: 1 }
          ] },
        { id: 'it4', comp: ['decision', 'leadership'], title: 'Change on Friday night',
          scenario: 'A vendor wants to deploy a POS update at 8 PM Friday, peak sales time, because "it is tested".',
          question: 'What is the most effective response?',
          options: [
            { t: 'Reschedule to a low-traffic window, require a rollback plan, pilot in a few stores first.', s: 3 },
            { t: 'Approve it — the vendor tested it.', s: 0 },
            { t: 'Reject the update entirely.', s: 1 },
            { t: 'Approve but stay online to watch.', s: 1 }
          ] }
      ],
      simulation: {
        title: 'Ransomware alert',
        brief: 'Antivirus flags ransomware behaviour on a head-office PC. Rank your actions in order.',
        items: [
          { id: 'a', t: 'Isolate the PC from the network' },
          { id: 'b', t: 'Notify the incident response lead / management' },
          { id: 'c', t: 'Identify the scope — other affected machines, shares' },
          { id: 'd', t: 'Restore from clean backups' },
          { id: 'e', t: 'Post-incident review and user awareness' }
        ],
        ideal: ['a', 'b', 'c', 'd', 'e'],
        rationale: 'Contain → escalate → scope → recover → learn.'
      },
      caseStudy: {
        title: 'Slow stores, unhappy customers',
        context: 'Since adding 40 new stores, POS billing takes 25–40 seconds per bill during evening peak (target: under 8 seconds). All stores connect to one central SQL server over VPN. Store internet is 10 Mbps. CPU on the database server hits 95% between 7–10 PM. Customers are leaving queues.',
        exhibit: { caption: 'Monitoring snapshot — 8 PM', headers: ['Metric', 'Value', 'Target'], rows: [['Avg bill time', '32 s', '< 8 s'], ['DB server CPU', '95%', '< 70%'], ['VPN latency', '140 ms', '< 60 ms'], ['Active stores', '142', '—']] },
        questions: [
          { id: 'itq1', comp: ['problem', 'role'], q: 'How would you diagnose the root cause? Which data would you check and in what order?',
            rubric: [
              { point: 'Database performance (slow queries, indexes, locks)', kw: ['query', 'index', 'lock', 'database', 'sql', 'execution plan', 'slow log'] },
              { point: 'Network / VPN latency investigation', kw: ['network', 'latency', 'vpn', 'bandwidth', 'ping', 'packet'] },
              { point: 'Server resources / scaling', kw: ['cpu', 'memory', 'ram', 'server', 'capacity', 'resource'] },
              { point: 'Compare peak vs off-peak / new vs old stores', kw: ['peak', 'off-peak', 'compare', 'new stores', 'pattern', 'baseline'] },
              { point: 'Uses monitoring / logs systematically', kw: ['monitor', 'log', 'apm', 'metric', 'trace', 'dashboard'] }
            ] },
          { id: 'itq2', comp: ['decision', 'leadership'], q: 'Propose short-term fixes for this week and a long-term architecture improvement.',
            rubric: [
              { point: 'Short-term: optimise queries / indexes / caching', kw: ['index', 'optimi', 'cache', 'query'] },
              { point: 'Short-term: scale server resources', kw: ['scale', 'upgrade', 'more cpu', 'vertical', 'resource'] },
              { point: 'Long-term: offline-first / local store DB with sync', kw: ['offline', 'local', 'sync', 'edge', 'store server', 'replica'] },
              { point: 'Long-term: cloud / horizontal scaling / read replicas', kw: ['cloud', 'replica', 'horizontal', 'load balanc', 'microservice', 'distributed'] },
              { point: 'Rollout with testing / pilot and monitoring', kw: ['pilot', 'test', 'rollout', 'monitor', 'gradual', 'staging'] }
            ] }
        ]
      }
    },

    'supply-chain': {
      title: 'Supply Chain & Logistics Officer', category: 'corporate', icon: 'truck',
      tagline: 'The right medicine, in the right store, on time.',
      skills: ['supply chain', 'logistics', 'procurement', 'inventory management', 'warehouse', 'demand planning', 'forecasting', 'cold chain', 'erp', 'sap', 'vendor management', 'excel', 'distribution', 'fefo'],
      voice: [
        { id: 'why', q: 'Why supply chain at DVAGO? What makes pharmacy supply chain different from normal retail?', checks: [
          { label: 'Motivation', kw: ['dvago', 'pharmacy', 'health', 'growth', 'network'] },
          { label: 'Pharma specifics', kw: ['expiry', 'cold chain', 'regulat', 'drap', 'batch', 'recall', 'temperature', 'shortage', 'critical'] },
          { label: 'Experience', kw: ['experience', 'worked', 'warehouse', 'procure', 'planning', 'vendor'] }
        ] },
        { id: 'star', q: 'Tell me about a time a shipment or supply problem threatened operations. How did you handle it?', checks: [
          { label: 'Problem', kw: ['delay', 'shortage', 'stuck', 'late', 'problem', 'issue'] },
          { label: 'Actions', kw: ['arranged', 'alternative', 'negotiat', 'transfer', 'called', 'expedit'] },
          { label: 'Result', kw: ['result', 'saved', 'delivered', 'avoided', 'learned', 'on time'] }
        ] }
      ],
      sjt: [
        { id: 'sc1', comp: ['decision', 'customer'], title: 'Insulin shortage',
          scenario: 'A national insulin shortage hits. You have 400 vials across the network; demand is 900 for the next two weeks.',
          question: 'What is the most effective approach?',
          options: [
            { t: 'Allocate based on prescription-backed demand and existing patients, set per-customer limits, rebalance between stores and pursue alternative sources.', s: 3 },
            { t: 'Send stock to the highest-revenue stores.', s: 0 },
            { t: 'First come, first served.', s: 1 },
            { t: 'Keep it in the warehouse until supply normalises.', s: 0 }
          ] },
        { id: 'sc2', comp: ['integrity', 'role'], title: 'Short-dated delivery',
          scenario: 'A supplier delivers 2,000 units with 3 months shelf-life left. Your policy is a minimum of 9 months.',
          question: 'What is the most effective action?',
          options: [
            { t: 'Reject or quarantine per policy, document it, and agree a replacement or return with the supplier and procurement.', s: 3 },
            { t: 'Accept it to avoid stock-outs.', s: 0 },
            { t: 'Accept and push it to high-volume stores.', s: 1 },
            { t: 'Accept half of it.', s: 1 }
          ] },
        { id: 'sc3', comp: ['problem', 'decision'], title: 'Dead stock',
          scenario: 'Rs 9M of stock in the warehouse has not moved for 6 months.',
          question: 'What is the most effective first step?',
          options: [
            { t: 'Run an ABC/XYZ and expiry analysis, then decide per SKU: return, transfer to stores where it sells, promote or write off.', s: 3 },
            { t: 'Write all of it off.', s: 1 },
            { t: 'Push it to all stores equally.', s: 0 },
            { t: 'Stop buying any of these brands forever.', s: 0 }
          ] },
        { id: 'sc4', comp: ['communication', 'leadership'], title: 'Late supplier',
          scenario: 'Your main distributor has been late on 30% of deliveries for three months.',
          question: 'What is the most effective action?',
          options: [
            { t: 'Share OTIF data with them, agree a corrective plan with targets and timeline, and qualify a backup supplier in parallel.', s: 3 },
            { t: 'Switch suppliers immediately.', s: 1 },
            { t: 'Increase safety stock and accept the delays.', s: 1 },
            { t: 'Complain by email every week.', s: 0 }
          ] }
      ],
      simulation: {
        title: 'Cold-chain truck breakdown',
        brief: 'A refrigerated truck carrying vaccines breaks down on the motorway. Rank your actions.',
        items: [
          { id: 'a', t: 'Check current temperature data from the logger' },
          { id: 'b', t: 'Dispatch a replacement refrigerated vehicle' },
          { id: 'c', t: 'Inform receiving stores of the delay' },
          { id: 'd', t: 'Quarantine stock on arrival pending QA review' },
          { id: 'e', t: 'Root-cause and update the contingency SOP' }
        ],
        ideal: ['a', 'b', 'c', 'd', 'e'],
        rationale: 'Know product condition → protect it → inform → verify quality → learn.'
      },
      caseStudy: {
        title: 'Stock-outs vs overstock',
        context: 'DVAGO stores report 7% stock-outs on fast-moving medicines while the central warehouse holds 74 days of inventory (target 35). Stores order manually every Monday based on the store manager\'s judgement. Dengue season starts in 3 weeks and last year paracetamol and ORS demand tripled.',
        exhibit: { caption: 'Network inventory health', headers: ['KPI', 'Current', 'Target'], rows: [['Store stock-out rate', '7%', '< 2%'], ['Warehouse days of cover', '74', '35'], ['Forecast accuracy', '58%', '> 80%'], ['Ordering method', 'Manual weekly', 'Auto-replenish']] },
        questions: [
          { id: 'scq1', comp: ['problem', 'role'], q: 'Why might the network have stock-outs and overstock at the same time? What would you fix first?',
            rubric: [
              { point: 'Wrong mix — excess slow movers, short fast movers', kw: ['mix', 'slow moving', 'slow-moving', 'fast moving', 'fast-moving', 'wrong items', 'sku'] },
              { point: 'Manual / judgement ordering problem', kw: ['manual', 'judgement', 'judgment', 'gut', 'store manager', 'weekly'] },
              { point: 'Poor forecasting / demand visibility', kw: ['forecast', 'demand', 'data', 'visibility', 'sales history'] },
              { point: 'Auto-replenishment / min-max / reorder points', kw: ['auto', 'replenish', 'min-max', 'min max', 'reorder point', 'par level', 'system'] },
              { point: 'Distribution frequency / allocation', kw: ['frequency', 'allocation', 'distribution', 'daily', 'twice', 'transfer'] }
            ] },
          { id: 'scq2', comp: ['decision', 'leadership'], q: 'Prepare a plan for dengue season in the next 3 weeks.',
            rubric: [
              { point: 'Forecast using last year\'s data / seasonality', kw: ['last year', 'season', 'forecast', 'trend', 'triple', '3x'] },
              { point: 'Secure supply early with suppliers', kw: ['supplier', 'advance', 'order early', 'secure', 'contract', 'commit'] },
              { point: 'Pre-position stock in high-risk areas', kw: ['pre-position', 'position', 'area', 'hotspot', 'high-risk', 'region', 'allocat'] },
              { point: 'Monitor daily and rebalance', kw: ['daily', 'monitor', 'rebalanc', 'track', 'dashboard'] },
              { point: 'Coordinate with stores / marketing', kw: ['store', 'marketing', 'communicat', 'coordinate', 'team'] }
            ] }
        ]
      }
    },

    'quality': {
      title: 'Quality Assurance Officer', category: 'corporate', icon: 'shield',
      tagline: 'Every pack safe, every process compliant.',
      skills: ['quality assurance', 'gmp', 'gdp', 'gsp', 'drap', 'audit', 'sop', 'capa', 'compliance', 'iso', 'pharmacovigilance', 'documentation', 'recall', 'cold chain', 'risk assessment'],
      voice: [
        { id: 'why', q: 'Why do you want to join DVAGO Quality Assurance, and what does "quality" mean to you in a pharmacy?', checks: [
          { label: 'Motivation', kw: ['dvago', 'patient', 'safety', 'pharmacy', 'trust'] },
          { label: 'QA concepts', kw: ['sop', 'gmp', 'gdp', 'audit', 'capa', 'compliance', 'drap', 'documentation', 'storage'] },
          { label: 'Experience', kw: ['experience', 'audit', 'inspection', 'worked', 'implemented', 'certif'] }
        ] },
        { id: 'star', q: 'Tell me about an audit finding or quality issue you closed. How did you make sure it did not come back?', checks: [
          { label: 'Finding', kw: ['finding', 'non-conform', 'nonconform', 'deviation', 'issue', 'audit'] },
          { label: 'Root cause & CAPA', kw: ['root cause', 'capa', 'corrective', 'preventive', 'why'] },
          { label: 'Verification', kw: ['verified', 'follow up', 'follow-up', 'effectiveness', 're-audit', 'monitor', 'closed'] }
        ] }
      ],
      sjt: [
        { id: 'qa1', comp: ['integrity', 'decision'], title: 'Pressure to pass',
          scenario: 'During a store audit you find temperature logs filled in advance for the next three days. The store manager begs you not to report it because of his promotion review.',
          question: 'What is the most effective action?',
          options: [
            { t: 'Record it as a critical finding, explain why falsified records are a patient-safety risk, and agree immediate CAPA.', s: 3 },
            { t: 'Give a verbal warning and leave it out of the report.', s: 0 },
            { t: 'Record it as a minor finding.', s: 1 },
            { t: 'Report the manager to HR without discussing it.', s: 1 }
          ] },
        { id: 'qa2', comp: ['problem', 'role'], title: 'Repeat complaints',
          scenario: 'Three stores report customers complaining that a cream "smells different". All from the same batch.',
          question: 'What is the most effective first action?',
          options: [
            { t: 'Place the batch on hold network-wide, collect samples and complaint details, inform the manufacturer and assess recall need.', s: 3 },
            { t: 'Refund the three customers and continue selling.', s: 0 },
            { t: 'Wait for more complaints to confirm.', s: 0 },
            { t: 'Remove it only from those three stores.', s: 1 }
          ] },
        { id: 'qa3', comp: ['leadership', 'communication'], title: 'SOP nobody follows',
          scenario: 'Audits show that 60% of stores do not follow the new returns SOP. Staff say it is "too long".',
          question: 'What is the most effective response?',
          options: [
            { t: 'Get store feedback, simplify the SOP into a visual one-page checklist, train, and re-audit.', s: 3 },
            { t: 'Issue warnings to all non-compliant stores.', s: 1 },
            { t: 'Accept it — staff know best.', s: 0 },
            { t: 'Email the SOP again.', s: 0 }
          ] },
        { id: 'qa4', comp: ['decision', 'integrity'], title: 'Minor DRAP finding',
          scenario: 'A DRAP inspection gives your warehouse a minor finding on pest-control records.',
          question: 'What is the most effective response?',
          options: [
            { t: 'Acknowledge it, assign an owner, close it with CAPA and evidence before the deadline, and check other sites for the same gap.', s: 3 },
            { t: 'Fix it only at that warehouse.', s: 2 },
            { t: 'Dispute the finding.', s: 0 },
            { t: 'It is minor — handle it when there is time.', s: 0 }
          ] }
      ],
      simulation: {
        title: 'Handling a deviation',
        brief: 'Rank the steps of handling a quality deviation in the correct order.',
        items: [
          { id: 'a', t: 'Contain — hold affected product' },
          { id: 'b', t: 'Record the deviation' },
          { id: 'c', t: 'Investigate root cause' },
          { id: 'd', t: 'Implement corrective & preventive actions' },
          { id: 'e', t: 'Verify effectiveness and close' }
        ],
        ideal: ['a', 'b', 'c', 'd', 'e'],
        rationale: 'Contain → document → investigate → CAPA → verify.'
      },
      caseStudy: {
        title: 'Building a store audit programme',
        context: 'DVAGO has 140 stores and only 3 QA officers. Last year, 12 stores had serious findings (wrong storage, expired stock on shelf, missing narcotics records). Leadership wants zero critical findings in next year\'s DRAP inspections.',
        exhibit: { caption: 'Last year\'s critical findings', headers: ['Finding type', 'Stores'], rows: [['Expired stock on shelf', '7'], ['Cold-chain not logged', '5'], ['Narcotics register gaps', '4'], ['Pest control records missing', '3']] },
        questions: [
          { id: 'qaq1', comp: ['problem', 'leadership', 'decision'], q: 'Design a risk-based audit programme that 3 people can realistically run.',
            rubric: [
              { point: 'Risk-based prioritisation of stores', kw: ['risk', 'priorit', 'high risk', 'history', 'score', 'tier'] },
              { point: 'Self-audits / store checklists', kw: ['self-audit', 'self audit', 'checklist', 'store manager', 'weekly check'] },
              { point: 'Digital tools / photo evidence / data', kw: ['digital', 'app', 'photo', 'data', 'dashboard', 'system'] },
              { point: 'Focus on top finding types', kw: ['expired', 'cold chain', 'narcotic', 'register', 'pest'] },
              { point: 'Calendar / frequency / coverage', kw: ['frequency', 'calendar', 'quarter', 'month', 'schedule', 'visits'] },
              { point: 'CAPA follow-up', kw: ['capa', 'follow up', 'follow-up', 'close', 'action plan'] }
            ] },
          { id: 'qaq2', comp: ['leadership', 'communication'], q: 'How would you build a quality culture so stores comply even when no auditor is present?',
            rubric: [
              { point: 'Training & awareness of "why"', kw: ['train', 'awareness', 'why', 'patient safety', 'understand'] },
              { point: 'Recognition / incentives', kw: ['recogn', 'reward', 'incentive', 'champion', 'award', 'league'] },
              { point: 'Accountability / KPIs for managers', kw: ['kpi', 'accountab', 'scorecard', 'target', 'performance'] },
              { point: 'Simple tools / visual SOPs', kw: ['simple', 'visual', 'one page', 'poster', 'checklist'] },
              { point: 'Open reporting without blame', kw: ['report', 'no blame', 'blame', 'open', 'speak up', 'near miss'] }
            ] }
        ]
      }
    }
  };

  const SECTIONS = [
    { key: 'sjt', label: 'Decision Making', desc: 'Real workplace dilemmas — choose the most effective action.', minutes: 9, icon: 'compass' },
    { key: 'simulation', label: 'Job Simulation', desc: 'Prioritise tasks the way you would on the job.', minutes: 4, icon: 'layers' },
    { key: 'case', label: 'Case Study', desc: 'Analyse a real DVAGO scenario. Type or speak your answers.', minutes: 14, icon: 'file' },
    { key: 'reasoning', label: 'Reasoning & Attention', desc: 'Quick pharmacy maths and an attention-to-detail challenge.', minutes: 6, icon: 'zap' }
  ];

  function roleQuestions(roleKey) {
    const r = ROLES[roleKey];
    if (!r) return null;
    return {
      voice: VOICE_COMMON.concat(r.voice),
      sjt: COMMON_SJT.concat(r.sjt),
      simulation: r.simulation,
      caseStudy: r.caseStudy,
      reasoning: REASONING
    };
  }

  // Default positions (sub-specialisations) per role. Each has a job description shown to the candidate.
  // Admins can add more via the dashboard.
  const JD = (about, resp, req, perks) =>
    `About the role\n${about}\n\nKey responsibilities\n${resp.map((r) => '• ' + r).join('\n')}\n\nWhat we are looking for\n${req.map((r) => '• ' + r).join('\n')}\n\nWhat you'll get\n${perks.map((r) => '• ' + r).join('\n')}`;

  const DEFAULT_POSITIONS = {
    'front-staff': [
      { id: 'fs-rep', title: 'Front Staff Representative', jd: JD(
        "Be the welcoming face of your DVAGO store, help customers find what they need, and support the pharmacy team with everyday operations.",
        ["Greet and assist walk-in customers warmly and professionally", "Help customers find products and explain basic usage", "Operate the point of sale and process billing accurately", "Maintain shelf arrangement, cleanliness and visual merchandising", "Follow FEFO (first expiry, first out) and remove expired products", "Support the pharmacist with over-the-counter sales"],
        ["Matric or above; good spoken English and Urdu", "A friendly, service-first attitude", "Attention to detail and ability to stand for long periods", "Willing to work rotating shifts, weekends and public holidays"],
        ["Competitive salary with performance incentives", "Health & medical coverage for self and family", "Clear career path to Senior Rep and Store Manager", "On-the-job training on retail pharmacy best practices"]
      ) }
    ],
    'cashier': [
      { id: 'ca-main', title: 'Cashier', jd: JD(
        "Handle all cash, card and digital wallet transactions at the counter with speed, accuracy and complete honesty.",
        ["Process billing for every customer accurately and quickly", "Handle cash, cards, Easypaisa and JazzCash payments", "Reconcile cash drawer at every shift opening and closing", "Issue receipts, process returns and discount coupons per policy", "Spot and report counterfeit notes and suspicious transactions", "Keep the counter area clean and organised"],
        ["Matric or Intermediate; comfortable with numbers", "Prior cashiering or billing experience preferred", "Strong attention to detail and reliability with cash", "Willing to work rotating shifts including evenings"],
        ["Fixed salary plus end-of-month attendance bonus", "Health & medical coverage", "Daily lunch allowance", "Growth into Senior Cashier and Shift Supervisor"]
      ) }
    ],
    'store-manager': [
      { id: 'sm-main', title: 'Store Manager', jd: JD(
        "Lead one DVAGO pharmacy end-to-end: sales, team, inventory, compliance and customer experience.",
        ["Hit monthly sales, margin and footfall targets", "Hire, roster, coach and develop a team of 6-10 staff", "Own stock availability, FEFO rotation and shrinkage control", "Ensure DRAP, cold-chain and SOP compliance at all times", "Resolve customer complaints and build community loyalty", "Report store KPIs weekly to area management"],
        ["Bachelor's degree; 3+ years retail leadership experience", "Strong people-management and conflict-resolution skills", "Comfortable with KPIs, P&L, basic Excel", "Pharmacy or FMCG retail background is a plus"],
        ["Attractive salary with store-performance bonus", "Health & medical coverage for self and family", "Leadership training programme", "Fast-track to Area/Regional Manager"]
      ) },
      { id: 'sm-asst', title: 'Assistant Store Manager', jd: JD(
        "Partner with the Store Manager to run daily operations, step up in their absence, and get ready for your own store.",
        ["Open and close the store; manage shift schedules", "Supervise front staff and cashiers on the floor", "Drive upselling, promotions and customer service standards", "Support inventory audits and daily cash reconciliation"],
        ["Bachelor's degree; 1-2 years retail supervisory experience", "Hands-on, lead-by-example style", "Good communication and problem-solving skills"],
        ["Competitive salary with monthly incentive", "Health & medical coverage", "Promotion to Store Manager within 12-18 months"]
      ) }
    ],
    'pharma-assistant': [
      { id: 'pa-main', title: 'Pharmacy Assistant', jd: JD(
        "Support the pharmacist in safe, accurate dispensing and in giving patients a great experience.",
        ["Receive and verify prescriptions under pharmacist supervision", "Dispense medicines accurately following labels and dosage", "Maintain the cold-chain log and daily fridge temperature records", "Manage controlled substances register with full accuracy", "Counsel patients on dose and storage under pharmacist guidance", "Flag any dispensing concern immediately to the pharmacist"],
        ["Pharm-D student, Pharmacy Technician Diploma or B-Pharmacy", "Working knowledge of common medicines and dosage", "Honest, careful and detail-oriented", "Able to work rotating shifts"],
        ["Competitive salary with experience-based increments", "Health coverage and medicine discount for family", "Access to continuous pharmacy training", "Clear path to Senior Pharmacy roles"]
      ) }
    ],
    'marketing': [
      { id: 'mk-exec', title: 'Marketing Executive', jd: JD(
        "Run multi-channel marketing campaigns that grow DVAGO's brand across digital and in-store.",
        ["Plan and execute seasonal and category campaigns", "Manage social media calendar across Instagram, Facebook, TikTok", "Coordinate with creative and influencer partners", "Track campaign KPIs: reach, engagement, footfall, ROI", "Prepare monthly performance reports for leadership"],
        ["Bachelor's degree in marketing or related field", "1-3 years marketing experience; healthcare is a plus", "Hands-on with Canva, Meta Ads Manager, basic analytics", "Strong writing in English; Urdu is a plus"],
        ["Competitive salary with campaign bonuses", "Health & medical coverage", "Learning budget for marketing courses", "Fast growth as DVAGO expands nationwide"]
      ) },
      { id: 'mk-digital', title: 'Digital Marketing Specialist', jd: JD(
        "Own DVAGO's digital performance: paid media, SEO, email, CRM and the mobile app growth loop.",
        ["Run paid campaigns on Meta, Google and TikTok", "Manage SEO for the DVAGO website and app store listings", "Build email and WhatsApp journeys for loyalty members", "A/B test landing pages and creative", "Report CAC, CPA, ROAS and retention metrics weekly"],
        ["2-4 years paid digital experience with real campaign results", "Hands-on with Meta Ads, Google Ads, GA4, a CRM tool", "Analytical mindset; comfortable with numbers and testing", "Portfolio of past campaigns required"],
        ["Attractive salary plus performance bonus", "Health & medical coverage", "Paid access to premium marketing tools and courses"]
      ) },
      { id: 'mk-brand', title: 'Brand Manager', jd: JD(
        "Guard the DVAGO brand across every touchpoint and shape how Pakistan sees us.",
        ["Own brand guidelines, tone of voice and visual identity", "Lead brand campaigns from brief to launch", "Manage agency relationships", "Track brand health metrics (awareness, consideration, NPS)", "Partner with Retail Ops on in-store brand experience"],
        ["Bachelor's degree; 4+ years brand marketing experience", "Prior work on an FMCG, pharmacy or wellness brand preferred", "Strong strategic thinking and storytelling skills"],
        ["Senior-level compensation package", "Health & medical coverage for family", "Leadership track to Head of Brand"]
      ) },
      { id: 'mk-content', title: 'Content Writer', jd: JD(
        "Write content that educates customers about health, wellness and DVAGO products — in English and Urdu.",
        ["Write blog articles, social captions, product descriptions, email copy", "Research health topics with accuracy and empathy", "Collaborate with designers for carousel and video scripts", "Edit and proofread the team's output"],
        ["Bachelor's degree; portfolio of published writing", "Excellent written English; Urdu writing is a plus", "Curiosity about health, nutrition and wellness", "Comfortable with SEO best practices"],
        ["Competitive salary", "Health coverage", "Flexible hybrid work option after probation"]
      ) }
    ],
    'finance': [
      { id: 'fi-main', title: 'Finance & Accounts Officer', jd: JD(
        "Keep DVAGO's books accurate, reconciled and audit-ready across 100+ stores.",
        ["Daily bank and cash reconciliation for assigned stores", "Record accruals, prepayments and journal entries", "Support monthly closing and management accounts", "Process supplier invoices and payments", "Prepare schedules for internal and external audit"],
        ["Bachelor's in Accounting/Finance or part-qualified ACCA/CA", "1-3 years finance experience; retail/FMCG is a plus", "Strong Excel; exposure to SAP or Oracle is a plus", "Accuracy and ownership mindset"],
        ["Competitive salary", "Health coverage", "ACCA/CA study support", "Growth into Senior Finance and Controller roles"]
      ) },
      { id: 'fi-audit', title: 'Internal Audit Officer', jd: JD(
        "Audit DVAGO stores and corporate functions for process compliance, cash integrity and shrinkage control.",
        ["Carry out scheduled and surprise store audits", "Review cash handling, refunds, discounts and voids", "Investigate shrinkage, stock variance and fraud flags", "Issue findings reports with corrective actions", "Track CAPA closure with store managers"],
        ["Bachelor's in Accounting/Finance; CIA or ACCA preferred", "2-4 years internal audit experience", "Willingness to travel to stores across Pakistan"],
        ["Attractive salary plus field allowance", "Health coverage", "Growth into Senior Audit and Risk roles"]
      ) },
      { id: 'fi-analyst', title: 'Financial Analyst', jd: JD(
        "Turn DVAGO's data into decisions: budgets, forecasts, store P&L and investment cases.",
        ["Build and maintain the annual budget and rolling forecast", "Prepare store P&L reports and variance analysis", "Model business cases for new stores, categories and campaigns", "Partner with Ops, Marketing and Supply Chain on finance questions"],
        ["Bachelor's in Finance/Accounting or ACCA/CA finalist", "2-4 years FP&A or analyst experience", "Advanced Excel; Power BI is a plus"],
        ["Competitive salary", "Health coverage", "High-visibility role with leadership exposure"]
      ) }
    ],
    'hr': [
      { id: 'hr-exec', title: 'HR Executive', jd: JD(
        "Support the full employee lifecycle for DVAGO's growing team of 1,000+ across head office and stores.",
        ["Handle recruitment, onboarding and documentation", "Maintain HRIS and personnel files accurately", "Support payroll, attendance and leave management", "Address employee queries and grievances", "Coordinate training sessions and engagement activities"],
        ["Bachelor's degree in HR or related field", "1-3 years HR experience; retail is a plus", "Working knowledge of Pakistan labour law", "Empathetic, discreet and detail-oriented"],
        ["Competitive salary", "Health coverage for self and family", "Learning budget for HR certifications"]
      ) },
      { id: 'hr-ta', title: 'Talent Acquisition Specialist', jd: JD(
        "Build the pipeline of front-line and corporate talent that fuels DVAGO's expansion.",
        ["Own end-to-end hiring for assigned roles and locations", "Run walk-in hiring days for store openings", "Source candidates through job boards, referrals and LinkedIn", "Use the DVAGO AI assessment platform to screen candidates", "Partner with hiring managers on structured interviews"],
        ["Bachelor's degree; 2-4 years recruitment experience", "Strong sourcing and interviewing skills", "Comfortable with ATS and recruitment analytics"],
        ["Competitive salary plus hiring targets bonus", "Health coverage", "Rapid growth as DVAGO opens new stores"]
      ) },
      { id: 'hr-ld', title: 'Learning & Development Officer', jd: JD(
        "Design and deliver training that lifts the capability of every DVAGO employee.",
        ["Design onboarding and SOP training for new joiners", "Build role-specific learning paths for staff and managers", "Deliver classroom and online training sessions", "Measure training effectiveness and ROI"],
        ["Bachelor's degree; 2-4 years L&D experience", "Confident facilitator; good instructional design skills", "Comfortable with LMS platforms"],
        ["Competitive salary", "Health coverage", "Access to global L&D certifications"]
      ) }
    ],
    'it': [
      { id: 'it-support', title: 'IT Support Engineer', jd: JD(
        "Keep every DVAGO store and head-office user running — POS, printers, network, laptops and apps.",
        ["Resolve tickets for store POS, printers, scanners and label machines", "Set up new user accounts, laptops and email", "Manage network connectivity at stores (VPN, Wi-Fi)", "First-response for incidents; escalate to vendors as needed", "Maintain IT asset inventory"],
        ["Bachelor's in CS/IT; 1-3 years hands-on IT support experience", "Comfortable with Windows, basic networking, Active Directory", "Retail or POS experience is a strong plus", "Willing to travel to stores for setup/incidents"],
        ["Competitive salary plus on-call allowance", "Health coverage", "Tool stipend; training on enterprise systems"]
      ) },
      { id: 'it-data', title: 'Data Analyst', jd: JD(
        "Turn DVAGO's sales, inventory and customer data into insights the business acts on every week.",
        ["Build and maintain dashboards for Sales, Supply Chain and Marketing", "Write SQL queries against the data warehouse", "Analyse basket, promotion, loyalty and inventory patterns", "Partner with teams on A/B tests and performance reviews", "Automate recurring reports"],
        ["Bachelor's in CS, Stats, Economics or related field", "2-4 years analytics experience with SQL + Excel + a BI tool (Power BI/Tableau/Looker)", "Strong business sense; can explain findings simply", "Python / R a plus"],
        ["Competitive salary with annual bonus", "Health coverage", "Access to premium analytics tools and learning platforms"]
      ) },
      { id: 'it-aiml', title: 'AI / ML Engineer', jd: JD(
        "Build the AI products that power DVAGO: demand forecasting, personalisation, chatbot, and smart hiring.",
        ["Design and ship ML models for forecasting, recommendation and NLP use cases", "Own data pipelines, feature stores and model deployment", "Integrate LLM-based products (chat, voice, recruitment AI)", "Monitor model performance and iterate", "Collaborate with Data, Product and Engineering teams"],
        ["Bachelor's/Master's in CS or related field; 2-5 years ML experience", "Strong Python, SQL, PyTorch or TensorFlow, scikit-learn", "Hands-on with LLM APIs (OpenAI, Anthropic, open-source)", "Experience deploying models to production (MLflow, FastAPI, cloud)"],
        ["Top-end compensation", "Health coverage", "GPU and cloud credits; conference budget", "Work on real AI products used by millions of Pakistanis"]
      ) },
      { id: 'it-dev', title: 'Software Developer', jd: JD(
        "Build and maintain DVAGO's internal tools, APIs and customer-facing web/mobile features.",
        ["Design and build web services, APIs and integrations", "Contribute to the DVAGO mobile app and admin dashboards", "Write clean, tested code with code reviews", "Partner with Product and Design on user-facing features", "Troubleshoot production issues and ship fixes"],
        ["Bachelor's in CS; 2-5 years full-stack experience", "Strong JavaScript/TypeScript, Node.js or Python, React", "Database experience (PostgreSQL/MySQL)", "Git, CI/CD, cloud (AWS/Azure/GCP) a plus"],
        ["Attractive salary", "Health coverage", "Modern dev tooling, laptop of choice", "Hybrid work option"]
      ) },
      { id: 'it-infra', title: 'Network / Infrastructure Engineer', jd: JD(
        "Design, operate and secure the network and server infrastructure that connects 100+ DVAGO stores.",
        ["Manage SD-WAN, VPN, firewalls and store Wi-Fi", "Operate on-prem and cloud servers (Windows/Linux, VMware, AWS/Azure)", "Monitor uptime, patch systems, run backups", "Plan network capacity for new store openings", "Respond to incidents on-call"],
        ["Bachelor's in CS/Network Engineering; 3-6 years infra experience", "CCNA/CCNP, Azure/AWS cert a plus", "Scripting with PowerShell or Python"],
        ["Senior-level salary with on-call allowance", "Health coverage", "Certification sponsorship"]
      ) },
      { id: 'it-sec', title: 'Cybersecurity Analyst', jd: JD(
        "Protect DVAGO's systems, data and customers from cyber threats.",
        ["Monitor SIEM alerts and investigate security incidents", "Run vulnerability scans and coordinate patching", "Lead phishing awareness and security training", "Review access controls, backups and DR readiness", "Maintain compliance with PCI-DSS and data-protection standards"],
        ["Bachelor's in CS/InfoSec; 2-5 years security experience", "Working knowledge of SIEM, EDR, firewalls, Active Directory", "Security certifications (CEH, Security+, CISSP) a plus"],
        ["Attractive compensation", "Health coverage", "Training and certification budget"]
      ) }
    ],
    'supply-chain': [
      { id: 'sc-main', title: 'Supply Chain Officer', jd: JD(
        "Make sure the right medicine reaches the right DVAGO store at the right time.",
        ["Plan and raise purchase orders based on forecast and stock", "Coordinate warehouse-to-store distribution across Pakistan", "Monitor on-time, in-full (OTIF) delivery performance", "Manage short-dated and recalled stock per SOP", "Partner with suppliers on service and quality"],
        ["Bachelor's in Supply Chain, Business or related field", "2-4 years supply chain experience in retail/pharma", "Strong Excel; SAP/Oracle experience a plus"],
        ["Competitive salary", "Health coverage", "Growth into Senior Supply Chain and Planning roles"]
      ) },
      { id: 'sc-proc', title: 'Procurement Officer', jd: JD(
        "Source and negotiate with suppliers to secure quality, price and reliability for DVAGO.",
        ["Qualify new suppliers; manage existing supplier relationships", "Run RFQs and negotiate contracts, pricing and payment terms", "Track supplier scorecards (quality, OTIF, cost)", "Partner with Finance and QA on supplier compliance"],
        ["Bachelor's degree; 2-4 years procurement experience", "Strong negotiation and analytical skills", "Pharma procurement experience is a strong plus"],
        ["Competitive salary with annual bonus", "Health coverage", "Exposure to senior stakeholders and strategic decisions"]
      ) },
      { id: 'sc-log', title: 'Logistics Coordinator', jd: JD(
        "Run the daily transport and distribution operation across DVAGO's store network.",
        ["Plan daily delivery routes and dispatch to stores", "Coordinate with 3PL partners and own fleet", "Resolve delivery issues and in-transit incidents", "Maintain cold-chain integrity for temperature-sensitive items"],
        ["Bachelor's degree; 1-3 years logistics experience", "Comfortable with route planning tools and WMS/TMS", "Night-shift availability during peak season"],
        ["Competitive salary with shift allowance", "Health coverage", "Fast-track to Logistics Manager"]
      ) }
    ],
    'quality': [
      { id: 'qa-main', title: 'Quality Assurance Officer', jd: JD(
        "Keep every DVAGO store compliant with DRAP, SOPs and the highest patient-safety standards.",
        ["Conduct scheduled and surprise store quality audits", "Monitor cold-chain, FEFO, expired-stock and narcotics compliance", "Lead CAPA for findings and track closure", "Prepare documentation for DRAP inspections", "Train store teams on quality SOPs"],
        ["Pharm-D or Bachelor's in a related field; 2-4 years QA experience", "Working knowledge of DRAP regulations and GDP/GSP", "Willing to travel to stores across Pakistan"],
        ["Competitive salary plus travel allowance", "Health coverage", "Clear growth into Senior QA and Compliance Manager"]
      ) },
      { id: 'qa-comp', title: 'Compliance Officer', jd: JD(
        "Ensure DVAGO meets regulatory, legal and licensing requirements across all operations.",
        ["Maintain DRAP, trade and other operational licences", "Monitor regulatory changes and update SOPs", "Coordinate with legal counsel on contracts and disputes", "Investigate compliance incidents and recommend controls"],
        ["Bachelor's in Law, Pharmacy or Business; 3-5 years compliance experience", "Strong knowledge of Pakistan pharmaceutical regulations", "Excellent writing and stakeholder communication"],
        ["Senior-level salary", "Health coverage", "High-visibility role working with executive leadership"]
      ) }
    ]
  };

  // Mark all defaults so admin UI knows what's seedable
  Object.values(DEFAULT_POSITIONS).forEach((arr) => arr.forEach((p) => { p.isDefault = true; p.isActive = true; }));

  const BANK = { COMPETENCIES, CATEGORIES, ROLES, SECTIONS, REASONING, COMMON_SJT, VOICE_COMMON, DEFAULT_POSITIONS, roleQuestions };
  if (typeof module !== 'undefined' && module.exports) module.exports = BANK;
  else root.DVAGO_BANK = BANK;
})(typeof window !== 'undefined' ? window : globalThis);
