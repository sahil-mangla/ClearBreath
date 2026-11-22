import { HttpError } from '../http.js';

/**
 * The 400 for failed validation: the messages, and the form fields the page should mark invalid.
 * @param {{errors:string[], fields:string[]}} failure
 */
export const badInput = ({ errors, fields }) =>
  new HttpError(400, 'Please fix the highlighted inputs.', { code: 'bad_input', details: errors, fields });
