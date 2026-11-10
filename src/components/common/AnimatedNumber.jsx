import React, { useEffect, useState, useRef } from 'react';
import { formatINR } from '../../services/financialEngine.js';

/**
 * AnimatedNumber
 * Smoothly counts up/down to target numerical value over 600ms.
 * Enforces tabular numbers, nowrap, and Indian currency formatting without duplicate symbols.
 */
export function AnimatedNumber({
  value,
  prefix = '₹',
  duration = 600,
  className = '',
  style = {}
}) {
  const numericTarget = typeof value === 'number'
    ? value
    : Number(String(value || 0).replace(/[^\d.-]/g, '')) || 0;

  const [displayValue, setDisplayValue] = useState(numericTarget);
  const prevTargetRef = useRef(numericTarget);
  const animFrameRef = useRef(null);

  useEffect(() => {
    // Respect user's motion preference
    const prefersReducedMotion = typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setDisplayValue(numericTarget);
      prevTargetRef.current = numericTarget;
      return;
    }

    const startVal = prevTargetRef.current;
    const diff = numericTarget - startVal;
    if (diff === 0) {
      setDisplayValue(numericTarget);
      return;
    }

    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic: 1 - pow(1 - progress, 3)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + diff * easeProgress);

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(numericTarget);
        prevTargetRef.current = numericTarget;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [numericTarget, duration]);

  // Clean formatting ensuring no duplicate ₹ and proper negative handling
  const isNegative = displayValue < 0;
  const absFormatted = formatINR(Math.abs(displayValue)).replace(/^[₹\s]+/, '');
  const formattedText = `${isNegative ? '-' : ''}${prefix}${absFormatted}`;

  return (
    <span
      className={`animated-currency-num ${className}`}
      style={{
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        display: 'inline-block',
        ...style
      }}
    >
      {formattedText}
    </span>
  );
}

export default AnimatedNumber;
