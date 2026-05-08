// pets-data.jsx — solo-operator data model
// One groomer (you), one calendar, fewer levers.

const SHOP = { name: 'Glasshound', owner: 'Lior Adler', city: 'Brooklyn, NY', established: 2026 };

const CLIENTS = [
  { id: 'c1', name: 'Eleanora Vance', phone: '+1 (212) 555-0142', email: 'eleanora@vance.studio', since: '2024-04-12', tier: 'Regular', pets: ['p1','p2'], note: 'Saturday mornings. Champagne in the lounge.' },
  { id: 'c2', name: 'Marcus Holloway', phone: '+1 (212) 555-0190', email: 'm.holloway@hollowayco.com', since: '2024-09-02', tier: 'Regular', pets: ['p3'], note: 'Calls ahead. Tips in cash.' },
  { id: 'c3', name: 'Iris Bellamy', phone: '+1 (646) 555-0118', email: 'iris.b@gmail.com', since: '2025-01-22', tier: 'VIP', pets: ['p4','p5'], note: 'Standing every-other-Friday booking.' },
  { id: 'c4', name: 'Theodore Asari', phone: '+1 (917) 555-0133', email: 'theo@asari.io', since: '2025-06-08', tier: 'Regular', pets: ['p6'], note: '' },
  { id: 'c5', name: 'Camille Yoon', phone: '+1 (212) 555-0177', email: 'camille@yoon.design', since: '2026-02-14', tier: 'New', pets: ['p7'], note: 'Referral from Eleanora.' },
  { id: 'c6', name: 'Julian Brandt', phone: '+1 (212) 555-0163', email: 'julian@brandt.law', since: '2025-11-03', tier: 'Regular', pets: ['p8'], note: '' },
  { id: 'c7', name: 'Wren Okafor', phone: '+1 (718) 555-0102', email: 'wren@okafor.co', since: '2024-08-19', tier: 'Regular', pets: ['p9'], note: '' },
];

const PETS = [
  { id: 'p1', name: 'Beatrix',     species: 'dog', breed: 'Standard Poodle',           sex: 'F', dob: '2019-03-11', weight: 48, ownerId: 'c1', coat: 'Curly · continental clip', temperament: 'Theatrical, loves the dryer', allergies: ['Oatmeal shampoo'], lastVisit: '2026-04-18', cadence: 28 },
  { id: 'p2', name: 'Hieronymus',  species: 'cat', breed: 'Maine Coon',                sex: 'M', dob: '2021-08-04', weight: 17, ownerId: 'c1', coat: 'Long double coat',         temperament: 'Aloof until brushed',         allergies: [],                  lastVisit: '2026-03-30', cadence: 56 },
  { id: 'p3', name: 'Atlas',       species: 'dog', breed: 'Bernese Mountain Dog',      sex: 'M', dob: '2020-06-22', weight: 92, ownerId: 'c2', coat: 'Long double coat',         temperament: 'Gentle giant',                allergies: ['Tea-tree'],        lastVisit: '2026-04-22', cadence: 35 },
  { id: 'p4', name: 'Persephone',  species: 'dog', breed: 'Cavalier King Charles',     sex: 'F', dob: '2022-02-14', weight: 16, ownerId: 'c3', coat: 'Silky feathered',          temperament: 'Lap-only',                    allergies: [],                  lastVisit: '2026-04-25', cadence: 21 },
  { id: 'p5', name: 'Orpheus',     species: 'cat', breed: 'British Shorthair',         sex: 'M', dob: '2020-11-09', weight: 13, ownerId: 'c3', coat: 'Plush short',              temperament: 'Reserved',                    allergies: [],                  lastVisit: '2026-02-19', cadence: 70 },
  { id: 'p6', name: 'Saffron',     species: 'dog', breed: 'Vizsla',                    sex: 'F', dob: '2021-05-30', weight: 52, ownerId: 'c4', coat: 'Smooth short',             temperament: 'Velcro dog',                  allergies: [],                  lastVisit: '2026-04-10', cadence: 42 },
  { id: 'p7', name: 'Mochi',       species: 'dog', breed: 'Shiba Inu',                 sex: 'M', dob: '2023-09-12', weight: 22, ownerId: 'c5', coat: 'Dense double',             temperament: 'Opinionated',                 allergies: ['Lavender'],        lastVisit: '2026-04-28', cadence: 28 },
  { id: 'p8', name: 'Margaux',     species: 'dog', breed: 'Wheaten Terrier',           sex: 'F', dob: '2019-12-01', weight: 35, ownerId: 'c6', coat: 'Soft silky wave',          temperament: 'Spirited',                    allergies: [],                  lastVisit: '2026-04-15', cadence: 35 },
  { id: 'p9', name: 'Juno',        species: 'dog', breed: 'Goldendoodle',              sex: 'F', dob: '2022-07-08', weight: 44, ownerId: 'c7', coat: 'Curly · soft blend',       temperament: 'Sweet',                       allergies: [],                  lastVisit: '2026-03-12', cadence: 35 },
];

const SERVICES = [
  { id: 's1', name: 'Bath & Brush',          dur: 60,  price: 85,  desc: 'Two-stage hydration bath, blow-out, light brush. Ear & nail finishing.' },
  { id: 's2', name: 'Full Groom',            dur: 120, price: 165, desc: 'Bath, hand-scissor cut, blow-out, sanitary, paw pads, nails, ears.' },
  { id: 's3', name: 'Show Clip · Bespoke',   dur: 180, price: 285, desc: 'Breed-standard or bespoke styling. Includes consultation.' },
  { id: 's4', name: 'De-shed Treatment',     dur: 90,  price: 125, desc: 'Undercoat removal with conditioning rinse.' },
  { id: 's5', name: 'Feline Spa',            dur: 75,  price: 110, desc: 'Low-stress bath, calming room, gentle dry, sanitary trim.' },
  { id: 's6', name: 'Nail trim only',        dur: 15,  price: 22,  desc: 'Quick nails. Walk-in welcome.' },
  { id: 's7', name: 'Teeth polish',          dur: 20,  price: 35,  desc: 'Add-on. Enzymatic clean and freshening rinse.' },
];

// Today is Tuesday 2026-05-05. Solo groomer's realistic day: 4–5 pets.
const APPOINTMENTS = [
  // Yesterday (completed)
  { id: 'a1',  date: '2026-05-04', start: '09:00', end: '11:00', petId: 'p1', serviceId: 's2', status: 'completed', price: 165 },
  { id: 'a2',  date: '2026-05-04', start: '11:30', end: '13:00', petId: 'p7', serviceId: 's1', status: 'completed', price: 85 },
  { id: 'a3',  date: '2026-05-04', start: '14:00', end: '15:30', petId: 'p2', serviceId: 's5', status: 'completed', price: 110 },

  // Today (5/5) — what you're actually doing
  { id: 'a4',  date: '2026-05-05', start: '09:00', end: '10:00', petId: 'p4', serviceId: 's1', status: 'in-progress', price: 85 },
  { id: 'a5',  date: '2026-05-05', start: '10:30', end: '12:30', petId: 'p3', serviceId: 's2', status: 'confirmed', price: 165 },
  { id: 'a6',  date: '2026-05-05', start: '13:30', end: '15:00', petId: 'p8', serviceId: 's4', status: 'confirmed', price: 125 },
  { id: 'a7',  date: '2026-05-05', start: '15:30', end: '16:30', petId: 'p7', serviceId: 's1', status: 'confirmed', price: 85 },

  // Rest of week
  { id: 'a8',  date: '2026-05-06', start: '09:30', end: '11:30', petId: 'p3', serviceId: 's2', status: 'confirmed', price: 165 },
  { id: 'a9',  date: '2026-05-06', start: '13:00', end: '14:30', petId: 'p4', serviceId: 's1', status: 'confirmed', price: 85 },
  { id: 'a10', date: '2026-05-07', start: '11:00', end: '14:00', petId: 'p1', serviceId: 's3', status: 'confirmed', price: 285 },
  { id: 'a11', date: '2026-05-08', start: '10:00', end: '11:15', petId: 'p7', serviceId: 's1', status: 'confirmed', price: 85 },
  { id: 'a12', date: '2026-05-08', start: '14:00', end: '15:00', petId: 'p6', serviceId: 's1', status: 'confirmed', price: 85 },
];

const NOTES = [
  { id: 'n1', petId: 'p1', date: '2026-04-18', tag: 'styling',     text: 'Beatrix prefers the lavender-free conditioner. Start the high-velocity dryer on the chest, not the hindquarters — she tolerates it better.' },
  { id: 'n2', petId: 'p1', date: '2026-03-04', tag: 'medical',     text: 'Small mat behind left ear cleared. Skin healing well from last visit.' },
  { id: 'n3', petId: 'p3', date: '2026-04-22', tag: 'temperament', text: 'Atlas is calmer when his owner waits in the lounge with a tea. Don\u2019t separate during nail trim.' },
  { id: 'n4', petId: 'p7', date: '2026-04-28', tag: 'styling',     text: 'Mochi: leave the tail full. Owner asked for shorter belly only.' },
  { id: 'n5', petId: 'p4', date: '2026-04-25', tag: 'styling',     text: 'Persephone\u2019s ear feathering growing in unevenly \u2014 trim conservatively next visit.' },
  { id: 'n6', petId: 'p8', date: '2026-04-15', tag: 'temperament', text: 'Margaux nipped during paw pad trim. Use the muzzle proactively, not reactively.' },
];

const INVOICES = [
  { id: 'INV-2041', clientId: 'c1', petId: 'p1', date: '2026-04-18', items: [{ desc: 'Full Groom', amount: 165 }, { desc: 'Teeth polish', amount: 35 }], total: 200, status: 'paid', method: 'Card · ••4421' },
  { id: 'INV-2040', clientId: 'c2', petId: 'p3', date: '2026-04-22', items: [{ desc: 'Full Groom', amount: 165 }],                                       total: 165, status: 'paid', method: 'Card · ••8812' },
  { id: 'INV-2039', clientId: 'c3', petId: 'p4', date: '2026-04-25', items: [{ desc: 'Bath & Brush', amount: 85 }],                                     total: 85,  status: 'paid', method: 'Cash' },
  { id: 'INV-2042', clientId: 'c5', petId: 'p7', date: '2026-04-28', items: [{ desc: 'Bath & Brush', amount: 85 }, { desc: 'Nail trim', amount: 22 }],  total: 107, status: 'unpaid', method: '\u2014' },
  { id: 'INV-2043', clientId: 'c6', petId: 'p8', date: '2026-04-15', items: [{ desc: 'De-shed Treatment', amount: 125 }],                               total: 125, status: 'overdue', method: '\u2014' },
  { id: 'INV-2044', clientId: 'c4', petId: 'p6', date: '2026-04-10', items: [{ desc: 'Bath & Brush', amount: 85 }],                                     total: 85,  status: 'paid', method: 'Apple Pay' },
];

// Today = 2026-05-05. cadence is days between visits per pet.
// "Due" means lastVisit + cadence < today; system surfaces these so you don't chase them by hand.
const STATUSES = [
  { key: 'confirmed',    label: 'Confirmed',    tone: 'ink' },
  { key: 'in-progress',  label: 'In progress',  tone: 'sage' },
  { key: 'ready',        label: 'Ready',        tone: 'sage' },
  { key: 'completed',    label: 'Completed',    tone: 'muted' },
  { key: 'no-show',      label: 'No-show',      tone: 'oxblood' },
];

Object.assign(window, { SHOP, CLIENTS, PETS, SERVICES, APPOINTMENTS, NOTES, INVOICES, STATUSES });
