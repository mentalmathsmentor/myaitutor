// Acceptance regressions from the reviewed fix plan. These run in the default
// test suite and block CI; test:audit also runs this subset for focused diagnosis.
import { describe, it, expect } from 'vitest';
import { buildWorksheetRequest } from '../src/features/worksheet/utils/buildWorksheetRequest';
import { buildSyllabusPacket } from '../src/features/worksheet/utils/buildSyllabusPacket';
import { renderGemHandoffPrompt } from '../src/features/worksheet/utils/renderGemHandoffPrompt';
import { ensureStringArray } from '../src/features/worksheet/utils/promptHelpers';
import syllabus from '../src/syllabus_data.json';
import stages from '../src/stage_subjects.json';
import { resolveCourse } from '../src/features/worksheet/utils/courseCatalogue';

const base = { selectedStage: 'Year 11', selectedSubject: 'Mathematics Advanced', customSubject: '', rawQuestions: 'Synthetic manual brief',
  numQuestions: 10, difficulty: 'Mixed', workingSpace: 'Dynamic Space', includeMarks: false, generateAnswerKey: false,
  includeWorkedSolutions: false, includeName: true, includeDate: true, schoolName: '', removeWatermark: false,
  syllabusContextMode: 'Off', textbooksProvided: false, firstTimeMode: false, includeCanvasSetup: false, selectedPoints: [], syllabusData: {} };
const compile = changes => renderGemHandoffPrompt(buildWorksheetRequest({ ...base, ...changes }));

describe('remaining compiler contract acceptance', () => {
  it('flat catalogue topics survive packet construction', () => {
    const topics = stages['Stage 2 (Yr 3-4)'].Mathematics;
    const result = buildSyllabusPacket({ selectedStage: 'Stage 2 (Yr 3-4)', selectedSubject: 'Mathematics', selectedPoints: [topics[0]], syllabusData: topics });
    expect(result.dotPoints).toContain(topics[0]);
  });
  it('Power Rule guidance cannot globally prohibit the selected Chain Rule', () => {
    const result = buildSyllabusPacket({ selectedStage: 'Year 11', selectedSubject: 'Mathematics Advanced',
      selectedPoints: ['y_11_advanced_calculus_power_rule', 'y_11_advanced_calculus_chain_rule'], syllabusData: syllabus['Year 11 Advanced'] });
    expect(result.dotPoints.some(p => /chain rule/i.test(p))).toBe(true);
    expect(result.exclude).not.toContain('Chain rule applications');
    expect(result.exclude.some(p => /power rule/i.test(p) && /chain rule/i.test(p))).toBe(true);
  });
  it('all-stale selections fall back to the valid manual brief', () => {
    const result = buildWorksheetRequest({ ...base, selectedPoints: ['retired-synthetic-id'] });
    expect(result.topicSummary).toBe(base.rawQuestions);
    expect(result.legacyFields.manual_prompt).toBe(base.rawQuestions);
  });
  it('course-scoped IDs retain registry guidance in the final copied prompt', () => {
    const course = resolveCourse('Year 11', 'Mathematics Advanced');
    const point = course.records.find(p => p.sourceId === 'y_11_advanced_calculus_power_rule');
    expect(point).toBeDefined();
    const prompt = compile({ selectedPoints: [point.id], syllabusData: course.data });
    expect(prompt).toContain(point.label);
    expect(prompt).toContain(`For ${point.label} only: Chain rule applications`);
    expect(prompt).not.toContain(point.id);
  });
  it.each([false, true].flatMap(includeName => [false, true].map(heading => ({ includeName, heading }))))('name=$includeName / heading=$heading stay independent', ({ includeName, heading }) => {
    const result = buildWorksheetRequest({ ...base, includeName, schoolName: heading ? 'Synthetic class' : '' });
    expect(result.worksheetSettings.headerSpaces.includes('Include Name line.')).toBe(includeName);
    expect(result.worksheetSettings.headerSpaces.includes('Synthetic class')).toBe(heading);
  });
  it.each([false, true].flatMap(generateAnswerKey => [false, true].map(includeWorkedSolutions => ({ generateAnswerKey, includeWorkedSolutions }))))('answers=$generateAnswerKey / worked=$includeWorkedSolutions', ({ generateAnswerKey, includeWorkedSolutions }) => {
    const result = buildWorksheetRequest({ ...base, generateAnswerKey, includeWorkedSolutions });
    expect(result.worksheetSettings.answerKey.includes('Answer Key')).toBe(generateAnswerKey || includeWorkedSolutions);
    expect(result.worksheetSettings.answerKey.includes('full worked solutions')).toBe(includeWorkedSolutions);
  });
  it('spot-error conveys the promised one-mark constraint', () => expect(compile({ pedagogicalSpotError: true })).toMatch(/(?:exactly\s+)?(?:1|one)\s+mark/i));
  it('disabled marks and answers remain explicit in the copied prompt', () => {
    expect(compile({})).toContain('No marks.');
    expect(compile({})).toContain('No answer key.');
  });
  it.each([[true, false], [false, true], [true, true]])('first=%s setup=%s stays in application guidance', (firstTimeMode, includeCanvasSetup) => {
    expect(compile({ firstTimeMode, includeCanvasSetup })).not.toMatch(/greet|greeting/i);
  });
  it.each(['exclude', 'assessmentEmphasis', 'questionStyleNotes'])('a guidance-only %s packet survives alongside manual text', field => {
    const request = buildWorksheetRequest(base);
    request.syllabusPacket[field] = ['Synthetic guidance to preserve'];
    expect(renderGemHandoffPrompt(request)).toContain('Synthetic guidance to preserve');
  });
  it.each([null, 'invalid', {}, [null, {}, { label: ['bad'] }, { label: { length: 1 } }]])('normalisation never leaks non-string labels: %j', value => {
    const output = ensureStringArray(value);
    expect(output.every(item => typeof item === 'string')).toBe(true);
  });
});
