export const WORKSHEET_GEM_URL = 'https://gemini.google.com/gem/14I7EkTkmvun49uuifaHINSEv64BO_hbG?usp=sharing';
// Set this once a shareable custom GPT exists; its button stays hidden until then.
export const WORKSHEET_GPT_URL = '';

// `full` destinations have no worksheet setup of their own, so they receive the instructions with the request.
export const destinations = [
  { id: 'gem', label: 'Worksheet Gem', url: WORKSHEET_GEM_URL, full: false, note: 'The Gem needs a Google sign-in. If you land on a sign-in page or plain Gemini, use ChatGPT or Claude instead.' },
  ...(WORKSHEET_GPT_URL ? [{ id: 'gpt', label: 'Worksheet GPT', url: WORKSHEET_GPT_URL, full: false, note: 'The worksheet GPT needs a ChatGPT sign-in.' }] : []),
  { id: 'chatgpt', label: 'ChatGPT', url: 'https://chatgpt.com/', full: true, note: 'This copy includes the worksheet instructions, so ChatGPT can follow it without any setup.' },
  { id: 'claude', label: 'Claude', url: 'https://claude.ai/new', full: true, note: 'This copy includes the worksheet instructions, so Claude can follow it without any setup.' },
];

// Opens without exposing this page to the new tab. Returns false when the browser blocked it.
export function openDestination(destination) {
  const tab = window.open(destination.url, '_blank');
  if (!tab) return false;
  try { tab.opener = null; } catch { /* Some browsers lock this; the tab is still open. */ }
  return true;
}
