/**
 * Report whether `el` is on screen, so animated canvases below the fold can stop drawing.
 * Where IntersectionObserver is missing the element counts as always visible. Returns a function to stop watching.
 * @param {Element} el
 * @param {(onScreen:boolean) => void} onChange
 */
export function watchOnScreen(el, onChange) {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  const io = new IntersectionObserver(([entry]) => onChange(entry.isIntersecting));
  io.observe(el);
  return () => io.disconnect();
}
