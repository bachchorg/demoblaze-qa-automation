/** Small, dependency-free unique-value helpers used across fixtures/tests. */

export function uniqueUsername(prefix = 'qa'): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}

export function randomPassword(): string {
  return `Qa!${Math.random().toString(36).slice(2, 10)}9`;
}
