const compact = value => String(value || '').replace(/\s+/g, ' ').trim();

const RECEIPT_REQUIREMENTS = [
  'Before generating, retrieve the official curriculum source now; do not rely on memory or MyAITutor topic summaries as proof.',
  'Produce exact receipts for every source used: title, organisation, canonical URL or uploaded filename, version/publication/last-updated/first-assessment date, access date, and the exact section, page, table or heading used.',
  'Quote only short necessary fragments, build a topic -> receipt -> question-number mapping, and include that mapping under Sources.',
  'If exact receipts cannot be produced, stop and ask for a syllabus upload or clarification; never claim alignment.'
].join(' ');

const schoolYearMatch = subject => {
  const match = compact(subject).match(/\b(?:school\s+)?(?:year|yr)\s*(6|7|8|9|10)\b/i);
  return match ? Number(match[1]) : null;
};

const mypYearMatch = subject => {
  const match = compact(subject).match(/\b(?:myp|middle\s+years\s+programme)\s*(?:year\s*)?([1-5])\b/i);
  return match ? Number(match[1]) : null;
};

const levelMatch = subject => {
  const match = compact(subject).match(/\b(SL|HL)\b/i);
  return match ? match[1].toUpperCase() : null;
};

const mypCourseLevel = subject => {
  if (/\bextended\b/i.test(subject)) return 'extended';
  if (/\bstandard\b/i.test(subject)) return 'standard';
  return null;
};

const dpCourse = subject => {
  if (/\banalysis\s+and\s+approaches\b|\bAA\b/i.test(subject)) return 'analysis and approaches';
  if (/\bapplications?\s+and\s+interpretations?\b|\bAI\b/i.test(subject)) return 'applications and interpretation';
  return null;
};

const dpCoreWithoutSlHl = subject => {
  const canonicalSubject = compact(subject)
    .replace(/\binternational\s+baccalaureate\b/gi, ' ')
    .replace(/\bdiploma\s+programme\b/gi, ' ')
    .replace(/\b(?:ib|dp)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return /^(?:core\s+)?(?:theory\s+of\s+knowledge|tok|extended\s+essay|creativity\s*,?\s*activity\s*,?\s*service|cas)$/i.test(canonicalSubject);
};

export function resolveCurriculumProfile(selectedStage, displaySubject) {
  const stage = compact(selectedStage);
  const subject = compact(displaySubject);
  const combined = compact(`${stage} ${subject}`);
  const mentionsIB = /\b(?:ib|international\s+baccalaureate|myp|middle\s+years\s+programme|dp|diploma\s+programme)\b/i.test(combined);

  if (!mentionsIB) {
    return {
      authority: 'NESA',
      programme: 'nsw',
      specificity: 'exact',
      stage,
      subject
    };
  }

  const mypYear = mypYearMatch(subject);
  const year = schoolYearMatch(subject);
  const course = dpCourse(subject);
  const level = levelMatch(subject);
  const courseLevel = mypCourseLevel(subject);
  const explicitMyp = /\b(?:myp|middle\s+years\s+programme)\b/i.test(combined);
  const explicitDp = /\b(?:dp|diploma\s+programme)\b/i.test(combined);
  const programme = explicitMyp ? 'myp' : (explicitDp || course || level ? 'dp' : 'ib-unknown');
  const mathematicsSubject = /\b(?:math|maths|mathematics)\b/i.test(subject) || Boolean(course);
  const usesSlHl = programme === 'dp' && !dpCoreWithoutSlHl(subject);
  let specificity = 'needs-clarification';
  if (programme === 'dp') {
    specificity = mathematicsSubject ? (course && level ? 'exact' : 'needs-clarification') : (level || !usesSlHl ? 'exact' : 'needs-clarification');
  } else if (programme === 'myp' && mypYear && (!mathematicsSubject || mypYear <= 3 || courseLevel)) {
    specificity = 'exact';
  }

  return {
    authority: 'IB',
    programme,
    specificity,
    frameworkColumn: programme === 'myp' && mypYear && mathematicsSubject ? (mypYear <= 3 ? 'myp-1-3' : `myp-4-5-${courseLevel || 'unresolved'}`) : null,
    courseLevel,
    stage,
    subject,
    course,
    level,
    mypYear,
    mathematicsSubject,
    usesSlHl,
    schoolYear: year
  };
}

const profileInstruction = ({ stage, subject }, profile) => {
  if (profile.authority === 'NESA') {
    return `Use the official NSW Curriculum/NESA sources for ${stage} ${subject}; confirm the exact course. Use any teacher-supplied teaching cohort or syllabus edition as the controlling version; if its applicability is unclear, ask for clarification or a syllabus upload before generating. If no edition is supplied, verify the applicable edition from official receipts rather than assuming the latest syllabus applies.`;
  }

  if (profile.programme === 'dp' && !profile.mathematicsSubject) {
    if (profile.level) {
      return `The request appears to be ${subject}. Preserve that subject; do not convert it into mathematics. Use official IB DP sources for the exact subject, ${profile.level} level where that course uses SL/HL, syllabus version and assessment cohort before aligning questions.`;
    }
    if (!profile.usesSlHl) {
      return `The request appears to be ${subject}. Preserve that subject; do not convert it into mathematics. Use official IB DP sources for the exact subject, syllabus version and assessment cohort before aligning questions; do not impose SL/HL because this DP core component does not use those levels.`;
    }
    return `The request appears to be ${subject}, but its level requirements are unresolved. Preserve that subject; do not convert it into mathematics. Verify whether the official course uses SL/HL; if it does, ask whether SL or HL before generating.`;
  }

  if (profile.programme === 'dp' && profile.specificity === 'exact') {
    return `The request appears to be IB Diploma Programme Mathematics: ${profile.course} ${profile.level}. Confirm the assessment cohort and whether the current or incoming curriculum applies before using official IB DP sources. Use the examination session rather than today's date: sessions through November 2028 use the first-assessment-2021 curriculum generation; May 2029 onward uses the first-assessment-2029 generation.`;
  }

  if (profile.programme === 'dp') {
    return 'The request appears to be IB Diploma Programme mathematics, but the course and/or level is incomplete. Ask whether it is analysis and approaches or applications and interpretation, and SL or HL, before generating.';
  }

  if (profile.programme === 'myp' && profile.mypYear && !profile.mathematicsSubject) {
    return `The request appears to be ${subject}, MYP Year ${profile.mypYear}. Preserve that subject; do not convert it into mathematics. Use official IB MYP sources for the exact subject-group objectives and assessment criteria, confirm the school-confirmed assessment-criteria year (1, 3 or 5), and use the teacher's unit scope and sequence. Do not impose mathematics standard/extended requirements; the IB does not prescribe a year-by-year content sequence.`;
  }

  if (profile.programme === 'myp' && profile.mypYear) {
    if (profile.mypYear <= 3) {
      return `The request appears to be IB Middle Years Programme mathematics, MYP Year ${profile.mypYear}. MYP Years 1-3 use one common topic/skill column; do not impose standard/extended. Confirm the school-confirmed assessment-criteria year (1, 3 or 5), exact branch and exact topic/skill row. The IB does not prescribe a year-by-year content sequence, so the teacher's topics and school scope control the detailed sequence.`;
    }
    if (!profile.courseLevel) {
      return `The request appears to be IB Middle Years Programme mathematics, MYP Year ${profile.mypYear}, but the school-defined course level is missing. Ask whether the school uses standard or extended mathematics before generating; do not equate them with DP SL/HL. Also confirm the assessment-criteria year (1, 3 or 5), exact branch and exact topic/skill row.`;
    }
    return `The request appears to be IB Middle Years Programme mathematics, MYP Year ${profile.mypYear} ${profile.courseLevel}. Use the official MYP Years 4-5 ${profile.courseLevel} framework column, while remembering schools define the standard/extended split locally. Confirm the assessment-criteria year (1, 3 or 5), exact branch and exact topic/skill row.`;
  }

  if (profile.schoolYear) {
    const candidate = Math.max(1, Math.min(5, profile.schoolYear - 5));
    return `The request says school Year ${profile.schoolYear} in an IB/MYP context. Do not convert school Year ${profile.schoolYear} automatically into an MYP year. Ask for the exact MYP year (1-5) and school-confirmed assessment-criteria year (1, 3 or 5) before generating. If the teacher or school confirms Year ${profile.schoolYear} = MYP Year ${candidate} for this implementation, use the official MYP Year ${candidate} objectives/framework.`;
  }

  return 'The request names IB but does not identify PYP, MYP or DP. Ask for the programme, exact year/course/level, standard or extended mathematics where relevant, and assessment cohort before generating.';
};

export function buildCurriculumSearchInstruction(selectedStage, displaySubject) {
  const identity = { stage: compact(selectedStage), subject: compact(displaySubject) };
  const profile = resolveCurriculumProfile(selectedStage, displaySubject);
  return `Syllabus context: Search. ${profileInstruction(identity, profile)} ${RECEIPT_REQUIREMENTS} MyAITutor has not retrieved or verified these sources.`;
}
