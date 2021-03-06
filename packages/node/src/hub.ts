import { Carrier, getGlobalHub as getGlobalHubBase, Hub } from '@sentry/hub';
import * as domain from 'domain';

declare module 'domain' {
  export let active: Domain;
  /**
   * Extension for domain interface
   */
  export interface Domain {
    __SENTRY__?: Carrier;
  }
}

/**
 * Returns the latest global hum instance.
 *
 * If a hub is already registered in the global carrier but this module
 * contains a more recent version, it replaces the registered version.
 * Otherwise, the currently registered hub will be returned.
 */
export function getGlobalHub(): Hub {
  const globalHub = getGlobalHubBase();
  if (!domain.active) {
    return globalHub;
  }

  let carrier = domain.active.__SENTRY__;
  if (!carrier) {
    domain.active.__SENTRY__ = carrier = {};
  }

  if (!carrier.hub) {
    carrier.hub = new Hub(
      globalHub.getStackTop() ? [globalHub.getStackTop()] : [],
    );
  }

  return carrier.hub;
}
