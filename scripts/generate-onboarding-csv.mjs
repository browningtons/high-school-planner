import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const appPath = path.join(rootDir, 'src', 'App.tsx');
const outDir = path.join(rootDir, 'onboarding', 'ogden-csv-single');

function extractArrayLiteral(source, constName) {
  const marker = `const ${constName}`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error(`Could not find constant: ${constName}`);
  }

  const equalsIndex = source.indexOf('=', markerIndex);
  const start = source.indexOf('[', equalsIndex);
  if (start < 0) {
    throw new Error(`Could not find array start for: ${constName}`);
  }

  let depth = 0;
  let quote = null;
  let escaping = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (quote) {
      if (escaping) {
        escaping = false;
        continue;
      }
      if (ch === '\\') {
        escaping = true;
        continue;
      }
      if (ch === quote) {
        quote = null;
      }
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }

    if (ch === '[') {
      depth += 1;
      continue;
    }

    if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }

  throw new Error(`Unterminated array literal for: ${constName}`);
}

function evalArrayLiteral(literal, context = {}) {
  return vm.runInNewContext(`(${literal})`, context, { timeout: 1000 });
}

function csvEscape(value) {
  const stringValue = String(value ?? '');
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function toCsv(rows, headers) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    const line = headers.map((header) => csvEscape(row[header])).join(',');
    lines.push(line);
  }
  return `${lines.join('\n')}\n`;
}

function unique(values) {
  return [...new Set(values)];
}

function generate() {
  const source = fs.readFileSync(appPath, 'utf8');

  const allCoursesLiteral = extractArrayLiteral(source, 'ALL_COURSES');
  const skillPathsLiteral = extractArrayLiteral(source, 'SKILL_PATHS');
  const requiredCategoriesLiteral = extractArrayLiteral(source, 'REQUIRED_CATEGORIES');

  const allCourses = evalArrayLiteral(allCoursesLiteral);
  const skillPaths = evalArrayLiteral(skillPathsLiteral, {
    Zap: 'Zap',
    Heart: 'Heart',
    Briefcase: 'Briefcase',
    Globe: 'Globe',
  });
  const requiredCategories = evalArrayLiteral(requiredCategoriesLiteral);

  const courseRows = allCourses
    .map((course) => {
      const totalCredits = course.wsuEquivalent.reduce((sum, item) => sum + Number(item.credits || 0), 0);
      const courseType = course.type === 'ADDITIONAL' ? 'LOCAL' : course.type;
      const wsuEquivalents = course.wsuEquivalent
        .map((item) => `${item.wsuCode} (${item.credits})`)
        .join('; ');

      return {
        course_code: course.id,
        course_name: course.name,
        credit_hours: totalCredits,
        course_type: courseType,
        subject_area: course.category,
        gen_ed_category: course.genEdCategory ?? '',
        residency_eligible: course.type === 'CE' ? 'true' : 'false',
        ap_ib_exam_required: course.type === 'AP' || course.type === 'IB' ? 'true' : 'false',
        cultural_competence: course.culturalCompetence ? 'true' : 'false',
        wsu_equivalents: wsuEquivalents,
        grade_min: '',
        grade_max: '',
        prerequisites: '',
      };
    })
    .sort((a, b) => a.course_code.localeCompare(b.course_code));

  const pathwayRows = skillPaths.map((pathway) => ({
    pathway_code: pathway.id,
    pathway_name: pathway.name,
    description: pathway.description,
  }));

  const pathwayCourseRows = [];
  for (const pathway of skillPaths) {
    const gradeEntries = [
      ['10', pathway.schedule.grade10],
      ['11', pathway.schedule.grade11],
      ['12', pathway.schedule.grade12],
    ];

    for (const [grade, courseCodes] of gradeEntries) {
      courseCodes.forEach((courseCode, index) => {
        pathwayCourseRows.push({
          pathway_code: pathway.id,
          course_code: courseCode,
          year_level: grade,
          is_required: 'true',
          sequence_order: index + 1,
          placement: 'required',
          notes: '',
        });
      });
    }

    unique(pathway.recommendedElectives).forEach((courseCode) => {
      pathwayCourseRows.push({
        pathway_code: pathway.id,
        course_code: courseCode,
        year_level: '',
        is_required: 'false',
        sequence_order: '',
        placement: 'recommended_elective',
        notes: 'Can be scheduled in any year based on student plan.',
      });
    });
  }

  pathwayCourseRows.sort((a, b) => {
    if (a.pathway_code !== b.pathway_code) {
      return a.pathway_code.localeCompare(b.pathway_code);
    }
    if (a.placement !== b.placement) {
      return a.placement === 'required' ? -1 : 1;
    }
    const yearA = a.year_level === '' ? 99 : Number(a.year_level);
    const yearB = b.year_level === '' ? 99 : Number(b.year_level);
    if (yearA !== yearB) {
      return yearA - yearB;
    }
    const sequenceA = a.sequence_order === '' ? 99 : Number(a.sequence_order);
    const sequenceB = b.sequence_order === '' ? 99 : Number(b.sequence_order);
    if (sequenceA !== sequenceB) {
      return sequenceA - sequenceB;
    }
    return a.course_code.localeCompare(b.course_code);
  });

  const schoolProfile = {
    school_name: 'Ogden High School',
    district_name: 'Ogden School District',
    timezone: 'America/Denver',
    default_start_grade: 10,
    default_target_credits: 60,
    default_ce_residency_credits: 20,
    default_cultural_competence_min: 1,
    required_gened_categories: requiredCategories.join('; '),
  };

  const courseByCode = new Map(courseRows.map((course) => [course.course_code, course]));
  const pathwayByCode = new Map(pathwayRows.map((pathway) => [pathway.pathway_code, pathway]));

  const singleSheetRows = pathwayCourseRows.map((pathwayCourse) => {
    const course = courseByCode.get(pathwayCourse.course_code);
    const pathway = pathwayByCode.get(pathwayCourse.pathway_code);

    if (!course || !pathway) {
      throw new Error(`Missing course or pathway for row: ${JSON.stringify(pathwayCourse)}`);
    }

    return {
      school_name: schoolProfile.school_name,
      district_name: schoolProfile.district_name,
      timezone: schoolProfile.timezone,
      default_start_grade: schoolProfile.default_start_grade,
      default_target_credits: schoolProfile.default_target_credits,
      default_ce_residency_credits: schoolProfile.default_ce_residency_credits,
      default_cultural_competence_min: schoolProfile.default_cultural_competence_min,
      required_gened_categories: schoolProfile.required_gened_categories,
      pathway_code: pathway.pathway_code,
      pathway_name: pathway.pathway_name,
      pathway_description: pathway.description,
      year_level: pathwayCourse.year_level,
      placement: pathwayCourse.placement,
      is_required: pathwayCourse.is_required,
      sequence_order: pathwayCourse.sequence_order,
      course_code: course.course_code,
      course_name: course.course_name,
      credit_hours: course.credit_hours,
      course_type: course.course_type,
      subject_area: course.subject_area,
      gen_ed_category: course.gen_ed_category,
      residency_eligible: course.residency_eligible,
      ap_ib_exam_required: course.ap_ib_exam_required,
      cultural_competence: course.cultural_competence,
      wsu_equivalents: course.wsu_equivalents,
      prerequisites: course.prerequisites,
      grade_min: course.grade_min,
      grade_max: course.grade_max,
      notes: pathwayCourse.notes,
    };
  });

  const singleSheetHeaders = [
    'school_name',
    'district_name',
    'timezone',
    'default_start_grade',
    'default_target_credits',
    'default_ce_residency_credits',
    'default_cultural_competence_min',
    'required_gened_categories',
    'pathway_code',
    'pathway_name',
    'pathway_description',
    'year_level',
    'placement',
    'is_required',
    'sequence_order',
    'course_code',
    'course_name',
    'credit_hours',
    'course_type',
    'subject_area',
    'gen_ed_category',
    'residency_eligible',
    'ap_ib_exam_required',
    'cultural_competence',
    'wsu_equivalents',
    'prerequisites',
    'grade_min',
    'grade_max',
    'notes',
  ];

  const dataDictionaryRows = [
    { field_name: 'school_name', required: 'yes', data_type: 'string', allowed_values: '', example_value: schoolProfile.school_name, description: 'School display name for this template.' },
    { field_name: 'district_name', required: 'yes', data_type: 'string', allowed_values: '', example_value: schoolProfile.district_name, description: 'District name for the school.' },
    { field_name: 'timezone', required: 'yes', data_type: 'iana_timezone', allowed_values: 'e.g. America/Denver', example_value: schoolProfile.timezone, description: 'School timezone for date/schedule logic.' },
    { field_name: 'default_start_grade', required: 'yes', data_type: 'integer', allowed_values: '9,10,11,12', example_value: String(schoolProfile.default_start_grade), description: 'Typical first grade level shown in roadmap.' },
    { field_name: 'default_target_credits', required: 'yes', data_type: 'integer', allowed_values: '>= 0', example_value: String(schoolProfile.default_target_credits), description: 'Total college credits required for completion.' },
    { field_name: 'default_ce_residency_credits', required: 'yes', data_type: 'integer', allowed_values: '>= 0', example_value: String(schoolProfile.default_ce_residency_credits), description: 'Minimum CE/residency credits required.' },
    { field_name: 'default_cultural_competence_min', required: 'yes', data_type: 'integer', allowed_values: '>= 0', example_value: String(schoolProfile.default_cultural_competence_min), description: 'Minimum number of cultural competence courses required.' },
    { field_name: 'required_gened_categories', required: 'yes', data_type: 'semicolon_list', allowed_values: '', example_value: schoolProfile.required_gened_categories, description: 'Required Gen Ed categories, separated by semicolons.' },
    { field_name: 'pathway_code', required: 'yes', data_type: 'string', allowed_values: 'unique per pathway', example_value: 'tech', description: 'Stable pathway identifier.' },
    { field_name: 'pathway_name', required: 'yes', data_type: 'string', allowed_values: '', example_value: 'Technology & Engineering', description: 'Pathway display name.' },
    { field_name: 'pathway_description', required: 'no', data_type: 'string', allowed_values: '', example_value: 'Software, Engineering, Physics', description: 'Pathway summary description.' },
    { field_name: 'year_level', required: 'conditional', data_type: 'integer_or_blank', allowed_values: '9,10,11,12 or blank', example_value: '10', description: 'Required for placement=required; can be blank for electives.' },
    { field_name: 'placement', required: 'yes', data_type: 'enum', allowed_values: 'required,recommended_elective', example_value: 'required', description: 'Where this course sits in the pathway.' },
    { field_name: 'is_required', required: 'yes', data_type: 'boolean', allowed_values: 'true,false', example_value: 'true', description: 'Whether the pathway expects this course by default.' },
    { field_name: 'sequence_order', required: 'conditional', data_type: 'integer_or_blank', allowed_values: '1..N or blank', example_value: '1', description: 'Order within the year for required classes.' },
    { field_name: 'course_code', required: 'yes', data_type: 'string', allowed_values: 'unique per course', example_value: 'CE_ENG_1010', description: 'Stable course identifier.' },
    { field_name: 'course_name', required: 'yes', data_type: 'string', allowed_values: '', example_value: 'English 1010 CE', description: 'Course display name.' },
    { field_name: 'credit_hours', required: 'yes', data_type: 'number', allowed_values: '>= 0', example_value: '3', description: 'Total credit hours earned for this course.' },
    { field_name: 'course_type', required: 'yes', data_type: 'enum', allowed_values: 'CE,AP,IB,LOCAL', example_value: 'CE', description: 'Course credit type.' },
    { field_name: 'subject_area', required: 'yes', data_type: 'string', allowed_values: '', example_value: 'English', description: 'Subject/category grouping for course catalog.' },
    { field_name: 'gen_ed_category', required: 'no', data_type: 'string', allowed_values: '', example_value: 'English 1', description: 'Mapped Gen Ed requirement category if applicable.' },
    { field_name: 'residency_eligible', required: 'yes', data_type: 'boolean', allowed_values: 'true,false', example_value: 'true', description: 'Whether this course counts toward residency/CE minimum.' },
    { field_name: 'ap_ib_exam_required', required: 'yes', data_type: 'boolean', allowed_values: 'true,false', example_value: 'false', description: 'Whether AP/IB exam pass is required for credits to count.' },
    { field_name: 'cultural_competence', required: 'yes', data_type: 'boolean', allowed_values: 'true,false', example_value: 'false', description: 'Whether course satisfies cultural competence.' },
    { field_name: 'wsu_equivalents', required: 'no', data_type: 'semicolon_list', allowed_values: 'CODE (credits); CODE (credits)', example_value: 'ENG 1010 (3)', description: 'Equivalent college course mapping(s).' },
    { field_name: 'prerequisites', required: 'no', data_type: 'semicolon_list', allowed_values: 'course_code; course_code', example_value: '', description: 'Prerequisite course codes separated by semicolons.' },
    { field_name: 'grade_min', required: 'no', data_type: 'integer_or_blank', allowed_values: '9,10,11,12 or blank', example_value: '', description: 'Minimum grade allowed to take this course.' },
    { field_name: 'grade_max', required: 'no', data_type: 'integer_or_blank', allowed_values: '9,10,11,12 or blank', example_value: '', description: 'Maximum grade allowed to take this course.' },
    { field_name: 'notes', required: 'no', data_type: 'string', allowed_values: '', example_value: 'Can be scheduled in any year based on student plan.', description: 'Optional planning note for this row.' },
  ];

  const readme = `# Single CSV Template\n\nThis version is intentionally denormalized so admins can work in one sheet.\n\n## Files\n- school_planner_template.csv\n- data_dictionary.csv\n\n## How to use\n1. Open one file in Excel or Google Sheets.\n2. Edit school-wide defaults in the top rows and fill changes down.\n3. Edit course/pathway rows as needed.\n4. Keep \`course_code\` and \`pathway_code\` stable when possible.\n5. Save as CSV UTF-8 and send one file.\n\n## Notes\n- Each row is a pathway-course placement.\n- The same course may appear on multiple rows if used in multiple pathways.\n- \`placement=required\` rows are scheduled roadmap classes.\n- \`placement=recommended_elective\` rows are optional.\n`;

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, 'school_planner_template.csv'),
    toCsv(singleSheetRows, singleSheetHeaders)
  );

  fs.writeFileSync(
    path.join(outDir, 'data_dictionary.csv'),
    toCsv(dataDictionaryRows, [
      'field_name',
      'required',
      'data_type',
      'allowed_values',
      'example_value',
      'description',
    ])
  );

  fs.writeFileSync(path.join(outDir, 'README.md'), readme);

  console.log(`Generated single onboarding CSV in: ${outDir}`);
  console.log(`school_planner_template.csv rows: ${singleSheetRows.length}`);
}

generate();
