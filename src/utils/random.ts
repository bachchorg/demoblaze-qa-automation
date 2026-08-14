import { faker } from '@faker-js/faker';

export function uniqueUsername(prefix = 'qa'): string {
  return `${prefix}_${Date.now()}_${faker.string.alphanumeric(6).toLowerCase()}`;
}

export function randomPassword(): string {
  return `Qa!${faker.string.alphanumeric(8)}9`;
}
