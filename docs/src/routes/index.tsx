import { createFileRoute, redirect } from '@tanstack/react-router';

// The docs Worker's home is the users' docs.
export const Route = createFileRoute('/')({ beforeLoad: () => { throw redirect({ to: '/docs/$', params: { _splat: '' } }); } });
