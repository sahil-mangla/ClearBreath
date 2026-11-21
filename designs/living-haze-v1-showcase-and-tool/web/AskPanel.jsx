import { useState } from 'react';
import { postAsk } from './api.js';

/** Free-text follow-up question. The answer is plain text from the server, rendered as a text node. */
export default function AskPanel({ city, lang }) {
  const [question, setQuestion] = useState('');
  const [state, setState] = useState({ status: 'idle', text: '', lang: 'en' });

  const submit = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (q.length < 3) {
      setState({ status: 'error', text: 'Please type a question first.', lang: 'en' });
      return;
    }
    if (state.status === 'busy') return;
    setState({ status: 'busy', text: '', lang: 'en' });
    try {
      const { answer, lang: answerLang } = await postAsk({ city, question: q, lang });
      setState({ status: 'ok', text: answer, lang: answerLang });
    } catch (err) {
      setState({ status: 'error', text: err.message, lang: 'en' });
    }
  };

  const busy = state.status === 'busy';
  return (
    <section className="ask" aria-labelledby="ask-title">
      <h2 id="ask-title">Ask ClearBreath</h2>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="question">Your question about air quality or healthy habits</label>
          <input
            id="question"
            type="text"
            maxLength={300}
            autoComplete="off"
            placeholder="Is it safe for my son to play cricket today?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>
        <button type="submit" className="btn" aria-disabled={busy} data-busy={busy}>
          {busy ? 'Thinking…' : 'Ask'}
        </button>
      </form>
      <div className="ask__out" aria-live="polite">
        {state.status === 'ok' ? (
          <div className="answer">
            <p lang={state.lang}>{state.text}</p>
          </div>
        ) : null}
        {state.status === 'error' ? (
          <p className="error" role="alert">
            {state.text}
          </p>
        ) : null}
      </div>
    </section>
  );
}
