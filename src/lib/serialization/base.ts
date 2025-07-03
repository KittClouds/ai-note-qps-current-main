import { type SerializedFields, keyToJson, mapKeys } from './mapKeys';

export interface BaseSerialized<T extends string> {
  ns: number; // notes-system version
  type: T;
  id: string[];
  name?: string;
  graph?: Record<string, any>;
}

export interface SerializedConstructor extends BaseSerialized<'constructor'> {
  kwargs: SerializedFields;
}

export interface SerializedSecret extends BaseSerialized<'secret'> {}

export interface SerializedNotImplemented extends BaseSerialized<'not_implemented'> {}

export type Serialized =
  | SerializedConstructor
  | SerializedSecret
  | SerializedNotImplemented;

function shallowCopy<T extends object>(obj: T): T {
  return Array.isArray(obj) ? ([...obj] as T) : ({ ...obj } as T);
}

function replaceSecrets(
  root: SerializedFields,
  secretsMap: { [key: string]: string }
): SerializedFields {
  const result = shallowCopy(root);
  for (const [path, secretId] of Object.entries(secretsMap)) {
    const [last, ...partsReverse] = path.split('.').reverse();
    let current: any = result;
    for (const part of partsReverse.reverse()) {
      if (current[part] === undefined) {
        break;
      }
      current[part] = shallowCopy(current[part]);
      current = current[part];
    }
    if (current[last] !== undefined) {
      current[last] = {
        ns: 1,
        type: 'secret',
        id: [secretId],
      };
    }
  }
  return result;
}

/**
 * Get a unique name for the module
 */
export function getNsUniqueName(
  serializableClass: typeof Serializable
): string {
  const parentClass = Object.getPrototypeOf(serializableClass);
  const nsNameIsSubclassed =
    typeof serializableClass.ns_name === 'function' &&
    (typeof parentClass.ns_name !== 'function' ||
      serializableClass.ns_name() !== parentClass.ns_name());
  if (nsNameIsSubclassed) {
    return serializableClass.ns_name();
  } else {
    return serializableClass.name;
  }
}

export interface SerializableInterface {
  get ns_id(): string[];
}

export abstract class Serializable implements SerializableInterface {
  ns_serializable = false;
  ns_kwargs: SerializedFields;

  /**
   * A path to the module that contains the class, eg. ['notes', 'search']
   */
  abstract ns_namespace: string[];

  /**
   * The name of the serializable. Override to provide an alias or
   * to preserve the serialized module name in minified environments.
   */
  static ns_name(): string {
    return this.name;
  }

  /**
   * The final serialized identifier for the module.
   */
  get ns_id(): string[] {
    return [
      ...this.ns_namespace,
      getNsUniqueName(this.constructor as typeof Serializable),
    ];
  }

  /**
   * A map of secrets, which will be omitted from serialization.
   */
  get ns_secrets(): { [key: string]: string } | undefined {
    return undefined;
  }

  /**
   * A map of additional attributes to merge with constructor args.
   */
  get ns_attributes(): SerializedFields | undefined {
    return undefined;
  }

  /**
   * A map of aliases for constructor args.
   */
  get ns_aliases(): { [key: string]: string } | undefined {
    return undefined;
  }

  /**
   * A manual list of keys that should be serialized.
   */
  get ns_serializable_keys(): string[] | undefined {
    return undefined;
  }

  constructor(kwargs?: SerializedFields, ..._args: never[]) {
    if (this.ns_serializable_keys !== undefined) {
      this.ns_kwargs = Object.fromEntries(
        Object.entries(kwargs || {}).filter(([key]) =>
          this.ns_serializable_keys?.includes(key)
        )
      );
    } else {
      this.ns_kwargs = kwargs ?? {};
    }
  }

  toJSON(): Serialized {
    if (!this.ns_serializable) {
      return this.toJSONNotImplemented();
    }
    if (
      this.ns_kwargs instanceof Serializable ||
      typeof this.ns_kwargs !== 'object' ||
      Array.isArray(this.ns_kwargs)
    ) {
      return this.toJSONNotImplemented();
    }

    const aliases: { [key: string]: string } = {};
    const secrets: { [key: string]: string } = {};
    const kwargs = Object.keys(this.ns_kwargs).reduce((acc, key) => {
      acc[key] = key in this ? this[key as keyof this] : this.ns_kwargs[key];
      return acc;
    }, {} as SerializedFields);

    // get secrets, attributes and aliases from all superclasses
    for (
      let current = Object.getPrototypeOf(this);
      current;
      current = Object.getPrototypeOf(current)
    ) {
      Object.assign(aliases, Reflect.get(current, 'ns_aliases', this));
      Object.assign(secrets, Reflect.get(current, 'ns_secrets', this));
      Object.assign(kwargs, Reflect.get(current, 'ns_attributes', this));
    }

    // include all secrets used, even if not in kwargs
    Object.keys(secrets).forEach((keyPath) => {
      let read: any = this;
      let write: any = kwargs;

      const [last, ...partsReverse] = keyPath.split('.').reverse();
      for (const key of partsReverse.reverse()) {
        if (!(key in read) || read[key] === undefined) return;
        if (!(key in write) || write[key] === undefined) {
          if (typeof read[key] === 'object' && read[key] != null) {
            write[key] = {};
          } else if (Array.isArray(read[key])) {
            write[key] = [];
          }
        }

        read = read[key];
        write = write[key];
      }

      if (last in read && read[last] !== undefined) {
        write[last] = write[last] || read[last];
      }
    });

    return {
      ns: 1,
      type: 'constructor',
      id: this.ns_id,
      kwargs: mapKeys(
        Object.keys(secrets).length ? replaceSecrets(kwargs, secrets) : kwargs,
        keyToJson,
        aliases
      ),
    };
  }

  toJSONNotImplemented(): SerializedNotImplemented {
    return {
      ns: 1,
      type: 'not_implemented',
      id: this.ns_id,
    };
  }
}