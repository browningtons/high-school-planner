import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Download, DollarSign, FileText, GraduationCap, School, Sparkles, Upload, Users } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { ESTIMATED_TUITION_PER_CREDIT, SCHOOL_PRESETS, SKILL_PATHS, YEAR_LABELS } from './schoolData';
import type { SkillPath } from './schoolData';
import {
  assignmentsToCsv,
  generateSampleRoster,
  parseRosterCsv,
  rosterTemplateCsv,
  runDraft,
} from './draftEngine';
import type { DraftResult, RosterStudent } from './draftEngine';
import type { SchoolPreset } from './schoolData';

const PATH_TONES: Record<SkillPath['id'], { bar: string; chip: string }> = {
  tech: { bar: 'bg-sky-500', chip: 'bg-sky-100 text-sky-800' },
  health: { bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800' },
  business: { bar: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800' },
  social: { bar: 'bg-violet-500', chip: 'bg-violet-100 text-violet-800' },
};

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('en-US');

function downloadFile(filename: string, content: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const STUDENT_TABLE_LIMIT = 100;

// One-page class summary for principals/admins: headline stats, pathway
// distribution, and the top of the section-demand table.
function downloadSummaryPdf(result: DraftResult, school: SchoolPreset | null) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' }); // 612 x 792
  const ml = 48;
  const headerColor = school?.colors[0] ?? '#0f172a';

  doc.setFillColor(headerColor);
  doc.rect(0, 0, 612, 92, 'F');
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('Draft Day — Class Summary', ml, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(school ? school.name : 'Incoming class pathway draft', ml, 64);

  const stats = [
    ['Students drafted', num.format(result.totals.students)],
    ['Projected tuition savings', money.format(result.totals.savings)],
    ['College credits earned', num.format(result.totals.credits)],
    ['Avg credits / student', String(result.totals.avgCredits)],
  ];
  const boxW = 123;
  stats.forEach(([label, value], i) => {
    const x = ml + i * (boxW + 8);
    doc.setFillColor('#f8fafc');
    doc.setDrawColor('#e2e8f0');
    doc.roundedRect(x, 116, boxW, 62, 6, 6, 'FD');
    doc.setTextColor('#0f172a');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(value, x + 10, 144);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor('#64748b');
    doc.text(label, x + 10, 162);
  });

  let y = 214;
  doc.setTextColor('#0f172a');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Pathway distribution', ml, y);
  y += 16;
  const tones: Record<string, string> = { tech: '#0ea5e9', health: '#10b981', business: '#f59e0b', social: '#8b5cf6' };
  for (const path of SKILL_PATHS) {
    const count = result.pathwayCounts[path.id];
    const pct = result.totals.students ? count / result.totals.students : 0;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor('#334155');
    doc.text(path.name, ml, y + 9);
    doc.setFillColor('#f1f5f9');
    doc.rect(ml + 170, y, 260, 11, 'F');
    doc.setFillColor(tones[path.id]);
    doc.rect(ml + 170, y, Math.max(2, 260 * pct), 11, 'F');
    doc.setTextColor('#0f172a');
    doc.setFont('helvetica', 'bold');
    doc.text(`${num.format(count)} (${Math.round(pct * 100)}%)`, ml + 442, y + 9);
    y += 20;
  }

  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Section planning (top courses, ${result.sectionSize} students/section)`, ml, y);
  y += 18;
  doc.setFontSize(8);
  doc.setTextColor('#64748b');
  const cols = [ml, ml + 240, ml + 310, ml + 390, ml + 470];
  ['Course', 'Type', 'Year', 'Students', 'Sections'].forEach((h, i) => doc.text(h, cols[i], y));
  y += 6;
  doc.setDrawColor('#e2e8f0');
  doc.line(ml, y, 612 - ml, y);
  y += 14;
  doc.setTextColor('#0f172a');
  for (const d of result.seatDemand.slice(0, 16)) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(d.courseName.slice(0, 48), cols[0], y);
    doc.text(d.courseType, cols[1], y);
    doc.text(YEAR_LABELS[d.grade], cols[2], y);
    doc.text(num.format(d.students), cols[3], y);
    doc.setFont('helvetica', 'bold');
    doc.text(String(d.sections), cols[4], y);
    y += 16;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor('#94a3b8');
  doc.text(
    `Demo estimates from this planner's course catalog at $${ESTIMATED_TUITION_PER_CREDIT}/credit — verify against current school, district, and university catalogs before official advising.`,
    ml,
    768,
    { maxWidth: 612 - ml * 2 },
  );

  doc.save('draft_day_class_summary.pdf');
}

const DraftDay: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const school = useMemo(() => {
    const slug = new URLSearchParams(window.location.search).get('school');
    return SCHOOL_PRESETS.find((p) => p.slug === slug) ?? null;
  }, []);

  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [rosterLabel, setRosterLabel] = useState('');
  const [error, setError] = useState('');
  const [sectionSize, setSectionSize] = useState(30);
  const [drafted, setDrafted] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);

  const result = useMemo(
    () => (drafted && students.length > 0 ? runDraft(students, sectionSize) : null),
    [drafted, students, sectionSize],
  );
  const revealing = drafted && progress < students.length;

  useEffect(() => () => { if (timerRef.current) window.clearInterval(timerRef.current); }, []);

  const loadRoster = (roster: RosterStudent[], label: string) => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setStudents(roster);
    setRosterLabel(label);
    setError('');
    setDrafted(false);
    setProgress(0);
  };

  const handleFile = (file: File) => {
    file.text().then((text) => {
      const parsed = parseRosterCsv(text);
      if (parsed.error) setError(parsed.error);
      else loadRoster(parsed.students, `${file.name} (${parsed.students.length} students)`);
    });
  };

  const startDraft = () => {
    setDrafted(true);
    setProgress(0);
    const step = Math.max(1, Math.ceil(students.length / 60));
    timerRef.current = window.setInterval(() => {
      setProgress((p) => {
        const next = p + step;
        if (next >= students.length) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          return students.length;
        }
        return next;
      });
    }, 30);
  };

  const headerStyle = school ? { backgroundColor: school.colors[0] } : undefined;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-16">
      <div className={school ? 'text-white' : 'bg-slate-900 text-white'} style={headerStyle}>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <button onClick={onBack} className="flex items-center gap-1 text-sm opacity-80 hover:opacity-100 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to planner
          </button>
          <div className="flex items-center gap-3">
            {school?.logo && <img src={school.logo} alt="" className="w-12 h-12 object-contain" />}
            <div>
              <h1 className="text-3xl font-black flex items-center gap-2">
                <Sparkles className="w-7 h-7" /> Draft Day
              </h1>
              <p className="text-sm opacity-90 mt-1">
                Load {school ? `${school.name}'s` : 'an'} incoming class roster and auto-draft every student
                into a college-credit pathway — then see what the whole class earns.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6 space-y-6">
        {/* Roster controls */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> 1. Load the roster
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold cursor-pointer hover:bg-blue-700">
              <Upload className="w-4 h-4" /> Upload roster CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
              />
            </label>
            <button
              onClick={() => loadRoster(generateSampleRoster(312), 'Sample incoming class (312 students)')}
              className="px-4 py-2 rounded-lg border border-blue-300 text-blue-700 text-sm font-semibold hover:bg-blue-50"
            >
              Use sample roster (312 students)
            </button>
            <button
              onClick={() => downloadFile('roster_template.csv', rosterTemplateCsv())}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
            >
              <Download className="w-4 h-4" /> Roster template
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Needs a <code className="bg-gray-100 px-1 rounded">name</code> (or first/last) column; an optional{' '}
            <code className="bg-gray-100 px-1 rounded">interest</code> column steers each student's pathway.
            The roster stays in this browser — nothing is uploaded to a server.
          </p>
          {error && (
            <div className="mt-3 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}
          {rosterLabel && !error && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-emerald-700">Loaded: {rosterLabel}</span>
              <button
                onClick={startDraft}
                disabled={revealing}
                className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60"
              >
                {drafted ? 'Re-run the draft' : 'Run the draft'}
              </button>
            </div>
          )}
        </div>

        {revealing && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="text-4xl font-black text-gray-900 tabular-nums">
              Pick #{num.format(progress)} <span className="text-gray-400">/ {num.format(students.length)}</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">Drafting students onto pathways…</p>
            <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden max-w-lg mx-auto">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(progress / students.length) * 100}%` }} />
            </div>
          </div>
        )}

        {result && !revealing && (
          <>
            <div className="flex justify-end">
              <button
                onClick={() => downloadSummaryPdf(result, school)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700"
              >
                <FileText className="w-4 h-4" /> Download class summary (PDF)
              </button>
            </div>

            {/* Headline stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Students drafted', value: num.format(result.totals.students), icon: Users, tone: 'text-blue-600' },
                { label: 'Projected tuition savings', value: money.format(result.totals.savings), icon: DollarSign, tone: 'text-emerald-600' },
                { label: 'College credits earned', value: num.format(result.totals.credits), icon: GraduationCap, tone: 'text-violet-600' },
                { label: 'Avg credits / student', value: String(result.totals.avgCredits), icon: School, tone: 'text-amber-600' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <stat.icon className={`w-5 h-5 ${stat.tone}`} />
                  <div className="text-2xl font-black text-gray-900 mt-2">{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Pathway distribution */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Pathway distribution</h2>
              <div className="space-y-3">
                {SKILL_PATHS.map((path) => {
                  const count = result.pathwayCounts[path.id];
                  const pct = result.totals.students ? (count / result.totals.students) * 100 : 0;
                  return (
                    <div key={path.id} className="flex items-center gap-3">
                      <path.icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="w-52 text-sm text-gray-700 flex-shrink-0">{path.name}</span>
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${PATH_TONES[path.id].bar}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-24 text-right text-sm font-semibold text-gray-900 tabular-nums">
                        {num.format(count)} ({Math.round(pct)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Seat demand */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                <h2 className="text-sm font-bold text-gray-900">Section planning: seats this draft creates</h2>
                <label className="text-xs text-gray-500 flex items-center gap-2">
                  Students per section
                  <input
                    type="number"
                    min={10}
                    max={60}
                    value={sectionSize}
                    onChange={(e) => setSectionSize(Math.min(60, Math.max(10, Number(e.target.value) || 30)))}
                    className="w-16 rounded border border-gray-300 px-2 py-1 text-sm text-center"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                How many sections of each course this class generates as it moves through grades 10–12 —
                the master-schedule view of the same draft.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                      <th className="py-2 pr-4">Course</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Year</th>
                      <th className="py-2 pr-4 text-right">Students</th>
                      <th className="py-2 text-right">Sections needed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.seatDemand.map((d) => (
                      <tr key={`${d.courseId}-${d.grade}`} className="border-b border-gray-100">
                        <td className="py-2 pr-4 text-gray-900">{d.courseName}</td>
                        <td className="py-2 pr-4">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{d.courseType}</span>
                        </td>
                        <td className="py-2 pr-4 text-gray-600">{YEAR_LABELS[d.grade]}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">{num.format(d.students)}</td>
                        <td className="py-2 text-right font-bold tabular-nums">{d.sections}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Student assignments */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h2 className="text-sm font-bold text-gray-900">Student assignments</h2>
                <button
                  onClick={() => downloadFile('draft_assignments.csv', assignmentsToCsv(result))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                      <th className="py-2 pr-4">Student</th>
                      <th className="py-2 pr-4">Interest</th>
                      <th className="py-2 pr-4">Drafted pathway</th>
                      <th className="py-2 pr-4 text-right">Credits</th>
                      <th className="py-2 text-right">Est. savings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.assignments.slice(0, STUDENT_TABLE_LIMIT).map((a, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-1.5 pr-4 text-gray-900">{a.student.name}</td>
                        <td className="py-1.5 pr-4 text-gray-500">{a.student.interest || '—'}</td>
                        <td className="py-1.5 pr-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PATH_TONES[a.pathId].chip}`}>
                            {a.pathName}
                          </span>
                          {!a.matchedByInterest && <span className="ml-1 text-xs text-gray-400" title="No interest given; assigned to balance pathways">auto</span>}
                        </td>
                        <td className="py-1.5 pr-4 text-right tabular-nums">{a.credits}</td>
                        <td className="py-1.5 text-right tabular-nums">{money.format(a.savings)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.assignments.length > STUDENT_TABLE_LIMIT && (
                <p className="text-xs text-gray-500 mt-2">
                  Showing {STUDENT_TABLE_LIMIT} of {num.format(result.assignments.length)} students — the CSV export has everyone.
                </p>
              )}
            </div>
          </>
        )}

        <p className="text-xs text-gray-400">
          Demo estimates based on this planner's course catalog and a ${ESTIMATED_TUITION_PER_CREDIT}/credit
          tuition assumption — verify against the current school, district, and university catalog before
          official advising.
        </p>
      </div>
    </div>
  );
};

export default DraftDay;
