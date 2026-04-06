import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ZeroCodeOnboardingModal from '../ZeroCodeOnboardingModal';

const STORAGE_KEY = 'mait_zerocode_onboarding_seen';

describe('ZeroCodeOnboardingModal', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('shows the modal on first visit (no localStorage key)', async () => {
    render(<ZeroCodeOnboardingModal />);
    await waitFor(
      () => {
        expect(screen.getByText(/zero coding required/i)).toBeInTheDocument();
      },
      { timeout: 1500 }
    );
  });

  it('does NOT show if localStorage key is already set', async () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    render(<ZeroCodeOnboardingModal />);
    // Wait past the 600ms delay to be sure
    await new Promise((r) => setTimeout(r, 800));
    expect(screen.queryByText(/zero coding required/i)).not.toBeInTheDocument();
  });

  it('dismisses and sets localStorage when CTA button is clicked', async () => {
    render(<ZeroCodeOnboardingModal />);
    await waitFor(
      () => expect(screen.getByText(/zero coding required/i)).toBeInTheDocument(),
      { timeout: 1500 }
    );

    fireEvent.click(screen.getByRole('button', { name: /got it/i }));
    expect(screen.queryByText(/zero coding required/i)).not.toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('dismisses on Escape key', async () => {
    render(<ZeroCodeOnboardingModal />);
    await waitFor(
      () => expect(screen.getByText(/zero coding required/i)).toBeInTheDocument(),
      { timeout: 1500 }
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText(/zero coding required/i)).not.toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('renders all three feature bullets', async () => {
    render(<ZeroCodeOnboardingModal />);
    await waitFor(
      () => {
        expect(screen.getByText(/too easy/i)).toBeInTheDocument();
        expect(screen.getByText(/diagram weird/i)).toBeInTheDocument();
        expect(screen.getByText(/wrong scenario/i)).toBeInTheDocument();
      },
      { timeout: 1500 }
    );
  });

  it('has correct ARIA attributes for accessibility', async () => {
    render(<ZeroCodeOnboardingModal />);
    await waitFor(
      () => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-labelledby', 'zerocode-modal-title');
      },
      { timeout: 1500 }
    );
  });
});
