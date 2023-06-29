export function notFalsyTypeGuard<T>(
  entityOrFalsy: T | null | undefined | 0 | '',
  message = 'Entity not defined',
): T {
  if (!entityOrFalsy) {
    throw new Error(message);
  }

  return entityOrFalsy;
}
