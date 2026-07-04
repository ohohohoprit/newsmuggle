'use client';

import { useEffect, useRef, useState } from 'react';
import { Paperclip } from 'lucide-react';

const TIPS = [
  'The best content doesn\u2019t get lucky. It gets created with intention.',
  'Your audience doesn\u2019t owe you attention. Earn it.',
  'Consistency is the algorithm\u2019s favorite flavor.',
  'The first 3 seconds decide everything.',
];

const TYPE_SPEED = 45; // ms per char
const ERASE_SPEED = 25; // ms per char
const PAUSE_FULL = 2200; // ms to hold a fully typed tip
const PAUSE_EMPTY = 350; // ms before typing the next tip

export default function TypewriterTip() {
  const [displayed, setDisplayed] = useState('');
  const tipIndexRef = useRef(0);
  const charIndexRef = useRef(0);
  const modeRef = useRef<'typing' | 'pausing' | 'erasing' | 'idle'>('typing');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tick = () => {
      const currentTip = TIPS[tipIndexRef.current];
      const mode = modeRef.current;

      if (mode === 'typing') {
        charIndexRef.current += 1;
        setDisplayed(currentTip.slice(0, charIndexRef.current));
        if (charIndexRef.current >= currentTip.length) {
          modeRef.current = 'pausing';
          timerRef.current = setTimeout(tick, PAUSE_FULL);
          return;
        }
        timerRef.current = setTimeout(tick, TYPE_SPEED);
        return;
      }

      if (mode === 'pausing') {
        modeRef.current = 'erasing';
        timerRef.current = setTimeout(tick, PAUSE_EMPTY);
        return;
      }

      if (mode === 'erasing') {
        charIndexRef.current -= 1;
        setDisplayed(currentTip.slice(0, Math.max(0, charIndexRef.current)));
        if (charIndexRef.current <= 0) {
          tipIndexRef.current =
            (tipIndexRef.current + 1) % TIPS.length;
          modeRef.current = 'typing';
          timerRef.current = setTimeout(tick, PAUSE_EMPTY);
          return;
        }
        timerRef.current = setTimeout(tick, ERASE_SPEED);
        return;
      }

      // idle fallback — restart typing
      modeRef.current = 'typing';
      timerRef.current = setTimeout(tick, TYPE_SPEED);
    };

    timerRef.current = setTimeout(tick, TYPE_SPEED);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="mb-8 flex items-center gap-3 rounded-2xl border border-[#E5DDC8] bg-[#FAF6EB] px-6 py-4">
      <Paperclip size={22} className="shrink-0 text-[#8C6A3B]" strokeWidth={1.5} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="mb-0.5 text-[0.65rem] font-black uppercase tracking-[1px] text-[#8C6A3B]">
          Field Note
        </span>
        <p className="m-0 min-h-[1.5em] font-serif text-[1rem] italic leading-snug text-[#333]">
          {displayed}
          <span className="smuggler-caret" aria-hidden>&nbsp;</span>
        </p>
      </div>
    </div>
  );
}
