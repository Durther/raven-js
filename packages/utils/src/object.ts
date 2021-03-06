/**
 * Serializes the given object into a string.
 *
 * The object must be serializable, i.e.:
 *  - Only primitive types are allowed (object, array, number, string, boolean)
 *  - Its depth should be considerably low for performance reasons
 *
 * @param object A JSON-serializable object.
 * @returns A string containing the serialized object.
 */
export function serialize<T>(object: T): string {
  // TODO: Fix cyclic and deep objects
  return JSON.stringify(object);
}

/**
 * Deserializes an object from a string previously serialized with
 * {@link serialize}.
 *
 * @param str A serialized object.
 * @returns The deserialized object.
 */
export function deserialize<T>(str: string): T {
  // TODO: Handle recursion stubs from serialize
  return JSON.parse(str) as T;
}

/**
 * Creates a deep copy of the given object.
 *
 * The object must be serializable, i.e.:
 *  - It must not contain any cycles
 *  - Only primitive types are allowed (object, array, number, string, boolean)
 *  - Its depth should be considerably low for performance reasons
 *
 * @param object A JSON-serializable object.
 * @returns The object clone.
 */
export function clone<T>(object: T): T {
  return deserialize(serialize(object));
}

/**
 * Wrap a given object method with a higher-order function
 * and keep track of the original within `track` array
 *
 * @param source An object that contains a method to be wrapped.
 * @param name A name of method to be wrapped.
 * @param replacement A function that should be used to wrap a given method.
 * @param [track] An array containing original methods that were wrapped.
 * @returns void
 */

export function fill(
  source: { [key: string]: any },
  name: string,
  replacement: (...args: any[]) => any,
  track?: Array<[{ [key: string]: any }, string, any]>,
): void {
  const orig = source[name];
  source[name] = replacement(orig);
  // tslint:disable:no-unsafe-any
  source[name].__raven__ = true;
  // tslint:disable:no-unsafe-any
  source[name].__orig__ = orig;
  if (track) {
    track.push([source, name, orig]);
  }
}
