import { useState } from 'react';
import { postAsk } from './api.js';
import { useT } from './i18n.js';
import { errorMessage } from './strings.js';

/** Free-text follow-up question. The answer is plain text from the server, rendered as a text node. */
export default function AskPanel({ city, lang }) {
  const t = useT();
  const [question, setQuestion] = useState('');
  const [state, setState] = useState({ status: 'idle', text: '', lang: 'en', empty: false });

  const submit = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (q.length < 3) {
      setState({ status: 'error', text: '', lang: 'en', empty: true });
      return;
    }
    if (state.status === 'busy') return;
    setState({ status: 'busy', text: '', lang: 'en', empty: false });
    try {
      const { answer, lang: answerLang } = await postAsk({ city, question: q, lang });
      setState({ status: 'ok', text: answer, lang: answerLang, empty: false });
    } catch (err) {
      const { text, translated } = errorMessage(lang, err);
      setState({ status: 'error', text, lang: translated ? lang : 'en', empty: false });
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
            maxLength={300}
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
    </section>
  );
}
