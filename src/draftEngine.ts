// Draft Day engine: batch-assign a roster of incoming students to pathways
// and aggregate the class-level numbers (credits, tuition savings, and how
// many course sections the school would need to staff).

import {
  COURSE_BY_ID,
  ESTIMATED_TUITION_PER_CREDIT,
  SKILL_PATHS,
  courseCredits,
} from './schoolData';
import type { HighSchoolCourse, SkillPath, YearBucket } from './schoolData';

export interface RosterStudent {
  name: string;
  interest: string;
}

export interface DraftAssignment {
  student: RosterStudent;
  pathId: SkillPath['id'];
  pathName: string;
  matchedByInterest: boolean;
  credits: number;
  savings: number;
}

export interface SeatDemand {
  courseId: string;
  courseName: string;
  courseType: HighSchoolCourse['type'];
  grade: YearBucket;
  students: number;
  sections: number;
}

export interface DraftResult {
  assignments: DraftAssignment[];
  totals: {
    students: number;
    credits: number;
    savings: number;
    avgCredits: number;
  };
  pathwayCounts: Record<SkillPath['id'], number>;
  seatDemand: SeatDemand[];
  sectionSize: number;
}

// Maps a free-text career interest to a pathway. Order matters: first hit wins.
const INTEREST_RULES: Array<{ re: RegExp; pathId: SkillPath['id'] }> = [
  { re: /comput|software|cod(e|ing)|program|game|robot|engineer|tech|math|physic|cyber/i, pathId: 'tech' },
  { re: /health|med|nurs|doctor|dent|bio|emt|paramedic|anatomy|vet|therap/i, pathId: 'health' },
  { re: /law|legal|police|justice|criminal|history|gov|politic|teach|social|psych|geograph/i, pathId: 'social' },
  { re: /business|entrepreneur|market|account|financ|money|manag|sales|econ|art|music|theat|drama|design|writ|spanish|language/i, pathId: 'business' },
];

export function matchInterest(interest: string): SkillPath['id'] | null {
  const text = interest.trim();
  if (!text) return null;
  for (const { re, pathId } of INTEREST_RULES) {
    if (re.test(text)) return pathId;
  }
  return null;
}

function pathCredits(path: SkillPath): number {
  const courseIds = [...path.schedule.grade10, ...path.schedule.grade11, ...path.schedule.grade12];
  return courseIds.reduce((sum, id) => {
    const course = COURSE_BY_ID.get(id);
    return sum + (course ? courseCredits(course) : 0);
  }, 0);
}

export function runDraft(students: RosterStudent[], sectionSize = 30): DraftResult {
  const counts: Record<SkillPath['id'], number> = { tech: 0, health: 0, business: 0, social: 0 };
  const creditsByPath = new Map(SKILL_PATHS.map((p) => [p.id, pathCredits(p)]));
  const pathById = new Map(SKILL_PATHS.map((p) => [p.id, p]));

  const assignments: DraftAssignment[] = students.map((student) => {
    let pathId = matchInterest(student.interest);
    const matchedByInterest = pathId !== null;
    if (!pathId) {
      // No interest signal: draft onto the pathway with the fewest picks so
      // the class stays balanced (ties resolve in SKILL_PATHS order).
      pathId = SKILL_PATHS.reduce((min, p) => (counts[p.id] < counts[min] ? p.id : min), SKILL_PATHS[0].id);
    }
    counts[pathId] += 1;
    const credits = creditsByPath.get(pathId) ?? 0;
    return {
      student,
      pathId,
      pathName: pathById.get(pathId)?.name ?? pathId,
      matchedByInterest,
      credits,
      savings: credits * ESTIMATED_TUITION_PER_CREDIT,
    };
  });

  const seatMap = new Map<string, SeatDemand>();
  for (const path of SKILL_PATHS) {
    const enrolled = counts[path.id];
    if (enrolled === 0) continue;
    for (const grade of ['grade10', 'grade11', 'grade12'] as YearBucket[]) {
      for (const courseId of path.schedule[grade]) {
        const course = COURSE_BY_ID.get(courseId);
        if (!course) continue;
        const key = `${courseId}|${grade}`;
        const entry = seatMap.get(key) ?? {
          courseId,
          courseName: course.name,
          courseType: course.type,
          grade,
          students: 0,
          sections: 0,
        };
        entry.students += enrolled;
        seatMap.set(key, entry);
      }
    }
  }
  const seatDemand = [...seatMap.values()]
    .map((d) => ({ ...d, sections: Math.ceil(d.students / sectionSize) }))
    .sort((a, b) => b.students - a.students);

  const totalCredits = assignments.reduce((sum, a) => sum + a.credits, 0);
  return {
    assignments,
    totals: {
      students: assignments.length,
      credits: totalCredits,
      savings: totalCredits * ESTIMATED_TUITION_PER_CREDIT,
      avgCredits: assignments.length ? Math.round((totalCredits / assignments.length) * 10) / 10 : 0,
    },
    pathwayCounts: counts,
    seatDemand,
    sectionSize,
  };
}

// --- Roster CSV parsing ---------------------------------------------------

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some((f) => f.trim() !== '')) rows.push(row);
  }
  return rows;
}

const NAME_HEADERS = ['name', 'student', 'student_name', 'full_name'];
const FIRST_HEADERS = ['first', 'first_name', 'firstname', 'given_name'];
const LAST_HEADERS = ['last', 'last_name', 'lastname', 'surname'];
const INTEREST_HEADERS = ['interest', 'interests', 'career_interest', 'career', 'pathway', 'pathway_interest', 'goal'];

export interface RosterParseResult {
  students: RosterStudent[];
  error?: string;
}

export function parseRosterCsv(text: string): RosterParseResult {
  const rows = parseCsvRows(text);
  if (rows.length < 2) {
    return { students: [], error: 'The file needs a header row plus at least one student row.' };
  }
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const col = (names: string[]) => header.findIndex((h) => names.includes(h));

  const nameCol = col(NAME_HEADERS);
  const firstCol = col(FIRST_HEADERS);
  const lastCol = col(LAST_HEADERS);
  const interestCol = col(INTEREST_HEADERS);

  if (nameCol === -1 && firstCol === -1) {
    return {
      students: [],
      error: `Couldn't find a name column. Include a "name" column (or "first_name"/"last_name"). Found: ${header.join(', ')}`,
    };
  }

  const students: RosterStudent[] = [];
  for (const row of rows.slice(1)) {
    const name =
      nameCol !== -1
        ? (row[nameCol] ?? '').trim()
        : [row[firstCol], lastCol !== -1 ? row[lastCol] : '']
            .map((s) => (s ?? '').trim())
            .filter(Boolean)
            .join(' ');
    if (!name) continue;
    students.push({ name, interest: interestCol !== -1 ? (row[interestCol] ?? '').trim() : '' });
  }
  if (students.length === 0) return { students, error: 'No student rows found under the header.' };
  return { students };
}

// --- Sample roster ---------------------------------------------------------

const SAMPLE_FIRST = ['Aiden', 'Sofia', 'Liam', 'Maya', 'Noah', 'Isabella', 'Ethan', 'Aaliyah', 'Lucas', 'Emma', 'Mateo', 'Olivia', 'James', 'Camila', 'Benjamin', 'Zoe', 'Elijah', 'Harper', 'Daniel', 'Layla', 'Jackson', 'Nora', 'Sebastian', 'Ruby', 'Carter', 'Ava', 'Gabriel', 'Penelope', 'Owen', 'Naomi', 'Xavier', 'Lily'];
const SAMPLE_LAST = ['Martinez', 'Johnson', 'Nguyen', 'Smith', 'Garcia', 'Brown', 'Kim', 'Davis', 'Lopez', 'Miller', 'Hernandez', 'Wilson', 'Chen', 'Anderson', 'Patel', 'Taylor', 'Ramirez', 'Thomas', 'Okafor', 'Moore', 'Singh', 'Jackson', 'Flores', 'White', 'Ali', 'Harris', 'Torres', 'Clark', 'Ivanov', 'Lewis'];
const SAMPLE_INTERESTS = [
  'video games', 'nursing', 'law enforcement', 'business', 'art', 'history',
  'computers', 'sports medicine', 'engineering', 'teaching', 'music',
  'psychology', 'marketing', 'coding', 'medicine', 'criminal justice',
  '', '', '', 'undecided', 'not sure', '',
];

// Deterministic PRNG so the same sample roster renders on every demo.
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSampleRoster(count = 300, seed = 2030): RosterStudent[] {
  const rand = mulberry32(seed);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  return Array.from({ length: count }, () => ({
    name: `${pick(SAMPLE_FIRST)} ${pick(SAMPLE_LAST)}`,
    interest: pick(SAMPLE_INTERESTS),
  }));
}

export function rosterTemplateCsv(): string {
  const rows = generateSampleRoster(8, 7)
    .map((s) => `${s.name.split(' ')[0]},${s.name.split(' ')[1]},${s.interest}`)
    .join('\n');
  return `first_name,last_name,interest\n${rows}\n`;
}

export function assignmentsToCsv(result: DraftResult): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = ['student,interest,pathway,matched_by_interest,college_credits,estimated_tuition_savings'];
  for (const a of result.assignments) {
    lines.push(
      [a.student.name, a.student.interest, a.pathName, a.matchedByInterest ? 'yes' : 'no', a.credits, a.savings]
        .map(esc)
        .join(','),
    );
  }
  return lines.join('\n') + '\n';
}
