import { useReducedMotion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function useIsMobileOrReduced(breakpoint = 768) {
  const prefersReduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < breakpoint
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return prefersReduced || isMobile;
}
