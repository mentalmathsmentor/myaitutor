import { describe, it, expect } from 'vitest';
import { buildWorksheetRequest } from '../buildWorksheetRequest';
import { renderGemHandoffPrompt } from '../renderGemHandoffPrompt';

const params = {
  selectedStage: 'Year 12', selectedSubject: 'Mathematics Advanced', customSubject: '',
  rawQuestions: 'Create original questions about rates of change.', selectedPoints: [], syllabusData: {},
  numQuestions: 10, difficulty: 'Mixed', workingSpace: 'Dynamic Space',
  includeMarks: false, generateAnswerKey: false, includeWorkedSolutions: false,
  includeName: true, includeDate: true, schoolName: '', removeWatermark: false,
  syllabusContextMode: 'Off', textbooksProvided: false, firstTimeMode: false, includeCanvasSetup: false,
};
const compile = changes => renderGemHandoffPrompt(buildWorksheetRequest({ ...params, ...changes }));

describe('selected course and syllabus context reach the copied prompt', () => {
  it.each([
    ['Mathematics Advanced', '', 'Mathematics Advanced'],
    ['English', '', 'English'],
    ['Other', 'Ancient History', 'Ancient History'],
  ])('renders the selected subject %s explicitly', (selectedSubject, customSubject, expected) => {
    const prompt = compile({ selectedSubject, customSubject });
    expect(prompt).toContain(`- **Subject:** ${expected}`);
    expect(prompt).toContain('- **Course:** Year 12');
  });

  it('Search requests official sources for the selected course without claiming retrieval', () => {
    const prompt = compile({ syllabusContextMode: 'Search' });
    expect(prompt).toContain('Syllabus context: Search');
    expect(prompt).toContain('official NESA');
    expect(prompt).toContain('Year 12 Mathematics Advanced');
    expect(prompt).toContain('teaching cohort or syllabus edition');
    expect(prompt).toContain('ask for clarification');
    expect(prompt).toContain('MyAITutor has not retrieved or verified these sources.');
    expect(prompt).not.toContain('SYLLABUS PACKET (NESA ALIGNED)');
  });

  it('Off, Provide and Search produce distinct, non-accumulating instructions', () => {
    const off = compile({});
    const provide = compile({ syllabusContextMode: 'Provide' });
    const search = compile({ syllabusContextMode: 'Search' });
    expect(new Set([off, provide, search]).size).toBe(3);
    expect(off).toContain('Syllabus context: Off');
    expect(off).toContain('The local topic list is not proof of verified NESA alignment.');
    expect(off).not.toContain('Syllabus context: Search');
    expect(provide).toContain('Syllabus context: Provide');
    expect(provide).toContain('upload the syllabus in Gemini');
    expect(provide).not.toContain('Syllabus context: Search');
    expect(search).not.toContain('Syllabus context: Provide');
    expect(off).not.toContain('Consult official NESA sources');
    expect(off).not.toContain('I will upload the syllabus in Gemini');
    expect(provide).not.toContain('Consult official NESA sources');
    expect(search).not.toContain('I will upload the syllabus in Gemini');
  });

  it.each(['Off', 'Provide', 'Search'])('keeps textbook attachments independent of %s', mode => {
    const prompt = compile({ syllabusContextMode: mode, textbooksProvided: true });
    expect(prompt).toContain(`Syllabus context: ${mode}`);
    expect(prompt).toContain('textbooks/resources');
  });

  it('allows source clarification before final LaTeX output', () => {
    const prompt = compile({ syllabusContextMode: 'Search' });
    expect(prompt).toContain('Resolve missing sources or unclear syllabus applicability before generating');
    expect(prompt).not.toContain('Output only the final LaTeX artifact.');
  });
});
