import { createRequestHandler, RouterContextProvider } from 'react-router';
import { withObservability } from '@joeblew999/remy-ui/worker';
import { cloudflareContext } from '../app/context';

const handleRequest = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE,
);

// The shared wrapper adds the request ID, the structured log line and /healthz.
export default withObservability<Env>('remy-auth', (request, env, ctx) => {
  const context = new RouterContextProvider();
  context.set(cloudflareContext, { env, ctx, cf: request.cf as IncomingRequestCfProperties | undefined });
  return handleRequest(request, context);
}) satisfies ExportedHandler<Env>;
