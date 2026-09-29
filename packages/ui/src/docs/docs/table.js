import usersMeta from '@remy-docs-app/content/users/meta.json' with { type: 'json' };
import usersI18n from '@remy-docs-app/content/users/i18n.json' with { type: 'json' };
import devMeta from '@remy-docs-app/content/dev/meta.json' with { type: 'json' };
import devI18n from '@remy-docs-app/content/dev/i18n.json' with { type: 'json' };
import { docsConfig } from '@remy-docs-app/docs.config.ts';
import { docsTableOf } from './table-core.js';

// The docs table over this app's files, for the Worker (table-core.js; the app's files through the preset's
// @remy-docs-app alias).
export const { repository, branch, docsSites, docsTable, docsUrl, docsFile, docsLangs, docsObjectKey, docsObjectForKey, docsLangOfPath } =
  docsTableOf({ users: { meta: usersMeta, i18n: usersI18n }, dev: { meta: devMeta, i18n: devI18n } }, docsConfig);
