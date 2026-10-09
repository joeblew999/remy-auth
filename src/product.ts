import { docsConfig } from '../docs/docs.config';

/**
 * The product's name, for everything in this app that a person reads: the frame and page titles
 * (src/remy-app.tsx), the sign-in email (src/auth/mail.server.ts) and what Better Auth calls the app.
 * It is written once, as `product` in docs/docs.config.ts, which the docs Worker reads too; an app
 * with another name changes that one line (docs/content/dev/gui.md, "The product's name").
 */
export const product = docsConfig.product;
