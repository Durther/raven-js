import { getGlobalHub, Scope } from '@sentry/hub';
import { Breadcrumb, SentryEvent } from '@sentry/types';

/** Returns the current client, if any. */
export function getCurrentClient(): any | undefined {
  return getGlobalHub().getCurrentClient();
}

/**
 * This binds the given client to the current scope.
 * @param client An SDK client (client) instance.
 */
export function bindClient(client: any): void {
  const hub = getGlobalHub();
  const top = hub.getStackTop();
  top.client = client;
  top.scope = hub.createScope();
  top.scope.addScopeListener((s: Scope) => {
    // tslint:disable-next-line:no-unsafe-any
    if (client && client.getBackend) {
      try {
        // tslint:disable-next-line:no-unsafe-any
        client.getBackend().storeScope(s);
      } catch {
        // Do nothing
      }
    }
  });
}

/**
 * Captures an exception event and sends it to Sentry.
 *
 * @param exception An exception-like object.
 */
export function captureException(exception: any): void {
  getGlobalHub().captureException(exception);
}

/**
 * Captures a message event and sends it to Sentry.
 *
 * @param message The message to send to Sentry.
 */
export function captureMessage(message: string): void {
  getGlobalHub().captureMessage(message);
}

/**
 * Captures a manually created event and sends it to Sentry.
 *
 * @param event The event to send to Sentry.
 */
export function captureEvent(event: SentryEvent): void {
  getGlobalHub().captureEvent(event);
}

/**
 * Records a new breadcrumb which will be attached to future events.
 *
 * Breadcrumbs will be added to subsequent events to provide more context on
 * user's actions prior to an error or crash.
 *
 * @param breadcrumb The breadcrumb to record.
 */
export function addBreadcrumb(breadcrumb: Breadcrumb): void {
  getGlobalHub().addBreadcrumb(breadcrumb);
}

/**
 * Callback to set context information onto the scope.
 *
 * @param callback Callback function that receives Scope.
 */
export function configureScope(callback: (scope: Scope) => void): void {
  getGlobalHub().configureScope(callback);
}

/**
 * Calls a function on the latest client. Use this with caution, it's meant as
 * in "internal" helper so we don't need to expose every possible function in
 * the shim. It is not guaranteed that the client actually implements the
 * function.
 *
 * @param method The method to call on the client/client.
 * @param args Arguments to pass to the client/fontend.
 */
export function _callOnClient(method: string, ...args: any[]): void {
  getGlobalHub()._invokeClient(method, ...args);
}
