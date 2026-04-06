import { describe, it, expect, vi } from 'vitest';

// Mock the dependencies that read JSON files at import time
vi.mock('../../../../syllabus_registry.json', () => ({ default: {} }));
vi.mock('../../../../syllabus_data.json', () => ({ default: {} }));
vi.mock('../buildSyllabusPacket', () => ({
  buildSyllabusPacket: vi.fn(({ selectedStage, selectedSubject, selectedPoints }) => ({
    topicSummary: selectedPoints?.length
      ? selectedPoints.join(' | ')
      : `${selectedStage} ${selectedSubject}`,
    outcomes: [],
    dotPoints: selectedPoints || [],
    include: [],
    exclude: [],
    assessmentEmphasis: [],
    questionStyleNotes: [],
  })),
}));

import { buildWorksheetRequest } from '../buildWorksheetRequest';

const baseParams = {
  selectedStage: 'Year 12',
  selectedSubject: 'Mathematics Advanced',
  customSubject: '',
  mode: 'A',
  rawQuestions: '',
  numQuestions: 10,
  difficulty: 'Mixed',
  workingSpace: 'Dynamic Space',
  includeMarks: false,
  generateAnswerKey: false,
  includeWorkedSolutions: false,
  includeName: true,
  includeDate: true,
  schoolName: '',
  removeWatermark: false,
  syllabusContextMode: 'Off',
  textbooksProvided: false,
  firstTimeMode: false,
  includeCanvasSetup: false,
  pedagogicalSpotError: false,
  pedagogicalParameterShift: false,
  pedagogicalLimitCase: false,
  pedagogicalProofStyle: false,
  pedagogicalWordProblems: false,
  pedagogicalMultiStep: false,
  selectedPoints: [],
  syllabusData: {},
};

describe('buildWorksheetRequest', () => {
  it('returns the correct course and subject', () => {
    const result = buildWorksheetRequest(baseParams);
    expect(result.worksheetSettings.course).toBe('Year 12');
    expect(result.worksheetSettings.subject).toBe('Mathematics Advanced');
  });

  it('returns the correct number of questions', () => {
    const result = buildWorksheetRequest({ ...baseParams, numQuestions: 25 });
    expect(result.worksheetSettings.numberOfQuestions).toBe(25);
  });

  it('uses customSubject when selectedSubject is "Other"', () => {
    const result = buildWorksheetRequest({
      ...baseParams,
      selectedSubject: 'Other',
      customSubject: 'Ancient History',
    });
    expect(result.worksheetSettings.subject).toBe('Ancient History');
  });

  it('falls back to selectedSubject when customSubject is empty', () => {
    const result = buildWorksheetRequest({
      ...baseParams,
      selectedSubject: 'Physics',
      customSubject: '',
    });
    expect(result.worksheetSettings.subject).toBe('Physics');
  });

  it('sets EXAM STRICT mode when no pedagogical drills are selected', () => {
    const result = buildWorksheetRequest(baseParams);
    expect(result.worksheetSettings.mode).toContain('EXAM STRICT');
    expect(result.pedagogicalDrills).toEqual([]);
  });

  it('sets PEDAGOGY mode and lists drills when pedagogical options are selected', () => {
    const result = buildWorksheetRequest({
      ...baseParams,
      pedagogicalSpotError: true,
      pedagogicalWordProblems: true,
    });
    expect(result.worksheetSettings.mode).toContain('PEDAGOGY');
    expect(result.pedagogicalDrills).toContain('spot-error');
    expect(result.pedagogicalDrills).toContain('word-problems');
    expect(result.pedagogicalDrills).toHaveLength(2);
  });

  it('includes marks instruction when includeMarks is true', () => {
    const result = buildWorksheetRequest({ ...baseParams, includeMarks: true });
    expect(result.worksheetSettings.marks).toContain('Assign');
  });

  it('excludes marks by default', () => {
    const result = buildWorksheetRequest(baseParams);
    expect(result.worksheetSettings.marks).toBe('No marks.');
  });

  it('includes answer key text when generateAnswerKey is true', () => {
    const result = buildWorksheetRequest({ ...baseParams, generateAnswerKey: true });
    expect(result.worksheetSettings.answerKey).toContain('Answer Key');
  });

  it('includes worked solutions text when both flags are true', () => {
    const result = buildWorksheetRequest({
      ...baseParams,
      generateAnswerKey: true,
      includeWorkedSolutions: true,
    });
    expect(result.worksheetSettings.answerKey).toContain('worked solutions');
  });

  it('sets watermark to false when removeWatermark is true', () => {
    const result = buildWorksheetRequest({ ...baseParams, removeWatermark: true });
    expect(result.worksheetSettings.watermark).toBe(false);
  });

  it('includes FIRST TIME MODE in customInstructions when firstTimeMode is true', () => {
    const result = buildWorksheetRequest({ ...baseParams, firstTimeMode: true });
    expect(result.customInstructions).toContain('FIRST TIME MODE');
  });

  it('includes CANVAS SETUP GUIDE when includeCanvasSetup is true', () => {
    const result = buildWorksheetRequest({ ...baseParams, includeCanvasSetup: true });
    expect(result.customInstructions).toContain('CANVAS SETUP GUIDE');
  });

  it('includes school name in headerSpaces when provided', () => {
    const result = buildWorksheetRequest({ ...baseParams, schoolName: 'Sydney Grammar' });
    expect(result.worksheetSettings.headerSpaces).toContain('Sydney Grammar');
  });

  it('includes rawQuestions as teacher notes when both points and raw text are provided', () => {
    const result = buildWorksheetRequest({
      ...baseParams,
      selectedPoints: ['point-1'],
      rawQuestions: 'Focus on applications',
    });
    expect(result.customInstructions).toContain('ADDITIONAL TEACHER NOTES');
    expect(result.customInstructions).toContain('Focus on applications');
  });

  it('always includes requestVersion "2"', () => {
    const result = buildWorksheetRequest(baseParams);
    expect(result.requestVersion).toBe('2');
  });
});
