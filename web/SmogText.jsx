import { Fragment, useMemo, useState } from 'react';
import { letterTiming, splitWords } from './lib.js';

/**
 * Text that resolves out of smog: each letter starts blurred, faint and slightly displaced, then
 * sharpens on its own stagger. Thicker air (higher `density`) starts blurrier.
 * Screen readers get the plain string; the animated letters are hidden from them.
 * Remount (change `key`) to replay. Under reduced motion CSS shows the text at rest.
 */
export default function SmogText({ text, as: Tag = 'span', density = 0.4, className = '', lang, salt = 1 }) {
  const words = useMemo(() => splitWords(text), [text]);
  const [startDensity] = useState(density); // frozen so a late live reading does not retime a running animation
  let index = 0;
  return (
    <Tag className={`smog ${className}`.trim()} lang={lang}>
      <span className="visually-hidden">{text}</span>
      <span className="smog__vis" aria-hidden="true" translate="no">
        {words.map((letters, w) => (
          <Fragment key={w}>
            <span className="smog__w">
              {letters.map((ch, k) => {
                const t = letterTiming(index++, startDensity, salt);
                return (
                  <span
                    className="smog__l"
                    key={k}
                    style={{ '--d': `${t.delay}ms`, '--b': `${t.blur}px`, '--y': `${t.rise}px` }}
                  >
                    {ch}
                  </span>
                );
              })}
            </span>
            {w < words.length - 1 ? ' ' : null}
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}
