import React, { useState, useMemo, useEffect } from 'react';
import { Zap, Heart, Briefcase, CheckCircle, Circle, BookOpen, GraduationCap, Plus, AlertTriangle, School, Award, ChevronDown, ChevronUp, Search, List, Globe, Mail, User, Clock, Upload, Download, X } from 'lucide-react';

// --- DATA STRUCTURES ---

interface WSUCourse {
  wsuCode: string; // e.g., 'ENG 1010'
  credits: number; // e.g., 3
}

interface HighSchoolCourse {
  id: string;
  name: string;
  type: 'CE' | 'AP' | 'IB' | 'ADDITIONAL';
  wsuEquivalent: WSUCourse[];
  genEdCategory?: GenEdCategory;
  culturalCompetence?: boolean;
  category: string; // For grouping in the catalog
}

type GenEdCategory =
  | 'English 1'
  | 'English 2'
  | 'Quantitative Literacy'
  | 'Humanities'
  | 'American Institutions'
  | 'Creative Arts'
  | 'Social Sciences'
  | 'Life Sciences'
  | 'Physical Sciences';

interface YearlySchedule {
  grade10: string[];
  grade11: string[];
  grade12: string[];
}

type YearBucket = keyof YearlySchedule;

interface PathAssignments extends YearlySchedule {
  pool: string[];
}

interface SkillPath {
  id: 'tech' | 'health' | 'business' | 'social';
  name: string;
  icon: React.ElementType;
  description: string;
  schedule: YearlySchedule;
  recommendedElectives: string[]; // Extra classes to reach 60 credits
}

interface Counselor {
  name: string;
  role: string;
  email: string;
  assignment?: string; // e.g. "A-Di"
}

interface ImporterFlowStage {
  title: string;
  detail: string;
  hint: string;
  icon: React.ElementType;
}

interface ImporterPathwayRoleCard {
  pathway: string;
  csvSignal: string;
  classes: string;
  roles: string;
  toneClass: string;
}

// --- DATA BASED ON PDF CONTENT ---

const COUNSELORS: Counselor[] = [
  { name: 'Ty Harlan', role: 'Ogden High Counselor', email: 'harlant@ogdensd.org', assignment: 'Last Names: A-Di' },
  { name: 'Mark Allen', role: 'Ogden High Counselor', email: 'allenm@ogdensd.org', assignment: 'Last Names: Do-Lee' },
  { name: 'Amy Green', role: 'Ogden High Counselor', email: 'greena@ogdensd.org', assignment: 'Last Names: Lei-Ri' },
  { name: 'Catherine Sanchez', role: 'Ogden High Counselor', email: 'sanchezc@ogdensd.org', assignment: 'Last Names: Ro-Z' },
  { name: 'Jacqueline Perez', role: 'Weber State Academic Advisor', email: 'jacquelineperez@weber.edu' },
];

const ALL_COURSES: HighSchoolCourse[] = [
  // --- ENGLISH ---
  { id: 'CE_ENG_1010', name: 'English 1010 CE', type: 'CE', wsuEquivalent: [{ wsuCode: 'ENG 1010', credits: 3 }], genEdCategory: 'English 1', category: 'English' },
  { id: 'IB_ENG_1010', name: 'IB English (Jr & Sr Year)', type: 'IB', wsuEquivalent: [{ wsuCode: 'ENG 1010', credits: 3 }, { wsuCode: 'ENG 2200', credits: 3 }], genEdCategory: 'English 1', culturalCompetence: true, category: 'English' },
  { id: 'CE_ENG_2015', name: 'English 2015 CE', type: 'CE', wsuEquivalent: [{ wsuCode: 'ENG 2015', credits: 3 }], genEdCategory: 'English 2', category: 'English' },
  { id: 'AP_ENG_LANG', name: 'AP English Lang & Comp', type: 'AP', wsuEquivalent: [{ wsuCode: 'ENG 1010', credits: 3 }], genEdCategory: 'English 1', category: 'English' },
  { id: 'AP_SEMINAR', name: 'AP Seminar', type: 'AP', wsuEquivalent: [{ wsuCode: 'ENG 2010 Credit', credits: 3 }], genEdCategory: 'English 2', category: 'English' },

  // --- MATH ---
  { id: 'STAT_1040', name: 'STAT 1040', type: 'CE', wsuEquivalent: [{ wsuCode: 'STAT 1040', credits: 3 }], genEdCategory: 'Quantitative Literacy', category: 'Math' },
  { id: 'CE_MATH_1035', name: 'CE Math 1035 (Pre-Calc I)', type: 'CE', wsuEquivalent: [{ wsuCode: 'MATH 1035', credits: 6 }], genEdCategory: 'Quantitative Literacy', category: 'Math' },
  { id: 'CE_MATH_1050', name: 'CE Math 1050 (College Algebra)', type: 'CE', wsuEquivalent: [{ wsuCode: 'MATH 1050', credits: 4 }], genEdCategory: 'Quantitative Literacy', category: 'Math' },
  { id: 'AP_CALC_AB', name: 'AP Calc AB', type: 'AP', wsuEquivalent: [{ wsuCode: 'MATH 1050', credits: 4 }, { wsuCode: 'MATH 1060', credits: 4 }], genEdCategory: 'Quantitative Literacy', category: 'Math' },
  { id: 'AP_CALC_BC', name: 'AP Calc BC', type: 'AP', wsuEquivalent: [{ wsuCode: 'MATH 1210', credits: 4 }, { wsuCode: 'MATH 1220', credits: 4 }], genEdCategory: 'Quantitative Literacy', category: 'Math' },
  { id: 'IB_MATH_AI', name: 'IB Math AI', type: 'IB', wsuEquivalent: [{ wsuCode: 'MATH 1035', credits: 4 }], genEdCategory: 'Quantitative Literacy', category: 'Math' },

  // --- HUMANITIES ---
  { id: 'CE_COMM_2110', name: 'CE Comm 2110', type: 'CE', wsuEquivalent: [{ wsuCode: 'COMM 2110', credits: 3 }], genEdCategory: 'Humanities', category: 'Humanities' },
  { id: 'AP_SPANISH', name: 'AP Spanish', type: 'AP', wsuEquivalent: [{ wsuCode: 'SPAN 2020', credits: 3 }], genEdCategory: 'Humanities', category: 'Humanities' },
  
  // --- AMERICAN INSTITUTIONS ---
  { id: 'AP_US_HIST', name: 'AP U.S. History', type: 'AP', wsuEquivalent: [{ wsuCode: 'HIST 1700', credits: 3 }], genEdCategory: 'American Institutions', category: 'Social Studies' },
  { id: 'CE_US_HIST', name: 'CE U.S. History', type: 'CE', wsuEquivalent: [{ wsuCode: 'HIST 1700', credits: 3 }], genEdCategory: 'American Institutions', category: 'Social Studies' },
  { id: 'AP_US_GOV', name: 'AP U.S. Gov', type: 'AP', wsuEquivalent: [{ wsuCode: 'POLS 1100', credits: 3 }], genEdCategory: 'American Institutions', category: 'Social Studies' },

  // --- CREATIVE ARTS ---
  { id: 'CE_MUSIC', name: 'CE Exploring Music', type: 'CE', wsuEquivalent: [{ wsuCode: 'MUS 1010', credits: 3 }], genEdCategory: 'Creative Arts', category: 'Arts' },
  { id: 'AP_DRAWING', name: 'AP Drawing', type: 'AP', wsuEquivalent: [{ wsuCode: 'ART 1010', credits: 3 }], genEdCategory: 'Creative Arts', category: 'Arts' },
  { id: 'IB_THEATRE', name: 'IB Theatre', type: 'IB', wsuEquivalent: [{ wsuCode: 'THEA 1013', credits: 3 }], genEdCategory: 'Creative Arts', category: 'Arts' },
  { id: 'IB_ART', name: 'IB Art', type: 'IB', wsuEquivalent: [{ wsuCode: 'ART 1010', credits: 3 }, { wsuCode: 'Elective', credits: 3 }], genEdCategory: 'Creative Arts', category: 'Arts' },
  { id: 'AP_2D_ART', name: 'AP 2D Art', type: 'AP', wsuEquivalent: [{ wsuCode: 'ART 1120', credits: 3 }], category: 'Arts' },
  { id: 'AP_3D_ART', name: 'AP 3D Art', type: 'AP', wsuEquivalent: [{ wsuCode: 'ART 1130', credits: 3 }], category: 'Arts' },

  // --- SOCIAL SCIENCES ---
  { id: 'AP_GEOGRAPHY', name: 'AP Geography', type: 'AP', wsuEquivalent: [{ wsuCode: 'GEO 1300', credits: 3 }], genEdCategory: 'Social Sciences', culturalCompetence: true, category: 'Social Studies' },
  { id: 'AP_WORLD_HIST', name: 'AP World History', type: 'AP', wsuEquivalent: [{ wsuCode: 'HIST 1510', credits: 3 }], genEdCategory: 'Social Sciences', culturalCompetence: true, category: 'Social Studies' },
  { id: 'IB_ECON', name: 'IB Economics', type: 'IB', wsuEquivalent: [{ wsuCode: 'ECON 1010', credits: 3 }], genEdCategory: 'Social Sciences', category: 'Social Studies' },
  { id: 'CE_CJ_1010', name: 'CE Crim. Justice 1010', type: 'CE', wsuEquivalent: [{ wsuCode: 'CJ 1010', credits: 3 }], genEdCategory: 'Social Sciences', category: 'Social Studies' },
  { id: 'AP_MICRO', name: 'AP Microeconomics', type: 'AP', wsuEquivalent: [{ wsuCode: 'ECON 2010', credits: 3 }], genEdCategory: 'Social Sciences', category: 'Social Studies' },
  { id: 'AP_MACRO', name: 'AP Macroeconomics', type: 'AP', wsuEquivalent: [{ wsuCode: 'ECON 2020', credits: 3 }], genEdCategory: 'Social Sciences', category: 'Social Studies' },
  { id: 'AP_COMP_GOV', name: 'AP Comp Gov', type: 'AP', wsuEquivalent: [{ wsuCode: 'GOV 2200', credits: 3 }], genEdCategory: 'Social Sciences', category: 'Social Studies' },

  // --- LIFE SCIENCES ---
  { id: 'CE_CHEM_1010', name: 'CE Chemistry 1010', type: 'CE', wsuEquivalent: [{ wsuCode: 'CHEM 1010', credits: 5 }], genEdCategory: 'Life Sciences', category: 'Science' },
  { id: 'AP_BIOLOGY', name: 'AP Biology', type: 'AP', wsuEquivalent: [{ wsuCode: 'ZOOL 1010', credits: 5 }, { wsuCode: 'ZOOL 1610', credits: 5 }], genEdCategory: 'Life Sciences', category: 'Science' },

  // --- PHYSICAL SCIENCES ---
  { id: 'CE_NUTRITION', name: 'CE Nutrition', type: 'CE', wsuEquivalent: [{ wsuCode: 'NUTR 1020', credits: 3 }], genEdCategory: 'Physical Sciences', category: 'Science' },
  { id: 'AP_PHYSICS', name: 'AP Physics', type: 'AP', wsuEquivalent: [{ wsuCode: 'PHSY 1010', credits: 3 }, { wsuCode: 'PHSY 1015', credits: 3 }], genEdCategory: 'Physical Sciences', category: 'Science' },
  { id: 'AP_ENVIRO', name: 'AP Enviro Science', type: 'AP', wsuEquivalent: [{ wsuCode: 'BTNY 1403', credits: 3 }], genEdCategory: 'Physical Sciences', category: 'Science' },

  // --- CTE / AUTO / TECH ---
  { id: 'CS_1030', name: 'CS Principles (CS 1030)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'CS 1030', credits: 4 }], category: 'Tech' },
  { id: 'CS_1400', name: 'Comp Prog 2 (CS 1400)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'CS 1400', credits: 4 }], category: 'Tech' },
  { id: 'CS_1410', name: 'Adv Comp Prog (CS 1410)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'CS 1410', credits: 4 }], category: 'Tech' },
  { id: 'CS_2420', name: 'Algorithms (CS 2420)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'CS 2420', credits: 4 }], category: 'Tech' },
  { id: 'WEB_1400', name: 'Web Dev 1 (WEB 1400)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'WEB 1400', credits: 3 }], category: 'Tech' },
  { id: 'WEB_2350', name: 'Web Dev 2 (WEB 2350)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'WEB 2350', credits: 4 }], category: 'Tech' },
  { id: 'ENGR_1000', name: 'Principles of Eng (ENGR 1000)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'ENGR 1000', credits: 2 }], category: 'Tech' },
  { id: 'PDD_2830', name: 'Eng Design (PDD 2830)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'PDD 2830', credits: 3 }], category: 'Tech' },
  { id: 'ARCH_1040', name: 'CAD Arch 1 (ARCH 1040)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'ARCH 1040', credits: 3 }], category: 'Tech' },
  { id: 'ARCH_1350', name: 'Civil Engineering', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'ARCH 1350', credits: 4 }, { wsuCode: 'CM 2360', credits: 3 }], category: 'Tech' },
  
  { id: 'AUTO_1000', name: 'Intro to Auto (AUSV 1000)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'AUSV 1000', credits: 2 }], category: 'Auto' },
  { id: 'AUTO_1021', name: 'Steering (AUSV 1021)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'AUSV 1021', credits: 2 }], category: 'Auto' },
  { id: 'AUTO_1022', name: 'Brakes (AUSV 1022)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'AUSV 1022', credits: 2 }], category: 'Auto' },
  { id: 'AUTO_1120', name: 'Engine Perf (AUSV 1120)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'AUSV 1120', credits: 2 }], category: 'Auto' },
  { id: 'AUTO_1320', name: 'Electrical (AUSV 1320)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'AUSV 1320', credits: 2 }], category: 'Auto' },

  // --- HEALTH ---
  { id: 'HTHS_1101', name: 'Med Terminology (HTHS 1101)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'HTHS 1101', credits: 2 }], category: 'Health' },
  { id: 'HTHS_1104', name: 'Med Anatomy (HTHS 1104)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'HTHS 1104', credits: 3 }], category: 'Health' },
  { id: 'RHS_2175', name: 'Sports Med (RHS 2175)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'RHS 2175', credits: 3 }], category: 'Health' },
  { id: 'RHS_2300', name: 'EMS (RHS 2300)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'RHS 2300', credits: 3 }], category: 'Health' },
  { id: 'HTHS_2910', name: 'Med Scholars (HTHS 2910)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'HTHS 2910', credits: 4 }], category: 'Health' },

  // --- BUSINESS / LANG / OTHER ---
  { id: 'ENTR_1000', name: 'Entrepreneurship', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'ENTR 1000', credits: 3 }], category: 'Business' },
  { id: 'BSAD_1010', name: 'Business Mgmt', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'BSAD 1010', credits: 3 }], category: 'Business' },
  { id: 'WEB_1700', name: 'Bus Office Spec (WEB 1700)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'WEB 1700', credits: 3 }], category: 'Business' },
  { id: 'EDUC_1010', name: 'Intro to Education', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'EDUC 1010', credits: 3 }], category: 'Business' },
  { id: 'EDUC_2800', name: 'Education (EDUC 2800)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'EDUC 2800', credits: 3 }], category: 'Business' },
  { id: 'AVID_12', name: 'AVID 12 (FYE 1105)', type: 'ADDITIONAL', wsuEquivalent: [{ wsuCode: 'FYE 1105', credits: 3 }], category: 'General' },
  { id: 'IB_SPAN_SL', name: 'IB Spanish SL', type: 'IB', wsuEquivalent: [{ wsuCode: 'SPAN 1010/1020', credits: 6 }], category: 'Lang' },
  { id: 'IB_SPAN_HL', name: 'IB Spanish HL', type: 'IB', wsuEquivalent: [{ wsuCode: 'SPAN 2010', credits: 9 }], category: 'Lang' },
  { id: 'SPAN_3118', name: 'Spanish 3118', type: 'CE', wsuEquivalent: [{ wsuCode: 'SPAN 3118', credits: 3 }], category: 'Lang' },
];

const SKILL_PATHS: SkillPath[] = [
  {
    id: 'tech',
    name: 'Technology & Engineering',
    icon: Zap,
    description: 'Software, Engineering, Physics',
    schedule: {
      grade10: ['CS_1030', 'WEB_1400', 'AP_GEOGRAPHY'], 
      grade11: ['CS_1400', 'CE_MATH_1050', 'CE_CHEM_1010', 'CE_ENG_1010'], 
      grade12: ['CS_1410', 'AP_CALC_AB', 'AP_PHYSICS', 'CE_ENG_2015', 'CE_COMM_2110'], 
    },
    recommendedElectives: ['WEB_2350', 'ENGR_1000', 'CS_2420', 'CE_MUSIC', 'AUTO_1000'],
  },
  {
    id: 'health',
    name: 'Health Sciences',
    icon: Heart,
    description: 'Medical, Nursing, Biology',
    schedule: {
      grade10: ['HTHS_1101', 'CE_NUTRITION', 'AP_GEOGRAPHY'],
      grade11: ['HTHS_1104', 'CE_MATH_1035', 'CE_CHEM_1010', 'CE_ENG_1010'], 
      grade12: ['AP_BIOLOGY', 'RHS_2300', 'CE_ENG_2015', 'AP_US_GOV'],
    },
    recommendedElectives: ['RHS_2175', 'STAT_1040', 'CE_CJ_1010', 'HTHS_2910'],
  },
  {
    id: 'business',
    name: 'Business & Humanities',
    icon: Briefcase,
    description: 'Business, Law, Liberal Arts',
    schedule: {
      grade10: ['WEB_1700', 'ENTR_1000', 'AP_GEOGRAPHY'], 
      grade11: ['BSAD_1010', 'STAT_1040', 'CE_ENG_1010', 'AP_US_HIST'],
      grade12: ['IB_ECON', 'CE_COMM_2110', 'CE_ENG_2015', 'AP_US_GOV'],
    },
    recommendedElectives: ['AP_SPANISH', 'AP_US_GOV', 'AP_DRAWING', 'AP_MICRO', 'AVID_12', 'EDUC_1010'],
  },
  {
    id: 'social',
    name: 'Social Studies & Law',
    icon: Globe,
    description: 'History, Government, Criminal Justice',
    schedule: {
      grade10: ['AP_GEOGRAPHY', 'CE_CJ_1010', 'WEB_1700'], 
      grade11: ['AP_US_HIST', 'STAT_1040', 'CE_ENG_1010', 'IB_ECON'],
      grade12: ['AP_US_GOV', 'AP_MICRO', 'CE_COMM_2110', 'AP_COMP_GOV'], 
    },
    recommendedElectives: ['AP_GEOGRAPHY', 'IB_SPAN_SL', 'EDUC_1010', 'CE_MUSIC', 'AP_MICRO'],
  },
];

const REQUIRED_CATEGORIES: GenEdCategory[] = [
  'English 1', 'English 2', 'Quantitative Literacy', 'Humanities', 
  'American Institutions', 'Creative Arts', 'Social Sciences', 
  'Life Sciences', 'Physical Sciences'
];

const REQUIRED_IMPORT_COLUMNS = [
  'pathway_code',
  'pathway_name',
  'course_code',
  'course_name',
  'credit_hours',
  'course_type',
  'year_level',
  'placement',
];

const IMPORTER_FLOW_STAGES: ImporterFlowStage[] = [
  {
    title: '1. CSV Rows',
    detail: 'Each row represents one class placement for a pathway and grade level.',
    hint: 'Key fields: pathway_code, course_code, year_level, placement',
    icon: Upload,
  },
  {
    title: '2. Planner Build',
    detail: 'The importer groups rows into pathway plans and class sequences.',
    hint: 'Output: required vs elective placement by grade',
    icon: School,
  },
  {
    title: '3. Counselor View',
    detail: 'Counselors use the plan to guide family meetings and schedule choices.',
    hint: 'Output: credits, categories, and career talking points',
    icon: Briefcase,
  },
];

const IMPORTER_PATHWAY_ROLE_CARDS: ImporterPathwayRoleCard[] = [
  {
    pathway: 'Technology & Engineering',
    csvSignal: 'pathway_code = tech',
    classes: 'CS 1400, AP Calc AB, AP Physics',
    roles: 'Software Developer, Design Engineer',
    toneClass: 'border-sky-200 bg-sky-50',
  },
  {
    pathway: 'Health Sciences',
    csvSignal: 'pathway_code = health',
    classes: 'HTHS 1104, AP Biology, RHS 2300',
    roles: 'Nurse, EMS, Medical Assistant',
    toneClass: 'border-emerald-200 bg-emerald-50',
  },
  {
    pathway: 'Business & Humanities',
    csvSignal: 'pathway_code = business',
    classes: 'BSAD 1010, ENTR 1000, CE Comm 2110',
    roles: 'Entrepreneur, Project Coordinator',
    toneClass: 'border-amber-200 bg-amber-50',
  },
  {
    pathway: 'Social Studies & Law',
    csvSignal: 'pathway_code = social',
    classes: 'AP US Hist, CE CJ 1010, AP US Gov',
    roles: 'Public Service, Legal Support',
    toneClass: 'border-teal-200 bg-teal-50',
  },
];

const IMPORTER_QUICK_START_STEPS = [
  {
    title: 'Download the template',
    detail: 'Start with the template file so all required columns are already in place.',
  },
  {
    title: 'Fill in your school data',
    detail: 'Update rows in Excel or Google Sheets, then save as CSV UTF-8 format.',
  },
  {
    title: 'Upload and confirm',
    detail: 'Use Choose File and look for the green confirmation box after upload.',
  },
];

const IMPORTER_TROUBLESHOOTING_TIPS = [
  'If clicking seems unresponsive, click once and wait 2 seconds before trying again.',
  'If this feels like schedule-change week, take a breath, save once, and re-upload once.',
  'If upload fails, re-download the template and copy your data into it before retrying.',
];

const ESTIMATED_TUITION_PER_CREDIT = 120;

const COUNSELOR_SETUP_STEPS = [
  { id: 'import', label: 'Import school CSV template and validate required columns' },
  { id: 'pathway', label: 'Choose pathway and place classes into Grade 10-12' },
  { id: 'review', label: 'Review credits, residency, and Gen Ed coverage' },
  { id: 'meeting', label: 'Use talking points to run student + parent signup meeting' },
];

const YEAR_LABELS: Record<YearBucket, string> = {
  grade10: 'Grade 10',
  grade11: 'Grade 11',
  grade12: 'Grade 12',
};

const buildInitialAssignments = (path: SkillPath): PathAssignments => {
  const requiredIds = new Set([
    ...path.schedule.grade10,
    ...path.schedule.grade11,
    ...path.schedule.grade12,
  ]);
  const pool = Array.from(new Set(path.recommendedElectives)).filter((id) => !requiredIds.has(id));

  return {
    grade10: [...path.schedule.grade10],
    grade11: [...path.schedule.grade11],
    grade12: [...path.schedule.grade12],
    pool,
  };
};

const buildInitialAssignmentMap = (): Record<SkillPath['id'], PathAssignments> =>
  SKILL_PATHS.reduce((acc, path) => {
    acc[path.id] = buildInitialAssignments(path);
    return acc;
  }, {} as Record<SkillPath['id'], PathAssignments>);

type ImportStatus =
  | { state: 'idle' }
  | { state: 'ok'; fileName: string; rowCount: number }
  | { state: 'error'; fileName: string; message: string; missing?: string[] };

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

// --- COMPONENTS ---

// Tooltip Component for Header Info
const Tooltip: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative inline-block">
      <button 
        className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-orange-100 px-3 py-2 rounded-lg transition-colors text-sm font-medium border border-white/10"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
      >
        {icon}
        <span>{title}</span>
      </button>
      
      {isOpen && (
        <div className="absolute z-50 top-full mt-2 left-0 w-72 p-4 bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-100 text-sm animate-in fade-in zoom-in-95 duration-200">
           {children}
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [selectedPathId, setSelectedPathId] = useState<SkillPath['id']>('tech');
  const [showFullCatalog, setShowFullCatalog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [unpassedExamCourseIds, setUnpassedExamCourseIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('unpassed_exam_course_ids');
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [importStatus, setImportStatus] = useState<ImportStatus>({ state: 'idle' });
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [pathAssignments, setPathAssignments] = useState<Record<SkillPath['id'], PathAssignments>>(
    () => buildInitialAssignmentMap()
  );
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [draggedCourseId, setDraggedCourseId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<YearBucket | 'pool' | null>(null);
  const [completedSetupStepIds, setCompletedSetupStepIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('counselor_setup_step_ids');
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  });
  
  useEffect(() => {
    localStorage.setItem('unpassed_exam_course_ids', JSON.stringify(unpassedExamCourseIds));
  }, [unpassedExamCourseIds]);

  useEffect(() => {
    localStorage.setItem('counselor_setup_step_ids', JSON.stringify(completedSetupStepIds));
  }, [completedSetupStepIds]);

  const courseById = useMemo(
    () => new Map<string, HighSchoolCourse>(ALL_COURSES.map((course) => [course.id, course])),
    []
  );

  const getCourse = (id: string) => courseById.get(id);
  const selectedPath = useMemo(() => SKILL_PATHS.find((p) => p.id === selectedPathId)!, [selectedPathId]);
  const selectedAssignments = useMemo(
    () => pathAssignments[selectedPathId] ?? buildInitialAssignments(selectedPath),
    [pathAssignments, selectedPathId, selectedPath]
  );
  const requiredCourseIds = useMemo(
    () =>
      new Set([
        ...selectedPath.schedule.grade10,
        ...selectedPath.schedule.grade11,
        ...selectedPath.schedule.grade12,
      ]),
    [selectedPath]
  );
  const assignedCourseIds = useMemo(
    () => Array.from(new Set([...selectedAssignments.grade10, ...selectedAssignments.grade11, ...selectedAssignments.grade12])),
    [selectedAssignments]
  );
  const assignedCourses = useMemo(
    () =>
      assignedCourseIds
        .map((id) => courseById.get(id))
        .filter((course): course is HighSchoolCourse => Boolean(course)),
    [assignedCourseIds, courseById]
  );

  const plannedCourseIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...selectedPath.schedule.grade10,
          ...selectedPath.schedule.grade11,
          ...selectedPath.schedule.grade12,
          ...selectedPath.recommendedElectives,
        ])
      ),
    [selectedPath]
  );

  const plannedCourses = useMemo(
    () =>
      plannedCourseIds
        .map((id) => courseById.get(id))
        .filter((course): course is HighSchoolCourse => Boolean(course)),
    [courseById, plannedCourseIds]
  );

  const unpassedExamIdSet = useMemo(() => new Set(unpassedExamCourseIds), [unpassedExamCourseIds]);

  const isExamBasedCourse = (course: HighSchoolCourse) => course.type === 'AP' || course.type === 'IB';

  const gradStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let targetYear = today.getFullYear();
    let targetDate = new Date(targetYear, 8, 1); // Sept 1

    if (today > targetDate) {
      targetYear += 1;
      targetDate = new Date(targetYear, 8, 1);
    }

    const diff = targetDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));

    return { date: targetDate, days: Math.max(0, daysLeft), year: targetYear };
  }, []);

  // Computed data for the selected path
  const {
    satisfiedCats,
    totalCredits,
    wsuResidencyCredits,
    remainingCats,
    apIbPotentialCredits,
    apIbEarnedCredits,
  } = useMemo(() => {
    const satisfied = new Set<GenEdCategory>();
    let total = 0;
    let residency = 0;
    let apIbPotential = 0;
    let apIbEarned = 0;

    plannedCourses.forEach((course) => {
      const courseTotal = course.wsuEquivalent.reduce((acc, eq) => acc + eq.credits, 0);
      const isExamBasedCredit = isExamBasedCourse(course);
      const canCountCredits = !isExamBasedCredit || !unpassedExamIdSet.has(course.id);

      if (isExamBasedCredit) {
        apIbPotential += courseTotal;
      }

      if (!canCountCredits) {
        return;
      }

      if (course.genEdCategory) satisfied.add(course.genEdCategory);
      total += courseTotal;

      if (course.type === 'CE') {
        residency += courseTotal;
      }
      if (isExamBasedCredit) {
        apIbEarned += courseTotal;
      }
    });

    const remaining = REQUIRED_CATEGORIES.filter((cat) => !satisfied.has(cat));

    return { 
      satisfiedCats: satisfied, 
      totalCredits: total, 
      wsuResidencyCredits: residency,
      remainingCats: remaining,
      apIbPotentialCredits: apIbPotential,
      apIbEarnedCredits: apIbEarned,
    };
  }, [plannedCourses, unpassedExamIdSet]);

  const uniqueCourseCount = plannedCourses.length;
  const completedSetupCount = completedSetupStepIds.length;
  const isAllCoursesAssigned = selectedAssignments.pool.length === 0;

  const assignedProgress = useMemo(() => {
    const satisfied = new Set<GenEdCategory>();
    let total = 0;
    let residency = 0;

    assignedCourses.forEach((course) => {
      const courseTotal = course.wsuEquivalent.reduce((acc, eq) => acc + eq.credits, 0);
      const isExamBasedCredit = isExamBasedCourse(course);
      const canCountCredits = !isExamBasedCredit || !unpassedExamIdSet.has(course.id);

      if (!canCountCredits) return;

      if (course.genEdCategory) satisfied.add(course.genEdCategory);
      total += courseTotal;
      if (course.type === 'CE') residency += courseTotal;
    });

    const missingCategories = REQUIRED_CATEGORIES.filter((cat) => !satisfied.has(cat));
    return { satisfiedCategories: satisfied, missingCategories, totalCredits: total, residencyCredits: residency };
  }, [assignedCourses, unpassedExamIdSet]);

  const requiredCoursesInPool = useMemo(
    () => selectedAssignments.pool.filter((id) => requiredCourseIds.has(id)),
    [selectedAssignments.pool, requiredCourseIds]
  );

  const talkingPoints = useMemo(() => {
    const points: string[] = [];
    if (assignedProgress.totalCredits < 60) {
      points.push(`Current assigned plan is ${assignedProgress.totalCredits}/60 credits. Discuss where to place the remaining credits.`);
    } else {
      points.push(`Assigned plan currently meets the 60-credit target (${assignedProgress.totalCredits}).`);
    }
    if (assignedProgress.residencyCredits < 20) {
      points.push(`Residency is ${assignedProgress.residencyCredits}/20. Identify CE options to close the gap.`);
    } else {
      points.push(`Residency requirement is currently met (${assignedProgress.residencyCredits}/20).`);
    }
    if (assignedProgress.missingCategories.length > 0) {
      points.push(`Gen Ed gaps to confirm with student/parent: ${assignedProgress.missingCategories.join(', ')}.`);
    } else {
      points.push('All Gen Ed categories are represented in assigned classes.');
    }
    if (apIbEarnedCredits < apIbPotentialCredits) {
      points.push(`AP/IB exam follow-up: ${apIbEarnedCredits}/${apIbPotentialCredits} currently counting.`);
    }
    return points;
  }, [assignedProgress, apIbEarnedCredits, apIbPotentialCredits]);

  const parentPrepQuestions = useMemo(() => {
    const questions = [
      'Which classes are highest priority for this student this year, and why?',
      'What is the backup option if a selected class is full or unavailable?',
    ];

    if (assignedProgress.totalCredits < 60) {
      questions.push('Which additional courses should we add now to stay on track for 60 credits?');
    }
    if (assignedProgress.residencyCredits < 20) {
      questions.push('Which CE classes should we prioritize to reach the 20-credit residency minimum?');
    }
    if (assignedProgress.missingCategories.length > 0) {
      questions.push(`How will we cover these missing Gen Ed categories: ${assignedProgress.missingCategories.join(', ')}?`);
    }

    return questions;
  }, [assignedProgress]);
  const estimatedParentSavings = assignedProgress.totalCredits * ESTIMATED_TUITION_PER_CREDIT;

  const getLeastLoadedYear = (): YearBucket => {
    const buckets: Array<{ key: YearBucket; count: number }> = [
      { key: 'grade10', count: selectedAssignments.grade10.length },
      { key: 'grade11', count: selectedAssignments.grade11.length },
      { key: 'grade12', count: selectedAssignments.grade12.length },
    ];
    buckets.sort((a, b) => a.count - b.count);
    return buckets[0].key;
  };

  const getDefaultYearForRequiredCourse = (courseId: string): YearBucket => {
    if (selectedPath.schedule.grade10.includes(courseId)) return 'grade10';
    if (selectedPath.schedule.grade11.includes(courseId)) return 'grade11';
    if (selectedPath.schedule.grade12.includes(courseId)) return 'grade12';
    return getLeastLoadedYear();
  };

  const studentNextStep = useMemo(() => {
    if (selectedAssignments.pool.length === 0) {
      return null;
    }

    if (requiredCoursesInPool.length > 0) {
      const courseId = requiredCoursesInPool[0];
      return {
        courseId,
        targetYear: getDefaultYearForRequiredCourse(courseId),
        reason: 'This is a required pathway course and should be placed back into the roadmap.',
      };
    }

    for (const category of assignedProgress.missingCategories) {
      const match = selectedAssignments.pool.find((id) => courseById.get(id)?.genEdCategory === category);
      if (match) {
        return {
          courseId: match,
          targetYear: getLeastLoadedYear(),
          reason: `This helps cover missing Gen Ed category: ${category}.`,
        };
      }
    }

    if (assignedProgress.residencyCredits < 20) {
      const ceMatch = selectedAssignments.pool.find((id) => courseById.get(id)?.type === 'CE');
      if (ceMatch) {
        return {
          courseId: ceMatch,
          targetYear: getLeastLoadedYear(),
          reason: 'This helps close the CE residency-credit requirement.',
        };
      }
    }

    const highestCreditCourse = selectedAssignments.pool
      .map((id) => courseById.get(id))
      .filter((course): course is HighSchoolCourse => Boolean(course))
      .sort((a, b) =>
        b.wsuEquivalent.reduce((sum, eq) => sum + eq.credits, 0) -
        a.wsuEquivalent.reduce((sum, eq) => sum + eq.credits, 0)
      )[0];

    if (!highestCreditCourse) return null;

    return {
      courseId: highestCreditCourse.id,
      targetYear: getLeastLoadedYear(),
      reason: 'This is the highest-credit option currently in the pool.',
    };
  }, [selectedAssignments.pool, requiredCoursesInPool, assignedProgress, selectedPath, courseById]);

  const handleToggleExamPassed = (courseId: string) => {
    setUnpassedExamCourseIds((current) =>
      current.includes(courseId) ? current.filter((id) => id !== courseId) : [...current, courseId]
    );
  };

  const handleToggleSetupStep = (stepId: string) => {
    setCompletedSetupStepIds((current) =>
      current.includes(stepId) ? current.filter((id) => id !== stepId) : [...current, stepId]
    );
  };

  const assignCourseToBucket = (courseId: string, targetBucket: YearBucket | 'pool') => {
    setPathAssignments((current) => {
      const currentAssignments = current[selectedPathId] ?? buildInitialAssignments(selectedPath);
      const nextAssignments: PathAssignments = {
        grade10: currentAssignments.grade10.filter((id) => id !== courseId),
        grade11: currentAssignments.grade11.filter((id) => id !== courseId),
        grade12: currentAssignments.grade12.filter((id) => id !== courseId),
        pool: currentAssignments.pool.filter((id) => id !== courseId),
      };

      if (targetBucket === 'grade10') nextAssignments.grade10.push(courseId);
      if (targetBucket === 'grade11') nextAssignments.grade11.push(courseId);
      if (targetBucket === 'grade12') nextAssignments.grade12.push(courseId);
      if (targetBucket === 'pool') nextAssignments.pool.push(courseId);

      return {
        ...current,
        [selectedPathId]: nextAssignments,
      };
    });
  };

  const handleDropToBucket = (targetBucket: YearBucket | 'pool') => {
    if (!draggedCourseId) return;
    assignCourseToBucket(draggedCourseId, targetBucket);
    setActiveDropZone(null);
    setDraggedCourseId(null);
  };

  const handleResetPathAssignments = () => {
    setPathAssignments((current) => ({
      ...current,
      [selectedPathId]: buildInitialAssignments(selectedPath),
    }));
    setSelectedCourseId(null);
    setDraggedCourseId(null);
    setActiveDropZone(null);
  };

  useEffect(() => {
    setSelectedCourseId(null);
    setDraggedCourseId(null);
    setActiveDropZone(null);
  }, [selectedPathId]);

  const handleImportCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

      if (lines.length < 2) {
        setImportStatus({
          state: 'error',
          fileName: file.name,
          message: 'CSV needs a header row plus at least one data row.',
        });
        return;
      }

      const headers = parseCsvLine(lines[0]);
      const missing = REQUIRED_IMPORT_COLUMNS.filter((column) => !headers.includes(column));

      if (missing.length > 0) {
        setImportStatus({
          state: 'error',
          fileName: file.name,
          message: 'Missing required columns for onboarding.',
          missing,
        });
        return;
      }

      setImportStatus({
        state: 'ok',
        fileName: file.name,
        rowCount: lines.length - 1,
      });
    } catch {
      setImportStatus({
        state: 'error',
        fileName: file.name,
        message: 'Unable to read this CSV file.',
      });
    } finally {
      event.currentTarget.value = '';
    }
  };

  const yearlyCreditTotals = useMemo(() => {
    const sumCredits = (ids: string[]) =>
      ids.reduce((total, id) => {
        const course = courseById.get(id);
        if (!course) return total;

        const courseCredits = course.wsuEquivalent.reduce((acc, eq) => acc + eq.credits, 0);
        if (isExamBasedCourse(course) && unpassedExamIdSet.has(course.id)) {
          return total;
        }

        return total + courseCredits;
      }, 0);

    return {
      grade10: sumCredits(selectedAssignments.grade10),
      grade11: sumCredits(selectedAssignments.grade11),
      grade12: sumCredits(selectedAssignments.grade12),
    };
  }, [courseById, selectedAssignments, unpassedExamIdSet]);

  // Filter courses for catalog (exclude ones already in path or recommended)
  const groupedCatalog = useMemo(() => {
    const pathIds = new Set(plannedCourseIds);
    
    const available = ALL_COURSES.filter((c) => !pathIds.has(c.id)).filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group by category
    const groups: Record<string, HighSchoolCourse[]> = {};
    available.forEach((course) => {
      if (!groups[course.category]) groups[course.category] = [];
      groups[course.category].push(course);
    });
    
    return groups;
  }, [plannedCourseIds, searchTerm]);


  const CourseCard: React.FC<{
    course: HighSchoolCourse;
    compact?: boolean;
    showExamToggle?: boolean;
    draggable?: boolean;
    isSelected?: boolean;
    onSelect?: () => void;
  }> = ({
    course,
    compact,
    showExamToggle = false,
    draggable = false,
    isSelected = false,
    onSelect,
  }) => {
    const isResidency = course.type === 'CE';
    const isExamBasedCredit = isExamBasedCourse(course);
    const isExamPassed = !unpassedExamIdSet.has(course.id);
    
    return (
      <div
        className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${
          compact ? 'p-2' : 'p-3 mb-2'
        } ${isSelected ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'} ${draggable ? 'cursor-move' : ''}`}
        draggable={draggable}
        onDragStart={() => {
          if (!draggable) return;
          setActiveDropZone(null);
          setDraggedCourseId(course.id);
        }}
        onDragEnd={() => {
          if (!draggable) return;
          setDraggedCourseId(null);
          setActiveDropZone(null);
        }}
        onClick={(event) => {
          if (!onSelect) return;
          const target = event.target as HTMLElement;
          if (target.closest('label') || target.closest('input')) return;
          onSelect();
        }}
      >
        <div className={`absolute top-0 right-0 px-2 py-0.5 text-[9px] font-bold uppercase rounded-bl-lg
          ${isResidency ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-700'}`}>
          {isResidency ? 'WSU CE' : course.type}
        </div>

        <div className="pr-12">
          <div className={`font-bold text-gray-800 leading-tight ${compact ? 'text-xs' : 'text-sm'}`}>{course.name}</div>
          <div className="flex items-center text-xs text-gray-500 mt-1">
            <span className="font-medium mr-2">{course.wsuEquivalent.reduce((acc, curr) => acc + curr.credits, 0)} Cr</span>
            {!compact && (
              <>
                <span className="text-gray-300 mx-1">|</span>
                {isResidency ? (
                   <span className="flex items-center text-orange-600">
                     <School className="w-3 h-3 mr-1" /> Residency
                   </span>
                ) : (
                   <span className="flex items-center text-gray-500">
                     <Award className="w-3 h-3 mr-1" /> Test Credit
                   </span>
                )}
              </>
            )}
          </div>
        </div>
        
        {course.genEdCategory && !compact && (
          <div className="mt-2">
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-semibold uppercase rounded tracking-wider border border-gray-200">
              {course.genEdCategory}
            </span>
          </div>
        )}

        {showExamToggle && isExamBasedCredit && !compact && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                className="accent-orange-600"
                checked={isExamPassed}
                onChange={() => handleToggleExamPassed(course.id)}
              />
              <span>Exam Passed</span>
            </label>
          </div>
        )}
      </div>
    );
  };

  const selectedCourse = selectedCourseId ? getCourse(selectedCourseId) : null;
  const templateCsvUrl = `${import.meta.env.BASE_URL}school_planner_template.csv`;
  const dataDictionaryCsvUrl = `${import.meta.env.BASE_URL}data_dictionary.csv`;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      {/* Top Banner (Solid Background) */}
      <div className="bg-slate-900 text-white shadow-xl">
        <div className="max-w-6xl mx-auto p-6 md:p-8">
          
          <div className="flex flex-col md:flex-row gap-6">
             {/* Logo Placeholder */}
            <div className="hidden md:block w-24 h-24 bg-white/10 rounded-full border-4 border-white/20 overflow-hidden shadow-lg flex-shrink-0 relative">
               <img 
                  src="tiger-logo.png" 
                  alt="Ogden Tiger" 
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                  }} 
               />
               <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs" style={{zIndex: -1}}>
                  TIGER LOGO
               </div>
            </div>

            <div className="flex-grow flex flex-col justify-center text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start space-x-3 mb-2">
                  <GraduationCap className="w-8 h-8 text-orange-400" />
                  <span className="text-orange-200 font-semibold tracking-wider text-sm uppercase">Ogden School District • WSU</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-white mb-3">
                  Earn Your Associate's Degree in High School
                </h1>
                <p className="text-slate-300 max-w-2xl text-lg mb-4 mx-auto md:mx-0">
                  Get a head start on college by fulfilling your General Education requirements while still in high school.
                </p>
                
                {/* Info Tooltips - Moved Here */}
                <div className="flex gap-3 justify-center md:justify-start">
                   <Tooltip icon={<Award className="w-4 h-4" />} title="Degree Options">
                      <h4 className="font-bold text-orange-600 mb-2">Associate's Options</h4>
                      <div className="text-xs space-y-2 text-gray-600">
                        <p><strong>Associate of Science (AS):</strong><br/>Fulfill all Core Gen Requirements.</p>
                        <p><strong>Associate of Arts (AA):</strong><br/>Fulfill Core Reqs + Foreign Lang (1020 level).</p>
                      </div>
                   </Tooltip>

	                   <Tooltip icon={<List className="w-4 h-4" />} title="Core Requirements">
	                      <h4 className="font-bold text-orange-600 mb-2">To Earn the Degree:</h4>
	                      <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
	                        <li><strong>60 Total</strong> Credit Hours</li>
	                        <li>1 course from EACH Gen Ed category</li>
	                        <li><strong>20 Credits</strong> from WSU (CE)</li>
	                        <li>AP/IB credits count only after passing exams</li>
	                        <li>1 Cultural Competence course (*)</li>
	                      </ul>
	                   </Tooltip>

                     <button
                       onClick={() => setIsImporterOpen(true)}
                       className="flex items-center space-x-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 px-3 py-2 rounded-lg transition-colors text-sm font-medium border border-blue-300/30"
                       title="Open School Importer Prototype"
                     >
                       <Upload className="w-4 h-4" />
                       <span>Importer</span>
                     </button>
                </div>
            </div>

	            {/* Graduation Countdown Widget in Header */}
	            <div className="w-full md:w-64 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 flex-shrink-0 self-start h-fit">
                {/* Countdown Section */}
                <div>
                  <h3 className="text-xs font-bold text-orange-200 uppercase tracking-wider mb-2 flex items-center justify-center md:justify-start">
                    <Clock className="w-3 h-3 mr-1.5" /> Time Until 10th Grade
                  </h3>
                  
                  <div className="text-center">
                      <div className="text-3xl font-black text-white mb-0 leading-none">{gradStats.days}</div>
                      <div className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-2">Days Left</div>
                      <div className="pt-2 border-t border-white/10 text-[10px] text-slate-400 flex justify-start items-center">
                        <span>Starts: <strong>Sep {gradStats.year}</strong></span>
                      </div>
                  </div>
                </div>
	            </div>
          </div>
          
          {/* Action Bar: Path Selectors ONLY - Single Row */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex flex-nowrap gap-3 w-full overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {SKILL_PATHS.map(path => {
                const Icon = path.icon;
                return (
                  <button
                    key={path.id}
                    onClick={() => setSelectedPathId(path.id)}
                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all font-medium whitespace-nowrap ${
                      selectedPathId === path.id 
                        ? 'bg-orange-600 text-white shadow-lg scale-[1.02]' 
                        : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{path.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">

        {/* SECTION 1: DEGREE REQUIREMENTS (TOP DASHBOARD) */}
	        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-orange-600" />
              Degree Progress Dashboard
            </h2>

	            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
	               {/* Total Credits */}
	               <div>
	                  <div className="flex justify-between text-sm font-semibold mb-1">
	                    <span className="text-gray-700">Total Earned Credits (unique classes)</span>
	                    <span className={totalCredits >= 60 ? 'text-green-600' : 'text-gray-500'}>
	                      {totalCredits} / 60
	                    </span>
	                  </div>
	                  <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
                    <div 
                      className={`h-4 rounded-full transition-all duration-500 ${totalCredits >= 60 ? 'bg-green-500' : 'bg-orange-500'}`} 
	                      style={{ width: `${Math.min(100, (totalCredits / 60) * 100)}%` }}
	                    ></div>
	                    <div className="absolute top-0 bottom-0 border-l-2 border-white opacity-50 border-dashed" style={{ left: '33%' }} title="20 Credit Residency Line"></div>
	                  </div>
	                  <p className="text-xs text-gray-500 mt-1">
	                    AP/IB credits only count when the exam is marked as passed.
	                  </p>
	               </div>

               {/* Residency Check */}
               <div className={`p-3 rounded-lg border flex items-center ${wsuResidencyCredits >= 20 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                  {wsuResidencyCredits >= 20 ? <CheckCircle className="w-8 h-8 text-green-600 mr-3" /> : <AlertTriangle className="w-8 h-8 text-orange-600 mr-3" />}
                  <div>
                    <h4 className={`font-bold text-sm ${wsuResidencyCredits >= 20 ? 'text-green-800' : 'text-orange-800'}`}>
                      Residency Requirement: {wsuResidencyCredits} / 20
                    </h4>
                    <p className={`text-xs leading-tight ${wsuResidencyCredits >= 20 ? 'text-green-700' : 'text-orange-700'}`}>
                       {wsuResidencyCredits >= 20 ? 'Requirement Met' : 'Need 20 credits from Concurrent Enrollment (CE) courses.'}
                    </p>
	                  </div>
	               </div>
	            </div>
	            <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
	              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
	                <span className="text-gray-500">Unique classes counted</span>
	                <div className="font-bold text-gray-900">{uniqueCourseCount}</div>
	              </div>
	              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
	                <span className="text-gray-500">AP/IB credits earned</span>
	                <div className="font-bold text-gray-900">{apIbEarnedCredits}</div>
	              </div>
	              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
	                <span className="text-gray-500">AP/IB credit potential</span>
	                <div className="font-bold text-gray-900">{apIbPotentialCredits}</div>
	              </div>
	            </div>
	        </div>

        {/* SECTION: COUNSELOR ONBOARDING + PLAYBOOK */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Counselor Quick Start (20 Minutes)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Follow this quick-start checklist to onboard a school counselor workflow.
            </p>
            <div className="text-xs text-gray-500 mb-3">
              Progress: {completedSetupCount}/{COUNSELOR_SETUP_STEPS.length} complete
            </div>
            <div className="space-y-2">
              {COUNSELOR_SETUP_STEPS.map((step) => {
                const checked = completedSetupStepIds.includes(step.id);
                return (
                  <label key={step.id} className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-orange-600"
                      checked={checked}
                      onChange={() => handleToggleSetupStep(step.id)}
                    />
                    <span className={checked ? 'line-through text-gray-400' : ''}>{step.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Counselor Playbook</h3>
            <p className="text-sm text-gray-600 mb-4">
              Use this meeting script when guiding students through signup.
            </p>
            <div className="space-y-3 text-sm">
              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <div className="font-semibold text-gray-900">Phase 1: Confirm Goals</div>
                <div className="text-gray-600 mt-1">“Which pathway fits your post-high-school plan best?”</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <div className="font-semibold text-gray-900">Phase 2: Build the Year Plan</div>
                <div className="text-gray-600 mt-1">“Drag classes into Grade 10-12, then review credits and requirements.”</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <div className="font-semibold text-gray-900">Phase 3: Family Readiness</div>
                <div className="text-gray-600 mt-1">“Review parent questions, savings estimate, and next recommended course.”</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl shadow-md border border-slate-800 px-5 py-4 text-white">
          <div className="text-sm font-semibold text-orange-300 uppercase tracking-wider">Implementation Promise</div>
          <div className="mt-1 text-sm text-slate-200">
            Provide your two CSV files and we can configure a school-branded version of this planner in 48 hours.
          </div>
        </div>

	        {/* SECTION 2: YEARLY ROADMAP */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{selectedPath.name} Roadmap</h2>
            <button
              onClick={handleResetPathAssignments}
              className="text-xs sm:text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 px-3 py-1.5 font-semibold text-gray-700"
            >
              Reset to Path Default
            </button>
          </div>

          <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            <div className="text-xs text-blue-900 font-semibold mb-2">Drag tiles between years, or on mobile tap a tile then use assign buttons:</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-blue-800">
                {selectedCourse ? `Selected: ${selectedCourse.name}` : 'No tile selected'}
              </span>
              <button
                disabled={!selectedCourseId}
                onClick={() => selectedCourseId && assignCourseToBucket(selectedCourseId, 'grade10')}
                className="text-xs rounded px-3 py-1.5 bg-white border border-blue-200 text-blue-800 disabled:opacity-50"
              >
                Assign to 10
              </button>
              <button
                disabled={!selectedCourseId}
                onClick={() => selectedCourseId && assignCourseToBucket(selectedCourseId, 'grade11')}
                className="text-xs rounded px-3 py-1.5 bg-white border border-blue-200 text-blue-800 disabled:opacity-50"
              >
                Assign to 11
              </button>
              <button
                disabled={!selectedCourseId}
                onClick={() => selectedCourseId && assignCourseToBucket(selectedCourseId, 'grade12')}
                className="text-xs rounded px-3 py-1.5 bg-white border border-blue-200 text-blue-800 disabled:opacity-50"
              >
                Assign to 12
              </button>
              <button
                disabled={!selectedCourseId}
                onClick={() => selectedCourseId && assignCourseToBucket(selectedCourseId, 'pool')}
                className="text-xs rounded px-3 py-1.5 bg-white border border-blue-200 text-blue-800 disabled:opacity-50"
              >
                Move to Pool
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                key: 'grade10' as YearBucket,
                label: 'Sophomore',
                badge: '10',
                borderClass: 'border-orange-400',
                credits: yearlyCreditTotals.grade10,
              },
              {
                key: 'grade11' as YearBucket,
                label: 'Junior',
                badge: '11',
                borderClass: 'border-orange-500',
                credits: yearlyCreditTotals.grade11,
              },
              {
                key: 'grade12' as YearBucket,
                label: 'Senior',
                badge: '12',
                borderClass: 'border-orange-600',
                credits: yearlyCreditTotals.grade12,
              },
            ].map((year) => (
              <div key={year.key} className={`bg-white rounded-xl p-4 border-t-4 ${year.borderClass} shadow-sm flex flex-col h-full relative`}>
                <div className="flex items-center mb-4 pb-2 border-b border-gray-100">
                  <div className="bg-orange-100 text-orange-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-2">{year.badge}</div>
                  <h3 className="font-bold text-gray-800">{year.label}</h3>
                </div>
                <div className="mb-3 text-xs font-semibold text-gray-600 bg-orange-50 border border-orange-100 rounded px-2 py-1">
                  Total College Credit Hours: {year.credits}
                </div>
                <div
                  className={`space-y-2 flex-grow min-h-[200px] rounded-lg border-2 border-dashed p-2 transition-colors ${
                    activeDropZone === year.key ? 'border-blue-300 bg-blue-50/40' : 'border-transparent'
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setActiveDropZone(year.key);
                  }}
                  onDragLeave={() => {
                    setActiveDropZone((current) => (current === year.key ? null : current));
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleDropToBucket(year.key);
                  }}
                >
                  {selectedAssignments[year.key].map((id) => {
                    const course = getCourse(id);
                    return course ? (
                      <CourseCard
                        key={id}
                        course={course}
                        showExamToggle
                        draggable
                        isSelected={selectedCourseId === id}
                        onSelect={() => setSelectedCourseId((current) => (current === id ? null : id))}
                      />
                    ) : null;
                  })}
                  {selectedAssignments[year.key].length === 0 && (
                    <div className="text-xs text-gray-400 italic p-2">Drop courses here</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: ADDITIONS & GEN ED CHECKLIST */}
	        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Course Pool */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <Plus className="w-5 h-5 mr-2 text-orange-600" />
                  Course Pool (Unassigned / Optional)
                </h3>
              </div>
		              <div
                    className={`p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 flex-grow min-h-[240px] rounded-b-xl border-2 border-dashed transition-colors ${
                      activeDropZone === 'pool' ? 'border-blue-300 bg-blue-50/40' : 'border-transparent'
                    }`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setActiveDropZone('pool');
                    }}
                    onDragLeave={() => {
                      setActiveDropZone((current) => (current === 'pool' ? null : current));
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleDropToBucket('pool');
                    }}
                  >
		                {selectedAssignments.pool.map((id) => {
		                   const course = getCourse(id);
		                   return course ? (
                       <CourseCard
                         key={id}
                         course={course}
                         draggable
                         isSelected={selectedCourseId === id}
                         onSelect={() => setSelectedCourseId((current) => (current === id ? null : id))}
                       />
                     ) : null;
		                })}
                    {selectedAssignments.pool.length === 0 && (
                      <div className="text-xs text-gray-400 italic p-2 col-span-full">No courses in pool. Drag a course here to unschedule it.</div>
                    )}
		              </div>
          </div>

          {/* Gen Ed Requirements Grid - COMPACT */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 flex flex-col h-full">
             <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">General Education Categories</h3>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">9 Required</span>
             </div>
             <div className="grid grid-cols-3 gap-2 flex-grow">
                {REQUIRED_CATEGORIES.map(cat => {
                   const isDone = satisfiedCats.has(cat);
                   return (
                     <div key={cat} className={`flex flex-col items-center justify-center p-2 rounded text-center border h-full w-full transition-colors ${isDone ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                        {isDone 
                          ? <CheckCircle className="w-5 h-5 text-green-600 mb-1" />
                          : <Circle className="w-5 h-5 text-gray-300 mb-1" />
                        }
                        <span className={`text-[10px] leading-tight font-medium ${isDone ? 'text-green-800' : 'text-gray-400'}`}>
                          {cat}
                        </span>
                     </div>
                   );
                })}
             </div>
             {remainingCats.length > 0 && (
                <div className="mt-3 text-[10px] text-yellow-800 bg-yellow-100 p-2 rounded text-center font-medium border border-yellow-200">
                   Missing: {remainingCats.length} categories
                </div>
             )}
          </div>
	        </div>

        {/* SECTION: PARENT + STUDENT STICKY FEATURES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Parent Meeting Prep</h3>
            <p className="text-sm text-gray-600 mb-4">
              Use this prep card before counselor meetings.
            </p>
            <div className="bg-emerald-50 border border-emerald-200 rounded p-3 mb-4">
              <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Estimated College Savings</div>
              <div className="text-2xl font-black text-emerald-800 mt-1">
                ${estimatedParentSavings.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-700 mt-1">
                Based on assigned credits ({assignedProgress.totalCredits}) x ${ESTIMATED_TUITION_PER_CREDIT}/credit.
              </div>
            </div>
            <div className="space-y-2">
              {parentPrepQuestions.map((question) => (
                <div key={question} className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded p-2">
                  {question}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Student Next-Step Recommender</h3>
            <p className="text-sm text-gray-600 mb-4">
              Suggest one high-impact move to keep signup momentum.
            </p>

            {studentNextStep ? (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <div className="text-sm font-semibold text-blue-900">
                    Suggested Course: {getCourse(studentNextStep.courseId)?.name ?? studentNextStep.courseId}
                  </div>
                  <div className="text-xs text-blue-800 mt-1">{studentNextStep.reason}</div>
                  <div className="text-xs text-blue-700 mt-1">
                    Recommended placement: {YEAR_LABELS[studentNextStep.targetYear]}
                  </div>
                </div>
                <button
                  onClick={() => assignCourseToBucket(studentNextStep.courseId, studentNextStep.targetYear)}
                  className="text-sm rounded bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 font-semibold"
                >
                  Apply Recommendation
                </button>
              </div>
            ) : (
              <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded p-3">
                No immediate recommendation. All pool courses have been placed.
              </div>
            )}
          </div>
        </div>

        {/* SECTION: COUNSELOR TALKING POINTS */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Counselor Talking Points</h3>
          <p className="text-sm text-gray-600 mb-4">
            Generated discussion points for student signup meetings.
          </p>

          {isAllCoursesAssigned ? (
            <div className="space-y-2">
              {talkingPoints.map((point) => (
                <div key={point} className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded p-2">
                  {point}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3">
              Assign all classes from the pool to Grade 10-12 to unlock final counselor talking points.
              <div className="text-xs mt-1">Remaining in pool: {selectedAssignments.pool.length}</div>
            </div>
          )}
        </div>

	        {/* SECTION 4: FULL CATALOG - GROUPED */}
	        <div className="bg-white rounded-xl shadow-md border border-gray-200">
           <button 
             onClick={() => setShowFullCatalog(!showFullCatalog)}
             className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-200"
           >
              <h3 className="text-lg font-bold text-gray-900">Course Catalog (All Other Options)</h3>
              {showFullCatalog ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
           </button>
           
           {showFullCatalog && (
             <div className="p-6">
                <div className="mb-6 relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search classes..." 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {Object.keys(groupedCatalog).length === 0 && (
                   <div className="text-center text-gray-500 py-4">No other courses found matching your search.</div>
                )}

                {Object.entries(groupedCatalog).map(([category, courses]) => (
                  <div key={category} className="mb-6 last:mb-0">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 border-b border-gray-100 pb-1">{category}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {courses.map(c => (
                        <CourseCard key={c.id} course={c} compact />
                      ))}
                    </div>
                  </div>
                ))}
             </div>
           )}
        </div>

        {/* SECTION 5: ACADEMIC SUPPORT TEAM */}
        <div className="bg-slate-900 rounded-xl shadow-lg p-6 md:p-8 text-white">
          <div className="flex items-center mb-6">
            <User className="w-6 h-6 mr-3 text-orange-400" />
            <h2 className="text-2xl font-bold">Academic Support Team</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {COUNSELORS.map((counselor, idx) => (
                <div key={idx} className="bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-orange-500 transition-colors group">
                   <h3 className="font-bold text-lg text-white group-hover:text-orange-400 transition-colors">{counselor.name}</h3>
                   <p className="text-slate-300 text-sm font-medium mb-1">{counselor.role}</p>
                   {counselor.assignment && (
                     <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-3">{counselor.assignment}</p>
                   )}
                   <a href={`mailto:${counselor.email}`} className="flex items-center text-sm text-slate-400 hover:text-white transition-colors">
                     <Mail className="w-4 h-4 mr-2" />
                     {counselor.email}
                   </a>
                </div>
             ))}
          </div>
          <div className="mt-6 pt-6 border-t border-slate-800 text-center text-sm text-slate-500">
             <p>Consult these counselors to ensure you are on track to reach your university goals.</p>
          </div>
        </div>

      </div>

      {isImporterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-slate-950/70"
            onClick={() => setIsImporterOpen(false)}
            aria-label="Close importer modal"
          />
          <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl border border-blue-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-blue-900 flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  School Importer
                </h2>
                <p className="text-sm text-blue-800 mt-1">
                  Counselor Mode: a step-by-step upload flow for non-technical school staff.
                </p>
              </div>
              <button
                onClick={() => setIsImporterOpen(false)}
                className="text-slate-500 hover:text-slate-800 p-1 rounded"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Start Here (about 5 minutes)</h3>
                    <p className="text-sm text-slate-600 mt-1">Follow these steps in order. The template does the technical setup for you.</p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                    Counselor Mode
                  </span>
                </div>
                <ol className="mt-4 space-y-3">
                  {IMPORTER_QUICK_START_STEPS.map((step, index) => (
                    <li key={step.title} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{step.title}</div>
                        <div className="text-sm text-slate-600">{step.detail}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50/40 p-4">
                  <label className="block text-sm font-semibold text-blue-900 mb-2">Upload your completed CSV</label>
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <a
                      href={templateCsvUrl}
                      download
                      className="inline-flex items-center justify-center gap-2 rounded bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Step 1: Download Template
                    </a>
                    <a
                      href={dataDictionaryCsvUrl}
                      download
                      className="inline-flex items-center justify-center gap-2 rounded bg-white text-slate-700 border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Optional: Data Dictionary
                    </a>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    The template is required. The data dictionary is a reference sheet for field definitions.
                  </p>
                  <label htmlFor="admin-csv-upload" className="block text-sm font-semibold text-slate-800 mb-2">
                    Choose your CSV file
                  </label>
                  <input
                    id="admin-csv-upload"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleImportCsv}
                    className="block w-full text-sm text-gray-700 file:mr-4 file:rounded file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Upload <span className="font-mono">school_planner_template.csv</span> first if this is your first time.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    If the file picker resets to "No file chosen," that is expected after validation.
                  </p>

                  {importStatus.state === 'ok' && (
                    <div className="mt-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                      <div className="font-semibold">Success: CSV ready for onboarding</div>
                      <div>{importStatus.fileName} • {importStatus.rowCount} rows detected</div>
                      <div className="text-xs mt-2">
                        Next step: send this validated CSV and the data dictionary to your implementation contact.
                      </div>
                    </div>
                  )}

                  {importStatus.state === 'error' && (
                    <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      <div className="font-semibold">We could not validate this file yet.</div>
                      <div className="mt-1">{importStatus.message}</div>
                      <div className="text-xs mt-1">{importStatus.fileName}</div>
                      {importStatus.missing && importStatus.missing.length > 0 && (
                        <div className="text-xs mt-1">Missing: {importStatus.missing.join(', ')}</div>
                      )}
                      <div className="text-xs mt-2">Tip: Start from the template file and re-upload after saving as CSV.</div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h4 className="text-sm font-semibold text-slate-900">What one row becomes</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      One class row in the CSV turns into one class recommendation in a counselor-facing pathway plan.
                    </p>
                    <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-600">CSV row</div>
                      <div className="text-xs font-mono text-slate-700 mt-1">pathway_code=health, course_code=HTHS_1104, year_level=11, placement=required</div>
                    </div>
                    <div className="text-center text-slate-400 text-xs mt-2">↓</div>
                    <div className="rounded border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-600">Planner result</div>
                      <div className="text-xs text-slate-700 mt-1">Health Sciences pathway, Grade 11 required class, supports Nursing/EMS planning.</div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">Need help with basics?</div>
                    <ul className="mt-2 space-y-1 text-xs text-slate-600 list-disc list-inside">
                      {IMPORTER_TROUBLESHOOTING_TIPS.map((tip) => (
                        <li key={tip} className="leading-relaxed">{tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <details className="rounded-lg border border-slate-200 bg-white">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900">
                  Learn more (advanced): field names, pathway maps, and role examples
                </summary>
                <div className="border-t border-slate-100 p-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">What these CSVs are actually doing</h4>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                      Class rows become pathway plans, and pathway plans become counselor-ready student roadmaps.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {IMPORTER_FLOW_STAGES.map((stage) => {
                      const StageIcon = stage.icon;
                      return (
                        <div key={stage.title} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-center gap-2">
                            <StageIcon className="w-4 h-4 text-blue-700" />
                            <h5 className="text-sm font-semibold text-slate-900">{stage.title}</h5>
                          </div>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">{stage.detail}</p>
                          <p className="text-[11px] text-slate-500 mt-2">{stage.hint}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">System checks these columns automatically</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {REQUIRED_IMPORT_COLUMNS.map((column) => (
                        <span key={column} className="text-[11px] px-2 py-1 rounded border border-amber-200 bg-amber-50 text-amber-900">
                          {column}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">Pathway to role examples</div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {IMPORTER_PATHWAY_ROLE_CARDS.map((card) => (
                        <div key={card.pathway} className={`rounded-lg border p-3 ${card.toneClass}`}>
                          <div className="text-xs font-semibold text-slate-900">{card.pathway}</div>
                          <div className="text-[11px] font-mono text-slate-600 mt-1">{card.csvSignal}</div>
                          <div className="text-xs text-slate-700 mt-2">
                            <span className="font-semibold">Classes:</span> {card.classes}
                          </div>
                          <div className="text-xs text-slate-700 mt-1">
                            <span className="font-semibold">Roles:</span> {card.roles}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
