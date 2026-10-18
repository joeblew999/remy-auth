// This package's own src/ folder, for the Node code that reads its source files (the docs Worker, the parts, the
// fonts, the build-boundary markers): found from the package's manifest, so it is the same whether the file that asks
// runs from src/ (remy-auth's workspace) or was built into dist/ (an installed app: vp pack, vite.config.ts).
import { fileURLToPath } from 'node:url';

export const ownSrc: string = fileURLToPath(new URL('./src/', import.meta.resolve('@joeblew999/remy-ui/package.json')));
