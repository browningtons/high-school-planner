import type React from 'react';
import { Zap, Heart, Briefcase, Globe } from 'lucide-react';

export interface WSUCourse {
  wsuCode: string; // e.g., 'ENG 1010'
  credits: number; // e.g., 3
}

export interface HighSchoolCourse {
  id: string;
  name: string;
  type: 'CE' | 'AP' | 'IB' | 'ADDITIONAL';
  wsuEquivalent: WSUCourse[];
  genEdCategory?: GenEdCategory;
  culturalCompetence?: boolean;
  category: string; // For grouping in the catalog
}

export type GenEdCategory =
  | 'English 1'
  | 'English 2'
  | 'Quantitative Literacy'
  | 'Humanities'
  | 'American Institutions'
  | 'Creative Arts'
  | 'Social Sciences'
  | 'Life Sciences'
  | 'Physical Sciences';

export interface YearlySchedule {
  grade10: string[];
  grade11: string[];
  grade12: string[];
}

export type YearBucket = keyof YearlySchedule;

export interface SkillPath {
  id: 'tech' | 'health' | 'business' | 'social';
  name: string;
  icon: React.ElementType;
  description: string;
  schedule: YearlySchedule;
  recommendedElectives: string[]; // Extra classes to reach 60 credits
}

// --- DATA BASED ON PDF CONTENT ---

export const ALL_COURSES: HighSchoolCourse[] = [
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

export const SKILL_PATHS: SkillPath[] = [
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

export const REQUIRED_CATEGORIES: GenEdCategory[] = [
  'English 1', 'English 2', 'Quantitative Literacy', 'Humanities',
  'American Institutions', 'Creative Arts', 'Social Sciences',
  'Life Sciences', 'Physical Sciences'
];

// --- SCHOOL PRESETS (for ?school= URL param) ---
export interface SchoolPreset {
  slug: string;
  name: string;
  logo?: string;
  colors: string[]; // [primary, accent, bg, secondary, highlight]
}

export const SCHOOL_PRESETS: SchoolPreset[] = [
  {
    slug: 'ogden-high',
    name: 'Ogden High School',
    logo: '/ogden_high.png',
    colors: ['#000000', '#e05f27', '#ffffff', '#1a1a1a', '#f07a45'],
  },
  {
    slug: 'ben-lomond',
    name: 'Ben Lomond High School',
    logo: '/ben_lomond.png',
    colors: ['#0a59a4', '#d43c39', '#ffffff', '#0d6abf', '#e05350'],
  },
  {
    slug: 'weber-high',
    name: 'Weber High School',
    logo: '/weber.png',
    colors: ['#2d2d2f', '#e42526', '#ffffff', '#949599', '#f04041'],
  },
  {
    slug: 'fremont-high',
    name: 'Fremont High School',
    logo: '/fremont.png',
    colors: ['#25367b', '#3a50a0', '#f5ffff', '#1e2d6b', '#8494c7'],
  },
  {
    slug: 'bonneville-high',
    name: 'Bonneville High School',
    logo: '/bonneville.png',
    colors: ['#12233f', '#fdc228', '#ffffff', '#1a3050', '#fdd05a'],
  },
];

export const ESTIMATED_TUITION_PER_CREDIT = 120;
export const MAX_COURSES_PER_YEAR = 8;

export const YEAR_LABELS: Record<YearBucket, string> = {
  grade10: 'Grade 10',
  grade11: 'Grade 11',
  grade12: 'Grade 12',
};

export function courseCredits(course: HighSchoolCourse): number {
  return course.wsuEquivalent.reduce((sum, eq) => sum + eq.credits, 0);
}

export const COURSE_BY_ID: Map<string, HighSchoolCourse> = new Map(
  ALL_COURSES.map((c) => [c.id, c]),
);
