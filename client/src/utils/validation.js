/**
 * True when a price is digits with at most two decimals ("850", "99.5", "10.99").
 * Uses split + two simple patterns instead of one regex with a nested
 * optional group, which ESLint's safe-regex rule reported as a possible
 * ReDoS pattern (static analysis finding fix).
 */
export const hasAtMostTwoDecimals = (value) => {
  const parts = String(value).split('.');
  if (parts.length > 2) return false;
  const [whole, decimals = ''] = parts;
  return /^\d{1,7}$/.test(whole) && /^\d{0,2}$/.test(decimals);
};

/**
 * Client-side validation. It mirrors the API's rules so people get instant,
 * friendly feedback. It is a convenience only: the API validates everything
 * again and is the real security boundary.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME = /^[a-zA-Z0-9_]+$/;
const HTML = /<[^>]*>/;

export function validateRegister({ username, email, password, confirmPassword }) {
  const e = {};
  if (!username.trim()) e.username = 'Enter a username.';
  else if (username.trim().length < 3 || username.trim().length > 30) e.username = 'Use 3 to 30 characters.';
  else if (!USERNAME.test(username.trim())) e.username = 'Use only letters, numbers and underscores.';

  if (!email.trim()) e.email = 'Enter your email address.';
  else if (!EMAIL.test(email.trim())) e.email = 'Enter a valid email address, like name@example.com.';

  if (!password) e.password = 'Choose a password.';
  else if (password.length < 8) e.password = 'Use at least 8 characters.';
  else if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^a-zA-Z0-9]/.test(password))
    e.password = 'Include an uppercase letter, a lowercase letter, a number and a symbol.';

  if (password && confirmPassword !== password) e.confirmPassword = 'Passwords do not match.';
  return e;
}

export function validateLogin({ email, password }) {
  const e = {};
  if (!email.trim()) e.email = 'Enter your email address.';
  else if (!EMAIL.test(email.trim())) e.email = 'Enter a valid email address.';
  if (!password) e.password = 'Enter your password.';
  return e;
}

export function validateGig({ title, description, category, price, deliveryDays }) {
  const e = {};
  const t = title.trim();
  if (!t) e.title = 'Give your gig a title.';
  else if (HTML.test(t)) e.title = 'Titles cannot contain HTML.';
  else if (t.length < 5 || t.length > 100) e.title = 'Use 5 to 100 characters.';

  const d = description.trim();
  if (!d) e.description = 'Describe what the client gets.';
  else if (HTML.test(d)) e.description = 'Descriptions cannot contain HTML.';
  else if (d.length < 20 || d.length > 2000) e.description = 'Use 20 to 2000 characters.';

  if (!category) e.category = 'Pick a category.';

  const p = Number(price);
  if (price === '' || Number.isNaN(p)) e.price = 'Enter a price in rand.';
  else if (p < 1 || p > 1000000) e.price = 'Price must be between R1 and R1,000,000.';
  else if (!hasAtMostTwoDecimals(price)) e.price = 'Use at most two decimal places.';

  const dd = Number(deliveryDays);
  if (deliveryDays === '' || !Number.isInteger(dd) || dd < 1 || dd > 365) e.deliveryDays = 'Enter whole days from 1 to 365.';
  return e;
}

export function validateNotes(notes) {
  if (notes.length > 500) return 'Keep notes under 500 characters.';
  if (HTML.test(notes)) return 'Notes cannot contain HTML.';
  return '';
}
