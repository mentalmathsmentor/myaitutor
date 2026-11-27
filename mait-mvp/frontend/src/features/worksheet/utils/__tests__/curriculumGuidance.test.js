import { describe, expect, it } from 'vitest';
import { buildCurriculumSearchInstruction, resolveCurriculumProfile } from '../curriculumGuidance';

describe('curriculum profile resolution', () => {
  it('keeps NESA selections tied to the exact stage and course', () => {
    expect(resolveCurriculumProfile('Year 12', 'Mathematics Advanced')).toMatchObject({ authority: 'NESA', programme: 'nsw', specificity: 'exact' });
    const instruction = buildCurriculumSearchInstruction('Year 12', 'Mathematics Advanced');
    expect(instruction).toContain('official NSW Curriculum/NESA sources for Year 12 Mathematics Advanced');
  });

  it('resolves an exact IB DP course and level without inventing the version', () => {
    const profile = resolveCurriculumProfile('Year 12', 'IB DP Mathematics AA HL');
    expect(profile).toMatchObject({ authority: 'IB', programme: 'dp', course: 'analysis and approaches', level: 'HL', specificity: 'exact' });
    const instruction = buildCurriculumSearchInstruction('Year 12', 'IB DP Mathematics AA HL');
    expect(instruction).toContain('analysis and approaches HL');
    expect(instruction).toContain('assessment cohort');
    expect(instruction).toContain('current or incoming curriculum');
  });

  it('asks for missing IB DP course or level instead of guessing', () => {
    const instruction = buildCurriculumSearchInstruction('Year 12', 'IB DP Mathematics');
    expect(instruction).toContain('analysis and approaches or applications and interpretation');
    expect(instruction).toContain('SL or HL');
    expect(instruction).toContain('before generating');
  });

  it('uses an exact IB MYP year while requiring standard or extended confirmation', () => {
    const profile = resolveCurriculumProfile('Stage 4 (Yr 7-8)', 'IB MYP Year 3 Mathematics');
    expect(profile).toMatchObject({ authority: 'IB', programme: 'myp', mypYear: 3, specificity: 'exact' });
    const instruction = buildCurriculumSearchInstruction('Stage 4 (Yr 7-8)', 'IB MYP Year 3 Mathematics');
    expect(instruction).toContain('MYP Year 3');
    expect(instruction).toContain('standard or extended');
    expect(instruction).toContain('does not prescribe a year-by-year content sequence');
  });

  it('does not convert a school Year 8 automatically into an IB MYP year', () => {
    const instruction = buildCurriculumSearchInstruction('Stage 4 (Yr 7-8)', 'IB Year 8 Mathematics');
    expect(instruction).toContain('Do not convert school Year 8 automatically');
    expect(instruction).toContain('exact MYP year (1-5)');
    expect(instruction).toContain('If the teacher or school confirms Year 8 = MYP Year 3');
  });

  it('asks for the programme when IB is named without MYP or DP detail', () => {
    const instruction = buildCurriculumSearchInstruction('Year 11', 'IB Mathematics');
    expect(instruction).toContain('PYP, MYP or DP');
    expect(instruction).toContain('before generating');
  });

  it('demands exact retrieval receipts and a topic-to-question mapping', () => {
    const instruction = buildCurriculumSearchInstruction('Year 12', 'Mathematics Advanced');
    for (const phrase of ['retrieve the official curriculum source now', 'title, organisation, canonical URL or uploaded filename', 'version/publication/last-updated/first-assessment date', 'access date', 'exact section, page, table or heading', 'topic -> receipt -> question-number mapping', 'never claim alignment']) {
      expect(instruction).toContain(phrase);
    }
  });
});
