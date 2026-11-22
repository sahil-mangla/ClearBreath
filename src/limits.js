/** The allowed values for the household form. Shared by server validation and the form, so they cannot drift. */
export const COMMUTES = ['bus_metro', 'car', 'auto_cab', 'two_wheeler', 'walk_cycle', 'wfh'];
export const COOKING = ['lpg', 'png', 'induction', 'biomass'];
export const HEATING = ['none', 'electric', 'wood_coal'];
export const CONDITIONS = ['asthma', 'heart', 'pregnancy'];

/** [min, max] for each numeric field. */
export const LIMITS = {
  adults: [1, 10],
  children: [0, 10],
  seniors: [0, 10],
  commuteKm: [0, 100],
  manualPm25: [0, 1000],
};

export const NOTES_MAX = 200;
