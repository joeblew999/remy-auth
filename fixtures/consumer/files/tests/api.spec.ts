import { apiChecks } from '@joeblew999/remy-ui/api/checks';
import { info } from '@joeblew999/remy-fixture-contract';
import { router } from '../src/api/router';

apiChecks({ router, title: info.title });
