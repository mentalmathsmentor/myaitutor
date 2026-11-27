import { describe, expect, it } from 'vitest';
import { buildCurriculumSearchInstruction, resolveCurriculumProfile } from '../curriculumGuidance';

describe('curriculum profile resolution', () => {
  it('keeps NESA selections tied to the exact stage and course', () => {
    expect(resolveCurriculumProfile('Year 12', 'Mathematics Advanced')).toMatchObject({ authority: 'NESA', programme: 'nsw', specificity: 'exact' });
    const instruction = buildCurriculumSearchInstruction('Year 12', 'Mathematics Advanced');
    expect(instruction).toContain('official NSW Curriculum/NESA sources for Year 12 Mathematics Advanced');
    expect(instruction).toContain('teacher-supplied teaching cohort or syllabus edition as the controlling version');
    expect(instruction).toContain('ask for clarification or a syllabus upload');
    expect(instruction).toContain('verify the applicable edition from official receipts rather than assuming the latest syllabus applies');
  });

  it('resolves an exact IB DP course and level without inventing the version', () => {
    const profile = resolveCurriculumProfile('Year 12', 'IB DP Mathematics AA HL');
    expect(profile).toMatchObject({ authority: 'IB', programme: 'dp', course: 'analysis and approaches', level: 'HL', specificity: 'exact' });
    const instruction = buildCurriculumSearchInstruction('Year 12', 'IB DP Mathematics AA HL');
    expect(instruction).toContain('analysis and approaches HL');
    expect(instruction).toContain('assessment cohort');
    expect(instruction).toContain('current or incoming curriculum');
    expect(instruction).toContain('through November 2028');
    expect(instruction).toContain('May 2029 onward');
  });

  it('asks for missing IB DP course or level instead of guessing', () => {
    const instruction = buildCurriculumSearchInstruction('Year 12', 'IB DP Mathematics');
    expect(instruction).toContain('analysis and approaches or applications and interpretation');
    expect(instruction).toContain('SL or HL');
    expect(instruction).toContain('before generating');
  });

  it('preserves non-mathematics DP subjects instead of forcing a mathematics course', () => {
    const profile = resolveCurriculumProfile('Year 12', 'IB DP Physics HL');
    expect(profile).toMatchObject({ authority: 'IB', programme: 'dp', level: 'HL', mathematicsSubject: false, specificity: 'exact' });
    const instruction = buildCurriculumSearchInstruction('Year 12', 'IB DP Physics HL');
    expect(instruction).toContain('The request appears to be IB DP Physics HL.');
    expect(instruction).toContain('Preserve that subject');
    expect(instruction).toContain('do not convert it into mathematics');
    expect(instruction).not.toContain('analysis and approaches or applications and interpretation');
  });

  it('does not impose SL/HL on DP core Theory of Knowledge', () => {
    const profile = resolveCurriculumProfile('Year 12', 'IB DP Theory of Knowledge');
    expect(profile).toMatchObject({ programme: 'dp', mathematicsSubject: false, usesSlHl: false, specificity: 'exact' });
    const instruction = buildCurriculumSearchInstruction('Year 12', 'IB DP Theory of Knowledge');
    expect(instruction).toContain('The request appears to be IB DP Theory of Knowledge.');
    expect(instruction).toContain('do not impose SL/HL because this DP core component does not use those levels');
    expect(instruction).not.toContain('ask whether SL or HL');
  });

  it('keeps level clarification for non-mathematics DP subjects that may use SL/HL', () => {
    const profile = resolveCurriculumProfile('Year 12', 'IB DP Physics');
    expect(profile).toMatchObject({ programme: 'dp', usesSlHl: true, specificity: 'needs-clarification' });
    const instruction = buildCurriculumSearchInstruction('Year 12', 'IB DP Physics');
    expect(instruction).toContain('Verify whether the official course uses SL/HL');
    expect(instruction).toContain('ask whether SL or HL before generating');
  });

  it('preserves non-mathematics MYP subjects without applying mathematics framework rules', () => {
    const profile = resolveCurriculumProfile('Stage 4 (Yr 7-8)', 'IB Middle Years Programme Year 3 Sciences');
    expect(profile).toMatchObject({ programme: 'myp', mypYear: 3, mathematicsSubject: false, frameworkColumn: null, specificity: 'exact' });
    const instruction = buildCurriculumSearchInstruction('Stage 4 (Yr 7-8)', 'IB Middle Years Programme Year 3 Sciences');
    expect(instruction).toContain('The request appears to be IB Middle Years Programme Year 3 Sciences, MYP Year 3.');
    expect(instruction).toContain('Preserve that subject');
    expect(instruction).toContain('exact subject-group objectives and assessment criteria');
    expect(instruction).not.toContain('IB Middle Years Programme mathematics');
    expect(instruction).not.toContain('one common topic/skill column');
    const yearFive = resolveCurriculumProfile('Stage 5 (Yr 9-10)', 'IB MYP Year 5 Sciences');
    expect(yearFive).toMatchObject({ frameworkColumn: null, specificity: 'exact' });
    expect(buildCurriculumSearchInstruction('Stage 5 (Yr 9-10)', 'IB MYP Year 5 Sciences')).not.toContain('school-defined course level is missing');
  });

  it('uses the common MYP Years 1-3 column without imposing standard or extended', () => {
    const profile = resolveCurriculumProfile('Stage 4 (Yr 7-8)', 'IB MYP Year 3 Mathematics');
    expect(profile).toMatchObject({ authority: 'IB', programme: 'myp', mypYear: 3, frameworkColumn: 'myp-1-3', specificity: 'exact' });
    const instruction = buildCurriculumSearchInstruction('Stage 4 (Yr 7-8)', 'IB MYP Year 3 Mathematics');
    expect(instruction).toContain('MYP Year 3');
    expect(instruction).toContain('one common topic/skill column');
    expect(instruction).toContain('do not impose standard/extended');
    expect(instruction).toContain('assessment-criteria year (1, 3 or 5)');
    expect(instruction).toContain('does not prescribe a year-by-year content sequence');
  });

  it('requires the school-defined standard or extended column for MYP Years 4-5', () => {
    const missing = buildCurriculumSearchInstruction('Stage 5 (Yr 9-10)', 'IB MYP Year 5 Mathematics');
    expect(missing).toContain('standard or extended');
    expect(missing).toContain('do not equate them with DP SL/HL');
    const extended = resolveCurriculumProfile('Stage 5 (Yr 9-10)', 'IB MYP Year 5 Extended Mathematics');
    expect(extended).toMatchObject({ frameworkColumn: 'myp-4-5-extended', courseLevel: 'extended', specificity: 'exact' });
  });

  it('recognises the full Middle Years Programme name without mistaking a school year for an MYP year', () => {
    const profile = resolveCurriculumProfile('Stage 4 (Yr 7-8)', 'IB Middle Years Programme Year 3 Mathematics');
    expect(profile).toMatchObject({ programme: 'myp', mypYear: 3, frameworkColumn: 'myp-1-3', specificity: 'exact' });
    const schoolOnly = resolveCurriculumProfile('Stage 4 (Yr 7-8)', 'IB Middle Years Programme school Year 8 Mathematics');
    expect(schoolOnly.mypYear).toBeNull();
    expect(schoolOnly.schoolYear).toBe(8);
    expect(buildCurriculumSearchInstruction('Stage 4 (Yr 7-8)', 'IB Middle Years Programme school Year 8 Mathematics')).toContain('Do not convert school Year 8 automatically');
  });

  it('does not convert a school Year 8 automatically into an IB MYP year', () => {
    const instruction = buildCurriculumSearchInstruction('Stage 4 (Yr 7-8)', 'IB Year 8 Mathematics');
    expect(instruction).toContain('Do not convert school Year 8 automatically');
    expect(instruction).toContain('exact MYP year (1-5)');
    expect(instruction).toContain('assessment-criteria year (1, 3 or 5)');
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
