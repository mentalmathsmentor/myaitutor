import { describe, it, expect } from 'vitest';
import stages from '../../../../stage_subjects.json';
import syllabus from '../../../../syllabus_data.json';
import { resolveCourse, restorePoints, validateWorksheetSelection, topicRecords } from '../courseCatalogue';
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
      if (stage === 'Stage 4 (Yr 7-8)') expect([...sourceNames]).toEqual(['Year 7', 'Year 8']);
      else if (stage === 'Stage 5 (Yr 9-10)') expect([...sourceNames]).toEqual(['Year 9', 'Year 10']);
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
  it('junior maths includes both complete local year groups', () => {
    for (const [stage, years] of [['Stage 4 (Yr 7-8)', ['Year 7', 'Year 8']], ['Stage 5 (Yr 9-10)', ['Year 9', 'Year 10']]]) {
      expect(resolveCourse(stage, 'Mathematics').records.map(p => p.label)).toEqual(years.flatMap(year => topicRecords(syllabus[year]).map(p => p.label)));
    }
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
