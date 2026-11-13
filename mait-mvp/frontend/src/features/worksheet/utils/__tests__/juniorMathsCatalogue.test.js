import { describe, it, expect } from 'vitest';
import { resolveCourse, restorePoints } from '../courseCatalogue';
import { buildSyllabusPacket } from '../buildSyllabusPacket';
import { renderGemHandoffPrompt } from '../renderGemHandoffPrompt';

// Independent inventory totals from NESA's browser navigation and outcome table,
// captured on 18 September 2026. These are focus-area parts, not content points.
const stages = [
  ['Stage 1 (Yr 1-2)', 18, 16], ['Stage 2 (Yr 3-4)', 20, 20],
  ['Stage 3 (Yr 5-6)', 20, 21], ['Stage 4 (Yr 7-8)', 16, 16],
  ['Stage 5 (Yr 9-10)', 41, 41],
];
describe('source-referenced junior mathematics topics', () => {
  it.each(stages)('%s covers the focus-area inventory without cloned year lists', (stage, areas, outcomes) => {
    const course = resolveCourse(stage, 'Mathematics');
    expect(course.records).toHaveLength(areas);
    expect(new Set(course.records.map(p => p.label)).size).toBe(areas);
    expect(new Set(course.records.flatMap(p => p.outcomeCodes)).size).toBe(outcomes);
    for (const p of course.records) {
      expect(p.textType).toBe('original-topic-summary');
      expect(p.syllabusVersion).toBe('Mathematics K–10 (2022)');
      expect(p.sourceUrl).toMatch(new RegExp(`/stage-${stage[6]}/fa[a-f0-9]+$`));
      expect(p.outcomeCodes.length).toBeGreaterThan(0);
      expect(p.outcomeCodes.every(code => code.startsWith(`MA${stage[6]}-`))).toBe(true);
      expect(p.label).not.toMatch(/NPV\d|PrT\d|<[^>]+>/);
    }
  });
  it('keeps primary A/B flexible and Stage 5 Paths explicit', () => {
    for (const [stage, count] of stages.slice(0, 3)) {
      const records = resolveCourse(stage, 'Mathematics').records;
      expect(records.filter(p => p.part === 'A')).toHaveLength(count / 2);
      expect(records.filter(p => p.part === 'B')).toHaveLength(count / 2);
      expect(records.every(p => !Object.hasOwn(p, 'year'))).toBe(true);
    }
    const s4 = resolveCourse(stages[3][0], 'Mathematics');
    const s5 = resolveCourse(stages[4][0], 'Mathematics');
    expect(s4.records.every(p => p.pathway === 'Core')).toBe(true);
    expect(s5.records.filter(p => p.pathway === 'Core')).toHaveLength(18);
    expect(s5.records.filter(p => p.pathway === 'Path')).toHaveLength(23);
    expect(s4.records.some(p => p.outcomeCodes.includes('MA5-TRG-C-01'))).toBe(false);
    expect(s5.records.some(p => p.outcomeCodes.includes('MA5-TRG-C-01'))).toBe(true);
    expect(restorePoints(s4, s5.records.map(p => p.id))).toEqual([]);
  });
  it.each(stages)('%s carries only selected references into the copied prompt', (stage) => {
    const course = resolveCourse(stage, 'Mathematics');
    const point = course.records[0];
    const packet = buildSyllabusPacket({ selectedStage: stage, selectedSubject: 'Mathematics', selectedPoints: [point.id, point.id, 'retired'], syllabusData: course.data });
    expect(packet.outcomes).toEqual(point.outcomeCodes);
    expect(packet.dotPoints).toEqual([point.label]);
    expect(packet.questionStyleNotes.join(' ')).toContain(point.sourceUrl);
    expect(packet.questionStyleNotes.join(' ')).toContain('original topic summaries');
    expect(packet.questionStyleNotes.join(' ')).not.toContain(course.records[1].sourceUrl);
    const prompt = renderGemHandoffPrompt({ worksheetSettings: { course: stage, subject: 'Mathematics' }, syllabusPacket: packet, topicSummary: packet.topicSummary, legacyFields: {} });
    expect(prompt).toContain(point.sourceUrl);
    expect(prompt).toContain(point.label);
    expect(prompt).toContain(point.outcomeCodes[0]);
  });
});
