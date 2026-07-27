import React from 'react';
import { HelpCircle, Mail } from 'lucide-react';

const faqs = [
  {
    question: 'What is MAIT and who is it for?',
    answer: 'MAIT is an AI study mate for NSW high school students, starting with HSC Mathematics. It is designed for students who want curriculum-aware help, and for teachers who need faster ways to create NESA-aligned practice material.',
  },
  {
    question: 'Do I need to pay to use MAIT?',
    answer: 'No. MAIT has free ways to try the product, including the browser-based demo and BYOK mode. Paid access is planned for students and schools that want hosted accounts, saved progress, and a smoother managed experience.',
  },
  {
    question: 'What is BYOK (Bring Your Own Key) and how does it work?',
    answer: 'BYOK means you use your own Google Gemini API key in the browser. In the free BYOK tier, your request goes from your device to Google Gemini directly, so MAIT does not handle or store that key on its servers.',
  },
  {
    question: 'How do I get a free Gemini API key?',
    answer: 'You can create one through Google AI Studio using a Google account. Once Google gives you the key, paste it only into MAIT’s BYOK field and keep it private, just like you would with a password.',
  },
  {
    question: 'Is my data private?',
    answer: 'MAIT is being built around privacy-first defaults. Free demo and BYOK flows are designed for minimal MAIT server involvement, while paid accounts may store learning data securely so progress can persist across sessions.',
  },
  {
    question: 'Can MAIT generate worksheets I can print and give to my class?',
    answer: 'Yes. Worksheet Studio can generate structured, NESA-aligned worksheet material intended for classroom use and printing. The native canvas workflow is being built so teachers can edit and refine worksheet blocks before exporting.',
  },
  {
    question: 'What is the difference between the free demo and BYOK mode?',
    answer: 'The free demo runs a local model in your browser and is useful for trying the feel of MAIT without an API key. BYOK mode uses your Gemini key, which can give stronger cloud model responses while still avoiding MAIT-hosted key storage.',
  },
  {
    question: 'Can I use MAIT on my phone?',
    answer: 'Yes, the site is responsive and core pages work on mobile. Some heavier tools, especially worksheet editing and local browser models, are more comfortable on a laptop or desktop.',
  },
  {
    question: 'What subjects does MAIT cover currently?',
    answer: 'MAIT currently focuses on NSW Year 12 Mathematics Advanced workflows. Other courses are roadmap territory, so do not treat MAIT as complete coverage for every HSC subject or maths pathway yet.',
  },
  {
    question: 'How do I report a bug or suggest a feature?',
    answer: 'Use the contact page or the feedback box inside Worksheet Studio. Helpful reports include what you were trying to do, what happened, and whether you were using demo, BYOK, or a signed-in workflow.',
  },
];

export default function HelpPage() {
  return (
    <main className="min-h-screen px-4 pb-24 pt-28 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <section className="mb-12">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-mait-cyan/80">
            Help
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
            Questions students, teachers, and parents usually ask first.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/65">
            Clear answers about what MAIT does today, how the free modes work, and where to ask for help when something feels off.
          </p>
        </section>

        <section className="space-y-4">
          {faqs.map((item) => (
            <article key={item.question} className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
              <div className="flex gap-4">
                <HelpCircle className="mt-1 h-5 w-5 shrink-0 text-mait-cyan" />
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">{item.question}</h2>
                  <p className="mt-3 leading-7 text-white/62">{item.answer}</p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-2xl border border-mait-cyan/20 bg-mait-cyan/5 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold">Still need a hand?</h2>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Send a short note and include the page or tool you were using.
              </p>
            </div>
            <a href="/contact" className="btn-glass inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-white">
              <Mail className="h-4 w-4" />
              Contact MAIT
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
