import { useEffect, useRef, useState } from "react";

/**
 * Reveals `fullText` progressively, word-by-word, to emulate token
 * streaming for providers that return a complete response in one shot.
 * Pass `active=false` for messages loaded from history so they render
 * instantly instead of replaying the animation.
 */
export function useStreamingText(fullText: string, active: boolean) {
  const [visible, setVisible] = useState(active ? "" : fullText);
  const [done, setDone] = useState(!active);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setVisible(fullText);
      setDone(true);
      return;
    }

    setDone(false);
    const words = fullText.split(/(\s+)/); // keep whitespace tokens
    let i = 0;
    let acc = "";

    function tick() {
      // Reveal a few word-tokens per frame batch for a natural, fast pace.
      const chunk = Math.max(1, Math.ceil(words.length / 120));
      for (let n = 0; n < chunk && i < words.length; n++, i++) {
        acc += words[i];
      }
      setVisible(acc);
      if (i < words.length) {
        frame.current = window.setTimeout(tick, 14);
      } else {
        setDone(true);
      }
    }
    tick();

    return () => {
      if (frame.current) clearTimeout(frame.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullText, active]);

  return { visible, done };
}
