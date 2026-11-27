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
  const match = compact(subject).match(/\bmyp\s*(?:year\s*)?([1-5])\b/i);
  return match ? Number(match[1]) : null;
};

const levelMatch = subject => {
  const match = compact(subject).match(/\b(SL|HL)\b/i);
  return match ? match[1].toUpperCase() : null;
};

const dpCourse = subject => {
  if (/\banalysis\s+and\s+approaches\b|\bAA\b/i.test(subject)) return 'analysis and approaches';
  if (/\bapplications?\s+and\s+interpretations?\b|\bAI\b/i.test(subject)) return 'applications and interpretation';
  return null;
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
  const explicitMyp = /\b(?:myp|middle\s+years\s+programme)\b/i.test(combined);
  const explicitDp = /\b(?:dp|diploma\s+programme)\b/i.test(combined);
  const programme = explicitMyp ? 'myp' : (explicitDp || course || level ? 'dp' : 'ib-unknown');

  return {
    authority: 'IB',
    programme,
    specificity: programme === 'dp' ? (course && level ? 'exact' : 'needs-clarification') : (programme === 'myp' && mypYear ? 'exact' : 'needs-clarification'),
    stage,
    subject,
    course,
    level,
    mypYear,
    schoolYear: year
  };
}

const profileInstruction = ({ stage, subject }, profile) => {
  if (profile.authority === 'NESA') {
    return `Use the official NSW Curriculum/NESA sources for ${stage} ${subject}; confirm the exact course and current syllabus version before aligning questions.`;
  }

  if (profile.programme === 'dp' && profile.specificity === 'exact') {
    return `The request appears to be IB Diploma Programme Mathematics: ${profile.course} ${profile.level}. Confirm the assessment cohort and whether the current or incoming curriculum applies before using official IB DP sources.`;
  }

  if (profile.programme === 'dp') {
    return 'The request appears to be IB Diploma Programme mathematics, but the course and/or level is incomplete. Ask whether it is analysis and approaches or applications and interpretation, and SL or HL, before generating.';
  }

  if (profile.programme === 'myp' && profile.mypYear) {
    return `The request appears to be IB Middle Years Programme mathematics, MYP Year ${profile.mypYear}. Use the official MYP mathematics framework/objectives for that year band and confirm whether standard or extended mathematics applies. The IB does not prescribe a year-by-year content sequence, so the teacher's topics and school scope control the detailed sequence.`;
  }

  if (profile.schoolYear) {
    return `The request says school Year ${profile.schoolYear} in an IB/MYP context. Do not convert school Year ${profile.schoolYear} automatically into an MYP year. Ask for the exact MYP year (1-5) and whether standard or extended mathematics applies before generating. If the teacher or school confirms Year ${profile.schoolYear} = MYP Year ${Math.max(1, Math.min(5, profile.schoolYear - 5))}, use the official MYP Year ${Math.max(1, Math.min(5, profile.schoolYear - 5))} objectives/framework.`;
  }

  return 'The request names IB but does not identify PYP, MYP or DP. Ask for the programme, exact year/course/level, standard or extended mathematics where relevant, and assessment cohort before generating.';
};

export function buildCurriculumSearchInstruction(selectedStage, displaySubject) {
  const identity = { stage: compact(selectedStage), subject: compact(displaySubject) };
  const profile = resolveCurriculumProfile(selectedStage, displaySubject);
  return `Syllabus context: Search. ${profileInstruction(identity, profile)} ${RECEIPT_REQUIREMENTS} MyAITutor has not retrieved or verified these sources.`;
}
