import { createFileRoute } from '@tanstack/react-router';
import { info } from '@joeblew999/remy-fixture-contract';
import { noSession } from '@joeblew999/remy-ui/api/guard';
import { apiHandlers } from '@joeblew999/remy-ui/api/server';
import { router } from '../api/router';

// This app signs nobody in, so every caller is a stranger to the guard.
export const Route = createFileRoute('/api/$')({ server: { handlers: apiHandlers(router, { info, context: () => noSession }) } });
