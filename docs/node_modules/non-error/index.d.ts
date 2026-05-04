export type Options = {
	/**
	The superclass to extend from instead of `Error`.

	This can be useful if you need `NonError` to extend a custom error class.

	@default Error

	@example
	```
	import NonError from 'non-error';

	const error = new NonError('test', {superclass: TypeError});

	console.log(error instanceof TypeError);
	//=> true

	console.log(error instanceof NonError);
	//=> true
	```
	*/
	readonly superclass?: ErrorConstructor;
};

/**
Wraps a non-error value into an `Error` object.

This class is meant to be used when a value that is not an `Error` needs to be thrown or used as an error. JavaScript allows throwing any value, but this is considered bad practice. This class helps enforce proper error handling by converting any thrown value into a proper `Error` instance.

@example
```
import NonError from 'non-error';

const error = new NonError('Something went wrong');

console.log(error.message);
//=> 'Non-error value: Something went wrong'

console.log(error.value);
//=> 'Something went wrong'

console.log(error.isNonError);
//=> true

// Works with any value type
new NonError(404);
new NonError({code: 'ERR_NOT_FOUND'});
new NonError(undefined);
```
*/
export default class NonError extends Error {
	/**
	The error name.
	*/
	readonly name: 'NonError';

	/**
	The error stack trace.

	Always present for `NonError` instances.
	*/
	readonly stack: string;

	/**
	Identify `NonError` instances. Always `true`.
	*/
	readonly isNonError: true;

	/**
	The original unwrapped value.

	@example
	```
	import NonError from 'non-error';

	const error = new NonError(404);
	console.log(error.value);
	//=> 404
	```
	*/
	readonly value: unknown;

	/**
	@param value - The value to wrap. The error message will be a string representation of this value, and the original value will be stored in the `value` property. If value is already a `NonError` instance, it is returned as-is. If value is an `Error` instance, a `TypeError` is thrown (throw the Error directly instead).
	*/
	constructor(value: unknown, options?: Options);

	/**
	Check if a value is a `NonError` instance.

	@param value - The value to check.
	@returns `true` if the value is an instance of `NonError`, `false` otherwise.

	@example
	```
	import NonError from 'non-error';

	const error = new NonError('test');
	console.log(NonError.isNonError(error));
	//=> true

	console.log(NonError.isNonError(new Error('test')));
	//=> false
	```
	*/
	static isNonError(value: unknown): value is NonError;

	/**
	Executes the callback immediately and wraps any non-error throws in `NonError`. Real `Error` instances are re-thrown unchanged.

	Supports both sync and async functions.

	@param callback - A function to execute immediately.
	@returns The return value of the callback.

	@example
	```
	import NonError from 'non-error';

	// Non-error throws get wrapped
	try {
		NonError.try(() => {
			throw 'string error';
		});
	} catch (error) {
		console.log(error.isNonError);
		//=> true
	}

	// Real errors pass through unchanged
	try {
		NonError.try(() => {
			throw new TypeError('type error');
		});
	} catch (error) {
		console.log(error instanceof TypeError);
		//=> true
	}
	```
	*/
	static try<T>(callback: () => T): T;

	/**
	Returns a wrapped function that catches non-error throws and wraps them in `NonError`. Real `Error` instances are re-thrown unchanged.

	Supports both sync and async functions.

	Useful for array methods, promise chains, and callbacks that are invoked synchronously or by code with error handling.

	@param function_ - A function to wrap.
	@returns A wrapped version of the function.

	@example
	```
	import NonError from 'non-error';

	// Array operations
	const results = items.map(NonError.wrap(transform));
	```
	*/
	static wrap<A extends readonly unknown[], R>(function_: (...arguments_: A) => R): (...arguments_: A) => R;
}
