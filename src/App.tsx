import React, { useState, useMemo, useEffect } from 'react';
import { Zap, Heart, Briefcase, CheckCircle, Circle, BookOpen, GraduationCap, AlertTriangle, School, Award, ChevronDown, ChevronUp, Search, List, Globe, Mail, User, Clock, Upload, Download, X, FileText, Copy, Check, DollarSign, ArrowRight, Lock, Unlock, Star } from 'lucide-react';
import { jsPDF } from 'jspdf';

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
  onDeck: string[];
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

interface ImportedPathwayOption {
  code: string;
  name: string;
}

// --- DATA BASED ON PDF CONTENT ---

const COUNSELORS: Counselor[] = [
  { name: 'Sarah Johnson', role: 'School Counselor', email: 'counselor1@school.edu', assignment: 'Last Names: A-Di' },
  { name: 'Michael Davis', role: 'School Counselor', email: 'counselor2@school.edu', assignment: 'Last Names: Do-Lee' },
  { name: 'Rachel Thompson', role: 'School Counselor', email: 'counselor3@school.edu', assignment: 'Last Names: Lei-Ri' },
  { name: 'David Martinez', role: 'School Counselor', email: 'counselor4@school.edu', assignment: 'Last Names: Ro-Z' },
  { name: 'Jennifer Wilson', role: 'University Academic Advisor', email: 'advisor@university.edu' },
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

const FREE_PREVIEW_ROW_LIMIT = 25;

const IMPORTER_COLOR_SCHEMES = [
  { id: 'classic-navy', label: 'Classic Navy', accentHex: '#1d4ed8', previewClass: 'border-blue-200 bg-blue-50' },
  { id: 'forest', label: 'Forest', accentHex: '#15803d', previewClass: 'border-emerald-200 bg-emerald-50' },
  { id: 'sunrise', label: 'Sunrise', accentHex: '#d97706', previewClass: 'border-amber-200 bg-amber-50' },
  { id: 'cranberry', label: 'Cranberry', accentHex: '#be123c', previewClass: 'border-rose-200 bg-rose-50' },
  { id: 'teal', label: 'Teal', accentHex: '#0f766e', previewClass: 'border-teal-200 bg-teal-50' },
  { id: 'violet-blue', label: 'Violet Blue', accentHex: '#4338ca', previewClass: 'border-indigo-200 bg-indigo-50' },
  { id: 'charcoal', label: 'Charcoal', accentHex: '#334155', previewClass: 'border-slate-300 bg-slate-100' },
  { id: 'orange', label: 'Orange', accentHex: '#c2410c', previewClass: 'border-orange-200 bg-orange-50' },
] as const;

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
const MAX_COURSES_PER_YEAR = 8;

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
    onDeck: [],
  };
};

const buildInitialAssignmentMap = (): Record<SkillPath['id'], PathAssignments> =>
  SKILL_PATHS.reduce((acc, path) => {
    acc[path.id] = buildInitialAssignments(path);
    return acc;
  }, {} as Record<SkillPath['id'], PathAssignments>);

type ImportStatus =
  | { state: 'idle' }
  | {
      state: 'ok';
      fileName: string;
      rowCount: number;
      previewRowCount: number;
      lockedRowCount: number;
      pathways: ImportedPathwayOption[];
    }
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

const BOOKING_URL = 'mailto:browningtons@gmail.com?subject=School%20Planner%20-%20Schedule%20a%2015-Min%20Call';

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
  const [selectedPreviewPathwayCode, setSelectedPreviewPathwayCode] = useState('');
  const [selectedPreviewThemeId, setSelectedPreviewThemeId] = useState<string>(IMPORTER_COLOR_SCHEMES[0].id);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [previewSchoolName, setPreviewSchoolName] = useState('Your School');
  const [pathAssignments, setPathAssignments] = useState<Record<SkillPath['id'], PathAssignments>>(
    () => {
      try {
        const stored = localStorage.getItem('path_assignments');
        if (stored) return JSON.parse(stored) as Record<SkillPath['id'], PathAssignments>;
      } catch {
        // ignore
      }
      return buildInitialAssignmentMap();
    }
  );
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [draggedCourseId, setDraggedCourseId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<YearBucket | 'pool' | null>(null);
  const [lastAppliedMove, setLastAppliedMove] = useState<{ courseName: string; yearLabel: string } | null>(null);
  const [catalogAssignCourseId, setCatalogAssignCourseId] = useState<string | null>(null);
  const [studentCount, setStudentCount] = useState(50);
  const [copiedSavings, setCopiedSavings] = useState(false);
  const [expandedCard, setExpandedCard] = useState<'savings' | 'quickstart' | 'playbook' | null>(null);
  const [playbookHighlight, setPlaybookHighlight] = useState<string | null>(null);
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string | null>(null);
  const [schoolColors, setSchoolColors] = useState<string[]>(['#1e293b', '#ea580c', '#f8fafc', '#334155', '#fb923c']);
  const [optimizePrefs, setOptimizePrefs] = useState({ ce: true, ap: true, genEd: true, residency: true });
  const [optimizeFlash, setOptimizeFlash] = useState(false);
  const [optimizeAnimColumns, setOptimizeAnimColumns] = useState<Set<number>>(new Set());
  const [stage2Open, setStage2Open] = useState(false);
  const [stage2Picks, setStage2Picks] = useState<Record<string, string>>({});
  const [completedSetupStepIds, setCompletedSetupStepIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('counselor_setup_step_ids');
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [ctaDismissed, setCtaDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem('cta_bar_dismissed') === '1'; } catch { return false; }
  });
  
  useEffect(() => {
    localStorage.setItem('unpassed_exam_course_ids', JSON.stringify(unpassedExamCourseIds));
  }, [unpassedExamCourseIds]);

  useEffect(() => {
    localStorage.setItem('counselor_setup_step_ids', JSON.stringify(completedSetupStepIds));
  }, [completedSetupStepIds]);

  useEffect(() => {
    localStorage.setItem('path_assignments', JSON.stringify(pathAssignments));
  }, [pathAssignments]);

  // Apply school brand colors as CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    schoolColors.forEach((hex, i) => {
      root.style.setProperty(`--school-color-${i + 1}`, hex);
    });
    return () => {
      schoolColors.forEach((_, i) => {
        root.style.removeProperty(`--school-color-${i + 1}`);
      });
    };
  }, [schoolColors]);

  useEffect(() => {
    if (!isImporterOpen && !stage2Open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isImporterOpen, stage2Open]);

  useEffect(() => {
    if (!lastAppliedMove) return;
    const timer = setTimeout(() => setLastAppliedMove(null), 4000);
    return () => clearTimeout(timer);
  }, [lastAppliedMove]);

  const courseById = useMemo(
    () => new Map<string, HighSchoolCourse>(ALL_COURSES.map((course) => [course.id, course])),
    []
  );
  const selectedPreviewTheme = useMemo(
    () => IMPORTER_COLOR_SCHEMES.find((scheme) => scheme.id === selectedPreviewThemeId) ?? IMPORTER_COLOR_SCHEMES[0],
    [selectedPreviewThemeId]
  );
  const selectedPreviewPathway = useMemo(() => {
    if (importStatus.state !== 'ok') return null;
    return importStatus.pathways.find((pathway) => pathway.code === selectedPreviewPathwayCode) ?? importStatus.pathways[0] ?? null;
  }, [importStatus, selectedPreviewPathwayCode]);

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
    totalCredits,
    wsuResidencyCredits,
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

  const primaryMissingCategory = assignedProgress.missingCategories[0] ?? null;
  const studentNextStepCourse = studentNextStep ? getCourse(studentNextStep.courseId) : null;
  const focusedPoolCourseIds = useMemo(() => {
    if (requiredCoursesInPool.length > 0) {
      return requiredCoursesInPool;
    }

    if (primaryMissingCategory) {
      return selectedAssignments.pool.filter((id) => courseById.get(id)?.genEdCategory === primaryMissingCategory);
    }

    if (assignedProgress.residencyCredits < 20) {
      return selectedAssignments.pool.filter((id) => courseById.get(id)?.type === 'CE');
    }

    return selectedAssignments.pool;
  }, [requiredCoursesInPool, primaryMissingCategory, selectedAssignments.pool, courseById, assignedProgress.residencyCredits]);

  const secondaryPoolCourseIds = useMemo(
    () => selectedAssignments.pool.filter((id) => !focusedPoolCourseIds.includes(id)),
    [selectedAssignments.pool, focusedPoolCourseIds]
  );

  const guidanceFocus = useMemo(() => {
    if (requiredCoursesInPool.length > 0) {
      return {
        eyebrow: 'Step 1',
        title: 'Place required pathway courses first',
        detail: `${requiredCoursesInPool.length} required pathway course${requiredCoursesInPool.length === 1 ? '' : 's'} still need a year assignment.`,
        toneClass: 'border-orange-200 bg-orange-50 text-orange-900',
      };
    }

    if (primaryMissingCategory) {
      return {
        eyebrow: 'Step 2',
        title: `Close the next college requirement gap: ${primaryMissingCategory}`,
        detail: 'Choose a course that satisfies this missing category, then place it in the suggested grade.',
        toneClass: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      };
    }

    if (assignedProgress.residencyCredits < 20) {
      return {
        eyebrow: 'Step 3',
        title: 'Add another Concurrent Enrollment course',
        detail: `The plan still needs ${20 - assignedProgress.residencyCredits} more residency credits from CE classes.`,
        toneClass: 'border-blue-200 bg-blue-50 text-blue-900',
      };
    }

    if (selectedAssignments.pool.length > 0) {
      return {
        eyebrow: 'Final planning pass',
        title: 'Place the remaining optional courses',
        detail: 'You are on track. Finish by placing the strongest remaining electives.',
        toneClass: 'border-slate-200 bg-slate-50 text-slate-900',
      };
    }

    return {
      eyebrow: 'Ready for meeting',
      title: 'The year plan is fully placed',
      detail: 'All roadmap and optional courses are assigned. Move to parent prep and counselor talking points.',
      toneClass: 'border-green-200 bg-green-50 text-green-900',
    };
  }, [requiredCoursesInPool.length, primaryMissingCategory, assignedProgress.residencyCredits, selectedAssignments.pool.length]);

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

  const assignCourseToBucket = (courseId: string, targetBucket: YearBucket | 'pool' | 'onDeck') => {
    setPathAssignments((current) => {
      const currentAssignments = current[selectedPathId] ?? buildInitialAssignments(selectedPath);
      const nextAssignments: PathAssignments = {
        grade10: currentAssignments.grade10.filter((id) => id !== courseId),
        grade11: currentAssignments.grade11.filter((id) => id !== courseId),
        grade12: currentAssignments.grade12.filter((id) => id !== courseId),
        pool: currentAssignments.pool.filter((id) => id !== courseId),
        onDeck: currentAssignments.onDeck.filter((id) => id !== courseId),
      };

      if (targetBucket === 'grade10') nextAssignments.grade10.push(courseId);
      if (targetBucket === 'grade11') nextAssignments.grade11.push(courseId);
      if (targetBucket === 'grade12') nextAssignments.grade12.push(courseId);
      if (targetBucket === 'pool') nextAssignments.pool.push(courseId);
      if (targetBucket === 'onDeck') nextAssignments.onDeck.push(courseId);

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

  const handleApplyRecommendation = () => {
    if (!studentNextStep) return;
    const course = getCourse(studentNextStep.courseId);
    const yearLabel = YEAR_LABELS[studentNextStep.targetYear];
    assignCourseToBucket(studentNextStep.courseId, studentNextStep.targetYear);
    setSelectedCourseId(studentNextStep.courseId);
    if (course) {
      setLastAppliedMove({ courseName: course.name, yearLabel });
    }
  };

  const handleCatalogAssign = (targetBucket: YearBucket | 'onDeck') => {
    if (!catalogAssignCourseId) return;
    assignCourseToBucket(catalogAssignCourseId, targetBucket);
    setCatalogAssignCourseId(null);
  };

  const catalogAssignCourse = catalogAssignCourseId ? getCourse(catalogAssignCourseId) : null;

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
    setLastAppliedMove(null);
  }, [selectedPathId]);

  const handlePlaybookNavigate = (sectionId: string) => {
    setPlaybookHighlight(sectionId);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePlaybookReturn = () => {
    setPlaybookHighlight(null);
    const el = document.getElementById('counselor-tools');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleOptimize = () => {
    const path = selectedPath;
    const allPathCourseIds = new Set([
      ...path.schedule.grade10, ...path.schedule.grade11, ...path.schedule.grade12,
      ...path.recommendedElectives,
    ]);
    const available = ALL_COURSES.filter((c) => allPathCourseIds.has(c.id));
    const prefs = optimizePrefs;

    // Score each course by preference weight
    const scoreCourse = (c: HighSchoolCourse): number => {
      let s = 0;
      const credits = c.wsuEquivalent.reduce((sum, eq) => sum + eq.credits, 0);
      if (prefs.ce && c.type === 'CE') s += 20;
      if (prefs.ap && c.type === 'AP') s += 18;
      if (prefs.genEd && c.genEdCategory) s += 15;
      if (prefs.residency && c.type === 'CE') s += 12;
      s += credits; // heavier courses are more valuable
      return s;
    };

    // Sort by score descending
    const scored = available.map((c) => ({ course: c, score: scoreCourse(c) })).sort((a, b) => b.score - a.score);

    // Assign to grades respecting capacity
    const g10: string[] = [];
    const g11: string[] = [];
    const g12: string[] = [];
    const pool: string[] = [];
    const coveredCategories = new Set<string>();
    let ceCredits = 0;

    // First pass: place pathway-required courses in their default grades
    const requiredG10 = new Set(path.schedule.grade10);
    const requiredG11 = new Set(path.schedule.grade11);
    const requiredG12 = new Set(path.schedule.grade12);
    const placed = new Set<string>();

    for (const id of path.schedule.grade10) {
      if (g10.length < MAX_COURSES_PER_YEAR) {
        g10.push(id); placed.add(id);
        const c = available.find((x) => x.id === id);
        if (c?.genEdCategory) coveredCategories.add(c.genEdCategory);
        if (c?.type === 'CE') ceCredits += c.wsuEquivalent.reduce((s, e) => s + e.credits, 0);
      }
    }
    for (const id of path.schedule.grade11) {
      if (g11.length < MAX_COURSES_PER_YEAR) {
        g11.push(id); placed.add(id);
        const c = available.find((x) => x.id === id);
        if (c?.genEdCategory) coveredCategories.add(c.genEdCategory);
        if (c?.type === 'CE') ceCredits += c.wsuEquivalent.reduce((s, e) => s + e.credits, 0);
      }
    }
    for (const id of path.schedule.grade12) {
      if (g12.length < MAX_COURSES_PER_YEAR) {
        g12.push(id); placed.add(id);
        const c = available.find((x) => x.id === id);
        if (c?.genEdCategory) coveredCategories.add(c.genEdCategory);
        if (c?.type === 'CE') ceCredits += c.wsuEquivalent.reduce((s, e) => s + e.credits, 0);
      }
    }

    // Second pass: fill remaining slots from scored electives
    for (const { course } of scored) {
      if (placed.has(course.id)) continue;

      // If genEd pref is on, prioritize uncovered categories
      let bonus = 0;
      if (prefs.genEd && course.genEdCategory && !coveredCategories.has(course.genEdCategory)) bonus += 50;
      if (prefs.residency && course.type === 'CE' && ceCredits < 20) bonus += 30;
      if (bonus === 0 && !prefs.ce && course.type === 'CE') continue;
      if (bonus === 0 && !prefs.ap && course.type === 'AP') continue;

      // Try to find space in the best grade (spread evenly, prefer later grades for electives)
      const grades: [string[], Set<string>][] = [[g10, requiredG10], [g11, requiredG11], [g12, requiredG12]];
      let assigned = false;
      // Prefer the grade with the most space
      const bySpace = [...grades].sort((a, b) => (MAX_COURSES_PER_YEAR - b[0].length) - (MAX_COURSES_PER_YEAR - a[0].length));
      for (const [grade] of bySpace) {
        if (grade.length < MAX_COURSES_PER_YEAR) {
          grade.push(course.id);
          placed.add(course.id);
          if (course.genEdCategory) coveredCategories.add(course.genEdCategory);
          if (course.type === 'CE') ceCredits += course.wsuEquivalent.reduce((s, e) => s + e.credits, 0);
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        pool.push(course.id);
      }
    }

    // Update assignments
    setPathAssignments((prev) => ({
      ...prev,
      [selectedPathId]: { grade10: g10, grade11: g11, grade12: g12, pool, onDeck: prev[selectedPathId].onDeck },
    }));

    // Flash animation + staggered column animation
    setOptimizeFlash(true);
    setTimeout(() => setOptimizeFlash(false), 1500);
    setOptimizeAnimColumns(new Set([0]));
    setTimeout(() => setOptimizeAnimColumns(new Set([0, 1])), 200);
    setTimeout(() => setOptimizeAnimColumns(new Set([0, 1, 2])), 400);
    setTimeout(() => setOptimizeAnimColumns(new Set()), 1200);

    // Check for remaining gaps — open Stage 2 if any
    const totalSlots = (MAX_COURSES_PER_YEAR * 3) - g10.length - g11.length - g12.length;
    const missingCats = REQUIRED_CATEGORIES.filter((cat) => !coveredCategories.has(cat));
    if (totalSlots > 0 && (missingCats.length > 0 || ceCredits < 20)) {
      setStage2Picks({});
      setTimeout(() => setStage2Open(true), 600);
    }
  };

  // Stage 2: compute gaps and candidate courses
  const stage2Data = useMemo(() => {
    if (!stage2Open) return null;
    const current = selectedAssignments;
    const placedIds = new Set([...current.grade10, ...current.grade11, ...current.grade12]);
    const placedCourses = [...placedIds].map((id) => courseById.get(id)).filter(Boolean) as HighSchoolCourse[];
    const coveredCats = new Set<string>();
    let ceCredits = 0;
    let totalCredits = 0;
    for (const c of placedCourses) {
      if (c.genEdCategory) coveredCats.add(c.genEdCategory);
      const cr = c.wsuEquivalent.reduce((s, e) => s + e.credits, 0);
      if (c.type === 'CE') ceCredits += cr;
      totalCredits += cr;
    }
    const missingCats = REQUIRED_CATEGORIES.filter((cat) => !coveredCats.has(cat));
    const ceGap = Math.max(0, 20 - ceCredits);
    const creditGap = Math.max(0, 60 - totalCredits);
    const slotsLeft = (MAX_COURSES_PER_YEAR * 3) - current.grade10.length - current.grade11.length - current.grade12.length;

    // For each missing gen ed category, find candidate courses from ALL_COURSES
    const genEdOptions: { category: GenEdCategory; courses: HighSchoolCourse[] }[] = missingCats.map((cat) => ({
      category: cat as GenEdCategory,
      courses: ALL_COURSES.filter((c) => c.genEdCategory === cat && !placedIds.has(c.id)),
    }));

    // CE courses not yet placed that could help close residency gap
    const ceCandidates = ceGap > 0
      ? ALL_COURSES.filter((c) => c.type === 'CE' && !placedIds.has(c.id) && !c.genEdCategory)
      : [];

    return { missingCats, genEdOptions, ceGap, ceCredits, creditGap, totalCredits, ceCandidates, slotsLeft };
  }, [stage2Open, selectedAssignments, courseById]);

  const handleStage2Apply = () => {
    const picks = Object.values(stage2Picks).filter(Boolean);
    if (picks.length === 0) { setStage2Open(false); return; }

    setPathAssignments((prev) => {
      const curr = { ...prev[selectedPathId] };
      const g10 = [...curr.grade10];
      const g11 = [...curr.grade11];
      const g12 = [...curr.grade12];
      const pool = curr.pool.filter((id) => !picks.includes(id));

      for (const id of picks) {
        // Remove from pool/onDeck if present
        const poolIdx = pool.indexOf(id);
        if (poolIdx >= 0) pool.splice(poolIdx, 1);

        // Place in grade with most space
        const grades = [g10, g11, g12];
        grades.sort((a, b) => a.length - b.length);
        for (const grade of grades) {
          if (grade.length < MAX_COURSES_PER_YEAR && !grade.includes(id)) {
            grade.push(id);
            break;
          }
        }
      }

      return { ...prev, [selectedPathId]: { ...curr, grade10: g10, grade11: g11, grade12: g12, pool, onDeck: curr.onDeck } };
    });

    setStage2Open(false);
    setStage2Picks({});
    setOptimizeFlash(true);
    setTimeout(() => setOptimizeFlash(false), 1500);
    setOptimizeAnimColumns(new Set([0]));
    setTimeout(() => setOptimizeAnimColumns(new Set([0, 1])), 200);
    setTimeout(() => setOptimizeAnimColumns(new Set([0, 1, 2])), 400);
    setTimeout(() => setOptimizeAnimColumns(new Set()), 1200);
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
    const pageW = 612;
    const ml = 36;
    const mr = 36;
    const pw = pageW - ml - mr; // 540
    let y = 0;

    // Colors matching the app
    const slate900: [number, number, number] = [15, 23, 42];
    const orange500: [number, number, number] = [234, 88, 12];
    const orange200: [number, number, number] = [253, 186, 116];
    const white: [number, number, number] = [255, 255, 255];
    const gray600: [number, number, number] = [75, 85, 99];
    const gray400: [number, number, number] = [156, 163, 175];
    const green600: [number, number, number] = [22, 163, 74];
    const emerald700: [number, number, number] = [4, 120, 87];

    const text = (s: string, x: number, yPos: number, size: number, style: 'normal' | 'bold' = 'normal', color: [number, number, number] = [30, 30, 30]) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', style);
      doc.setTextColor(...color);
      doc.text(s, x, yPos);
    };

    const rect = (x: number, yPos: number, w: number, h: number, color: [number, number, number]) => {
      doc.setFillColor(...color);
      doc.rect(x, yPos, w, h, 'F');
    };

    const roundRect = (x: number, yPos: number, w: number, h: number, r: number, color: [number, number, number]) => {
      doc.setFillColor(...color);
      doc.roundedRect(x, yPos, w, h, r, r, 'F');
    };

    const checkPage = (needed: number) => {
      if (y + needed > 740) {
        doc.addPage();
        y = 36;
      }
    };

    // ── DARK HEADER BAR (matches app's slate-900 banner) ──
    const headerH = 80;
    rect(0, 0, pageW, headerH, slate900);

    // Orange accent line at bottom of header
    rect(0, headerH - 3, pageW, 3, orange500);

    // Header text
    text(`${(previewSchoolName || 'Your School').toUpperCase()}  •  COLLEGE CREDIT PLANNER`, ml, 28, 8, 'bold', orange200);
    text('Student Course Roadmap', ml, 48, 18, 'bold', white);
    text(`${selectedPath.name}`, ml, 64, 11, 'normal', [203, 213, 225]); // slate-300

    // Date in top-right
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.setFontSize(8);
    const dateW = doc.getTextWidth(dateStr);
    text(dateStr, pageW - mr - dateW, 28, 8, 'normal', [148, 163, 184]);

    y = headerH + 20;

    // ── PROGRESS SUMMARY STRIP ──
    const stripH = 80;
    roundRect(ml, y, pw, stripH, 4, [249, 250, 251]); // gray-100
    doc.setDrawColor(229, 231, 235); // gray-200
    doc.roundedRect(ml, y, pw, stripH, 4, 4, 'S');

    // Three stat boxes across the strip
    const statW = pw / 3;
    const statY = y + 14;

    // Credits
    text('Total Credits', ml + 14, statY, 8, 'bold', gray600);
    const credColor = assignedProgress.totalCredits >= 60 ? green600 : orange500;
    text(`${assignedProgress.totalCredits} / 60`, ml + 14, statY + 16, 14, 'bold', credColor);
    text('60 credit hours required', ml + 14, statY + 30, 6.5, 'normal', gray400);
    text('for associate degree', ml + 14, statY + 39, 6.5, 'normal', gray400);

    // Residency
    text('CE Residency', ml + statW + 14, statY, 8, 'bold', gray600);
    const resColor = assignedProgress.residencyCredits >= 20 ? green600 : orange500;
    text(`${assignedProgress.residencyCredits} / 20`, ml + statW + 14, statY + 16, 14, 'bold', resColor);
    text('20 credits must come from', ml + statW + 14, statY + 30, 6.5, 'normal', gray400);
    text('concurrent enrollment (CE)', ml + statW + 14, statY + 39, 6.5, 'normal', gray400);

    // Gen Ed
    text('Gen Ed Coverage', ml + statW * 2 + 14, statY, 8, 'bold', gray600);
    const genColor = assignedProgress.missingCategories.length === 0 ? green600 : orange500;
    text(`${assignedProgress.satisfiedCategories.size} / ${REQUIRED_CATEGORIES.length}`, ml + statW * 2 + 14, statY + 16, 14, 'bold', genColor);
    text('1 course from each of 9', ml + statW * 2 + 14, statY + 30, 6.5, 'normal', gray400);
    text('Gen Ed categories required', ml + statW * 2 + 14, statY + 39, 6.5, 'normal', gray400);

    // Vertical dividers
    doc.setDrawColor(220, 220, 220);
    doc.line(ml + statW, y + 10, ml + statW, y + stripH - 10);
    doc.line(ml + statW * 2, y + 10, ml + statW * 2, y + stripH - 10);

    y += stripH + 16;

    // ── GRADE COLUMNS (side by side) ──
    const colGap = 12;
    const colW = (pw - colGap * 2) / 3;
    const colStartY = y;
    const buckets: YearBucket[] = ['grade10', 'grade11', 'grade12'];
    const gradeLabels = ['Sophomore (10)', 'Junior (11)', 'Senior (12)'];
    const borderColors: [number, number, number][] = [[251, 146, 60], [249, 115, 22], [234, 88, 12]]; // orange-400/500/600

    let maxColBottom = y;

    buckets.forEach((bucket, i) => {
      const colX = ml + i * (colW + colGap);
      let cy = colStartY;

      // Column header with orange top accent
      roundRect(colX, cy, colW, 28, 3, [255, 247, 237]); // orange-50
      roundRect(colX, cy, colW, 3, 3, borderColors[i]); // thin accent on top
      text(gradeLabels[i], colX + 8, cy + 18, 9, 'bold', [154, 52, 18]); // orange-800

      // Credit badge right-aligned
      const credStr = `${yearlyCreditTotals[bucket]} cr`;
      doc.setFontSize(8);
      const credBadgeW = doc.getTextWidth(credStr) + 10;
      roundRect(colX + colW - credBadgeW - 6, cy + 8, credBadgeW, 14, 3, [255, 237, 213]); // orange-100
      text(credStr, colX + colW - credBadgeW - 1, cy + 18, 8, 'bold', [154, 52, 18]);

      cy += 34;

      const ids = selectedAssignments[bucket];
      if (ids.length === 0) {
        text('No courses assigned', colX + 6, cy + 10, 8, 'normal', gray400);
        cy += 18;
      } else {
        for (const id of ids) {
          const course = courseById.get(id);
          if (!course) continue;
          const credits = course.wsuEquivalent.reduce((sum, eq) => sum + eq.credits, 0);

          // Course row background
          roundRect(colX, cy, colW, 22, 3, [255, 255, 255]);
          doc.setDrawColor(240, 240, 240);
          doc.roundedRect(colX, cy, colW, 22, 3, 3, 'S');

          // Course name (truncated to fit column)
          doc.setFontSize(8);
          let displayName = course.name;
          while (doc.getTextWidth(displayName) > colW - 50 && displayName.length > 10) {
            displayName = displayName.slice(0, -1);
          }
          if (displayName !== course.name) displayName += '...';
          text(displayName, colX + 6, cy + 14, 8, 'normal', [30, 30, 30]);

          // Type badge
          const badgeColor: [number, number, number] = course.type === 'CE' ? [255, 237, 213] : [243, 244, 246];
          const badgeText: [number, number, number] = course.type === 'CE' ? [154, 52, 18] : [75, 85, 99];
          const badge = course.type === 'CE' ? 'CE' : course.type;
          doc.setFontSize(6);
          const bw = doc.getTextWidth(badge) + 6;
          roundRect(colX + colW - bw - 20, cy + 5, bw, 12, 2, badgeColor);
          text(badge, colX + colW - bw - 17, cy + 13, 6, 'bold', badgeText);

          // Credits
          text(`${credits}`, colX + colW - 14, cy + 14, 8, 'normal', gray400);

          cy += 26;
        }
      }
      maxColBottom = Math.max(maxColBottom, cy);
    });

    y = maxColBottom + 12;

    // ── GEN ED CHECKLIST ──
    checkPage(80);
    roundRect(ml, y, pw, 20, 4, slate900);
    text('Gen Ed Category Checklist', ml + 10, y + 14, 9, 'bold', white);
    y += 26;

    const catCols = 3;
    const catColW = pw / catCols;
    REQUIRED_CATEGORIES.forEach((cat, i) => {
      const col = i % catCols;
      const row = Math.floor(i / catCols);
      const cx = ml + col * catColW;
      const cy = y + row * 18;
      const isCovered = assignedProgress.satisfiedCategories.has(cat);

      // Checkmark or empty circle
      if (isCovered) {
        roundRect(cx, cy, 10, 10, 2, [220, 252, 231]); // green-100
        text('✓', cx + 2, cy + 8, 8, 'bold', green600);
      } else {
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(cx, cy, 10, 10, 2, 2, 'S');
      }
      text(cat, cx + 14, cy + 9, 8, 'normal', isCovered ? [30, 30, 30] : [180, 80, 40]);
    });

    y += Math.ceil(REQUIRED_CATEGORIES.length / catCols) * 18 + 12;

    // ── SAVINGS CALLOUT ──
    checkPage(50);
    roundRect(ml, y, pw, 40, 4, [236, 253, 245]); // emerald-50
    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.roundedRect(ml, y, pw, 40, 4, 4, 'S');
    text('ESTIMATED COLLEGE SAVINGS', ml + 12, y + 14, 7, 'bold', emerald700);
    text(`$${estimatedParentSavings.toLocaleString()}`, ml + 12, y + 30, 16, 'bold', emerald700);
    text(`${assignedProgress.totalCredits} credits × $${ESTIMATED_TUITION_PER_CREDIT}/credit`, ml + 110, y + 30, 9, 'normal', [75, 85, 99]);
    y += 52;

    // ── COUNSELOR CONTACTS ──
    checkPage(70);
    roundRect(ml, y, pw, 20, 4, slate900);
    text('Academic Support Team', ml + 10, y + 14, 9, 'bold', white);
    y += 26;

    COUNSELORS.forEach((counselor, i) => {
      checkPage(22);
      const rowBg: [number, number, number] = i % 2 === 0 ? [249, 250, 251] : [255, 255, 255];
      roundRect(ml, y, pw, 18, 2, rowBg);
      text(counselor.name, ml + 8, y + 12, 8, 'bold', [30, 30, 30]);
      text(counselor.role, ml + 130, y + 12, 8, 'normal', gray600);
      text(counselor.email, ml + 310, y + 12, 8, 'normal', gray400);
      if (counselor.assignment) {
        text(counselor.assignment, ml + pw - 80, y + 12, 7, 'normal', gray400);
      }
      y += 20;
    });

    y += 10;

    // ── OPTIONAL / SWAP CANDIDATES ──
    const optionalIds = [...selectedAssignments.pool, ...selectedAssignments.onDeck];
    const optionalCourses = optionalIds.map((id) => courseById.get(id)).filter(Boolean) as HighSchoolCourse[];
    if (optionalCourses.length > 0) {
      checkPage(50);
      roundRect(ml, y, pw, 20, 4, [30, 41, 59]); // slate-800
      text('Optional Classes (Swap Candidates)', ml + 10, y + 14, 9, 'bold', white);
      y += 26;

      // Render as compact 2-column grid
      const colW2 = (pw - 10) / 2;
      optionalCourses.forEach((course, i) => {
        const col = i % 2;
        const cx = ml + col * (colW2 + 10);
        if (col === 0) checkPage(18);
        const rowBg: [number, number, number] = Math.floor(i / 2) % 2 === 0 ? [249, 250, 251] : [255, 255, 255];
        roundRect(cx, y, colW2, 16, 2, rowBg);
        text(course.name, cx + 6, y + 11, 7, 'normal', [30, 30, 30]);
        const cCredits = course.wsuEquivalent.reduce((s, e) => s + e.credits, 0);
        text(`${cCredits} cr`, cx + colW2 - 28, y + 11, 7, 'normal', gray400);
        // Type badge
        const badgeColor: [number, number, number] = course.type === 'CE' ? [37, 99, 235] : course.type === 'AP' ? [147, 51, 234] : course.type === 'IB' ? [107, 114, 128] : [156, 163, 175];
        text(course.type, cx + colW2 - 50, y + 11, 6, 'bold', badgeColor);
        if (col === 1 || i === optionalCourses.length - 1) y += 18;
      });
      y += 6;
    }

    // ── FOOTER ──
    const footerY = Math.max(y + 20, 760);
    doc.setDrawColor(229, 231, 235);
    doc.line(ml, footerY, ml + pw, footerY);
    text(`${previewSchoolName || 'Your School'} • College Credit Planner`, ml, footerY + 12, 7, 'normal', gray400);
    text(dateStr, ml + pw - 80, footerY + 12, 7, 'normal', gray400);

    doc.save(`roadmap-${selectedPath.id}.pdf`);
  };

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
        setSelectedPreviewPathwayCode('');
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
        setSelectedPreviewPathwayCode('');
        return;
      }

      const pathwayCodeIndex = headers.indexOf('pathway_code');
      const pathwayNameIndex = headers.indexOf('pathway_name');
      const pathwayMap = new Map<string, string>();

      for (const line of lines.slice(1)) {
        const values = parseCsvLine(line);
        const pathwayCode = values[pathwayCodeIndex]?.trim();
        if (!pathwayCode) continue;

        const pathwayName = values[pathwayNameIndex]?.trim() || pathwayCode;
        if (!pathwayMap.has(pathwayCode)) {
          pathwayMap.set(pathwayCode, pathwayName);
        }
      }

      const pathways = Array.from(pathwayMap.entries())
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (pathways.length === 0) {
        setImportStatus({
          state: 'error',
          fileName: file.name,
          message: 'No pathway data found. Add values in pathway_code and retry.',
        });
        setSelectedPreviewPathwayCode('');
        return;
      }

      const rowCount = lines.length - 1;
      const previewRowCount = Math.min(rowCount, FREE_PREVIEW_ROW_LIMIT);
      const lockedRowCount = Math.max(rowCount - previewRowCount, 0);

      setImportStatus({
        state: 'ok',
        fileName: file.name,
        rowCount,
        previewRowCount,
        lockedRowCount,
        pathways,
      });
      setSelectedPreviewPathwayCode(pathways[0].code);
    } catch {
      setImportStatus({
        state: 'error',
        fileName: file.name,
        message: 'Unable to read this CSV file.',
      });
      setSelectedPreviewPathwayCode('');
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
    const pathIds = new Set([...plannedCourseIds, ...selectedAssignments.onDeck]);

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
  }, [plannedCourseIds, selectedAssignments.onDeck, searchTerm]);


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
        } ${isSelected ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'} ${draggable ? 'cursor-move' : onSelect ? 'cursor-pointer' : ''}`}
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
          {isResidency ? 'Univ CE' : course.type}
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
    <div className="min-h-screen bg-gray-50 font-sans pb-24">
      {/* Top Banner (Solid Background) — uses school primary color */}
      <div className="text-white shadow-xl" style={{ backgroundColor: schoolColors[0] || '#1e293b' }}>
        <div className="max-w-6xl mx-auto p-6 md:p-8">
          
          <div className="flex flex-col md:flex-row gap-6">
             {/* Logo — uses uploaded school logo or default tiger */}
            <div className="hidden md:block w-24 h-24 bg-white/10 rounded-full border-4 border-white/20 overflow-hidden shadow-lg flex-shrink-0 relative">
               <img
                  src={schoolLogoUrl || 'tiger-logo.png'}
                  alt={`${previewSchoolName || 'School'} logo`}
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                  }}
               />
               <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs" style={{zIndex: -1}}>
                  LOGO
               </div>
            </div>

            <div className="flex-grow flex flex-col justify-center text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start space-x-3 mb-2">
                  <GraduationCap className="w-8 h-8" style={{ color: schoolColors[4] || '#fb923c' }} />
                  <span className="font-semibold tracking-wider text-sm uppercase" style={{ color: `${schoolColors[4] || '#fb923c'}cc` }}>{previewSchoolName || 'Your School'} &bull; College Credit Planner</span>
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
	                        <li><strong>20 Credits</strong> from your local university (CE)</li>
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
          <div id="section-pathway-tabs" className={`mt-8 pt-6 border-t border-white/10 scroll-mt-4 rounded-xl transition-shadow ${playbookHighlight === 'section-pathway-tabs' ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900' : ''}`}>
            <div className="flex flex-nowrap gap-3 w-full overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {SKILL_PATHS.map(path => {
                const Icon = path.icon;
                return (
                  <button
                    key={path.id}
                    onClick={() => setSelectedPathId(path.id)}
                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all font-medium whitespace-nowrap ${
                      selectedPathId === path.id
                        ? 'text-white shadow-lg scale-[1.02]'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                    style={selectedPathId === path.id ? { backgroundColor: schoolColors[1] || '#ea580c' } : undefined}
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

        {/* SECTION: COUNSELOR TOOLS -- compact 3-column row */}
        <div id="counselor-tools" className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Card 1: Savings Calculator */}
          <div className="bg-white rounded-xl shadow-md border border-emerald-200 overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-emerald-800 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-200" />
              <span className="text-sm font-bold text-white">Savings Calculator</span>
              <button
                onClick={() => setExpandedCard(expandedCard === 'savings' ? null : 'savings')}
                className="ml-auto p-1 rounded hover:bg-white/10 transition-colors"
                title={expandedCard === 'savings' ? 'Collapse' : 'Expand for details'}
              >
                {expandedCard === 'savings'
                  ? <ChevronUp className="w-3.5 h-3.5 text-emerald-200" />
                  : <ChevronDown className="w-3.5 h-3.5 text-emerald-200" />
                }
              </button>
            </div>
            <div className="p-4 bg-gradient-to-b from-emerald-50 to-white flex-grow">
              {/* Always visible: key numbers */}
              <div className="text-[11px] uppercase tracking-wider font-semibold text-emerald-700">Per-Student Savings</div>
              <div className="text-2xl font-black text-emerald-800 mt-0.5">
                ${estimatedParentSavings.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-600 mt-0.5">
                {assignedProgress.totalCredits} credits × ${ESTIMATED_TUITION_PER_CREDIT}/cr
              </div>
              <div className="mt-3 pt-3 border-t border-emerald-100">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-emerald-700">School-Wide ({studentCount} students)</div>
                <div className="text-xl font-black text-emerald-800 mt-0.5">
                  ${(estimatedParentSavings * studentCount).toLocaleString()}
                </div>
              </div>

              {/* Expanded: slider, board summary, copy */}
              {expandedCard === 'savings' && (
                <div className="mt-4 pt-4 border-t border-emerald-200 space-y-4 animate-[fadeSlideIn_0.2s_ease-out]">
                  <div>
                    <label htmlFor="student-count" className="text-xs font-semibold text-emerald-800">
                      Adjust class size
                    </label>
                    <div className="flex items-center gap-3 mt-1.5">
                      <input
                        id="student-count"
                        type="number"
                        min={1}
                        max={2000}
                        value={studentCount}
                        onChange={(e) => setStudentCount(Math.max(1, Math.min(2000, Number(e.target.value) || 1)))}
                        className="w-16 rounded border border-emerald-300 px-2 py-1 text-sm text-center font-bold text-emerald-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <input
                        type="range"
                        min={10}
                        max={500}
                        step={10}
                        value={studentCount}
                        onChange={(e) => setStudentCount(Number(e.target.value))}
                        className="flex-grow accent-emerald-600 h-2"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-emerald-800 leading-relaxed">
                    <span className="font-semibold">Board-ready:</span> Our school can save families <strong>${(estimatedParentSavings * studentCount).toLocaleString()}</strong> per class while students earn <strong>{assignedProgress.totalCredits}</strong> college credits before graduation.
                  </div>
                  <button
                    onClick={() => {
                      const summary = `By offering concurrent enrollment pathways, our school can save families an estimated $${(estimatedParentSavings * studentCount).toLocaleString()} per graduating class (${studentCount} students × $${estimatedParentSavings.toLocaleString()} each) while students earn up to ${assignedProgress.totalCredits} college credits before graduation.`;
                      navigator.clipboard.writeText(summary).then(() => {
                        setCopiedSavings(true);
                        setTimeout(() => setCopiedSavings(false), 2500);
                      });
                    }}
                    className={`w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                      copiedSavings
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    {copiedSavings ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSavings ? 'Copied!' : 'Copy Summary for Board'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Counselor Quick Start */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-slate-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-orange-300" />
              <span className="text-sm font-bold text-white">Quick Start</span>
              <span className="ml-auto flex items-center gap-1.5">
                <span className="text-[10px] text-slate-300 font-medium">{completedSetupCount}/{COUNSELOR_SETUP_STEPS.length}</span>
                <button
                  onClick={() => setExpandedCard(expandedCard === 'quickstart' ? null : 'quickstart')}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                  title={expandedCard === 'quickstart' ? 'Collapse' : 'Expand for details'}
                >
                  {expandedCard === 'quickstart'
                    ? <ChevronUp className="w-3.5 h-3.5 text-slate-300" />
                    : <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
                  }
                </button>
              </span>
            </div>
            <div className="p-4 flex-grow">
              {/* Always visible: progress bar + summary */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className="h-2 rounded-full bg-orange-500 transition-all duration-500"
                  style={{ width: `${(completedSetupCount / COUNSELOR_SETUP_STEPS.length) * 100}%` }}
                />
              </div>
              <div className="text-sm text-gray-700">
                {completedSetupCount === COUNSELOR_SETUP_STEPS.length
                  ? <span className="font-semibold text-green-700">All steps complete</span>
                  : <span>{COUNSELOR_SETUP_STEPS.length - completedSetupCount} step{COUNSELOR_SETUP_STEPS.length - completedSetupCount !== 1 ? 's' : ''} remaining</span>
                }
              </div>
              <p className="text-xs text-gray-500 mt-1">20-minute onboarding checklist for counselors.</p>

              {/* Expanded: full checklist */}
              {expandedCard === 'quickstart' && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2.5 animate-[fadeSlideIn_0.2s_ease-out]">
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
              )}
            </div>
          </div>

          {/* Card 3: Counselor Playbook */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-blue-800 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-200" />
              <span className="text-sm font-bold text-white">Counselor Playbook</span>
              <button
                onClick={() => setExpandedCard(expandedCard === 'playbook' ? null : 'playbook')}
                className="ml-auto p-1 rounded hover:bg-white/10 transition-colors"
                title={expandedCard === 'playbook' ? 'Collapse' : 'Expand for details'}
              >
                {expandedCard === 'playbook'
                  ? <ChevronUp className="w-3.5 h-3.5 text-blue-200" />
                  : <ChevronDown className="w-3.5 h-3.5 text-blue-200" />
                }
              </button>
            </div>
            <div className="p-4 flex-grow">
              {/* Always visible: 3 phases as compact pills */}
              <p className="text-xs text-gray-500 mb-3">3-phase meeting script for student signup.</p>
              <div className="space-y-1.5">
                {[
                  { label: 'Phase 1: Confirm Goals', section: 'section-pathway-tabs', tip: 'Start here -- help the student pick a pathway' },
                  { label: 'Phase 2: Build the Plan', section: 'section-roadmap', tip: 'Drag courses into Grade 10-12' },
                  { label: 'Phase 3: Family Readiness', section: 'section-meeting-prep', tip: 'Review savings, parent questions, talking points' },
                ].map((phase) => (
                  <div key={phase.section} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    <span className="font-medium text-gray-800">{phase.label}</span>
                  </div>
                ))}
              </div>

              {/* Expanded: clickable phase cards with navigation */}
              {expandedCard === 'playbook' && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2.5 animate-[fadeSlideIn_0.2s_ease-out]">
                  <p className="text-xs text-gray-600 mb-2">Click a phase to jump to that section. A callout will appear so you can find your way back.</p>
                  {[
                    { label: 'Phase 1: Confirm Goals', section: 'section-pathway-tabs', script: '"Which pathway fits your post-high-school plan best?"', detail: 'Use the pathway tabs above to explore options with the student.' },
                    { label: 'Phase 2: Build the Year Plan', section: 'section-roadmap', script: '"Let\'s drag your classes into each grade."', detail: 'Use the roadmap to assign courses, then check credits and requirements.' },
                    { label: 'Phase 3: Family Readiness', section: 'section-meeting-prep', script: '"Here\'s what to share with your family."', detail: 'Review the savings estimate, parent questions, and counselor talking points.' },
                  ].map((phase) => (
                    <button
                      key={phase.section}
                      onClick={() => handlePlaybookNavigate(phase.section)}
                      className="w-full text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-3 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-sm text-blue-900">{phase.label}</div>
                        <ArrowRight className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <div className="text-xs text-blue-700 mt-1 italic">{phase.script}</div>
                      <div className="text-xs text-blue-600 mt-1">{phase.detail}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

	        {/* SECTION 2: YEARLY ROADMAP */}
        <div id="section-roadmap" className={`scroll-mt-4 rounded-xl transition-shadow ${playbookHighlight === 'section-roadmap' ? 'ring-2 ring-blue-400 ring-offset-4' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{selectedPath.name} Roadmap</h2>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadPdf}
                className="text-xs sm:text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 px-3 py-1.5 font-semibold text-gray-700 flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                Download PDF
              </button>
              <button
                onClick={handleResetPathAssignments}
                className="text-xs sm:text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 px-3 py-1.5 font-semibold text-gray-700"
              >
                Reset to Path Default
              </button>
            </div>
          </div>

          {/* Optimizer Hero Card */}
          <div className={`mb-6 rounded-2xl border-2 transition-all duration-500 overflow-hidden ${optimizeFlash ? 'border-green-400 shadow-xl shadow-green-100/60' : 'border-gray-200 shadow-md'}`}>
            <div
              className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-5"
              style={{ background: `linear-gradient(135deg, ${schoolColors[0] || '#1e293b'} 0%, ${schoolColors[3] || '#334155'} 100%)` }}
            >
              {/* Left: title + subtitle */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-yellow-300 flex-shrink-0" />
                  <h3 className="text-lg font-extrabold text-white tracking-tight">Build My Roadmap</h3>
                </div>
                <p className="text-sm text-white/70 leading-snug">Automatically place the highest-value courses across all three grade years based on your priorities.</p>
              </div>
              {/* Right: big button */}
              <button
                onClick={handleOptimize}
                className="flex items-center justify-center gap-2.5 rounded-xl text-white px-7 py-3.5 text-base font-extrabold transition-all duration-150 shadow-lg active:scale-[0.96] hover:brightness-110 flex-shrink-0"
                style={{ backgroundColor: schoolColors[1] || '#ea580c' }}
              >
                <Zap className="w-5 h-5" />
                Auto-Fill Roadmap
              </button>
            </div>
            {/* Preferences row */}
            <div className="bg-white px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest mr-1">Prioritize:</span>
              {[
                { key: 'ce' as const, label: 'CE Credits' },
                { key: 'ap' as const, label: 'AP Credits' },
                { key: 'genEd' as const, label: 'Gen Ed Coverage' },
                { key: 'residency' as const, label: '20 CE Residency' },
              ].map((opt) => (
                <label key={opt.key} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={optimizePrefs[opt.key]}
                    onChange={() => setOptimizePrefs((p) => ({ ...p, [opt.key]: !p[opt.key] }))}
                    className="w-4 h-4 rounded accent-orange-600"
                  />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Manual assign bar (mobile) */}
          {selectedCourseId && (
            <div className="mb-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-blue-800 font-medium">
                {selectedCourse?.name}:
              </span>
              {(['grade10', 'grade11', 'grade12'] as YearBucket[]).map((b) => (
                <button
                  key={b}
                  onClick={() => assignCourseToBucket(selectedCourseId, b)}
                  className="rounded px-2.5 py-1 bg-white border border-blue-200 text-blue-800 hover:bg-blue-50"
                >
                  {b === 'grade10' ? '10' : b === 'grade11' ? '11' : '12'}
                </button>
              ))}
              <button
                onClick={() => assignCourseToBucket(selectedCourseId, 'pool')}
                className="rounded px-2.5 py-1 bg-white border border-blue-200 text-blue-800 hover:bg-blue-50"
              >
                Pool
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                key: 'grade10' as YearBucket,
                label: 'Sophomore',
                badge: '10',
                borderClass: 'border-orange-400',
                credits: yearlyCreditTotals.grade10,
                colIndex: 0,
              },
              {
                key: 'grade11' as YearBucket,
                label: 'Junior',
                badge: '11',
                borderClass: 'border-orange-500',
                credits: yearlyCreditTotals.grade11,
                colIndex: 1,
              },
              {
                key: 'grade12' as YearBucket,
                label: 'Senior',
                badge: '12',
                borderClass: 'border-orange-600',
                credits: yearlyCreditTotals.grade12,
                colIndex: 2,
              },
            ].map((year) => {
              const isAnimating = optimizeAnimColumns.has(year.colIndex);
              return (
              <div key={year.key} className={`bg-white rounded-xl p-4 border-t-4 ${year.borderClass} shadow-sm flex flex-col h-full relative transition-all duration-300 ${isAnimating ? 'ring-2 ring-green-400 ring-offset-2 shadow-lg shadow-green-100/60 scale-[1.02]' : ''}`}>
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
              );
            })}
          </div>
        </div>

	        {/* SECTION 3: GUIDED COUNSELOR WORKSPACE */}
	        <div className="space-y-6">
	          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
	            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
	              <div>
	                <h3 className="text-xl font-bold text-gray-900">Guided Counselor Workspace</h3>
	                <p className="text-sm text-gray-600 mt-1">
	                  Follow one clear move at a time: identify the gap, place the best course, then confirm the checklist updates.
	                </p>
	              </div>
	              <div className={`rounded-lg border px-4 py-3 max-w-md ${guidanceFocus.toneClass}`}>
	                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">{guidanceFocus.eyebrow}</div>
	                <div className="text-base font-bold mt-1">{guidanceFocus.title}</div>
	                <div className="text-sm mt-1 opacity-90">{guidanceFocus.detail}</div>
	              </div>
	            </div>
	          </div>

	          <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.95fr] gap-6 items-start">
	            <div className="space-y-6">
	              <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
	                <div className="px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
	                  <div className="flex items-center justify-between gap-3">
	                    <div>
	                      <h3 className="text-lg font-bold text-gray-900">Do This Next</h3>
	                      <p className="text-sm text-gray-600 mt-1">
	                        Keep the counselor focused on the next highest-value move.
	                      </p>
	                    </div>
	                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold">
	                      {selectedAssignments.pool.length} courses not placed
	                    </span>
	                  </div>
	                </div>

	                <div className="p-5 space-y-5">
	                  {studentNextStep && studentNextStepCourse ? (
	                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
	                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Recommended move</div>
	                      <div className="mt-2 text-lg font-bold text-blue-950">{studentNextStepCourse.name}</div>
	                      <div className="mt-1 text-sm text-blue-900">{studentNextStep.reason}</div>
	                      <div className="mt-2 text-sm text-blue-800">
	                        Place this in <span className="font-semibold">{YEAR_LABELS[studentNextStep.targetYear]}</span>.
	                      </div>
	                      <button
	                        onClick={handleApplyRecommendation}
	                        className="mt-4 text-sm rounded bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 font-semibold"
	                      >
	                        Add Recommended Course to {YEAR_LABELS[studentNextStep.targetYear]}
	                      </button>
	                    </div>
	                  ) : (
	                    <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-900">
	                      <div className="font-semibold">Planning queue is clear</div>
	                      <div className="text-sm mt-1">All unplaced courses have been addressed. Move on to parent prep or final talking points.</div>
	                    </div>
	                  )}

	                  {lastAppliedMove && (
	                    <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 flex items-center gap-3 animate-[fadeSlideIn_0.3s_ease-out]">
	                      <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
	                      <div className="text-sm text-green-900">
	                        <span className="font-semibold">{lastAppliedMove.courseName}</span> placed in <span className="font-semibold">{lastAppliedMove.yearLabel}</span>. Scroll up to see it in the roadmap.
	                      </div>
	                    </div>
	                  )}

	                  <div>
	                    <div className="flex items-center justify-between gap-3 mb-3">
	                      <div>
	                        <h4 className="text-base font-bold text-gray-900">Best choices right now</h4>
	                        <p className="text-sm text-gray-600">
	                          These courses directly support the current planning step.
	                        </p>
	                      </div>
	                      {primaryMissingCategory && (
	                        <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full font-semibold">
	                          Working on: {primaryMissingCategory}
	                        </span>
	                      )}
	                    </div>

	                    <div
	                      className={`grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border-2 border-dashed p-3 transition-colors ${
	                        activeDropZone === 'pool' ? 'border-blue-300 bg-blue-50/40' : 'border-gray-100 bg-gray-50/60'
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
	                      {focusedPoolCourseIds.map((id) => {
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
	                      {focusedPoolCourseIds.length === 0 && (
	                        <div className="text-sm text-gray-500 italic p-3 col-span-full">
	                          No focused course suggestions remain for this step.
	                        </div>
	                      )}
	                    </div>
	                  </div>

	                  <details className="rounded-xl border border-gray-200 bg-gray-50">
	                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-900">
	                      Courses Not Placed Yet ({secondaryPoolCourseIds.length})
	                    </summary>
	                    <div className="border-t border-gray-200 p-4">
	                      {secondaryPoolCourseIds.length > 0 ? (
	                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
	                          {secondaryPoolCourseIds.map((id) => {
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
	                        </div>
	                      ) : (
	                        <div className="text-sm text-gray-500">Everything in the pool is already part of the current focus, or the pool is empty.</div>
	                      )}
	                    </div>
	                  </details>
	                </div>
	              </div>

	              <div id="section-meeting-prep" className={`bg-white rounded-xl shadow-md border border-gray-200 p-5 scroll-mt-4 transition-shadow ${playbookHighlight === 'section-meeting-prep' ? 'ring-2 ring-blue-400 ring-offset-4' : ''}`}>
	                <h3 className="text-lg font-bold text-gray-900 mb-1">After Planning: Parent Meeting Prep</h3>
	                <p className="text-sm text-gray-600 mb-4">
	                  Use this after the course placements are in a good spot.
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
	            </div>

	            <div className="space-y-6 xl:sticky xl:top-6">
	              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
	                <div className="flex items-center justify-between gap-3 mb-4">
	                  <div>
	                    <h3 className="text-lg font-bold text-gray-900">College Requirement Checklist</h3>
	                    <p className="text-sm text-gray-600 mt-1">
	                      Watch this update as you place courses.
	                    </p>
	                  </div>
	                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-semibold">
	                    {assignedProgress.satisfiedCategories.size}/9 covered
	                  </span>
	                </div>

	                {assignedProgress.missingCategories.length > 0 ? (
	                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
	                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Still missing</div>
	                    <div className="mt-2 flex flex-wrap gap-2">
	                      {assignedProgress.missingCategories.map((category) => (
	                        <span key={category} className="px-2 py-1 rounded-full bg-white border border-amber-200 text-xs font-medium text-amber-900">
	                          {category}
	                        </span>
	                      ))}
	                    </div>
	                  </div>
	                ) : (
	                  <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
	                    All General Education categories are currently covered.
	                  </div>
	                )}

	                <div className="grid grid-cols-2 gap-2">
	                  {REQUIRED_CATEGORIES.map((cat) => {
	                    const isDone = assignedProgress.satisfiedCategories.has(cat);
	                    return (
	                      <div key={cat} className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${isDone ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
	                        {isDone ? <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> : <Circle className="w-4 h-4 text-gray-300 shrink-0" />}
	                        <span className={`text-xs font-medium leading-tight ${isDone ? 'text-green-800' : 'text-gray-500'}`}>{cat}</span>
	                      </div>
	                    );
	                  })}
	                </div>

	                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
	                  <div className={`rounded-lg border p-3 ${assignedProgress.residencyCredits >= 20 ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
	                    <div className="text-xs uppercase tracking-wide font-semibold text-gray-700">Residency progress</div>
	                    <div className="text-lg font-bold text-gray-900 mt-1">{assignedProgress.residencyCredits}/20 CE credits</div>
	                  </div>
	                  <div className={`rounded-lg border p-3 ${selectedAssignments.pool.length === 0 ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
	                    <div className="text-xs uppercase tracking-wide font-semibold text-gray-700">Placement progress</div>
	                    <div className="text-lg font-bold text-gray-900 mt-1">{selectedAssignments.pool.length} courses left in pool</div>
	                  </div>
	                </div>
	              </div>
	            </div>
	          </div>
	        </div>

	        {/* SECTION: COUNSELOR TALKING POINTS */}
	        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
	          <h3 className="text-lg font-bold text-gray-900 mb-1">Final Meeting Talking Points</h3>
	          <p className="text-sm text-gray-600 mb-4">
	            These unlock once the plan is fully placed.
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
	              Finish placing the remaining pool courses to unlock final meeting talking points.
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
	              <div className="text-left">
	                <h3 className="text-lg font-bold text-gray-900">Backup Course Catalog</h3>
	                <div className="text-sm font-normal text-gray-500 mt-0.5">Use this when the suggested next course is unavailable or you need another option.</div>
	              </div>
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
                        <CourseCard key={c.id} course={c} compact onSelect={() => setCatalogAssignCourseId(c.id)} />
                      ))}
                    </div>
                  </div>
                ))}
             </div>
           )}
        </div>

        {/* SECTION: ON DECK LIST */}
        {selectedAssignments.onDeck.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">On Deck</h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  Courses you're considering but haven't placed in a year yet.
                </p>
              </div>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-semibold">
                {selectedAssignments.onDeck.length} course{selectedAssignments.onDeck.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedAssignments.onDeck.map((id) => {
                const course = getCourse(id);
                return course ? (
                  <div key={id} className="relative">
                    <CourseCard
                      course={course}
                      compact
                      onSelect={() => setCatalogAssignCourseId(id)}
                    />
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}

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

      {/* Persistent CTA bar */}
      {!ctaDismissed && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-4 px-4 py-3 sm:px-6 bg-gradient-to-r from-slate-900 to-indigo-950 border-t border-indigo-800 shadow-2xl">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white leading-tight">Want this at your school?</div>
            <div className="text-xs text-slate-300 mt-0.5 hidden sm:block">Get a branded planner live for your students in 48 hours.</div>
          </div>
          <a
            href={BOOKING_URL}
            className="flex-shrink-0 inline-flex items-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white px-5 py-2.5 text-sm font-extrabold transition-colors shadow-lg whitespace-nowrap"
          >
            Schedule a 15-Min Call
            <ArrowRight className="w-4 h-4" />
          </a>
          <button
            onClick={() => { setCtaDismissed(true); localStorage.setItem('cta_bar_dismissed', '1'); }}
            className="flex-shrink-0 p-1.5 rounded text-slate-400 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stage 2 Optimizer Modal */}
      {stage2Open && stage2Data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-slate-950/60" onClick={() => setStage2Open(false)} aria-label="Close" />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Fill Remaining Gaps</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {stage2Data.slotsLeft} slot{stage2Data.slotsLeft !== 1 ? 's' : ''} open &middot; {stage2Data.creditGap > 0 ? `${stage2Data.creditGap} credits to 60` : 'Credits met'} &middot; {stage2Data.ceGap > 0 ? `${stage2Data.ceGap} CE credits to 20` : 'CE met'}
                </p>
              </div>
              <button onClick={() => setStage2Open(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-5 space-y-4">
              {/* Missing Gen Ed categories */}
              {stage2Data.genEdOptions.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Missing Gen Ed Requirements</div>
                  <div className="space-y-3">
                    {stage2Data.genEdOptions.map(({ category, courses }) => (
                      <div key={category} className="rounded-lg border border-orange-100 bg-orange-50/50 p-3">
                        <div className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                          {category}
                        </div>
                        {courses.length === 0 ? (
                          <div className="text-xs text-gray-500 italic">No available courses for this category</div>
                        ) : (
                          <div className="space-y-1">
                            {courses.map((c) => {
                              const credits = c.wsuEquivalent.reduce((s, e) => s + e.credits, 0);
                              const isSelected = stage2Picks[category] === c.id;
                              return (
                                <button
                                  key={c.id}
                                  onClick={() => setStage2Picks((p) => ({ ...p, [category]: isSelected ? '' : c.id }))}
                                  className={`w-full text-left flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
                                    isSelected
                                      ? 'bg-orange-600 text-white shadow-sm'
                                      : 'bg-white border border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      isSelected ? 'bg-white/20 text-white' : c.type === 'CE' ? 'bg-blue-100 text-blue-700' : c.type === 'AP' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                                    }`}>{c.type}</span>
                                    <span className="font-medium">{c.name}</span>
                                  </div>
                                  <span className={`text-xs font-semibold ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>{credits} cr</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CE gap filler */}
              {stage2Data.ceGap > 0 && stage2Data.ceCandidates.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    CE Credits for Residency ({stage2Data.ceCredits}/20 &mdash; need {stage2Data.ceGap} more)
                  </div>
                  <div className="space-y-1">
                    {stage2Data.ceCandidates.slice(0, 8).map((c) => {
                      const credits = c.wsuEquivalent.reduce((s, e) => s + e.credits, 0);
                      const key = `ce_${c.id}`;
                      const isSelected = stage2Picks[key] === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setStage2Picks((p) => ({ ...p, [key]: isSelected ? '' : c.id }))}
                          className={`w-full text-left flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>CE</span>
                            <span className="font-medium">{c.name}</span>
                          </div>
                          <span className={`text-xs font-semibold ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>{credits} cr</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {stage2Data.genEdOptions.length === 0 && stage2Data.ceGap === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <div className="font-semibold text-gray-800">All requirements covered!</div>
                  <div className="text-xs mt-1">Your roadmap meets gen ed and CE residency targets.</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="text-xs text-gray-500">
                {Object.values(stage2Picks).filter(Boolean).length} course{Object.values(stage2Picks).filter(Boolean).length !== 1 ? 's' : ''} selected
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStage2Open(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Skip
                </button>
                <button
                  onClick={handleStage2Apply}
                  disabled={Object.values(stage2Picks).filter(Boolean).length === 0}
                  className="rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2 text-sm font-bold transition-colors shadow-sm"
                  style={{ backgroundColor: Object.values(stage2Picks).filter(Boolean).length > 0 ? (schoolColors[1] || '#ea580c') : undefined }}
                >
                  Apply &amp; Fill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Playbook highlight banner -- floating at top when a section is active */}
      {playbookHighlight && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-blue-700 text-white shadow-lg animate-[fadeSlideIn_0.2s_ease-out]">
          <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-200" />
              <span className="text-sm font-semibold">
                {playbookHighlight === 'section-pathway-tabs' && 'Phase 1: Help the student pick a pathway using the tabs below'}
                {playbookHighlight === 'section-roadmap' && 'Phase 2: Drag courses into Grade 10-12, then check credits'}
                {playbookHighlight === 'section-meeting-prep' && 'Phase 3: Review savings and parent questions below'}
              </span>
            </div>
            <button
              onClick={handlePlaybookReturn}
              className="flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Back to Playbook
            </button>
          </div>
        </div>
      )}

      {catalogAssignCourseId && catalogAssignCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-slate-950/50"
            onClick={() => setCatalogAssignCourseId(null)}
            aria-label="Close assignment popup"
          />
          <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-sm p-5">
            <button
              onClick={() => setCatalogAssignCourseId(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Add to Roadmap</div>
              <div className="text-lg font-bold text-gray-900 mt-1">{catalogAssignCourse.name}</div>
              <div className="text-sm text-gray-600 mt-0.5">
                {catalogAssignCourse.wsuEquivalent.reduce((sum, eq) => sum + eq.credits, 0)} credits
                {catalogAssignCourse.genEdCategory && <> &middot; {catalogAssignCourse.genEdCategory}</>}
              </div>
            </div>

            <div className="space-y-2">
              {([
                { bucket: 'grade10' as YearBucket, label: 'Grade 10', count: selectedAssignments.grade10.length },
                { bucket: 'grade11' as YearBucket, label: 'Grade 11', count: selectedAssignments.grade11.length },
                { bucket: 'grade12' as YearBucket, label: 'Grade 12', count: selectedAssignments.grade12.length },
              ]).map(({ bucket, label, count }) => {
                const isFull = count >= MAX_COURSES_PER_YEAR;
                return (
                  <button
                    key={bucket}
                    disabled={isFull}
                    onClick={() => handleCatalogAssign(bucket)}
                    className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
                      isFull
                        ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'border-gray-200 bg-white text-gray-800 hover:bg-blue-50 hover:border-blue-200'
                    }`}
                  >
                    <span>{label}</span>
                    <span className={`text-xs font-medium ${isFull ? 'text-red-400' : 'text-gray-500'}`}>
                      {count}/{MAX_COURSES_PER_YEAR} {isFull ? '(full)' : ''}
                    </span>
                  </button>
                );
              })}

              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => handleCatalogAssign('onDeck')}
                  className="w-full flex items-center justify-between rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                >
                  <span>Add to On Deck</span>
                  <span className="text-xs font-medium text-amber-600">holding list</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => setCatalogAssignCourseId(null)}
              className="mt-3 w-full text-center text-xs text-gray-500 hover:text-gray-700 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isImporterOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6">
          <button
            className="absolute inset-0 bg-slate-950/70"
            onClick={() => setIsImporterOpen(false)}
            aria-label="Close importer modal"
          />
          <div className="relative mx-auto my-6 flex max-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-blue-200 bg-white shadow-2xl overscroll-contain">
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

            <div className="overflow-y-auto p-6 space-y-6">

              {/* STEP 1 LABEL */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-700 text-white text-sm font-extrabold flex-shrink-0">1</div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">Brand your planner</div>
                  <div className="text-xs text-slate-500">See exactly what your school's planner will look like before uploading anything.</div>
                </div>
              </div>

              {/* BRAND CUSTOMIZATION INLINE (Step 1) */}
              <div className="rounded-xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-indigo-50 overflow-hidden">
                <div className="px-5 py-3 bg-violet-800 flex items-center gap-2">
                  <Star className="w-4 h-4 text-violet-200" />
                  <span className="text-sm font-bold text-white">Live Preview — Your School's Planner</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-violet-300 font-semibold">No CSV required</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-violet-200">
                  {/* Left: branding controls */}
                  <div className="p-5 space-y-4">
                    {/* School Name */}
                    <div>
                      <label htmlFor="brand-school-name-top" className="block text-sm font-semibold text-slate-800 mb-1">School or District Name</label>
                      <input
                        id="brand-school-name-top"
                        type="text"
                        value={previewSchoolName}
                        onChange={(e) => setPreviewSchoolName(e.target.value)}
                        placeholder="e.g., Ogden School District"
                        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>

                    {/* Logo Upload */}
                    <div>
                      <div className="text-sm font-semibold text-slate-800 mb-1">School Logo</div>
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full border-2 border-dashed border-violet-300 bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
                          {schoolLogoUrl ? (
                            <img src={schoolLogoUrl} alt="School logo" className="w-full h-full object-contain p-1" />
                          ) : (
                            <div className="text-[9px] text-slate-400 text-center leading-tight px-1">No logo</div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="inline-flex items-center gap-2 rounded-lg bg-violet-700 hover:bg-violet-600 text-white px-3 py-2 text-xs font-semibold cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            Upload Logo
                            <input
                              type="file"
                              accept="image/png,image/svg+xml,image/jpeg,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 512000) { alert('Logo file must be under 500 KB.'); return; }
                                const reader = new FileReader();
                                reader.onload = (ev) => { setSchoolLogoUrl(ev.target?.result as string); };
                                reader.readAsDataURL(file);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          {schoolLogoUrl && (
                            <button onClick={() => setSchoolLogoUrl(null)} className="text-xs text-red-600 hover:text-red-800 font-medium">Remove logo</button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Color Palette */}
                    <div>
                      <div className="text-sm font-semibold text-slate-800 mb-1">School Colors</div>
                      <div className="space-y-2">
                        {['Primary (header/nav)', 'Accent (buttons/highlights)', 'Background (light)', 'Text (dark)', 'Secondary accent'].map((label, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <input
                              type="color"
                              value={schoolColors[i] || '#ffffff'}
                              onChange={(e) => {
                                const next = [...schoolColors];
                                next[i] = e.target.value;
                                setSchoolColors(next);
                              }}
                              className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                            />
                            <input
                              type="text"
                              value={schoolColors[i] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^#?[0-9a-fA-F]{0,6}$/.test(val.replace('#', ''))) {
                                  const next = [...schoolColors];
                                  next[i] = val.startsWith('#') ? val : `#${val}`;
                                  setSchoolColors(next);
                                }
                              }}
                              placeholder="#000000"
                              className="w-24 rounded border border-slate-300 px-2 py-1 text-xs font-mono text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                            <span className="text-xs text-slate-500">{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: live mini-preview */}
                  <div className="p-5 flex flex-col">
                    <div className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                      Live preview with your brand
                    </div>
                    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-lg flex-1">
                      <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: schoolColors[0] || '#1e293b' }}>
                        <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {schoolLogoUrl ? (
                            <img src={schoolLogoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
                          ) : (
                            <GraduationCap className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{previewSchoolName || 'Your School'}</div>
                          <div className="text-[10px] leading-tight" style={{ color: `${schoolColors[4] || '#fb923c'}` }}>
                            Associate Degree Planner
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-0.5 px-2 py-1.5" style={{ backgroundColor: `${schoolColors[3] || '#334155'}` }}>
                        {['Tech & Eng', 'Health Sci', 'Business', 'Social'].map((pw, pi) => (
                          <span
                            key={pw}
                            className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${pi === 0 ? 'bg-white font-bold shadow-sm' : 'bg-white/15 text-white/80'}`}
                            style={pi === 0 ? { color: schoolColors[1] || '#ea580c' } : undefined}
                          >
                            {pw}
                          </span>
                        ))}
                      </div>
                      <div className="p-3 space-y-2.5" style={{ backgroundColor: schoolColors[2] || '#f8fafc' }}>
                        <div className="flex items-center gap-2">
                          <div className="flex-grow h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: '65%', backgroundColor: schoolColors[1] || '#ea580c' }} />
                          </div>
                          <span className="text-[9px] font-bold text-slate-500">39/60 cr</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {['Sophomore', 'Junior', 'Senior'].map((grade, gi) => (
                            <div key={grade} className="rounded border border-slate-200 bg-white p-1.5">
                              <div className="text-[8px] font-bold mb-1 pb-0.5 border-b" style={{ color: schoolColors[3] || '#334155', borderColor: `${schoolColors[1] || '#ea580c'}40` }}>{grade}</div>
                              {[0, 1, 2].map((ci) => (
                                <div key={ci} className="flex items-center gap-1 mb-0.5">
                                  <div className="h-1.5 rounded" style={{ width: `${50 + (gi * 10) + (ci * 8)}%`, backgroundColor: ci === 0 ? `${schoolColors[1] || '#ea580c'}30` : '#e2e8f0' }} />
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                        <div className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1.5 flex items-center justify-between">
                          <span className="text-[9px] font-semibold text-emerald-700">Est. Savings</span>
                          <span className="text-[10px] font-black text-emerald-800">$4,680</span>
                        </div>
                        <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
                          <span>Custom branded site</span>
                          <span className="font-semibold" style={{ color: schoolColors[1] || '#ea580c' }}>{previewSchoolName ? `${previewSchoolName.toLowerCase().replace(/\s+/g, '')}.plannerapp.com` : 'yourschool.plannerapp.com'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 2 LABEL */}
              <div className="flex items-center gap-3 pt-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-700 text-white text-sm font-extrabold flex-shrink-0">2</div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">Import your course data</div>
                  <div className="text-xs text-slate-500">Upload your school's CSV to populate the planner with your actual courses and pathways.</div>
                </div>
              </div>

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
                        Your file is valid. Next: send this validated CSV and the data dictionary to your implementation contact.
                      </div>
                      <div className="mt-3 rounded border border-indigo-200 bg-indigo-50 p-3 text-slate-800">
                        <div className="text-sm font-semibold text-indigo-900">Free Preview active: 1 pathway + first 25 rows</div>
                        <p className="text-xs text-slate-700 mt-1">
                          {importStatus.previewRowCount} rows are shown in preview. {importStatus.lockedRowCount} rows are locked until upgrade.
                        </p>
                        <div className="mt-3 space-y-3">
                          <div>
                            <label htmlFor="free-preview-pathway" className="block text-xs font-semibold text-slate-700 mb-1">
                              Choose one pathway for your free preview
                            </label>
                            <select
                              id="free-preview-pathway"
                              value={selectedPreviewPathwayCode}
                              onChange={(event) => setSelectedPreviewPathwayCode(event.target.value)}
                              className="block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              {importStatus.pathways.map((pathway) => (
                                <option key={pathway.code} value={pathway.code}>
                                  {pathway.name} ({pathway.code})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <div className="text-xs font-semibold text-slate-700 mb-1">Pick a color scheme (8 free options)</div>
                            <div className="grid grid-cols-2 gap-2">
                              {IMPORTER_COLOR_SCHEMES.map((scheme) => (
                                <button
                                  key={scheme.id}
                                  type="button"
                                  onClick={() => setSelectedPreviewThemeId(scheme.id)}
                                  className={`flex items-center gap-2 rounded border px-2 py-1.5 text-xs font-medium transition-colors ${
                                    selectedPreviewThemeId === scheme.id
                                      ? 'border-blue-400 bg-blue-100 text-blue-900'
                                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <span
                                    className="inline-block h-3 w-3 rounded-full border border-white/80 shadow-sm"
                                    style={{ backgroundColor: scheme.accentHex }}
                                  />
                                  {scheme.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 text-amber-500" />
                            Live preview of your school's planner
                          </div>
                          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-lg">
                            {/* Mini app header */}
                            <div className="px-4 py-3" style={{ backgroundColor: selectedPreviewTheme.accentHex }}>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                  <GraduationCap className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div>
                                  <input
                                    type="text"
                                    value={previewSchoolName}
                                    onChange={(e) => setPreviewSchoolName(e.target.value)}
                                    placeholder="Your School"
                                    className="bg-transparent text-white text-sm font-bold w-full outline-none placeholder-white/50"
                                  />
                                  <div className="text-white/60 text-[10px] leading-tight">College Credit Planner &middot; University &amp; AP Credits</div>
                                </div>
                              </div>
                            </div>
                            {/* Mini pathway tabs */}
                            {importStatus.state === 'ok' && importStatus.pathways.length > 0 && (
                              <div className="flex gap-0.5 px-2 py-1.5" style={{ backgroundColor: `${selectedPreviewTheme.accentHex}ee` }}>
                                {importStatus.pathways.slice(0, 4).map((pw) => (
                                  <span
                                    key={pw.code}
                                    className={`text-[9px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                                      pw.code === selectedPreviewPathwayCode
                                        ? 'bg-white font-bold shadow-sm'
                                        : 'bg-white/15 text-white/80'
                                    }`}
                                    style={pw.code === selectedPreviewPathwayCode ? { color: selectedPreviewTheme.accentHex } : undefined}
                                  >
                                    {pw.name}
                                  </span>
                                ))}
                                {importStatus.pathways.length > 4 && (
                                  <span className="text-[9px] text-white/50 px-1 py-0.5">+{importStatus.pathways.length - 4}</span>
                                )}
                              </div>
                            )}
                            {/* Mini dashboard area */}
                            <div className="bg-gray-50 p-3 space-y-2.5">
                              {selectedPreviewPathway && (
                                <div className="text-xs font-bold" style={{ color: selectedPreviewTheme.accentHex }}>
                                  {selectedPreviewPathway.name} Roadmap
                                </div>
                              )}
                              {/* Mini progress bar */}
                              <div className="flex items-center gap-2">
                                <div className="flex-grow h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: '65%', backgroundColor: selectedPreviewTheme.accentHex }} />
                                </div>
                                <span className="text-[9px] font-bold text-slate-500">39/60 cr</span>
                              </div>
                              {/* Mini grade columns */}
                              <div className="grid grid-cols-3 gap-1.5">
                                {['Sophomore', 'Junior', 'Senior'].map((grade, gi) => (
                                  <div key={grade} className="rounded border border-slate-200 bg-white p-1.5">
                                    <div className="text-[8px] font-bold text-slate-600 mb-1 pb-0.5 border-b" style={{ borderColor: `${selectedPreviewTheme.accentHex}40` }}>{grade}</div>
                                    {[0, 1, 2].map((ci) => (
                                      <div key={ci} className="flex items-center gap-1 mb-0.5">
                                        <div
                                          className="h-1.5 rounded"
                                          style={{
                                            width: `${50 + (gi * 10) + (ci * 8)}%`,
                                            backgroundColor: ci === 0 ? `${selectedPreviewTheme.accentHex}30` : '#e2e8f0',
                                          }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                              {/* Mini savings callout */}
                              <div className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1.5 flex items-center justify-between">
                                <span className="text-[9px] font-semibold text-emerald-700">Est. Savings</span>
                                <span className="text-[10px] font-black text-emerald-800">$4,680</span>
                              </div>
                              <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
                                <span>{importStatus.state === 'ok' ? importStatus.previewRowCount : 0} courses &middot; {selectedPreviewTheme.label}</span>
                                <span className="font-semibold" style={{ color: selectedPreviewTheme.accentHex }}>yourschool.plannerapp.com</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Free vs Paid Comparison */}
                      <div className="mt-3 rounded-xl border border-blue-200 bg-white overflow-hidden">
                        <div className="text-xs font-bold text-center py-2 bg-blue-50 text-blue-900 uppercase tracking-wider">What Your School Gets</div>
                        <div className="grid grid-cols-2 divide-x divide-blue-100">
                          <div className="p-3">
                            <div className="text-xs font-bold text-slate-500 uppercase mb-2">Free Preview</div>
                            <ul className="space-y-1.5 text-[11px] text-slate-600">
                              <li className="flex items-start gap-1.5"><Check className="w-3 h-3 text-green-500 mt-0.5 shrink-0" /> 1 pathway preview</li>
                              <li className="flex items-start gap-1.5"><Check className="w-3 h-3 text-green-500 mt-0.5 shrink-0" /> First 25 rows</li>
                              <li className="flex items-start gap-1.5"><Check className="w-3 h-3 text-green-500 mt-0.5 shrink-0" /> 8 color schemes</li>
                              <li className="flex items-start gap-1.5"><Lock className="w-3 h-3 text-slate-300 mt-0.5 shrink-0" /> <span className="text-slate-400">Remaining rows locked</span></li>
                              <li className="flex items-start gap-1.5"><Lock className="w-3 h-3 text-slate-300 mt-0.5 shrink-0" /> <span className="text-slate-400">No branded site</span></li>
                            </ul>
                          </div>
                          <div className="p-3 bg-blue-50/50">
                            <div className="text-xs font-bold text-blue-800 uppercase mb-2 flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-500" /> Full Launch
                            </div>
                            <ul className="space-y-1.5 text-[11px] text-slate-700">
                              <li className="flex items-start gap-1.5"><Unlock className="w-3 h-3 text-blue-600 mt-0.5 shrink-0" /> <strong>All pathways</strong> unlocked</li>
                              <li className="flex items-start gap-1.5"><Unlock className="w-3 h-3 text-blue-600 mt-0.5 shrink-0" /> <strong>All CSV rows</strong> imported</li>
                              <li className="flex items-start gap-1.5"><Unlock className="w-3 h-3 text-blue-600 mt-0.5 shrink-0" /> School-branded <strong>planner site</strong></li>
                              <li className="flex items-start gap-1.5"><Unlock className="w-3 h-3 text-blue-600 mt-0.5 shrink-0" /> <strong>PDF export</strong> for families</li>
                              <li className="flex items-start gap-1.5"><Unlock className="w-3 h-3 text-blue-600 mt-0.5 shrink-0" /> <strong>48-hour</strong> setup turnaround</li>
                            </ul>
                          </div>
                        </div>
                        <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600">
                          <a
                            href={BOOKING_URL}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white text-blue-700 px-4 py-2.5 text-sm font-bold hover:bg-blue-50 transition-colors shadow-sm"
                          >
                            Schedule a 15-Min Call
                            <ArrowRight className="w-4 h-4" />
                          </a>
                        </div>
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
                    <h4 className="text-sm font-semibold text-slate-900">Concrete example: one CSV row to counselor plan</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      This CSV row becomes a Grade 11 required class in the Health pathway.
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                      <div className="rounded border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-600">Before (CSV row)</div>
                        <div className="text-xs font-mono text-slate-700 mt-1">pathway_code=health, course_code=HTHS_1104, year_level=11, placement=required</div>
                      </div>
                      <div className="text-center text-slate-400 text-xs font-semibold">to</div>
                      <div className="rounded border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-600">After (planner view)</div>
                        <div className="text-xs text-slate-700 mt-1">Health Sciences pathway, Grade 11 required class, supports Nursing and EMS advising.</div>
                      </div>
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
