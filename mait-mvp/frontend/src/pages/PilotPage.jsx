import React, { useState } from 'react';
import { CalendarDays, CheckCircle2, ClipboardCheck, GraduationCap, Lock, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const included = [
  'One Year 12 class',
  'One school term',
  'All current MAIT features',
  'Free access in exchange for usage data and structured feedback',
];

const maitProvides = [
  'Native Canvas worksheet IDE',
  'AI tutoring chat',
  'Pedagogical safety verification',
  'Autonomous adversarial testing',
];

const schoolsProvide = [
  'Classroom access for the agreed pilot class',
  'Feedback rights from staff and participating students',
  'A signed pilot agreement before rollout',
];

const initialForm = {
  schoolName: '',
  contactName: '',
  role: '',
  email: '',
  phone: '',
  expectedStart: '',
  notes: '',
};

export default function PilotPage() {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const { API_URL } = await import('@/config/api');
      const response = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          context: 'School Pilot Enquiry',
          subject: `MAIT Pilot enquiry: ${form.schoolName}`,
          message: [
            `School: ${form.schoolName}`,
            `Contact: ${form.contactName}`,
            `Role: ${form.role}`,
            `Email: ${form.email}`,
            `Phone: ${form.phone || 'Not supplied'}`,
            `Expected pilot start: ${form.expectedStart || 'Not supplied'}`,
            '',
            'Notes:',
            form.notes || 'None supplied',
          ].join('\n'),
        }),
      });

      if (!response.ok) {
        throw new Error('Pilot enquiry failed');
      }

      toast.success('Pilot enquiry sent. Darayat will review it soon.');
      setForm(initialForm);
    } catch (error) {
      toast.error('Could not send the pilot enquiry. Please try the email fallback below.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen px-4 pb-24 pt-28 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="space-y-7">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-mait-cyan/80">
              School pilot
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Pilot MAIT at your school
            </h1>
            <p className="text-lg leading-8 text-white/65">
              A practical one-term pilot for school administrators who want to test MAIT with a real Year 12 class before broader rollout.
            </p>

            <div className="rounded-2xl border border-mait-cyan/20 bg-mait-cyan/5 p-6">
              <div className="flex gap-3">
                <Sparkles className="mt-1 h-5 w-5 shrink-0 text-mait-cyan" />
                <div>
                  <h2 className="text-xl font-semibold">What is included</h2>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-white/65">
                    {included.map((item) => (
                      <li key={item} className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mait-cyan" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Register interest</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                This goes directly to mentor@mentalmaths.au through MAIT's existing Resend feedback route.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 sm:col-span-2">
                <Label htmlFor="schoolName" className="text-white/70">School name</Label>
                <Input id="schoolName" required value={form.schoolName} onChange={(event) => updateField('schoolName', event.target.value)} className="input-base h-12" />
              </label>
              <label className="space-y-2">
                <Label htmlFor="contactName" className="text-white/70">Contact name</Label>
                <Input id="contactName" required value={form.contactName} onChange={(event) => updateField('contactName', event.target.value)} className="input-base h-12" />
              </label>
              <label className="space-y-2">
                <Label htmlFor="role" className="text-white/70">Role</Label>
                <Input id="role" required value={form.role} onChange={(event) => updateField('role', event.target.value)} className="input-base h-12" />
              </label>
              <label className="space-y-2">
                <Label htmlFor="email" className="text-white/70">Email</Label>
                <Input id="email" type="email" required value={form.email} onChange={(event) => updateField('email', event.target.value)} className="input-base h-12" />
              </label>
              <label className="space-y-2">
                <Label htmlFor="phone" className="text-white/70">Phone</Label>
                <Input id="phone" type="tel" required value={form.phone} onChange={(event) => updateField('phone', event.target.value)} className="input-base h-12" />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <Label htmlFor="expectedStart" className="text-white/70">Expected pilot start</Label>
                <Input id="expectedStart" type="month" required value={form.expectedStart} onChange={(event) => updateField('expectedStart', event.target.value)} className="input-base h-12" />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes" className="text-white/70">Anything useful to know?</Label>
                <Textarea id="notes" value={form.notes} onChange={(event) => updateField('notes', event.target.value)} className="input-base min-h-28 resize-none" />
              </label>
            </div>

            <Button type="submit" disabled={isSubmitting} className="mt-6 h-12 w-full rounded-xl bg-mait-cyan text-black hover:bg-mait-cyan/90">
              {isSubmitting ? 'Sending...' : (
                <>
                  <Send className="h-4 w-4" />
                  Send pilot enquiry
                </>
              )}
            </Button>

            <p className="mt-4 text-center text-sm text-white/45">
              Prefer email? <a href="mailto:mentor@mentalmaths.au?subject=MAIT%20School%20Pilot" className="text-mait-cyan hover:text-white">mentor@mentalmaths.au</a>
            </p>
          </form>
        </section>

        <section className="mt-12 grid gap-5 lg:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <GraduationCap className="mb-5 h-6 w-6 text-mait-cyan" />
            <h2 className="text-xl font-semibold">What MAIT provides</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-white/62">
              {maitProvides.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <ClipboardCheck className="mb-5 h-6 w-6 text-mait-cyan" />
            <h2 className="text-xl font-semibold">What schools provide</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-white/62">
              {schoolsProvide.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <ShieldCheck className="mb-5 h-6 w-6 text-mait-cyan" />
            <h2 className="text-xl font-semibold">Privacy and compliance</h2>
            <p className="mt-4 text-sm leading-7 text-white/62">
              Pilot data will be handled under the pilot agreement and MAIT's privacy policy, with explicit attention to consent, student wellbeing signals, and school context.
            </p>
            <a href="/privacy" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-mait-cyan hover:text-white">
              Read the privacy policy
              <Lock className="h-4 w-4" />
            </a>
          </article>
        </section>

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.035] p-6">
          <div className="flex gap-3">
            <CalendarDays className="mt-1 h-5 w-5 shrink-0 text-mait-cyan" />
            <p className="leading-7 text-white/62">
              The pilot is intentionally narrow: one class, one term, enough real classroom use to learn honestly, and no broad school rollout before the agreement, consent, and support expectations are clear.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
