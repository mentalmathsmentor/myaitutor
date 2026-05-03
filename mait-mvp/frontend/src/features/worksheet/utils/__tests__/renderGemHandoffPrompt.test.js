import { describe, it, expect } from 'vitest';
import { renderGemHandoffPrompt } from '../renderGemHandoffPrompt';

describe('renderGemHandoffPrompt', () => {
  const baseRequest = {
    worksheetSettings: {
      course: 'Year 12',
      difficulty: 'Mixed',
      workingSpace: 'Dynamic Space',
      marks: 'Experimental',
      answerKey: 'Worked solutions',
      watermark: true,
      mode: 'EXAM STRICT',
    },
    topicSummary: 'Algebra | Calculus',
    syllabusPacket: {
      dotPoints: ['Graphing polynomials', 'Derivatives'],
      outcomes: [],
      include: ['Use limits'],
      exclude: ['Do not use first principles'],
      assessmentEmphasis: ['Focus on application'],
      questionStyleNotes: ['Use word problems'],
    },
    legacyFields: {
      manual_prompt: 'Here is a custom brief.'
    }
  };

  it('renders watermark ON correctly', () => {
    const prompt = renderGemHandoffPrompt(baseRequest);
    expect(prompt).toContain('- **WATERMARK:** ON (Set rfoot to "myaitutor.au/worksheets")');
  });

  it('renders watermark OFF correctly', () => {
    const prompt = renderGemHandoffPrompt({
      ...baseRequest,
      worksheetSettings: {
        ...baseRequest.worksheetSettings,
        watermark: false
      }
    });
    expect(prompt).toContain('- **WATERMARK:** OFF (Leave rfoot empty)');
  });

  it('includes manual prompt if provided', () => {
    const prompt = renderGemHandoffPrompt(baseRequest);
    expect(prompt).toContain('**MANUAL INSTRUCTIONS & CUSTOM TOPICS:**');
    expect(prompt).toContain('Here is a custom brief.');
  });

  it('formats syllabus directives correctly', () => {
    const prompt = renderGemHandoffPrompt(baseRequest);
    expect(prompt).toContain('- **Relevant Dot-Points:** Graphing polynomials, Derivatives');
    expect(prompt).toContain('- **Include:** Use limits');
    expect(prompt).toContain('- **Exclude:** Do not use first principles');
  });
});
