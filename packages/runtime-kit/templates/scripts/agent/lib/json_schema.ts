export interface JsonSchema {
  type?: string | string[];
  const?: unknown;
  enum?: unknown[];
  pattern?: string;
  minLength?: number;
  minItems?: number;
  minimum?: number;
  items?: JsonSchema;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean;
  format?: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Minimal, dependency-free JSON Schema validator covering only the keyword
 * subset used by next_action.schema.json (object/array/string/integer/
 * boolean/null, const, enum, pattern, minLength, minItems, minimum,
 * required, properties, additionalProperties, format: date-time).
 */
export function validateAgainstSchema(
  schema: JsonSchema,
  data: unknown,
  path = "$",
): SchemaValidationResult {
  const errors: string[] = [];
  validateNode(schema, data, path, errors);
  return { valid: errors.length === 0, errors };
}

function validateNode(
  schema: JsonSchema,
  value: unknown,
  path: string,
  errors: string[],
): void {
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(t, value))) {
      errors.push(`${path}: expected type ${types.join(" | ")}`);
      return;
    }
  }

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path}: expected const ${JSON.stringify(schema.const)}`);
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: value not in enum [${schema.enum.join(", ")}]`);
  }

  if (typeof value === "string") {
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path}: does not match pattern ${schema.pattern}`);
    }
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path}: shorter than minLength ${schema.minLength}`);
    }
    if (schema.format === "date-time" && Number.isNaN(Date.parse(value))) {
      errors.push(`${path}: not a valid date-time`);
    }
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path}: below minimum ${schema.minimum}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path}: fewer than minItems ${schema.minItems}`);
    }
    if (schema.items) {
      value.forEach((item, index) => {
        validateNode(schema.items as JsonSchema, item, `${path}[${index}]`, errors);
      });
    }
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;

    for (const key of schema.required ?? []) {
      if (!(key in obj)) {
        errors.push(`${path}: missing required property "${key}"`);
      }
    }

    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in obj) {
          validateNode(propSchema, obj[key], `${path}.${key}`, errors);
        }
      }
    }

    if (schema.additionalProperties === false && schema.properties) {
      const allowed = new Set(Object.keys(schema.properties));
      for (const key of Object.keys(obj)) {
        if (!allowed.has(key)) {
          errors.push(`${path}: unexpected additional property "${key}"`);
        }
      }
    }
  }
}

function matchesType(type: string, value: unknown): boolean {
  switch (type) {
    case "object":
      return value !== null && typeof value === "object" && !Array.isArray(value);
    case "array":
      return Array.isArray(value);
    case "string":
      return typeof value === "string";
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "number":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    default:
      return true;
  }
}
