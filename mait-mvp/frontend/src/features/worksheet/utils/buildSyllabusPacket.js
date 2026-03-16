import syllabusRegistry from '../../../syllabus_registry.json';
import { ensureStringArray } from './promptHelpers';

function extractLabels(points, syllabusData) {
  if (!syllabusData) return points;
  
  const idToLabel = {};
  const traverse = (obj) => {
      if (Array.isArray(obj)) {
          obj.forEach(p => {
              if (typeof p === 'object' && p !== null && p.id && p.label) {
                  idToLabel[p.id] = p.label;
              }
          });
      } else if (typeof obj === 'object' && obj !== null) {
          Object.values(obj).forEach(traverse);
      }
  };
  traverse(syllabusData);
  
  return points.map(p => idToLabel[p] || p);
}

export function buildSyllabusPacket({ selectedStage, selectedSubject, selectedPoints, syllabusData }) {
  if (!selectedPoints || selectedPoints.length === 0) {
    return {
      topicSummary: `${selectedStage} ${selectedSubject}`,
      outcomes: [],
      dotPoints: [],
      include: [],
      exclude: [],
      assessmentEmphasis: [],
      questionStyleNotes: []
    };
  }

  const outcomes = new Set();
  const include = new Set();
  const exclude = new Set();
  const assessmentEmphasis = new Set();
  const questionStyleNotes = new Set();

  selectedPoints.forEach(pointId => {
    // Attempt match on the stable ID
    const meta = syllabusRegistry[pointId];
    if (meta) {
      if (meta.outcomes) meta.outcomes.forEach(o => outcomes.add(o));
      if (meta.include) meta.include.forEach(i => include.add(i));
      if (meta.exclude) meta.exclude.forEach(e => exclude.add(e));
      if (meta.assessmentEmphasis) meta.assessmentEmphasis.forEach(a => assessmentEmphasis.add(a));
      if (meta.questionStyleNotes) meta.questionStyleNotes.forEach(q => questionStyleNotes.add(q));
    }
  });

  const displayLabels = extractLabels(selectedPoints, syllabusData);

  return {
    topicSummary: displayLabels.join(' | '),
    outcomes: ensureStringArray(Array.from(outcomes)),
    dotPoints: ensureStringArray(displayLabels),
    include: ensureStringArray(Array.from(include)),
    exclude: ensureStringArray(Array.from(exclude)),
    assessmentEmphasis: ensureStringArray(Array.from(assessmentEmphasis)),
    questionStyleNotes: ensureStringArray(Array.from(questionStyleNotes))
  };
}
