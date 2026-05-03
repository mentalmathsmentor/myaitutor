import { ensureString, ensureStringArray } from './promptHelpers';

export function renderGemHandoffPrompt(request) {
  const settings = request.worksheetSettings;
  const packet = request.syllabusPacket;

  // Format syllabus arrays, suppressing empty ones to keep prompt clean
  const formatArray = (label, arr) => {
    const cleanArr = ensureStringArray(arr);
    return cleanArr.length > 0 ? `- **${label}:** ${cleanArr.join(', ')}` : '';
  };

  // Condense topic for title: if multiple points, use the first one + " (Mixed)"
  const topicSummary = ensureString(request.topicSummary);
  const topicParts = topicSummary.split('|').map(s => s.trim()).filter(Boolean);
  const firstTopic = topicParts[0] || 'Mathematics';
  const condensedTopic = topicParts.length > 1 ? `${firstTopic} (Mixed)` : firstTopic;

  let handoff = `**${settings.course} ${condensedTopic} Worksheet**\n\n`;
  handoff += `**USER WORKSHEET REQUEST:**\n\n`;

  handoff += `**WORKSHEET SETTINGS:**\n`;
  handoff += `- **Course:** ${settings.course}\n`;
  handoff += `- **Topic Summary:** ${topicSummary}\n`;
  handoff += `- **Number of Questions:** ${settings.numberOfQuestions}\n`;
  handoff += `- **Difficulty:** ${settings.difficulty}\n`;
  if (settings.headerSpaces) handoff += `- **Header Spaces:** ${settings.headerSpaces}\n`;
  handoff += `- **Working Space:** ${settings.workingSpace}\n`;
  if (settings.marks !== 'No marks.') handoff += `- **Marks:** ${settings.marks}\n`;
  if (settings.answerKey !== 'No answer key.') handoff += `- **Answer Key:** ${settings.answerKey}\n`;
  if (settings.watermark) {
    handoff += `- **WATERMARK:** ON (Set rfoot to "myaitutor.au/worksheets")\n`;
  } else {
    handoff += `- **WATERMARK:** OFF (Leave rfoot empty)\n`;
  }
  handoff += `- **MODE:** ${settings.mode}\n\n`;

  if (request.legacyFields.manual_prompt) {
    handoff += `**MANUAL INSTRUCTIONS & CUSTOM TOPICS:**\n${request.legacyFields.manual_prompt}\n\n`;
  }

  const hasPacketData = packet.dotPoints.length > 0 || packet.outcomes.length > 0 || packet.include.length > 0;
  
  if (hasPacketData || !request.legacyFields.manual_prompt) {
    handoff += `**SYLLABUS PACKET (NESA ALIGNED):**\n`;
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
      handoff += `**PEDAGOGICAL DRILLS REQUESTED:**\n- ${cleanDrills.join(', ')}\n\n`;
  }

  handoff += `**Generate the worksheet strictly from the supplied settings and syllabus packet. Output only the final LaTeX artifact.**`;

  return handoff;
}
