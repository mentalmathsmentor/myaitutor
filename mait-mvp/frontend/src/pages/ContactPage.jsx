import React, { useState } from 'react';
import { Mail, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const audienceOptions = ['Student', 'Teacher', 'School Administrator', 'Parent', 'Other'];

const initialForm = {
  name: '',
  email: '',
  audience: '',
  subject: '',
  message: '',
};

export default function ContactPage() {
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
          context: `Contact Form - ${form.audience}`,
          subject: `MAIT Contact: ${form.subject}`,
          message: [
            `Name: ${form.name}`,
            `Email: ${form.email}`,
            `I am a: ${form.audience}`,
            `Subject: ${form.subject}`,
            '',
            'Message:',
            form.message,
          ].join('\n'),
        }),
      });

      if (!response.ok) {
        throw new Error('Contact form failed');
      }

      toast.success('Message sent. Thanks for reaching out.');
      setForm(initialForm);
    } catch (error) {
      toast.error('Could not send the message. Please use the email fallback below.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen px-4 pb-24 pt-28 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-mait-cyan/80">
              Contact
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              Talk to the person building MAIT.
            </h1>
            <p className="text-lg leading-8 text-white/65">
              Questions, school pilot interest, bugs, teacher workflow ideas, and honest student feedback are all useful at this stage.
            </p>

            <div className="rounded-2xl border border-mait-cyan/20 bg-mait-cyan/5 p-6">
              <div className="flex gap-3">
                <MessageSquare className="mt-1 h-5 w-5 shrink-0 text-mait-cyan" />
                <div>
                  <h2 className="text-xl font-semibold">Good messages include context</h2>
                  <p className="mt-3 text-sm leading-7 text-white/62">
                    If you are reporting a bug, mention the page, what you expected, and what happened. If you are a teacher or school administrator, include the year group or workflow you care about.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <Label htmlFor="name" className="text-white/70">Name</Label>
                <Input id="name" required value={form.name} onChange={(event) => updateField('name', event.target.value)} className="input-base h-12" />
              </label>

              <label className="space-y-2">
                <Label htmlFor="email" className="text-white/70">Email</Label>
                <Input id="email" type="email" required value={form.email} onChange={(event) => updateField('email', event.target.value)} className="input-base h-12" />
              </label>

              <div className="space-y-2">
                <Label className="text-white/70">I am a...</Label>
                <Select value={form.audience} onValueChange={(value) => updateField('audience', value)} required>
                  <SelectTrigger className="input-base h-12">
                    <SelectValue placeholder="Select one" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-mait-space text-white">
                    {audienceOptions.map((option) => (
                      <SelectItem key={option} value={option} className="focus:bg-mait-cyan/10 focus:text-mait-cyan">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <label className="space-y-2">
                <Label htmlFor="subject" className="text-white/70">Subject</Label>
                <Input id="subject" required value={form.subject} onChange={(event) => updateField('subject', event.target.value)} className="input-base h-12" />
              </label>

              <label className="space-y-2 sm:col-span-2">
                <Label htmlFor="message" className="text-white/70">Message</Label>
                <Textarea id="message" required value={form.message} onChange={(event) => updateField('message', event.target.value)} className="input-base min-h-40 resize-none" />
              </label>
            </div>

            <Button type="submit" disabled={isSubmitting || !form.audience} className="mt-6 h-12 w-full rounded-xl bg-mait-cyan text-black hover:bg-mait-cyan/90">
              {isSubmitting ? 'Sending...' : (
                <>
                  <Send className="h-4 w-4" />
                  Send message
                </>
              )}
            </Button>

            <p className="mt-4 text-center text-sm text-white/45">
              Email fallback: <a href="mailto:mentor@mentalmaths.au" className="text-mait-cyan hover:text-white">mentor@mentalmaths.au</a>
            </p>
          </form>
        </section>

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.035] p-6">
          <div className="flex gap-3">
            <Mail className="mt-1 h-5 w-5 shrink-0 text-mait-cyan" />
            <p className="leading-7 text-white/62">
              The form uses MAIT's existing Resend-backed feedback route and sends to mentor@mentalmaths.au. The mailto fallback stays here for schools or networks where forms are blocked.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
