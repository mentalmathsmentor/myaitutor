import React from 'react';
import { ExternalLink, Github, GraduationCap, HeartPulse, MapPin, Sparkles } from 'lucide-react';

const values = [
  {
    icon: HeartPulse,
    title: 'Wellness first, marks second',
    body: 'MAIT exists because HSC maths should build confidence, not quietly burn students out. The goal is a study mate that notices cognitive load and teaches with care before it chases more minutes on screen.',
  },
  {
    icon: MapPin,
    title: 'Built for NSW classrooms',
    body: 'The product starts with NSW HSC Mathematics because local curriculum detail matters. MAIT is designed around the language, pressure, timing, and expectations Australian students and teachers already live with.',
  },
  {
    icon: Sparkles,
    title: 'Against generic AI',
    body: 'Most AI products optimise for engagement. MAIT is being built to optimise for learning: better questions, safer boundaries, printable teaching artefacts, and moments where the system knows to slow down.',
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen px-4 pb-24 pt-28 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="min-w-0 space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-mait-cyan/80">
              About MAIT
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              An Australian AI study mate for the HSC pressure cooker.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-white/65">
              MAIT began with a simple thesis: students do not need another generic chatbot trying to keep them online. They need a curriculum-aware tutor that can help them think, catch overload early, and respect the realities of Year 11 and 12 in NSW.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="https://github.com/mentalmathsmentor/myaitutor"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-cosmic inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-white"
              >
                <Github className="h-4 w-4" />
                View the code
                <ExternalLink className="h-4 w-4" />
              </a>
              <a
                href="https://mentalmaths.au"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-glass inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-white"
              >
                Mental Maths Mentor
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          <aside className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur">
            <div className="flex aspect-[4/5] items-center justify-center rounded-xl border border-dashed border-mait-cyan/30 bg-mait-cyan/5 text-center">
              <div className="px-8">
                <GraduationCap className="mx-auto mb-4 h-10 w-10 text-mait-cyan" />
                <p className="text-sm font-medium text-white/70">Photo placeholder</p>
                <p className="mt-2 text-xs leading-5 text-white/40">
                  Darayat can replace this with a founder photo later.
                </p>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-18 grid gap-5 md:grid-cols-3">
          {values.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
                <Icon className="mb-5 h-6 w-6 text-mait-cyan" />
                <h2 className="text-xl font-semibold">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-white/60">{item.body}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-7">
            <h2 className="text-2xl font-bold">Who is building it</h2>
            <p className="mt-4 leading-8 text-white/65">
              MAIT is being built by Darayat Ilham Chowdhury, a Bachelor of Education student at Macquarie University and the person behind Mental Maths Mentor. Darayat has around four years of tutoring experience, including being named Class Teacher of the Year 2023 at Art of Smart.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-7">
            <h2 className="text-2xl font-bold">Build philosophy</h2>
            <p className="mt-4 leading-8 text-white/65">
              MAIT is open source, transparent about costs, and built in Australia by an Australian for Australian students. The work is deliberately public because trust matters when a learning tool handles young people, stress, and personal study habits.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
