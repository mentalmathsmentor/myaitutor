import { buildSyllabusPacket } from './buildSyllabusPacket';

export function buildWorksheetRequest(params) {
  const {
    // UI selections
    selectedStage,
    selectedSubject,
    customSubject = '',
    rawQuestions = '',
    numQuestions,
    difficulty,
    workingSpace,
    includeMarks,
    generateAnswerKey,
    includeWorkedSolutions,
    includeName,
    includeDate,
    schoolName,
    removeWatermark,
    syllabusContextMode,
    textbooksProvided,
    // Pedagogy
    pedagogicalSpotError,
    pedagogicalParameterShift,
    pedagogicalLimitCase,
    pedagogicalProofStyle,
    pedagogicalWordProblems,
    pedagogicalMultiStep,
    // Data
    selectedPoints,
    syllabusData
  } = params;

  const displaySubject = selectedSubject === 'Other' && customSubject.trim() ? customSubject.trim() : selectedSubject;
  
  const pedagogicalDrills = [];
  if (pedagogicalSpotError) pedagogicalDrills.push('spot-error');
  if (pedagogicalParameterShift) pedagogicalDrills.push('parameter-shift');
  if (pedagogicalLimitCase) pedagogicalDrills.push('limit-case');
  if (pedagogicalProofStyle) pedagogicalDrills.push('proof-style');
  if (pedagogicalWordProblems) pedagogicalDrills.push('word-problems');
  if (pedagogicalMultiStep) pedagogicalDrills.push('multi-step');

  const answerKeyStatus = generateAnswerKey || includeWorkedSolutions
    ? (includeWorkedSolutions ? 'Generate Teacher Answer Key at the end with full worked solutions & marking rubric.' : 'Generate Teacher Answer Key at the end.')
    : 'No answer key.';

  let headerSpaces = [];
  if (schoolName?.trim()) headerSpaces.push(`School/Class Name for Header: ${schoolName.trim()}.`);
  headerSpaces.push(includeName ? 'Include Name line.' : 'No Name line.');
  headerSpaces.push(includeDate ? 'Include Date line.' : 'No Date line.');

  const syllabusPacket = buildSyllabusPacket({ selectedStage, selectedSubject: displaySubject, selectedPoints, syllabusData });
  const hasSelectedPoints = syllabusPacket.dotPoints.length > 0;
  const topicSummary = hasSelectedPoints
    ? syllabusPacket.topicSummary
    : (rawQuestions.trim() ? rawQuestions.trim() : `${selectedStage} ${displaySubject}`);

  let customInstructions = '';
  if (syllabusContextMode === 'Search') {
    customInstructions += `Syllabus context: Search. Consult official NESA sources for ${selectedStage} ${displaySubject} and the selected topics. Use any teacher-supplied teaching cohort or syllabus edition; if applicability is unclear, ask for clarification or a syllabus upload before generating. Identify the source URL and edition used before claiming alignment; do not assume the latest syllabus applies. MyAITutor has not retrieved or verified these sources. `;
  } else if (syllabusContextMode === 'Provide') {
    customInstructions += `Syllabus context: Provide. I will upload the syllabus in Gemini for ${selectedStage} ${displaySubject}. If it is missing or its applicability is unclear, ask for the upload or clarification before generating; do not claim to have read an unavailable attachment. `;
  } else {
    customInstructions += 'Syllabus context: Off. Use the selected topics and teacher brief without requesting a web search. The local topic list is not proof of verified NESA alignment. ';
  }
  if (textbooksProvided) customInstructions += 'I will upload textbooks/resources. ';
  if (hasSelectedPoints && rawQuestions.trim()) customInstructions += 'ADDITIONAL TEACHER NOTES: ' + rawQuestions.trim() + ' ';

  return {
    requestVersion: "2",
    worksheetSettings: {
      course: selectedStage,
      subject: displaySubject,
      difficulty: difficulty,
      numberOfQuestions: numQuestions,
      headerSpaces: headerSpaces.join(' '),
      workingSpace: workingSpace,
      marks: includeMarks ? 'Assign and right-align marks.' : 'No marks.',
      answerKey: answerKeyStatus,
      watermark: !removeWatermark,
      mode: pedagogicalDrills.length === 0 ? 'EXAM STRICT (Pure questions only, no pedagogy tools)' : 'PEDAGOGY (Weave in selected pedagogy tools)'
    },
    topicSummary: topicSummary,
    syllabusPacket: syllabusPacket,
    pedagogicalDrills: pedagogicalDrills,
    customInstructions: customInstructions,
    legacyFields: {
      manual_prompt: (!hasSelectedPoints && rawQuestions.trim()) ? rawQuestions.trim() : '',
      context_source: syllabusContextMode === 'Search' ? 'web' : syllabusContextMode === 'Provide' || textbooksProvided ? 'syllabus' : 'builtin'
    }
  };
}
