export type SerializedFields = Record<string, any>;

/**
 * Convert a key to JSON format (camelCase to snake_case conversion)
 */
export function keyToJson(key: string): string {
  return key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert a key from JSON format (snake_case to camelCase conversion)
 */
export function keyFromJson(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Map object keys using a transformation function and optional aliases
 */
export function mapKeys(
  obj: SerializedFields,
  keyMapper: (key: string) => string,
  aliases: Record<string, string> = {}
): SerializedFields {
  const result: SerializedFields = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const aliasedKey = aliases[key] || key;
    const mappedKey = keyMapper(aliasedKey);
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[mappedKey] = mapKeys(value, keyMapper, aliases);
    } else if (Array.isArray(value)) {
      result[mappedKey] = value.map(item => 
        item && typeof item === 'object' && !Array.isArray(item)
          ? mapKeys(item, keyMapper, aliases)
          : item
      );
    } else {
      result[mappedKey] = value;
    }
  }
  
  return result;
}