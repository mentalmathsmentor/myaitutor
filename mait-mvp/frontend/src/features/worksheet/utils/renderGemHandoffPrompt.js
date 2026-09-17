import { ensureString, ensureStringArray } from './promptHelpers';
import { pedagogyDirectives } from './worksheetDirectives';

export function renderGemHandoffPrompt(request) {
  const settings = request.worksheetSettings;
  const packet = request.syllabusPacket;

  // Format syllabus arrays, suppressing empty ones to keep prompt clean
  const formatArray = (label, arr) => {
    const cleanArr = ensureStringArray(arr);
    return cleanArr.length > 0 ? `- **${label}:** ${cleanArr.join(', ')}` : '';
  };

  const topicSummary = ensureString(request.topicSummary);

  let handoff = `**${settings.course} [Generate a concise 1-3 word summary of the topics] Worksheet**\n\n`;
  handoff += `**USER WORKSHEET REQUEST:**\n\n`;

  handoff += `**WORKSHEET SETTINGS:**\n`;
  handoff += `- **Course:** ${settings.course}\n`;
  handoff += `- **Subject:** ${ensureString(settings.subject)}\n`;
  handoff += `- **Topic Summary:** ${topicSummary}\n`;
  handoff += `- **Number of Questions:** ${settings.numberOfQuestions}\n`;
  handoff += `- **Difficulty:** ${settings.difficulty}\n`;
  if (settings.headerSpaces) handoff += `- **Header Spaces:** ${settings.headerSpaces}\n`;
  handoff += `- **Working Space:** ${settings.workingSpace}\n`;
  handoff += `- **Marks:** ${settings.marks}\n`;
  handoff += `- **Answer Key:** ${settings.answerKey}\n`;
  if (!settings.watermark) {
    handoff += `- **WATERMARK:** OFF (Leave rfoot empty)\n`;
  } else {
    handoff += `- **WATERMARK:** ON (Include the MyAITutor footer link)\n`;
  }
  handoff += `- **MODE:** ${settings.mode}\n\n`;

  if (request.legacyFields.manual_prompt) {
    handoff += `**MANUAL INSTRUCTIONS & CUSTOM TOPICS:**\n${request.legacyFields.manual_prompt}\n\n`;
  }

  const hasPacketData = ['dotPoints', 'outcomes', 'include', 'exclude', 'assessmentEmphasis', 'questionStyleNotes'].some(key => ensureStringArray(packet[key]).length > 0);
  
  if (hasPacketData || !request.legacyFields.manual_prompt) {
    handoff += `**SELECTED TOPICS AND GUIDANCE (alignment not verified):**\n`;
    const dotPointsStr = formatArray("Relevant Dot-Points", packet.dotPoints);
    if (dotPointsStr) handoff += `${dotPointsStr}\n`;
    
    const outcomesStr = formatArray("Outcomes", packet.outcomes);
    if (outcomesStr) handoff += `${outcomesStr}\n`;
    const includesStr = formatArray("Include", packet.include);
    if (includesStr) handoff += `${includesStr}\n`;
    const excludesStr = formatArray("Exclude", packet.exclude);
    if (excludesStr) handoff += `${excludesStr}\n`;
    const emphasisStr = formatArray("Assessment Emphasis", packet.assessmentEmphasis);
    if (emphasisStr) handoff += `${emphasisStr}\n`;
    const stylesStr = formatArray("Question Style Notes", packet.questionStyleNotes);
    if (stylesStr) handoff += `${stylesStr}\n`;

    if (!dotPointsStr && !outcomesStr && !includesStr && !excludesStr && !emphasisStr && !stylesStr) {
        handoff += `- No direct syllabus map provided.\n`;
    }
    handoff += `\n`;
  }

  if (request.customInstructions) {
    handoff += `**CUSTOM INSTRUCTIONS:**\n- ${request.customInstructions}\n\n`;
  }

  if (request.pedagogicalDrills && request.pedagogicalDrills.length > 0) {
      const cleanDrills = ensureStringArray(request.pedagogicalDrills);
      handoff += `**PEDAGOGICAL DRILLS REQUESTED:**\n${cleanDrills.map(id => `- ${id}: ${pedagogyDirectives[id] || id}`).join('\n')}\n\n`;
  }

  handoff += `**Resolve missing sources or unclear syllabus applicability before generating when the requested context requires them. Once ready, generate the worksheet from the supplied settings, teacher brief and applicable source material, returning the final worksheet as LaTeX.**`;

  return handoff;
}
