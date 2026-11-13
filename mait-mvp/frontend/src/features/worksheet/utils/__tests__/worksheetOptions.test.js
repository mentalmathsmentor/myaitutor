import { it, expect } from 'vitest';
import { buildWorksheetRequest } from '../buildWorksheetRequest';
import { renderGemHandoffPrompt } from '../renderGemHandoffPrompt';
import { pedagogyDirectives } from '../worksheetDirectives';

const base = { selectedStage: 'Year 12', selectedSubject: 'English', customSubject: '', rawQuestions: 'Synthetic brief',
  selectedPoints: [], syllabusData: {}, numQuestions: 10, difficulty: 'Mixed', workingSpace: 'Dynamic Space', syllabusContextMode: 'Off' };
const flags = ['includeMarks', 'generateAnswerKey', 'includeWorkedSolutions', 'includeName', 'includeDate', 'removeWatermark', 'heading'];
it.each(Array.from({ length: 128 }, (_, mask) => mask))('preserves every output option for flag combination %s', mask => {
  const choices = Object.fromEntries(flags.map((name, i) => [name, Boolean(mask & (1 << i))]));
  const request = buildWorksheetRequest({ ...base, ...choices, schoolName: choices.heading ? 'Synthetic class' : '' });
  const prompt = renderGemHandoffPrompt(request);
  expect(prompt).toContain(choices.includeMarks ? 'Assign and right-align marks.' : 'No marks.');
  expect(prompt).toContain(choices.generateAnswerKey || choices.includeWorkedSolutions ? 'Generate Teacher Answer Key' : 'No answer key.');
  expect(prompt.includes('full worked solutions')).toBe(choices.includeWorkedSolutions);
  expect(prompt.includes('marking rubric')).toBe(choices.includeWorkedSolutions);
  expect(prompt).toContain(choices.includeName ? 'Include Name line.' : 'No Name line.');
  expect(prompt).toContain(choices.includeDate ? 'Include Date line.' : 'No Date line.');
  expect(prompt.includes('Synthetic class')).toBe(choices.heading);
  expect(prompt).toContain(`**WATERMARK:** ${choices.removeWatermark ? 'OFF' : 'ON'}`);
});

const pedagogy = ['pedagogicalSpotError', 'pedagogicalParameterShift', 'pedagogicalLimitCase', 'pedagogicalProofStyle', 'pedagogicalWordProblems', 'pedagogicalMultiStep'];
it.each(Array.from({ length: 64 }, (_, mask) => mask))('renders exactly the selected pedagogy instructions for subset %s', mask => {
  const request = buildWorksheetRequest({ ...base, ...Object.fromEntries(pedagogy.map((flag, i) => [flag, Boolean(mask & (1 << i))])) });
  const prompt = renderGemHandoffPrompt(request);
  for (const [i, [id, directive]] of Object.entries(pedagogyDirectives).entries()) {
    expect(request.pedagogicalDrills.includes(id)).toBe(Boolean(mask & (1 << i)));
    expect(prompt.includes(directive)).toBe(Boolean(mask & (1 << i)));
  }
});
