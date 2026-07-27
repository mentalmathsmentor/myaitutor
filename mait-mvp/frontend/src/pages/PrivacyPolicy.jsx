import React from 'react';
import { AlertTriangle, Database, KeyRound, Lock, Mail, Shield, TimerReset } from 'lucide-react';

const sections = [
  {
    icon: KeyRound,
    title: 'Free BYOK tier',
    body: 'In Bring Your Own Key mode, your Gemini API key stays in your browser and is used from your device to contact Google Gemini directly. MAIT does not receive the key on its servers, does not store it in a MAIT database, and does not proxy your BYOK requests through MAIT infrastructure.',
  },
  {
    icon: Database,
    title: 'Paid accounts',
    body: 'Paid MAIT accounts may store account details, learning progress, worksheet history, tutoring interactions, and settings so the product can work across sessions. This data is stored in encrypted Postgres infrastructure and is never sold or shared for advertising.',
  },
  {
    icon: TimerReset,
    title: 'Engagement telemetry',
    body: 'With explicit consent, MAIT may collect typing cadence, interaction latency, pause patterns, deletion or correction patterns, and error patterns. These signals help estimate cognitive load in the same spirit as a human tutor noticing a student say “3... wait, 4” and slowing the lesson down.',
  },
  {
    icon: Lock,
    title: 'Consent for students',
    body: 'Engagement telemetry is opt-in. Users under 18 require parental or guardian consent before MAIT collects or uses these wellness signals beyond the minimum needed to operate the current session.',
  },
];

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen px-4 pb-24 pt-28 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-5 text-amber-50">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
            <p className="text-sm leading-6">
              This privacy policy is a working draft pending legal review before MAIT's school pilot launch.
            </p>
          </div>
        </div>

        <section className="mb-12">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-mait-cyan/80">
            Privacy
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
            Privacy should be part of the tutoring model, not fine print after the fact.
          </h1>
          <p className="mt-5 text-lg leading-8 text-white/65">
            MAIT is built for young people, schools, and high-pressure learning. That means data collection must be limited, explained clearly, and tied to a real learning or wellbeing purpose.
          </p>
          <p className="mt-4 text-sm text-white/45">Last updated: 30 April 2026</p>
        </section>

        <section className="grid gap-5">
          {sections.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
                <div className="flex gap-4">
                  <Icon className="mt-1 h-5 w-5 shrink-0 text-mait-cyan" />
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold">{item.title}</h2>
                    <p className="mt-3 leading-7 text-white/62">{item.body}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-10 space-y-8 rounded-2xl border border-white/10 bg-white/[0.035] p-7">
          <div>
            <h2 className="text-2xl font-bold">What MAIT collects</h2>
            <p className="mt-4 leading-8 text-white/65">
              MAIT only aims to collect information needed to provide tutoring, worksheet generation, account access, product support, school pilot evaluation, safety controls, and wellbeing-aware learning. Free demo and BYOK experiences are designed for zero MAIT server retention unless you separately submit feedback or contact MAIT.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold">How MAIT uses data</h2>
            <p className="mt-4 leading-8 text-white/65">
              Data is used to deliver tutoring, remember paid-account progress, improve reliability, respond to support requests, and detect signs of cognitive overload where consent has been given. MAIT does not sell student data, build advertising profiles, or share learning records for third-party advertising.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Retention</h2>
            <p className="mt-4 leading-8 text-white/65">
              The free BYOK tier is designed for zero MAIT server retention because requests do not pass through MAIT servers. Paid-tier data is retained while the subscription is active, unless a legal obligation requires a longer period or you request deletion earlier and MAIT can lawfully comply.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Your rights</h2>
            <p className="mt-4 leading-8 text-white/65">
              You can request access to personal information MAIT holds about you, ask for correction if something is wrong, or request deletion of your account data. For students under 18, a parent or guardian may need to help verify and manage these requests.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Australian Privacy Principles</h2>
            <p className="mt-4 leading-8 text-white/65">
              MAIT is being designed to comply with the Australian Privacy Principles, including transparency, purpose limitation, reasonable security, access, correction, and careful handling of personal information. This draft will be reviewed before any school pilot launch.
            </p>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-mait-cyan/20 bg-mait-cyan/5 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Shield className="mt-1 h-5 w-5 shrink-0 text-mait-cyan" />
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">Privacy contact</h2>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  For privacy questions, access requests, corrections, or deletion requests, contact MAIT directly.
                </p>
              </div>
            </div>
            <a href="mailto:mentor@mentalmaths.au" className="btn-glass inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-white">
              <Mail className="h-4 w-4" />
              mentor@mentalmaths.au
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
