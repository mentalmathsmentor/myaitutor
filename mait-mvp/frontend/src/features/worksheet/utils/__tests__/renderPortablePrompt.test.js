import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { portableInstructions, renderPortablePrompt, skillFile } from '../renderPortablePrompt';

describe('portable worksheet prompt', () => {
  it('ships a valid skill file with a name and description', () => {
    expect(skillFile).toMatch(/^---\nname: mait-worksheet\ndescription: .+\n---\n/);
  });
  it('strips the skill header from pasted instructions', () => {
    expect(portableInstructions.startsWith('# MyAITutor Worksheet')).toBe(true);
    expect(portableInstructions).not.toContain('description:');
  });
  it('stays inside documented portable skill limits', () => {
    const frontmatter = skillFile.match(/^---\n([\s\S]*?)\n---\n/)[1];
    const description = frontmatter.match(/^description: (.+)$/m)[1];
    expect('mait-worksheet'.length).toBeLessThanOrEqual(64);
    expect(description.length).toBeLessThanOrEqual(1024);
    expect(skillFile.length).toBeLessThanOrEqual(20000);
    expect(skillFile.split('\n').length).toBeLessThanOrEqual(500);
  });
  it('covers the settings the wizard sends', () => {
    for (const setting of ['MODE: PEDAGOGY', 'MODE: EXAM STRICT', 'WATERMARK: OFF', 'Spot the Error', 'Parameter Shift', 'Limit Case', '**Search**', '**Provide**', '**Off**']) {
      expect(portableInstructions).toContain(setting);
    }
  });
  it('tells portable AIs to retrieve official curriculum receipts before alignment', () => {
    for (const phrase of ['exact curriculum receipts', 'MYP year 1-5', 'assessment-criteria year 1/3/5', 'one common column', 'AA/AI', 'SL/HL', 'exam session', 'topic -> receipt -> question-number mapping']) {
      expect(portableInstructions).toContain(phrase);
    }
  });
  it('marks the legacy Gem base instructions as superseded by the skill package', () => {
    const gemBase = readFileSync('../Gem_Base_Instructions.md', 'utf8');
    expect(gemBase).toContain('Deprecated');
    expect(gemBase).toContain('mait-worksheet');
    expect(gemBase).not.toBe(portableInstructions);
  });
  it('carries no private names or tool routing', () => {
    expect(skillFile).not.toMatch(/Darra|Mental Maths|Arthur|AGY|chatgpt\.com\/g\//);
  });
  it('keeps the wizard request whole and last', () => {
    const request = '**Year 12 Worksheet**\n- **Subject:** Synthetic';
    const prompt = renderPortablePrompt(request);
    expect(prompt.startsWith(portableInstructions)).toBe(true);
    expect(prompt.endsWith(request)).toBe(true);
  });
});
