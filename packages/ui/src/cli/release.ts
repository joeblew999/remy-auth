import { where } from './flow.ts';
import { release } from './packages.ts';

// STEP 4 of the flow, rarely and on the owner's word: a release, every check in every language
// locally, then the tag (packages.ts's release does both).
export async function main(): Promise<void> {
  const here = where();
  if (!here.onMain || !here.clean) {
    console.error(
      `dev:release: a release is made from a clean main (this is ${here.branch}${here.clean ? '' : ', with changes'}); npm run dev:land first`,
    );
    process.exit(1);
  }
  await release();
}
