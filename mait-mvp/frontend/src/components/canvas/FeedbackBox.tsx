import React, { useState } from 'react';
import { MessageSquarePlus, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

export function FeedbackBox() {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          context: 'Worksheet Native Canvas',
          email: localStorage.getItem('mait_student_id') || 'anonymous',
        }),
      });

      if (response.ok) {
        toast.success("Feedback sent! Thanks for helping us improve.");
        setMessage('');
        setIsOpen(false);
      } else {
        toast.error("Failed to send feedback. Please try again.");
      }
    } catch (e) {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="btn-glass rounded-full w-9 h-9">
          <MessageSquarePlus className="w-4 h-4 text-mait-cyan" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-slate-900 border-mait-cosmic/50 p-4 shadow-xl" align="end">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-white">Send Feedback</h4>
            <Button variant="ghost" size="icon" className="w-6 h-6 hover:bg-white/10" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-white/60">Notice a bug or have a feature request? Let us know directly below!</p>
          <Textarea 
            placeholder="What's on your mind?" 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[100px] bg-black/40 border-white/10 focus:border-mait-cyan/50 text-white placeholder:text-white/30 resize-none"
          />
          <div className="flex justify-end">
            <Button 
              onClick={handleSubmit} 
              disabled={!message.trim() || isSubmitting}
              className="btn-cosmic bg-mait-cyan text-black hover:bg-mait-cyan/90"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
