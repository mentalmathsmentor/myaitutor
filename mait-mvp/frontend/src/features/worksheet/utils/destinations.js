// Custom Gems are legacy/deprecated. Set this once a shareable custom GPT exists; its button stays hidden until then.
export const WORKSHEET_GPT_URL = '';

export const CURRICULUM_REFERENCE_LINKS = [
  {
    id: 'nesa',
    label: 'Official NESA curriculum',
    url: 'https://curriculum.nsw.edu.au/',
    note: 'NSW syllabuses by stage and learning area',
  },
  {
    id: 'ib-myp-maths',
    label: 'IB MYP Mathematics',
    url: 'https://www.ibo.org/programmes/middle-years-programme/curriculum/mathematics/',
    note: 'Official MYP framework, standard/extended levels and subject brief',
  },
  {
    id: 'ib-dp-maths',
    label: 'IB DP Mathematics',
    url: 'https://www.ibo.org/programmes/diploma-programme/curriculum/mathematics/',
    note: 'Official DP courses, levels, subject briefs and assessment versions',
  },
];

// `full` destinations have no worksheet setup of their own, so they receive the instructions with the request.
export const destinations = [
  { id: 'gemini', label: 'Gemini', url: 'https://gemini.google.com/app', full: true, note: 'Use the mait-worksheet skill if installed; otherwise paste the full portable instructions copied here.' },
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
