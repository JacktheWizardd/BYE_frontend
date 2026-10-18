// Fictional sample data for the interactive illustrations. These are not real PCC faculty,
// and every illustration on the page is labelled as sample data.

export type Day = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'
export type Review = { date: string; when: string; rating: number; difficulty: number; text: string }
export type Professor = {
  name: string
  rating: number
  difficulty: number
  takeAgain: number
  ratings: number
  summary: string
  reviews: Review[]
}
export type Section = { crn: string; days: Day[] | 'online'; time: string; seats: number; prof: number }

// The one course with full sample data. Its code and title match the real PCC Fall 2026 schedule.
export const course = { code: 'MATH 005A', title: 'Single Variable Calculus I', term: 'Fall 2026' }

export const professors: Professor[] = [
  { name: 'Prof. Elena Marsh', rating: 4.6, difficulty: 2.8, takeAgain: 91, ratings: 38,
    summary: 'Students describe clear explanations, weekly quizzes and fair exams. Several say the practice sets matter and that office hours help before tests.',
    reviews: [
      { date: '2026-09', when: 'Sep 2026', rating: 5, difficulty: 3, text: 'Explains every step on the board and posts the notes after class. Do the practice sets and the exams feel fair.' },
      { date: '2026-05', when: 'May 2026', rating: 4, difficulty: 3, text: 'Weekly quizzes keep you on track. Office hours helped a lot before the midterm.' },
      { date: '2025-12', when: 'Dec 2025', rating: 4, difficulty: 2, text: 'Clear grading and quick replies to email. Homework is online and due Sundays.' },
    ] },
  { name: 'Prof. Daniel Okafor', rating: 4.1, difficulty: 3.2, takeAgain: 80, ratings: 21,
    summary: 'Reviews mention a fast pace and challenging problem sets, balanced by detailed feedback and a curve on the final.',
    reviews: [
      { date: '2026-06', when: 'Jun 2026', rating: 4, difficulty: 4, text: 'Moves quickly, so read ahead. The feedback on homework is really detailed.' },
      { date: '2026-01', when: 'Jan 2026', rating: 5, difficulty: 3, text: 'Makes calculus feel practical. The final was curved.' },
      { date: '2025-10', when: 'Oct 2025', rating: 3, difficulty: 4, text: 'Problem sets take a while. Start them early in the week.' },
    ] },
  { name: 'Prof. Priya Raman', rating: 3.7, difficulty: 3.6, takeAgain: 68, ratings: 54,
    summary: 'Students say the online format is flexible but self-paced, with weekly deadlines and video lectures that are easy to rewatch.',
    reviews: [
      { date: '2026-08', when: 'Aug 2026', rating: 4, difficulty: 3, text: 'Good if you like to rewatch lectures. Weekly deadlines keep you honest.' },
      { date: '2026-03', when: 'Mar 2026', rating: 3, difficulty: 4, text: 'You have to stay on top of it yourself. Replies to questions within a day.' },
      { date: '2025-11', when: 'Nov 2025', rating: 4, difficulty: 4, text: 'Tests are tough but match the practice exams closely.' },
    ] },
]

export const allDays: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
export const startDays: Day[] = ['Tue', 'Thu']

export const sections: Section[] = [
  { crn: '30418', days: ['Tue', 'Thu'], time: '8:00–10:05am', seats: 6, prof: 0 },
  { crn: '30422', days: ['Mon', 'Wed'], time: '11:10am–1:15pm', seats: 12, prof: 1 },
  { crn: '30431', days: 'online', time: 'Any time', seats: 3, prof: 2 },
  { crn: '30447', days: ['Tue', 'Thu'], time: '5:30–7:35pm', seats: 0, prof: 1 },
  { crn: '30455', days: ['Mon', 'Wed'], time: '8:00–10:05am', seats: 9, prof: 0 },
]

// Online sections always show; in-person sections show only when all their days are picked.
export const fits = (s: Section, picked: Day[]) => s.days === 'online' || s.days.every(d => picked.includes(d))

export const professorSorts = ['Highest rated', 'Lowest difficulty', 'Student reviews'] as const
export type ProfessorSort = (typeof professorSorts)[number]
export const sortProfessors = (list: number[], sort: ProfessorSort) => [...list].sort((a, b) => {
  const A = professors[a], B = professors[b]
  return sort === 'Highest rated' ? B.rating - A.rating : sort === 'Lowest difficulty' ? A.difficulty - B.difficulty : B.ratings - A.ratings
})

export const reviewSorts = ['Latest first', 'Oldest first', 'Highest rating', 'Lowest rating', 'Highest difficulty', 'Lowest difficulty'] as const
export type ReviewSort = (typeof reviewSorts)[number]
export const sortReviews = (list: Review[], sort: ReviewSort) => [...list].sort((a, b) => {
  switch (sort) {
    case 'Latest first': return b.date.localeCompare(a.date)
    case 'Oldest first': return a.date.localeCompare(b.date)
    case 'Highest rating': return b.rating - a.rating
    case 'Lowest rating': return a.rating - b.rating
    case 'Highest difficulty': return b.difficulty - a.difficulty
    case 'Lowest difficulty': return a.difficulty - b.difficulty
  }
})
