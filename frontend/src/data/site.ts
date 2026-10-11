// Content sourced from the live site https://theachievers.com.np/
// (home + /teachers, fetched Oct 2026). Images in public/teachers/.

export type Teacher = {
  photo: string
  name: string
  subject: string
  credential: string
  qualification: string
  experience: string
  featured?: boolean
}

export const TEACHERS: Teacher[] = [
  { photo: '/teachers/t1.jpg', name: 'Mr. Nirmal Dhami', subject: 'Zoology', credential: 'MBBS Scholar, KUSMS', qualification: 'MBBS Scholar', experience: '2+ years teaching experience', featured: true },
  { photo: '/teachers/t2.jpg', name: 'Prakash Saud', subject: 'Physics', credential: 'JEE Ranker', qualification: 'Bachelor Completed', experience: '4+ years teaching experience', featured: true },
  { photo: '/teachers/t3.jpg', name: 'Divyanshu Thapa', subject: 'Chemistry', credential: 'Founder, IOE Ranker', qualification: 'Masters Running', experience: '6+ years teaching experience', featured: true },
  { photo: '/teachers/t4.jpg', name: 'Gaurav Prasad Bist', subject: 'Mathematics', credential: 'IOE Ranker', qualification: 'Bachelors Complete', experience: '5+ years teaching experience' },
  { photo: '/teachers/t5.jpg', name: 'Niraj Badu', subject: 'Biology', credential: 'SNSC Ranker', qualification: 'Bachelors Complete', experience: '4+ years teaching experience' },
  { photo: '/teachers/t6.jpg', name: 'Dipesh Saud', subject: 'Physics', credential: 'Physics Tutor, B.E. Computer', qualification: 'B.E. Computer', experience: '2+ years teaching experience', featured: true },
  { photo: '/teachers/t7.jpg', name: 'Dipesh Kalouni', subject: 'Chemistry', credential: 'WRC Ranker', qualification: 'Bachelors Complete', experience: '4+ years teaching experience' },
  { photo: '/teachers/t8.jpg', name: 'Birendra Singh Oire', subject: 'Physics & Mathematics', credential: 'SNSC Ranker', qualification: 'Masters Running', experience: '5+ years teaching experience' },
  { photo: '/teachers/t9.jpg', name: 'Chakra Chand', subject: 'Physics', credential: 'MSc Topper', qualification: 'Masters Complete', experience: '6+ years teaching experience' },
  { photo: '/teachers/t10.jpg', name: 'Tikendra Prasad Bist', subject: 'Physics', credential: 'FWU Ranker', qualification: 'Bachelors Complete', experience: '4+ years teaching experience' },
  { photo: '/teachers/t11.jpg', name: 'Kailash Bhatt', subject: 'Mathematics (8, 9, 10)', credential: 'Mathematics Topper', qualification: 'Bachelors Complete', experience: '4+ years teaching experience' },
]

export type Testimonial = { quote: string; name: string; meta: string }

export const TESTIMONIALS: Testimonial[] = [
  { quote: 'The live classes are so interactive — I can clear doubts instantly and the teachers explain every concept until it makes sense. My Physics and Maths improved a lot.', name: 'Aarav Sharma', meta: 'Class 12 · Science' },
  { quote: 'Switching to online tuition with The Achievers was the best decision. The recorded lessons let me revise anytime and the chapterwise notes are perfect before exams.', name: 'Sneha Gurung', meta: 'Class 11 · Science' },
  { quote: 'Accounts and Economics finally make sense. The teachers are patient and the weekly tests kept me consistent through the whole year.', name: 'Bishal Thapa', meta: 'Class 12 · Management' },
  { quote: 'I used to struggle with Chemistry, but the way concepts are taught here — with real examples and practice sets — made it my strongest subject.', name: 'Anjali Shrestha', meta: 'Class 11 · Science' },
  { quote: 'Quality teaching from home with no travel and no wasted time. The doubt-solving sessions before the board exams were a real lifesaver.', name: 'Prakash Adhikari', meta: 'Class 12 · Science' },
  { quote: "As a parent, I love that I can follow my daughter's progress and attendance. The teachers genuinely care about every student.", name: 'Sunita Karki', meta: 'Parent' },
  { quote: 'Affordable, well structured, and the mentors are always available. The mock tests feel exactly like the real NEB exams.', name: 'Rohan Maharjan', meta: 'Class 11 · Science' },
  { quote: 'From Biology diagrams to numerical problems, everything is explained step by step. My confidence for the board exam is so much higher now.', name: 'Pooja Bhandari', meta: 'Class 12 · Science' },
  { quote: 'The notes and practice questions cover the entire syllabus. I scored my best marks ever in the terminal exams this year.', name: 'Kiran Rai', meta: 'Class 12 · Management' },
  { quote: 'Live classes, recorded backups and instant doubt clearing — it feels like having a personal tutor for every subject.', name: 'Manisha Poudel', meta: 'Class 11 · Science' },
]

export type Batch = {
  name: string
  mode: 'ONLINE' | 'PHYSICAL'
  price: number
  was: number
  capacity: number
  taken: number
  refundable: boolean
}

export type Course = {
  slug: string
  title: string
  subtitle: string
  banner: string
  goal: string
  batches: Batch[]
}

// Live catalogue from https://theachievers.com.np/api/courses (Oct 2026).
// Prices in NPR. Title typo "MEDIACAL" corrected per PRD §7.5.
export const COURSES: Course[] = [
  {
    slug: 'see-batch',
    title: 'SEE Batch',
    subtitle: 'Achieve high, work smart',
    banner: '/courses/see.jpg',
    goal: 'SEE',
    batches: [
      { name: 'SEE Online Batch', mode: 'ONLINE', price: 500, was: 700, capacity: 100, taken: 1, refundable: true },
      { name: 'SEE Physical Batch', mode: 'PHYSICAL', price: 800, was: 1000, capacity: 100, taken: 0, refundable: true },
    ],
  },
  {
    slug: 'cee-medical-preparation',
    title: 'CEE Medical Preparation',
    subtitle: "Sudurpaschim's best learning platform",
    banner: '/courses/cee.jpg',
    goal: 'CEE',
    batches: [
      { name: 'Neuron Batch', mode: 'ONLINE', price: 15000, was: 25000, capacity: 100, taken: 2, refundable: false },
      { name: 'Megha Batch', mode: 'PHYSICAL', price: 25000, was: 35000, capacity: 100, taken: 0, refundable: false },
    ],
  },
  {
    slug: 'neb-class-12',
    title: 'NEB Class-12 Tuition (Science)',
    subtitle: 'Prepare for board exams',
    banner: '/courses/class12.jpg',
    goal: 'Class 12',
    batches: [
      { name: 'Karishma 2.O Batch (3 Subjects)', mode: 'ONLINE', price: 9000, was: 10000, capacity: 100, taken: 0, refundable: false },
      { name: 'Karishma Batch (3 Subjects)', mode: 'PHYSICAL', price: 15000, was: 17000, capacity: 100, taken: 0, refundable: false },
    ],
  },
  {
    slug: 'class-11-science',
    title: 'Class-11 Tuition (Science)',
    subtitle: "Sudurpaschim's best learning platform",
    banner: '/courses/class11.jpg',
    goal: 'Class 11',
    batches: [
      { name: 'Sankalpa 2.O Batch (3 Subject)', mode: 'ONLINE', price: 9000, was: 10000, capacity: 100, taken: 1, refundable: false },
      { name: 'Sankalpa Batch (3 Subjects)', mode: 'PHYSICAL', price: 15000, was: 17000, capacity: 100, taken: 0, refundable: false },
    ],
  },
  {
    slug: 'ioe-entrance',
    title: 'IOE Entrance Preparation',
    subtitle: "Nepal's best entrance prep, online & physical",
    banner: '/courses/ioe.jpg',
    goal: 'IOE',
    batches: [
      { name: 'Pragati 2.0 Batch', mode: 'ONLINE', price: 8000, was: 15000, capacity: 100, taken: 1, refundable: false },
      { name: 'Pragati Batch', mode: 'PHYSICAL', price: 15000, was: 25000, capacity: 100, taken: 0, refundable: false },
    ],
  },
]

export const WHATSAPP_NUMBER = 'https://wa.me/9779810686665'

export function whatsappEnquiry(course: string, batch: string) {
  return `${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Namaste! I want to enroll in ${batch} (${course}).`)}`
}

export function whatsappTeacher(name: string) {
  return `${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Namaste! I want to learn from ${name}. Please share batch details.`)}`
}

export type Faq = { q: string; a: string }

export const FAQS: Faq[] = [
  { q: 'Who are the classes for?', a: 'The Achievers offers live online tuition for NEB Class 11 and Class 12 students (Science & Management), plus Medical (CEE) entrance preparation.' },
  { q: 'How do live classes work?', a: 'Classes are streamed live by expert teachers on a fixed weekly schedule. Every class is also recorded, so you can rewatch anytime from the app or website.' },
  { q: 'Are mock tests really free?', a: 'Yes — every enrolled student gets access to free chapterwise and full-length mock tests with instant results and detailed solutions.' },
  { q: 'What payment methods are accepted?', a: 'We accept eSewa, Khalti, Fonepay and major Nepali bank transfers through a secure, encrypted checkout.' },
  { q: 'Can I try before I pay?', a: 'Yes — book a free demo class or explore our free mock tests before enrolling in a paid batch.' },
]
