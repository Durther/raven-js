import { Backend, Options, SentryError } from '@sentry/core';
import { addBreadcrumb, captureEvent } from '@sentry/minimal';
import { SentryEvent, SentryException } from '@sentry/types';
import { Raven, SendMethod } from './raven';

/** Original raven send function. */
const sendRavenEvent = Raven._sendProcessedPayload.bind(Raven) as SendMethod;

/** Normalizes the event so it is consistent with our domain interface. */
function normalizeRavenEvent(event?: SentryEvent): SentryEvent | undefined {
  const ex = ((event && event.exception) || {}) as {
    values?: SentryException[];
  };
  if (event && ex && ex.values) {
    event.exception = ex.values;
  }
  return event;
}

/** Prepares an event so it can be send with raven-js. */
function prepareEventForRaven(event: SentryEvent): SentryEvent {
  const ravenEvent = event as any;
  if (event.exception) {
    // tslint:disable-next-line:no-unsafe-any
    ravenEvent.exception = { values: event.exception };
  }
  return ravenEvent as SentryEvent;
}

/**
 * Configuration options for the Sentry Browser SDK.
 * @see BrowserClient for more information.
 */
export interface BrowserOptions extends Options {
  /**
   * A pattern for error messages which should not be sent to Sentry. By
   * default, all errors will be sent.
   */
  ignoreErrors?: Array<string | RegExp>;

  /**
   * A pattern for error URLs which should not be sent to Sentry. To whitelist
   * certain errors instead, use {@link Options.whitelistUrls}. By default, all
   * errors will be sent.
   */
  ignoreUrls?: Array<string | RegExp>;

  /**
   * A pattern for error URLs which should exclusively be sent to Sentry. This
   * is the opposite of {@link Options.ignoreUrls}. By default, all errors will
   * be sent.
   */
  whitelistUrls?: Array<string | RegExp>;

  /**
   * Defines a list source code file paths. Only errors including these paths in
   * their stack traces will be sent to Sentry. By default, all errors will be
   * sent.
   */
  includePaths?: Array<string | RegExp>;
}

/** The Sentry Browser SDK Backend. */
export class BrowserBackend implements Backend {
  /** Creates a new browser backend instance. */
  public constructor(private readonly options: BrowserOptions = {}) {}

  /**
   * @inheritDoc
   */
  public install(): boolean {
    // We are only called by the client if the SDK is enabled and a valid DSN
    // has been configured. If no DSN is present, this indicates a programming
    // error.
    const dsn = this.options.dsn;
    if (!dsn) {
      throw new SentryError(
        'Invariant exception: install() must not be called when disabled',
      );
    }

    Raven.config(dsn, this.options);

    // We need to leave it here for now, as we are skipping `install` call,
    // due to integrations migration
    // TODO: Remove it once we fully migrate our code
    Raven._isRavenInstalled = true;
    Error.stackTraceLimit = Raven._globalOptions.stackTraceLimit;

    // Hook into Raven's breadcrumb mechanism. This allows us to intercept both
    // breadcrumbs created internally by Raven and pass them to the Client
    // first, before actually capturing them.
    Raven.setBreadcrumbCallback(breadcrumb => {
      addBreadcrumb(breadcrumb);
      return false;
    });

    // Hook into Raven's internal event sending mechanism. This allows us to
    // pass events to the client, before they will be sent back here for
    // actual submission.
    Raven._sendProcessedPayload = event => {
      const normalizedEvent = normalizeRavenEvent(event);
      if (normalizedEvent) {
        captureEvent(normalizedEvent);
      }
    };

    return true;
  }

  /**
   * @inheritDoc
   */
  public async eventFromException(exception: any): Promise<SentryEvent> {
    const originalSend = Raven._sendProcessedPayload;
    try {
      let event!: SentryEvent;
      Raven._sendProcessedPayload = evt => {
        event = evt;
      };
      Raven.captureException(exception);
      const normalizedEvent = normalizeRavenEvent(event);
      if (normalizedEvent) {
        return normalizedEvent;
      }
      throw new SentryError('Event was undefined when it should be an event');
    } finally {
      Raven._sendProcessedPayload = originalSend;
    }
  }

  /**
   * @inheritDoc
   */
  public async eventFromMessage(message: string): Promise<SentryEvent> {
    const originalSend = Raven._sendProcessedPayload;
    try {
      let event!: SentryEvent;
      Raven._sendProcessedPayload = evt => {
        event = evt;
      };
      Raven.captureMessage(message);
      const normalizedEvent = normalizeRavenEvent(event);
      if (normalizedEvent) {
        return normalizedEvent;
      }
      throw new SentryError('Event was undefined when it should be an event');
    } finally {
      Raven._sendProcessedPayload = originalSend;
    }
  }

  /**
   * @inheritDoc
   */
  public async sendEvent(event: SentryEvent): Promise<number> {
    return new Promise<number>(resolve => {
      sendRavenEvent(prepareEventForRaven(event), error => {
        // TODO: Check the response status code
        resolve(error ? 500 : 200);
      });
    });
  }

  /**
   * @inheritDoc
   */
  public storeBreadcrumb(): boolean {
    return true;
  }

  /**
   * @inheritDoc
   */
  public storeScope(): void {
    // Noop
  }
}
