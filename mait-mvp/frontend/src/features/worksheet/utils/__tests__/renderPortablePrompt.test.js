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
  it('fits an 8,000 character custom instruction limit, header included', () => {
    expect(skillFile.length).toBeLessThanOrEqual(8000);
  });
  it('covers the settings the wizard sends', () => {
    for (const setting of ['MODE: PEDAGOGY', 'MODE: EXAM STRICT', 'WATERMARK: OFF', 'Spot the Error', 'Parameter Shift', 'Limit Case', '**Search**', '**Provide**', '**Off**']) {
      expect(portableInstructions).toContain(setting);
    }
  });
  it('tells portable AIs to use official NESA or IB sources for the applicable course', () => {
    expect(portableInstructions).toContain('NESA for NSW');
    expect(portableInstructions).toContain('IB for International Baccalaureate');
  });
  it('keeps the Gem base instructions exactly synchronised with the portable skill body', () => {
    const gemBase = readFileSync('../Gem_Base_Instructions.md', 'utf8');
    expect(gemBase).toBe(portableInstructions);
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
