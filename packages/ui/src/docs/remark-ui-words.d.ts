import type { Plugin } from 'unified';
import type { Root } from 'mdast';

/** The remark plugin that writes the app's own word for each `:ui[key]` marker, in the page's language. */
export declare function remarkUiWords(options: { root: string; baseLocale?: string }): Plugin<[], Root>;
