import skillFile from '../engine/SKILL.md?raw';

export { skillFile };
export const portableInstructions = skillFile.replace(/^---\n[\s\S]*?\n---\n+/, '').trim();

// Wraps the short wizard request for an assistant that has no worksheet instructions of its own.
export function renderPortablePrompt(request) {
  return `${portableInstructions}\n\n---\n\n## WORKSHEET REQUEST\n\n${request}`;
}
