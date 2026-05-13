import { describe, it, expect, vi } from 'vitest';
import { buildSyllabusPacket } from '../buildSyllabusPacket';

// Mock the syllabus registry
vi.mock('../../../../syllabus_registry.json', () => ({
  default: {
    'valid-id-1': {
      outcomes: ['Outcome 1'],
      include: ['Include 1'],
      exclude: ['Exclude 1'],
    },
    'stale-id-2': {
      outcomes: ['Phantom Outcome'],
      include: ['Phantom Include'],
    }
  }
}));

describe('buildSyllabusPacket', () => {
  it('returns default empty packet when no selected points', () => {
    const result = buildSyllabusPacket({
      selectedStage: 'Stage 6',
      selectedSubject: 'Math',
      selectedPoints: [],
      syllabusData: {}
    });
    expect(result.topicSummary).toBe('Stage 6 Math');
    expect(result.outcomes).toEqual([]);
    expect(result.dotPoints).toEqual([]);
  });

  it('drops stale ids and prevents phantom metadata injection', () => {
    const syllabusData = {
      module1: [
        { id: 'valid-id-1', label: 'Valid Label 1' }
      ]
    };

    // 'stale-id-2' is in selectedPoints but NOT in syllabusData
    const selectedPoints = ['valid-id-1', 'stale-id-2'];

    const result = buildSyllabusPacket({
      selectedStage: 'Stage 6',
      selectedSubject: 'Math',
      selectedPoints,
      syllabusData
    });

    expect(result.topicSummary).toBe('Valid Label 1');
    expect(result.dotPoints).toEqual(['Valid Label 1']);
    expect(result.outcomes).toEqual(['Outcome 1']); // 'Phantom Outcome' should not be present
    expect(result.include).toEqual(['Include 1']);
    expect(result.exclude).toEqual(['Exclude 1']);
    
    // Check that 'stale-id-2' produced no metadata
    expect(result.outcomes).not.toContain('Phantom Outcome');
  });
});
