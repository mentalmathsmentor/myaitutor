import { describe, it, expect } from 'vitest';
import stages from '../../../../stage_subjects.json';
import syllabus from '../../../../syllabus_data.json';
import { buildWorksheetRequest } from '../buildWorksheetRequest';
import { renderGemHandoffPrompt } from '../renderGemHandoffPrompt';

const base = {
  customSubject: '', rawQuestions: 'Synthetic teacher brief: preserve α, fractions and line breaks.\nSecond instruction.',
  selectedPoints: [], syllabusData: {}, numQuestions: 10, difficulty: 'Mixed', workingSpace: 'Dynamic Space',
  includeMarks: false, generateAnswerKey: false, includeWorkedSolutions: false,
  includeName: true, includeDate: true, schoolName: '', removeWatermark: false,
};
const courses = Object.entries(stages).flatMap(([selectedStage, subjects]) =>
  [...Object.keys(subjects), 'Other'].map(selectedSubject => ({ selectedStage, selectedSubject,
    customSubject: selectedSubject === 'Other' ? '  Custom subject — α & history  ' : '' })));
const modes = ['Off', 'Provide', 'Search'];
const bools = [false, true];
const cases = courses.flatMap(course => modes.flatMap(syllabusContextMode => bools.flatMap(textbooksProvided =>
  bools.flatMap(firstTimeMode => bools.map(includeCanvasSetup => ({ ...course, syllabusContextMode, textbooksProvided, firstTimeMode, includeCanvasSetup }))))));

describe('subject/context preservation across the offered course and context controls', () => {
  // This matrix tests this patch's subject/context guarantees, not syllabus accuracy
  // or the unfixed semantics of first-time/setup/answer/header controls.
  it.each(cases)('$selectedStage / $selectedSubject / $syllabusContextMode / books=$textbooksProvided first=$firstTimeMode setup=$includeCanvasSetup', changes => {
    const request = buildWorksheetRequest({ ...base, ...changes });
    const prompt = renderGemHandoffPrompt(request);
    const subject = changes.selectedSubject === 'Other' ? changes.customSubject.trim() : changes.selectedSubject;
    expect(prompt).toContain(`- **Course:** ${changes.selectedStage}\n`);
    expect(prompt).toContain(`- **Subject:** ${subject}\n`);
    expect(prompt).toContain(base.rawQuestions);
    expect(prompt.match(/Syllabus context: (Off|Provide|Search)\./g)).toEqual([`Syllabus context: ${changes.syllabusContextMode}.`]);
    expect(prompt.includes('I will upload textbooks/resources.')).toBe(changes.textbooksProvided);
    if (changes.syllabusContextMode === 'Search') {
      expect(prompt).toContain(`Consult official NESA sources for ${changes.selectedStage} ${subject}`);
      expect(prompt).toContain('ask for clarification');
      expect(prompt).toContain('has not retrieved or verified');
    }
    if (changes.syllabusContextMode === 'Provide') expect(prompt).toContain(`upload the syllabus in Gemini for ${changes.selectedStage} ${subject}`);
    expect(request.requestVersion).toBe('2');
    expect(Object.keys(request).sort()).toEqual(['customInstructions', 'legacyFields', 'pedagogicalDrills', 'requestVersion', 'syllabusPacket', 'topicSummary', 'worksheetSettings']);
    expect(request.legacyFields.context_source).toBe(changes.syllabusContextMode === 'Search' ? 'web' : changes.syllabusContextMode === 'Provide' || changes.textbooksProvided ? 'syllabus' : 'builtin');
  });
});

const firstPoint = tree => {
  if (Array.isArray(tree)) return tree.find(p => p && typeof p.id === 'string' && typeof p.label === 'string');
  for (const value of Object.values(tree || {})) { const p = firstPoint(value); if (p) return p; }
};
const sourceCases = Object.entries(syllabus).map(([source, tree]) => ({ source, tree, point: firstPoint(tree) })).filter(c => c.point);
describe('real structured topic records retain subject/context with and without manual text', () => {
  it.each(sourceCases.flatMap(c => modes.flatMap(mode => ['', base.rawQuestions].map(rawQuestions => ({ ...c, mode, rawQuestions })))))('$source / $mode / notes=$rawQuestions', ({ source, tree, point, mode, rawQuestions }) => {
    const request = buildWorksheetRequest({ ...base, selectedStage: source, selectedSubject: 'Fixture subject',
      syllabusContextMode: mode, rawQuestions, selectedPoints: [point.id], syllabusData: tree });
    const prompt = renderGemHandoffPrompt(request);
    expect(prompt).toContain('- **Subject:** Fixture subject');
    expect(prompt).toContain(`Syllabus context: ${mode}`);
    expect(request.syllabusPacket.dotPoints).toContain(point.label);
    expect(prompt).toContain(point.label);
    if (rawQuestions) expect(prompt).toContain(rawQuestions);
  });
});

const flags = ['pedagogicalSpotError', 'pedagogicalParameterShift', 'pedagogicalLimitCase', 'pedagogicalProofStyle', 'pedagogicalWordProblems', 'pedagogicalMultiStep'];
const difficulties = ['Mixed', 'Easy -> Hard Progression', 'Mostly Easy', 'Mostly Hard', 'Exam-Style'];
const layouts = ['Working Blank Space (Math)', 'Two-column Compact', 'Ruled lines (Writing)', 'Compact (No space)', 'Dynamic Space'];
describe('supported difficulty/layout/count combinations retain their settings and subject', () => {
  it.each(difficulties.flatMap(difficulty => layouts.flatMap(workingSpace => [1, 50, 100].map(numQuestions => ({ difficulty, workingSpace, numQuestions })))))('$difficulty / $workingSpace / $numQuestions', changes => {
    const request = buildWorksheetRequest({ ...base, ...changes, selectedStage: 'Year 12', selectedSubject: 'Mathematics Advanced', syllabusContextMode: 'Search' });
    const prompt = renderGemHandoffPrompt(request);
    expect(prompt).toContain(`- **Difficulty:** ${changes.difficulty}`);
    expect(prompt).toContain(`- **Working Space:** ${changes.workingSpace}`);
    expect(prompt).toContain(`- **Number of Questions:** ${changes.numQuestions}`);
    expect(prompt).toContain('- **Subject:** Mathematics Advanced');
    expect(prompt).toContain('Syllabus context: Search.');
  });
});

describe('context survives every pedagogy subset and boundary question counts', () => {
  it.each(Array.from({ length: 2 ** flags.length }, (_, mask) => modes.map(mode => ({ mask, mode }))).flat())('pedagogy=$mask / $mode', ({ mask, mode }) => {
    for (const numQuestions of [1, 100]) {
      const request = buildWorksheetRequest({ ...base, selectedStage: 'Year 12', selectedSubject: 'Mathematics Advanced', numQuestions,
        syllabusContextMode: mode, ...Object.fromEntries(flags.map((flag, i) => [flag, Boolean(mask & (1 << i))])) });
      const prompt = renderGemHandoffPrompt(request);
      expect(prompt).toContain('- **Subject:** Mathematics Advanced');
      expect(prompt).toContain(`Syllabus context: ${mode}`);
      expect(prompt).toContain(`- **Number of Questions:** ${numQuestions}`);
    }
  });
});
