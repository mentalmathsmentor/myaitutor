import { buildSyllabusPacket } from './buildSyllabusPacket';

export function buildWorksheetRequest(params) {
  const {
    // UI selections
    selectedStage,
    selectedSubject,
    customSubject,
    rawQuestions,
    numQuestions,
    difficulty,
    workingSpace,
    includeMarks,
    generateAnswerKey,
    includeWorkedSolutions,
    includeName,
    includeDate,
    schoolName,
    showWatermark,
    syllabusContextMode,
    textbooksProvided,
    firstTimeMode,
    includeCanvasSetup,
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

  const answerKeyStatus = generateAnswerKey 
    ? (includeWorkedSolutions ? 'Generate Teacher Answer Key at the end with full worked solutions & marking rubric.' : 'Generate Teacher Answer Key at the end.')
    : 'No answer key.';

  let headerSpaces = [];
  if (includeName) {
    headerSpaces.push(schoolName.trim() ? `School/Class Name for Header: ${schoolName.trim()}.` : 'Include Name line.');
  }
  if (includeDate) headerSpaces.push('Include Date line.');

  const syllabusPacket = buildSyllabusPacket({ selectedStage, selectedSubject: displaySubject, selectedPoints, syllabusData });
  const hasSelectedPoints = selectedPoints && selectedPoints.length > 0;
  const topicSummary = hasSelectedPoints
    ? syllabusPacket.topicSummary
    : (rawQuestions.trim() ? rawQuestions.trim() : `${selectedStage} ${displaySubject}`);

  let customInstructions = '';
  if (syllabusContextMode === 'Provide') customInstructions += 'I will upload the syllabus. ';
  if (textbooksProvided) customInstructions += 'I will upload textbooks/resources. ';
  if (firstTimeMode) customInstructions += 'FIRST TIME MODE: This is the user\'s first time. Greet them warmly and explain how to iterate on the worksheet. ';
  if (includeCanvasSetup) customInstructions += 'INCLUDE CANVAS SETUP GUIDE: Add Canvas setup tips to your greeting. ';
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
      watermark: showWatermark,
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
