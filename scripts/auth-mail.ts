// npm run auth:mail -- you@example.com [--origin http://127.0.0.1:5173]: the newest sign-in codes the
// local environment captured for an address instead of mailing them, from the running local Worker's
// /dev/mail (a second process reading the local D1 while the Worker runs fails).
const args = process.argv.slice(2);
const at = args.indexOf('--origin');
const origin = at >= 0 ? args[at + 1] : 'http://127.0.0.1:5173';
const email = args.find((arg, index) => !arg.startsWith('--') && (at < 0 || index !== at + 1));
if (!email || !origin) {
  console.error('npm run auth:mail -- <email> [--origin <origin>]');
  process.exit(2);
}
const url = new URL('/dev/mail', origin);
url.searchParams.set('recipient', email);
const response = await fetch(url).catch(() => undefined);
if (!response) {
  console.error(`auth:mail: ${origin} did not answer; is the local Worker running (npm run dev)?`);
  process.exit(1);
}
if (!response.ok) {
  console.error(`auth:mail: ${url.href} answered ${response.status}`);
  process.exit(1);
}
process.stdout.write(await response.text());
