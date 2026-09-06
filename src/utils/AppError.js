/**
 * AppError represents a predictable, "operational" error - e.g. bad input,
 * unauthorised access, a duplicate account. These are errors we expect can
 * happen and want to communicate safely to the client.
 *
 * Anything that is NOT an AppError (a bug, a database crash, an unexpected
 * exception) is treated as a programming error by the global error handler
 * and only ever returns a generic message to the client - full details are
 * kept server-side in the console/log output.
 */
