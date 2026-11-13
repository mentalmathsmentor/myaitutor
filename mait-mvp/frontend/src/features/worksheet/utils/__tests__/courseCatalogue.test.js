import { describe, it, expect } from 'vitest';
import stages from '../../../../stage_subjects.json';
import { resolveCourse, restorePoints, topicLabel, validateWorksheetSelection } from '../courseCatalogue';
import { buildSyllabusPacket } from '../buildSyllabusPacket';

const pairs = Object.entries(stages).flatMap(([stage, subjects]) => [...Object.keys(subjects), 'Other'].map(subject => [stage, subject]));
describe('explicit course catalogue', () => {
  it.each(pairs)('%s / %s has unique scoped records; every point compiles without loss', (stage, subject) => {
    const course = resolveCourse(stage, subject);
    expect(course.valid).toBe(true);
    expect(new Set(course.records.map(p => p.id)).size).toBe(course.records.length);
    for (const point of course.records) {
      expect(JSON.parse(point.id).slice(0, 2)).toEqual([stage, subject]);
      const packet = buildSyllabusPacket({ selectedStage: stage, selectedSubject: subject, selectedPoints: [point.id], syllabusData: course.data });
      expect(packet.dotPoints).toEqual([point.label]);
      expect(restorePoints(course, [point.sourceId], true)).toContain(point.id);
    }
    const packet = buildSyllabusPacket({ selectedStage: stage, selectedSubject: subject, selectedPoints: course.records.map(p => p.id), syllabusData: course.data });
    expect(packet.dotPoints).toEqual(course.records.map(p => p.label));
  });
  it.each(pairs)('%s / %s never borrows an unrelated course', (stage, subject) => {
    const course = resolveCourse(stage, subject);
    if (['English', 'Chemistry', 'Biology', 'Other'].includes(subject) || (stage === 'Year 11' && subject === 'Physics')) {
      expect(course.kind).toBe('manual'); expect(course.records).toEqual([]);
    } else if (course.kind === 'flat') {
      expect(course.records.map(p => p.label)).toEqual(stages[stage][subject]);
    } else {
      const sourceNames = new Set(course.records.map(p => p.source));
      if (stage.startsWith('Stage')) expect([...sourceNames]).toEqual(['Mathematics K–10 (2022)']);
      else {
        const own = `${stage} ${subject.replace('Mathematics ', '')}`;
        expect(sourceNames.has(own)).toBe(true);
        for (const source of sourceNames) expect(source === own || (subject.includes('Extension') && source.startsWith(stage) && /Advanced|Extension 1/.test(source))).toBe(true);
      }
    }
  });
  it.each([['Stage 4 (Yr 7-8)', 'Science'], ['Stage 5 (Yr 9-10)', 'HSIE'], ['Year 12', 'Mathematics Standard']])('%s / %s uses its flat list', (stage, subject) => {
    const course = resolveCourse(stage, subject);
    expect(course.kind).toBe('flat'); expect(course.records.map(p => p.label)).toEqual(stages[stage][subject]);
  });
  it('junior maths distinguishes stage content without invented annual allocations', () => {
    const stage4 = resolveCourse('Stage 4 (Yr 7-8)', 'Mathematics');
    const stage5 = resolveCourse('Stage 5 (Yr 9-10)', 'Mathematics');
    expect(stage4.records.map(p => p.label)).not.toEqual(stage5.records.map(p => p.label));
    expect(Object.keys(stage4.data)).toEqual(['Core']);
    expect(Object.keys(stage5.data)).toEqual(['Core', 'Path']);
  });
  it('rejects unknown combinations and cross-course topic IDs', () => {
    expect(resolveCourse('retired', 'Mathematics').valid).toBe(false);
    expect(resolveCourse('Year 12', 'constructor').valid).toBe(false);
    const a = resolveCourse('Year 11', 'Mathematics Advanced'), b = resolveCourse('Year 12', 'Mathematics Extension 2');
    expect(restorePoints(b, a.records.map(p => p.id))).toEqual([]);
  });
  it.each([0, 101, 1.5, NaN, Infinity, '10'])('rejects question count %s at the shared handoff boundary', numQuestions => {
    expect(validateWorksheetSelection({ selectedStage: 'Year 12', selectedSubject: 'English', rawQuestions: 'Synthetic brief', numQuestions, selectedPoints: [] })).toContain('between 1 and 100');
  });
});

describe('topic labels for the canvas', () => {
  it('shows a selected point by its label and keeps manual topics as typed', () => {
    const course = resolveCourse('Stage 4 (Yr 7-8)', 'Mathematics');
    const [record] = course.records;
    expect(record.id).not.toBe(record.label);
    expect(topicLabel(course, record.id)).toBe(record.label);
    expect(topicLabel(course, 'Synthetic manual topic')).toBe('Synthetic manual topic');
  });
});
