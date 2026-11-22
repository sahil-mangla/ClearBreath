import { useState } from 'react';
import { DEFAULT_LANG } from '../src/languages.js';
import { QUESTION_MAX, QUESTION_MIN } from '../src/limits.js';
import { postAsk } from './api.js';
import { useT } from './i18n.js';
import { errorMessage } from './strings.js';

/** @typedef {{status:'idle'|'busy'|'ok'|'error', text:string, lang:string, empty:boolean}} AskState */

/**
 * The live region under the form: the answer, or what went wrong.
 * @param {{state:AskState}} props
 */
function AskOutput({ state }) {
  const t = useT();
  return (
    <div className="ask__out" aria-live="polite">
      {state.status === 'ok' ? (
        <div className="answer">
          <p lang={state.lang}>{state.text}</p>
        </div>
      ) : null}
      {state.status === 'error' ? (
        <p id="ask-error" className="error" lang={state.empty ? undefined : state.lang}>
          {state.empty ? t('ask.empty') : state.text}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Free-text follow-up question. The answer is plain text from the server, rendered as a text node.
 * @param {{city:string, lang:string}} props
 */
export default function AskPanel({ city, lang }) {
  const t = useT();
  const [question, setQuestion] = useState('');
  const [state, setState] = useState(
    /** @type {AskState} */ ({
      status: 'idle',
      text: '',
      lang: DEFAULT_LANG,
      empty: false,
    }),
  );

  /** @param {import('react').FormEvent} e */
  const submit = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (q.length < QUESTION_MIN) {
      setState({ status: 'error', text: '', lang: DEFAULT_LANG, empty: true });
      return;
    }
    if (state.status === 'busy') return;
    setState({ status: 'busy', text: '', lang: DEFAULT_LANG, empty: false });
    try {
      const { answer, lang: answerLang } = await postAsk({ city, question: q, lang });
      setState({ status: 'ok', text: answer, lang: answerLang, empty: false });
    } catch (err) {
      const { text, translated } = errorMessage(lang, err);
      setState({ status: 'error', text, lang: translated ? lang : DEFAULT_LANG, empty: false });
    }
  };

  const busy = state.status === 'busy';
  return (
    <section className="ask" aria-labelledby="ask-title">
      <h2 id="ask-title">{t('ask.title')}</h2>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="question">{t('ask.label')}</label>
          <input
            id="question"
            type="text"
            maxLength={QUESTION_MAX}
            autoComplete="off"
            placeholder={t('ask.placeholder')}
            value={question}
            aria-invalid={state.status === 'error' ? true : undefined}
            aria-describedby={state.status === 'error' ? 'ask-error' : undefined}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>
        <button type="submit" className="btn" aria-disabled={busy} data-busy={busy}>
          {busy ? t('ask.busy') : t('ask.send')}
        </button>
      </form>
      <AskOutput state={state} />
    </section>
  );
}
