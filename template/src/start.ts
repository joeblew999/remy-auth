import { createStart } from '@tanstack/react-start';
import { startMiddleware } from '@joeblew999/remy-ui/start';
import { service } from './service';

export const startInstance = createStart(() => startMiddleware({ service }));
