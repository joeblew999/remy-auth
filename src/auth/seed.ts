// The seeded people: who exists, with which platform role, wherever the environment table allows
// seeded sign-in (src/auth/environment.ts; never production). Stable IDs, so an app's own seed can
// name them, as the notes demo's does (src/notes/seed.ts). Their addresses are `.test`, which is
// reserved and reaches nobody (RFC 2606). No Workers imports: the checks read this in Node.

/** The platform roles: what Better Auth's admin plugin stores on an account. */
export const roles = ['admin', 'user'] as const;
export type Role = typeof roles[number];

export const seededPeople = [
  { id: 'person_ada', name: 'Ada Okafor', email: 'ada@remy.test', role: 'admin' },
  { id: 'person_ben', name: 'Ben Carter', email: 'ben@remy.test', role: 'user' },
  { id: 'person_cleo', name: 'Cleo Tanaka', email: 'cleo@remy.test', role: 'user' },
  { id: 'person_dev', name: 'Dev Rahman', email: 'dev@remy.test', role: 'user' },
  { id: 'person_eli', name: 'Eli Novak', email: 'eli@remy.test', role: 'user' },
] as const satisfies readonly { id: string; name: string; email: string; role: Role }[];

export type SeededPerson = typeof seededPeople[number];

/** The seeded person with this address, if it is one of theirs. */
export const seededPerson = (email: string): SeededPerson | undefined => seededPeople.find(person => person.email === email.toLowerCase());
