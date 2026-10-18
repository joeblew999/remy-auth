// The status-card part's checks, as partChecks() runs them: the card's own (./card.checks.js), which need the
// Worker's name.
import { statusCardChecks } from '@joeblew999/remy-showcase/parts/status-card/card.checks';

export default (options) => {
  if (!options?.service)
    throw new Error(
      "status-card checks need the Worker's name: partChecks({ options: { 'status-card': { service } } })",
    );
  statusCardChecks(options);
};
