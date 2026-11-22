/** The allowed values for the household form. Shared by server validation and the form, so they cannot drift. */
export const COMMUTES = ['bus_metro', 'car', 'auto_cab', 'two_wheeler', 'walk_cycle', 'wfh'];
export const COOKING = ['lpg', 'png', 'induction', 'biomass'];
export const HEATING = ['none', 'electric', 'wood_coal'];
export const CONDITIONS = ['asthma', 'heart', 'pregnancy'];

/**
 * [min, max] for each numeric field.
 * @type {Readonly<Record<string, readonly [number, number]>>}
 */
export const LIMITS = {
  adults: [1, 10],
  children: [0, 10],
  seniors: [0, 10],
  commuteKm: [0, 100],
  manualPm25: [0, 1000],
};

export const NOTES_MAX = 200;
/** The shortest question the assistant will take (characters, after trimming). */
export const QUESTION_MIN = 3;
export const QUESTION_MAX = 300;

/** What the form starts with and what the server assumes when a field is left out. */
export const DEFAULTS = {
  adults: 2,
  children: 0,
  seniors: 0,
  commute: 'bus_metro',
  commuteKm: 10,
  cooking: 'lpg',
  heating: 'none',
};
