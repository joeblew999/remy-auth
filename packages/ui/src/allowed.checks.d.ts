import type { Locator } from '@playwright/test';

export declare function offeredActions(locator: Locator): Promise<string[]>;
export declare function allowedActions(can: Readonly<Record<string, boolean>>, offered?: readonly string[]): string[];
