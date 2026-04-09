import React, { useState, useRef, useEffect } from 'react';
import { MessageSquarePlus, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function FeedbackBox() {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setIsSubmitting(true);
    setFeedbackStatus(null);
    try {
      const { API_URL } = await import('@/config/api');
      const response = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          context: 'Worksheet Native Canvas / Free Tier',
          email: localStorage.getItem('mait_student_id') || 'anonymous',
        }),
      });

      if (response.ok) {
        setFeedbackStatus("Sent! Thanks for your help. The developer will review this.");
        setMessage('');
        setTimeout(() => setFeedbackStatus(null), 5000);
      } else {
        setFeedbackStatus("Failed to send. Try again later.");
      }
    } catch (e) {
      setFeedbackStatus("Network error. Try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card-strong w-full rounded-3xl p-6">
      <div className="space-y-4">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-semibold text-white">
            <MessageSquarePlus className="w-5 h-5 text-mait-cyan" />
            Send Feedback
          </h3>
          <p className="mt-1 text-sm text-white/50">Notice a bug or have a feature request? Let us know directly below!</p>
        </div>
        <Textarea 
          placeholder="What's on your mind?" 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[120px] bg-black/40 border-white/10 focus:border-mait-cyan/50 text-white placeholder:text-white/30 resize-none rounded-2xl p-4 text-sm"
        />
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-mait-cyan">
            {feedbackStatus}
          </span>
          <Button 
            onClick={handleSubmit} 
            disabled={!message.trim() || isSubmitting}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-mait-cyan hover:text-black hover:border-transparent disabled:opacity-50"
          >
            {isSubmitting ? 'Sending...' : (
              <>
                <Send className="w-4 h-4" />
                Send message
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
