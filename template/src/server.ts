import start from '@tanstack/react-start/server-entry';
import { localizedWorker } from '@joeblew999/remy-ui/tanstack';
import { service } from './service';
import { everyPath } from './paths';

export default localizedWorker<Env>(service, start, { entryPaths: everyPath }) satisfies ExportedHandler<Env>;
