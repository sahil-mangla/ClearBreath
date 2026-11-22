const OPTIONS = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी' },
];

/**
 * The language switch. Each button is written in its own language so it can be read before it is chosen.
 * @param {{lang:string, onChange:(lang:string) => void, label:string}} props
 */
export default function LangToggle({ lang, onChange, label }) {
  return (
    <div className="langs" role="group" aria-label={label}>
      {OPTIONS.map(({ code, name }) => (
        <button
          key={code}
          type="button"
          className="btn btn--quiet"
          lang={code}
          aria-pressed={lang === code}
          onClick={() => onChange(code)}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
