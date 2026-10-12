/**
 * Reads the "exp" claim from a JWT so the UI knows when the session ends.
 * This does NOT verify the token (only the server can do that); it is only
 * used to log the user out on time.
 */
export const decodeTokenExpiry = (token) => {
  try {
    const part = token.split('.')[1];
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
};
