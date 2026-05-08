// nina-data.jsx — Nina's Pet Salon, Federal Way WA
const SHOP = {
  name: "Nina's Pet Salon",
  city: 'Federal Way, WA',
  address: '1648 S 310th St, Ste 4A',
  phone: '(206) 651-7746',
  email: 'ninaspetsalon@gmail.com',
  hours: [
    { d: 'Mon', open: '7:30am', close: '6:00pm' },
    { d: 'Tue', open: '7:30am', close: '6:00pm' },
    { d: 'Wed', open: '7:30am', close: '6:00pm' },
    { d: 'Thu', open: '7:30am', close: '6:00pm' },
    { d: 'Fri', open: '7:30am', close: '6:00pm' },
    { d: 'Sat', open: '8:00am', close: '4:00pm' },
    { d: 'Sun', open: 'Closed', close: '' },
  ],
  todayDow: 'Wed',
  established: 2017,
};

const CLIENTS = [
  { id: 'c1', name: 'Eleanor Vance',    phone: '(253) 555-0142', email: 'eleanor@vance.studio',   pets: ['p1','p2'], tier: 'Regular', since: '2024-04-12' },
  { id: 'c2', name: 'Marcus Holloway',  phone: '(253) 555-0190', email: 'm.holloway@gmail.com',    pets: ['p3'],      tier: 'Regular', since: '2024-09-02' },
  { id: 'c3', name: 'Iris Bellamy',     phone: '(206) 555-0118', email: 'iris.b@gmail.com',        pets: ['p4','p5'], tier: 'VIP',     since: '2025-01-22' },
  { id: 'c4', name: 'Theodore Asari',   phone: '(425) 555-0133', email: 'theo@asari.io',            pets: ['p6'],      tier: 'Regular', since: '2025-06-08' },
  { id: 'c5', name: 'Camille Yoon',     phone: '(206) 555-0177', email: 'camille@yoon.design',      pets: ['p7'],      tier: 'New',     since: '2026-02-14' },
  { id: 'c6', name: 'Julian Brandt',    phone: '(253) 555-0163', email: 'julian@brandt.law',        pets: ['p8'],      tier: 'Regular', since: '2025-11-03' },
  { id: 'c7', name: 'Wren Okafor',      phone: '(206) 555-0102', email: 'wren@okafor.co',           pets: ['p9'],      tier: 'Regular', since: '2024-08-19' },
];

const PETS = [
  { id: 'p1', name: 'Beatrix',    species: 'dog', breed: 'Standard Poodle',       sex: 'F', dob: '2019-03-11', weight: 48, ownerId: 'c1', allergies: ['Oatmeal shampoo'], lastVisit: '2026-04-18', cadence: 28 },
  { id: 'p2', name: 'Hugo',       species: 'cat', breed: 'Maine Coon',            sex: 'M', dob: '2021-08-04', weight: 17, ownerId: 'c1', allergies: [],                  lastVisit: '2026-03-30', cadence: 56 },
  { id: 'p3', name: 'Atlas',      species: 'dog', breed: 'Bernese Mountain Dog',  sex: 'M', dob: '2020-06-22', weight: 92, ownerId: 'c2', allergies: ['Tea-tree'],        lastVisit: '2026-04-22', cadence: 35 },
  { id: 'p4', name: 'Persephone', species: 'dog', breed: 'Cavalier KC Spaniel',   sex: 'F', dob: '2022-02-14', weight: 16, ownerId: 'c3', allergies: [],                  lastVisit: '2026-04-25', cadence: 21 },
  { id: 'p5', name: 'Orpheus',    species: 'cat', breed: 'British Shorthair',     sex: 'M', dob: '2020-11-09', weight: 13, ownerId: 'c3', allergies: [],                  lastVisit: '2026-02-19', cadence: 70 },
  { id: 'p6', name: 'Saffron',    species: 'dog', breed: 'Vizsla',                sex: 'F', dob: '2021-05-30', weight: 52, ownerId: 'c4', allergies: [],                  lastVisit: '2026-04-10', cadence: 42 },
  { id: 'p7', name: 'Mochi',      species: 'dog', breed: 'Shiba Inu',             sex: 'M', dob: '2023-09-12', weight: 22, ownerId: 'c5', allergies: ['Lavender'],        lastVisit: '2026-04-28', cadence: 28 },
  { id: 'p8', name: 'Margaux',    species: 'dog', breed: 'Wheaten Terrier',       sex: 'F', dob: '2019-12-01', weight: 35, ownerId: 'c6', allergies: [],                  lastVisit: '2026-04-15', cadence: 35 },
  { id: 'p9', name: 'Juno',       species: 'dog', breed: 'Goldendoodle',          sex: 'F', dob: '2022-07-08', weight: 44, ownerId: 'c7', allergies: [],                  lastVisit: '2026-03-12', cadence: 35 },
];

const SERVICES = [
  { id: 's1', name: 'Bath & Brush',        dur: 60,  price: 65 },
  { id: 's2', name: 'Full Groom',          dur: 120, price: 95 },
  { id: 's3', name: 'Puppy First Groom',   dur: 90,  price: 75 },
  { id: 's4', name: 'De-shed Treatment',   dur: 90,  price: 85 },
  { id: 's5', name: 'Cat Bath & Brush',    dur: 75,  price: 70 },
  { id: 's6', name: 'Nail Trim',           dur: 15,  price: 18 },
  { id: 's7', name: 'Teeth Brushing',      dur: 15,  price: 15 },
];

const TODAY = '2026-05-06'; // Wednesday

const APPOINTMENTS = [
  { id: 'a1', date: '2026-05-06', start: '08:00', end: '09:00', petId: 'p4', serviceId: 's1', status: 'completed' },
  { id: 'a2', date: '2026-05-06', start: '09:30', end: '11:30', petId: 'p3', serviceId: 's2', status: 'progress' },
  { id: 'a3', date: '2026-05-06', start: '12:30', end: '14:00', petId: 'p8', serviceId: 's4', status: 'confirmed' },
  { id: 'a4', date: '2026-05-06', start: '14:30', end: '15:30', petId: 'p7', serviceId: 's1', status: 'confirmed' },
  { id: 'a5', date: '2026-05-06', start: '16:00', end: '17:00', petId: 'p9', serviceId: 's1', status: 'upcoming' },
];

// Booking volume buckets — for the overview KPIs / chart
const BOOKINGS = {
  today:    { count: 5,   revenue: 393, max: 6,   trend: '+1' },
  week:     { count: 22,  revenue: 1880, max: 28,  trend: '+8%' },
  month:    { count: 94,  revenue: 7960, max: 120, trend: '+12%' },
  '3month': { count: 268, revenue: 22340, max: 320, trend: '+18%' },
  '6month': { count: 512, revenue: 42180, max: 600, trend: '+22%' },
  year:     { count: 1042, revenue: 86420, max: 1200, trend: '+31%' },
};

// 14-day series for the chart (most recent on right)
const TREND_SERIES = {
  today:    [3,4,5,3,5,6,4,5,3,4,6,5,4,5],
  week:     [16,18,21,19,22,24,22,18,20,23,22,24,21,22],
  month:    [72,78,82,85,88,91,94,89,87,92,90,93,95,94],
  '3month': [220,235,242,250,258,265,272,265,260,268,270,275,278,268],
  '6month': [420,440,458,472,485,498,510,505,500,508,512,520,518,512],
  year:     [820,860,890,920,945,970,995,990,985,1000,1015,1030,1042,1042],
};

const NOTES = [
  { id: 'n1', petId: 'p1', date: '2026-04-18', text: 'Beatrix prefers the lavender-free conditioner. Start dryer on chest first.' },
  { id: 'n2', petId: 'p3', date: '2026-04-22', text: 'Atlas calmer with owner in lounge. Don\u2019t separate during nail trim.' },
  { id: 'n3', petId: 'p8', date: '2026-04-15', text: 'Margaux nipped during paw pad trim — use muzzle proactively.' },
];

const INVOICES = [
  { id: 'INV-2044', clientId: 'c1', petId: 'p1', date: '2026-04-18', total: 110, status: 'paid' },
  { id: 'INV-2045', clientId: 'c2', petId: 'p3', date: '2026-04-22', total: 95,  status: 'paid' },
  { id: 'INV-2046', clientId: 'c3', petId: 'p4', date: '2026-04-25', total: 65,  status: 'paid' },
  { id: 'INV-2047', clientId: 'c5', petId: 'p7', date: '2026-04-28', total: 83,  status: 'unpaid' },
  { id: 'INV-2048', clientId: 'c6', petId: 'p8', date: '2026-04-15', total: 85,  status: 'overdue' },
];

Object.assign(window, { SHOP, CLIENTS, PETS, SERVICES, APPOINTMENTS, NOTES, INVOICES, BOOKINGS, TREND_SERIES, TODAY });
