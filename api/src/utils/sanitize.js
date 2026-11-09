const { FilterXSS } = require('xss');

/**
 * Removes every HTML tag from a string, keeping only plain text.
 * "<script>alert(1)</script>Logo design" becomes "Logo design".
 *
 * Used on free-text fields (gig titles, descriptions, booking notes, search)
 * so stored data can never carry a script into a page (stored XSS). React
 * also escapes output when rendering, so this is defence in depth.
 */
const stripAllTags = new FilterXSS({
  whiteList: {}, // no tags allowed at all
  stripIgnoreTag: true, // drop tags that are not on the (empty) allow-list
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'noscript'], // drop these AND their contents
  escapeHtml: (html) => html, // we strip rather than escape, so text is stored as typed
});

const stripHtml = (value) => {
  if (typeof value !== 'string') return value;
  // Remove any stray angle brackets left over from broken/half tags.
  return stripAllTags.process(value).replace(/[<>]/g, '').replace(/\s{2,}/g, ' ').trim();
};

module.exports = { stripHtml };