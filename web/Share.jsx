import { useState } from 'react';
import { useLang, useT } from './i18n.js';
import { planToText } from './share.js';

/** Print the plan, or copy it as plain text for a family or RWA chat. */
export default function Share({ result }) {
  const t = useT();
  const lang = useLang();
  const [note, setNote] = useState('');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(planToText(result, lang));
      setNote(t('share.copied'));
    } catch {
      setNote(t('share.copyFail'));
    }
  };
  return (
    <div className="share">
      <p className="share__hint">{t('share.hint')}</p>
      <div className="share__btns">
        <button type="button" className="btn" onClick={() => window.print()}>
          {t('share.print')}
        </button>
        <button type="button" className="btn" onClick={copy}>
          {t('share.copy')}
        </button>
      </div>
      <p className="share__note" role="status">
        {note}
      </p>
    </div>
  );
}
