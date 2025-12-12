import React, { useState, useMemo, useEffect } from 'react';
import { Zap, Heart, Briefcase, CheckCircle, Circle, BookOpen, GraduationCap, Plus, AlertTriangle, School, Award, ChevronDown, ChevronUp, Search, List, Globe, Mail, User, Calendar, Clock, Check } from 'lucide-react';

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
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // --- NEW: DOB State & Logic ---
  const [childDob, setChildDob] = useState<string>(() => localStorage.getItem('child_dob') || '');
  // State to track if we are in "edit mode" for the date. 
  // If no date exists in storage, default to true.
  const [isEditingDob, setIsEditingDob] = useState<boolean>(!localStorage.getItem('child_dob'));

  useEffect(() => {
    localStorage.setItem('child_dob', childDob);
  }, [childDob]);

  const gradStats = useMemo(() => {
    if (!childDob) return null;
    const dob = new Date(childDob);
    if (isNaN(dob.getTime())) return null;

    // Estimate graduation: typically May of the year they turn 18.
    // Cutoff logic: If born Sep-Dec, usually graduate year they turn 19.
    const month = dob.getMonth(); // 0-11
    let gradYear = dob.getFullYear() + 18;
    if (month >= 8) { // Born Sep or later
        gradYear += 1;
    }
    
    // 10th Grade Start calculation:
    // Graduation is end of 12th.
    // Start of 12th: gradYear - 1 (Sept)
    // Start of 11th: gradYear - 2 (Sept)
    // Start of 10th: gradYear - 3 (Sept)
    const tenthGradeYear = gradYear - 3;

    // Target date: September 1st
    const targetDate = new Date(tenthGradeYear, 8, 1); // Month 8 is September
    const today = new Date();
    
    // Calculate difference
    const diff = targetDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    return { date: targetDate, days: Math.max(0, daysLeft), year: tenthGradeYear };
  }, [childDob]);
  // -----------------------------

  const handleShare = (e: React.FormEvent) => {
    e.preventDefault();
    if(!email) return;
    setIsSending(true);
    // Simulate API call
    setTimeout(() => {
        alert(`PDF Plan sent to ${email}!`);
        setIsSending(false);
        setEmail('');
    }, 1500);
  };

  const handleSaveDob = () => {
    setIsEditingDob(false);
  };

  const selectedPath = useMemo(() => SKILL_PATHS.find(p => p.id === selectedPathId)!, [selectedPathId]);

  // Helper to get course object from ID
  const getCourse = (id: string) => ALL_COURSES.find(c => c.id === id);

  // Computed data for the selected path
  const { satisfiedCats, totalCredits, wsuResidencyCredits, remainingCats } = useMemo(() => {
    const allIds = [
      ...selectedPath.schedule.grade10,
      ...selectedPath.schedule.grade11,
      ...selectedPath.schedule.grade12,
      ...selectedPath.recommendedElectives
    ];
    
    const courses = allIds.map(id => getCourse(id)).filter(Boolean) as HighSchoolCourse[];
    
    const satisfied = new Set<GenEdCategory>();
    let total = 0;
    let residency = 0;

    courses.forEach(c => {
      if (c.genEdCategory) satisfied.add(c.genEdCategory);
      
      const courseTotal = c.wsuEquivalent.reduce((acc, eq) => acc + eq.credits, 0);
      total += courseTotal;

      if (c.type === 'CE') {
        residency += courseTotal;
      }
    });

    const remaining = REQUIRED_CATEGORIES.filter(cat => !satisfied.has(cat));

    return { 
      satisfiedCats: satisfied, 
      totalCredits: total, 
      wsuResidencyCredits: residency,
      remainingCats: remaining
    };
  }, [selectedPath]);

  // Filter courses for catalog (exclude ones already in path or recommended)
  const groupedCatalog = useMemo(() => {
    const pathIds = new Set([
      ...selectedPath.schedule.grade10,
      ...selectedPath.schedule.grade11,
      ...selectedPath.schedule.grade12,
      ...selectedPath.recommendedElectives
    ]);
    
    const available = ALL_COURSES.filter(c => !pathIds.has(c.id)).filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group by category
    const groups: Record<string, HighSchoolCourse[]> = {};
    available.forEach(course => {
      if (!groups[course.category]) groups[course.category] = [];
      groups[course.category].push(course);
    });
    
    return groups;
  }, [selectedPath, searchTerm]);


  const CourseCard: React.FC<{ course: HighSchoolCourse; compact?: boolean }> = ({ course, compact }) => {
    const isResidency = course.type === 'CE';
    
    return (
      <div className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${compact ? 'p-2' : 'p-3 mb-2'}`}>
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
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      {/* Top Banner (Solid Background) */}
      <div className="bg-slate-900 text-white shadow-xl">
        <div className="max-w-6xl mx-auto p-6 md:p-8">
          
          <div className="flex flex-col md:flex-row gap-6">
             {/* Logo Placeholder */}
            <div className="w-full h-full object-cover translate-y-[-2px]">
              <img 
                src="tiger-logo.png" 
                alt="Ogden Tiger" 
                className="w-full h-full object-cover"
              />
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
                        <li>1 Cultural Competence course (*)</li>
                      </ul>
                   </Tooltip>
                </div>
            </div>

            {/* --- NEW: Graduation Countdown Widget in Header + EMAIL FORM --- */}
            <div className="w-full md:w-64 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 flex flex-col gap-4 flex-shrink-0">
                {/* Countdown Section */}
                <div>
                  <h3 className="text-xs font-bold text-orange-200 uppercase tracking-wider mb-2 flex items-center justify-center md:justify-start">
                    <Clock className="w-3 h-3 mr-1.5" /> Time Until 10th Grade
                  </h3>
                  
                  {isEditingDob || !gradStats ? (
                    <div className="text-center">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center bg-white/10 border border-white/20 rounded px-2 py-1.5 flex-grow">
                          <Calendar className="w-3 h-3 text-orange-200 mr-2 flex-shrink-0" />
                          <input 
                            type="date" 
                            className="text-xs text-white bg-transparent outline-none w-full placeholder-white/50"
                            value={childDob}
                            onChange={(e) => setChildDob(e.target.value)}
                          />
                        </div>
                        <button 
                          onClick={handleSaveDob}
                          disabled={!childDob}
                          className="bg-orange-600 text-white p-1.5 rounded hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Save Date"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">Enter student birthdate</p>
                    </div>
                  ) : (
                    <div className="text-center">
                        <div className="text-3xl font-black text-white mb-0 leading-none">{gradStats.days}</div>
                        <div className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-2">Days Left</div>
                        <div className="pt-2 border-t border-white/10 text-[10px] text-slate-400 flex justify-between items-center">
                          <span>Starts: <strong>Sep {gradStats.year}</strong></span>
                          <button onClick={() => setIsEditingDob(true)} className="text-orange-300 hover:text-white underline">Edit</button>
                        </div>
                    </div>
                  )}
                </div>

                {/* Email Plan Section */}
                <div className="pt-4 border-t border-white/10">
                   <h3 className="text-xs font-bold text-orange-200 uppercase tracking-wider mb-2 flex items-center justify-center md:justify-start">
                      <Mail className="w-3 h-3 mr-1.5" /> Share Plan
                   </h3>
                   <form onSubmit={handleShare} className="flex flex-col space-y-2">
                      <input
                        type="email"
                        placeholder="Parent email..."
                        className="px-3 py-1.5 bg-white/10 border border-white/20 rounded text-xs text-white placeholder-white/40 outline-none focus:ring-1 focus:ring-orange-500 w-full"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      <button 
                        type="submit" 
                        disabled={isSending}
                        className="w-full bg-orange-600 text-white py-1.5 rounded text-xs font-bold hover:bg-orange-500 transition-colors flex items-center justify-center disabled:opacity-50"
                      >
                        {isSending ? 'Sending...' : 'Send PDF'}
                      </button>
                   </form>
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
                    <span className="text-gray-700">Total Credits (CE + AP/IB)</span>
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
                  <p className="text-xs text-gray-500 mt-1">Goal: 60 Total Credits for Associate's Degree</p>
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
        </div>
        
        {/* SECTION 2: YEARLY ROADMAP */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{selectedPath.name} Roadmap</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Grade 10 */}
            <div className="bg-white rounded-xl p-4 border-t-4 border-orange-400 shadow-sm flex flex-col h-full relative">
              <div className="flex items-center mb-4 pb-2 border-b border-gray-100">
                <div className="bg-orange-100 text-orange-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-2">10</div>
                <h3 className="font-bold text-gray-800">Sophomore</h3>
              </div>
              <div className="space-y-2 flex-grow">
                {selectedPath.schedule.grade10.map(id => {
                  const c = getCourse(id);
                  return c ? <CourseCard key={id} course={c} /> : null;
                })}
              </div>
            </div>

            {/* Grade 11 */}
            <div className="bg-white rounded-xl p-4 border-t-4 border-orange-500 shadow-sm flex flex-col h-full">
              <div className="flex items-center mb-4 pb-2 border-b border-gray-100">
                <div className="bg-orange-100 text-orange-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-2">11</div>
                <h3 className="font-bold text-gray-800">Junior</h3>
              </div>
              <div className="space-y-2 flex-grow">
                {selectedPath.schedule.grade11.map(id => {
                   const c = getCourse(id);
                   return c ? <CourseCard key={id} course={c} /> : null;
                })}
              </div>
            </div>

            {/* Grade 12 */}
            <div className="bg-white rounded-xl p-4 border-t-4 border-orange-600 shadow-sm flex flex-col h-full">
              <div className="flex items-center mb-4 pb-2 border-b border-gray-100">
                <div className="bg-orange-100 text-orange-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-2">12</div>
                <h3 className="font-bold text-gray-800">Senior</h3>
              </div>
              <div className="space-y-2 flex-grow">
                {selectedPath.schedule.grade12.map(id => {
                   const c = getCourse(id);
                   return c ? <CourseCard key={id} course={c} /> : null;
                })}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: ADDITIONS & GEN ED CHECKLIST */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Recommended Additions */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <Plus className="w-5 h-5 mr-2 text-orange-600" />
                  Recommended Additions
                </h3>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 flex-grow">
                {selectedPath.recommendedElectives.map(id => {
                   const c = getCourse(id);
                   return c ? <CourseCard key={id} course={c} /> : null;
                })}
              </div>
          </div>

          {/* Gen Ed Requirements Grid - COMPACT */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
             <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Gen Ed Categories</h3>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">9 Required</span>
             </div>
             <div className="grid grid-cols-3 gap-1">
                {REQUIRED_CATEGORIES.map(cat => {
                   const isDone = satisfiedCats.has(cat);
                   return (
                     <div key={cat} className={`flex flex-col items-center justify-center p-1 rounded text-center border h-auto py-2 ${isDone ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                        {isDone 
                          ? <CheckCircle className="w-4 h-4 text-green-600 mb-0.5" />
                          : <Circle className="w-4 h-4 text-gray-300 mb-0.5" />
                        }
                        <span className={`text-[9px] leading-tight font-medium ${isDone ? 'text-green-800' : 'text-gray-400'}`}>
                          {cat}
                        </span>
                     </div>
                   );
                })}
             </div>
             {remainingCats.length > 0 && (
                <div className="mt-3 text-[10px] text-yellow-800 bg-yellow-100 p-1.5 rounded text-center font-medium border border-yellow-200">
                   Missing: {remainingCats.length} categories
                </div>
             )}
          </div>
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
    </div>
  );
};

export default App;
