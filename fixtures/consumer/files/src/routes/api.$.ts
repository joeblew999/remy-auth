import { createFileRoute } from '@tanstack/react-router';
import { info } from '@joeblew999/remy-fixture-contract';
import { apiHandlers } from '@joeblew999/remy-ui/api/server';
import { router } from '../api/router';

export const Route = createFileRoute('/api/$')({ server: { handlers: apiHandlers(router, { info, context: () => ({}) }) } });
