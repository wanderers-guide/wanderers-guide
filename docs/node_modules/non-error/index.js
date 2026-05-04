const isNonErrorSymbol = Symbol('isNonError');

function defineProperty(object, key, value) {
	Object.defineProperty(object, key, {
		value,
		writable: false,
		enumerable: false,
		configurable: false,
	});
}

function stringify(value) {
	if (value === undefined) {
		return 'undefined';
	}

	if (value === null) {
		return 'null';
	}

	if (typeof value === 'string') {
		return value;
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}

	if (typeof value === 'bigint') {
		return `${value}n`;
	}

	if (typeof value === 'symbol') {
		return value.toString();
	}

	if (typeof value === 'function') {
		return `[Function${value.name ? ` ${value.name}` : ' (anonymous)'}]`;
	}

	// TODO: Use `Error.isError` when targeting Node.js 24
	if (value instanceof Error) {
		try {
			return String(value);
		} catch {
			return '<Unserializable error>';
		}
	}

	try {
		return JSON.stringify(value);
	} catch {
		try {
			return String(value);
		} catch {
			return '<Unserializable value>';
		}
	}
}

export default class NonError extends Error {
	constructor(value, {superclass: Superclass = Error} = {}) {
		// If already a NonError, return it as-is
		if (NonError.isNonError(value)) {
			return value; // eslint-disable-line no-constructor-return
		}

		if (value instanceof Error) {
			throw new TypeError('Do not pass Error instances to NonError. Throw the error directly instead.');
		}

		super(`Non-error value: ${stringify(value)}`);

		if (Superclass !== Error) {
			// Change this instance's prototype to Superclass.prototype
			// This makes instanceof Superclass work
			Object.setPrototypeOf(this, Superclass.prototype);
		}

		defineProperty(this, 'name', 'NonError');
		defineProperty(this, isNonErrorSymbol, true);
		defineProperty(this, 'isNonError', true);
		defineProperty(this, 'value', value);
	}

	static isNonError(value) {
		return value?.[isNonErrorSymbol] === true;
	}

	static #handleCallback(callback, arguments_) {
		try {
			const result = callback(...arguments_);

			// If the result is thenable (Promise-like), handle async rejections
			if (result && typeof result.then === 'function') {
				return (async () => {
					try {
						return await result;
					} catch (error) {
						// TODO: Use `Error.isError` when targeting Node.js 24
						if (error instanceof Error) {
							throw error;
						}

						throw new NonError(error);
					}
				})();
			}

			return result;
		} catch (error) {
			// TODO: Use `Error.isError` when targeting Node.js 24
			// If it's already an Error, re-throw as-is
			if (error instanceof Error) {
				throw error;
			}

			// Otherwise, wrap it in NonError
			throw new NonError(error);
		}
	}

	static try(callback) {
		return NonError.#handleCallback(callback, []);
	}

	static wrap(callback) {
		return (...arguments_) => NonError.#handleCallback(callback, arguments_);
	}

	// This makes instanceof work even when using the `superclass` option
	static [Symbol.hasInstance](instance) {
		return NonError.isNonError(instance);
	}
}
