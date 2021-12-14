export class AuthError extends Error {}

export function handleUnAuthorizedError({ error }) {
  if (
    error?.response?.statusCode === 401 ||
    error?.response?.statusCode === 403 ||
    error?.response?.status === 401 ||
    error?.response?.status === 403
  ) {
    throw new AuthError();
  }
  return { error };
}
