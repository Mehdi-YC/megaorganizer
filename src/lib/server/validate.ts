import { error, json } from '@sveltejs/kit';

type Validator<T> = (value: unknown) => value is T;

// --- Primitive validators ---

export function isString(v: unknown): v is string {
	return typeof v === 'string';
}

export function isNumber(v: unknown): v is number {
	return typeof v === 'number' && !isNaN(v);
}

export function isBoolean(v: unknown): v is boolean {
	return typeof v === 'boolean';
}

export function isOptional<T>(isValid: Validator<T>): Validator<T | undefined | null> {
	return (v: unknown): v is T | undefined | null => v === undefined || v === null || isValid(v);
}

export function isNonEmptyString(v: unknown): v is string {
	return isString(v) && v.trim().length > 0;
}

export function isOneOf<T extends string>(values: readonly T[]): Validator<T> {
	return (v: unknown): v is T => values.includes(v as T);
}

export function isArray<T>(isValid: Validator<T>): Validator<T[]> {
	return (v: unknown): v is T[] => Array.isArray(v) && v.every(isValid);
}

export function hasFields(obj: unknown): obj is Record<string, unknown> {
	return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

// --- Schema-based validation ---

type FieldSpec<T> = {
	validate: Validator<T>;
	required?: boolean;
	label?: string;
};

type Schema = Record<string, FieldSpec<any>>;

type InferSchema<S extends Schema> = {
	[K in keyof S as S[K]['required'] extends false ? never : K]: S[K]['validate'] extends Validator<
		infer T
	>
		? T
		: never;
} & {
	[K in keyof S as S[K]['required'] extends false ? K : never]?: S[K]['validate'] extends Validator<
		infer T
	>
		? T
		: never;
};

/**
 * Validates already-parsed data against a schema.
 * Returns either the validated data or a Response to return immediately.
 */
export function validateBody<S extends Schema>(
	body: unknown,
	schema: S
): { ok: true; data: InferSchema<S> } | { ok: false; error: Response } {
	if (!hasFields(body)) {
		return {
			ok: false,
			error: json({ error: 'Request body must be a JSON object' }, { status: 400 })
		};
	}

	const data: Record<string, unknown> = {};
	const errors: string[] = [];

	for (const [key, spec] of Object.entries(schema)) {
		const value = body[key];
		const label = spec.label ?? key;

		if (value === undefined || value === null) {
			if (spec.required !== false) {
				errors.push(`${label} is required`);
			}
			continue;
		}

		if (!spec.validate(value)) {
			errors.push(`${label} is invalid`);
			continue;
		}

		data[key] = value;
	}

	if (errors.length > 0) {
		return { ok: false, error: json({ error: errors.join('; ') }, { status: 400 }) };
	}

	return { ok: true, data: data as InferSchema<S> };
}

/**
 * Parse request body once and return it.
 * Throws a kit HttpError (400) if JSON is invalid. Note: throwing a plain
 * Response would surface as a 500, so this must use error().
 */
export async function parseJson(request: Request): Promise<Record<string, unknown>> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, { message: 'Invalid JSON body', error: 'Invalid JSON body' });
	}
	if (!hasFields(body)) {
		throw error(400, {
			message: 'Request body must be a JSON object',
			error: 'Request body must be a JSON object'
		});
	}
	return body;
}

/**
 * Parse a query-string integer, falling back when missing or invalid.
 */
export function intParam(value: string | null, fallback: number): number {
	const n = parseInt(value ?? '', 10);
	return Number.isNaN(n) ? fallback : n;
}
