# non-error

> An error subclass for wrapping non-error values

Wrap non-error values in a proper `Error` subclass. JavaScript allows throwing any value, but only `Error` instances have stack traces and proper debugging context. This package converts non-error values (strings, numbers, objects, etc.) into proper errors while preserving the original value.

## Install

```sh
npm install non-error
```

## Usage

```js
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

## API

### `new NonError(value, options?)`

Wraps a non-error value into an `Error` object.

This class is meant to be used when a value that is not an `Error` needs to be thrown or used as an error. JavaScript allows throwing any value, but this is considered bad practice. This class helps enforce proper error handling by converting any thrown value into a proper `Error` instance.

#### value

Type: `unknown`

The value to wrap.

The error message will be a string representation of this value, and the original value will be stored in the `value` property.

If value is already a `NonError` instance, it is returned as-is. If value is an `Error` instance, a `TypeError` is thrown (throw the Error directly instead).

#### options

##### superclass

Type: `ErrorConstructor`\
Default: `Error`

The superclass to extend from instead of `Error`.

This can be useful if you need `NonError` to extend a custom error class.

```js
import NonError from 'non-error';

const error = new NonError('test', {superclass: TypeError});

console.log(error instanceof TypeError);
//=> true

console.log(error instanceof NonError);
//=> true
```

### `error.isNonError`

Type: `true` <sup>(read-only)</sup>

Identify `NonError` instances. Always `true`.

### `error.value`

Type: `unknown` <sup>(read-only)</sup>

The original unwrapped value.

```js
import NonError from 'non-error';

const error = new NonError(404);
console.log(error.value);
//=> 404
```

### `NonError.isNonError(value)`

Returns: `boolean`

Check if a value is a `NonError` instance.

```js
import NonError from 'non-error';

const error = new NonError('test');
console.log(NonError.isNonError(error));
//=> true

console.log(NonError.isNonError(new Error('test')));
//=> false
```

### `NonError.try(callback)`

Executes the callback immediately and wraps any non-error throws in `NonError`. Real `Error` instances are re-thrown unchanged.

Supports both sync and async functions.

```js
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

### `NonError.wrap(function)`

Returns a wrapped function that catches non-error throws and wraps them in `NonError`. Real `Error` instances are re-thrown unchanged.

Supports both sync and async functions.

Useful for array methods, promise chains, and callbacks that are invoked synchronously or by code with error handling.

```js
import NonError from 'non-error';

// Array operations
const results = items.map(NonError.wrap(transform));
```

## Best practices

- Always throw `Error` instances, never strings, numbers, or plain objects.
- Use `NonError` to convert non-error values when needed.
- Keep error cause chains proper (wrap non-error causes with `NonError`).
- Better TypeScript ergonomics: by ensuring all thrown values are `Error` instances, error handling code can work with `Error` type instead of `unknown`.

## FAQ

### Why doesn't this accept the value in a `cause` option?

You might wonder why you can't do `new NonError('message', {cause: nonErrorValue})`.

While JavaScript's spec allows any value in the `cause` property, I think this is a design mistake. The `cause` property should always be an `Error` instance (or `undefined`) because:
- Non-error causes lack stack traces, losing critical debugging context about where the root cause originated
- It breaks TypeScript ergonomics, forcing `error.cause` to be typed as `unknown` instead of `Error | undefined`
- Every code path has to safe-guard against non-errors

### How is this different from [`ensure-error`](https://github.com/sindresorhus/ensure-error)?

`ensure-error` fixes everything: wraps non-errors AND normalizes broken `Error` instances (adds missing `stack`, recursively fixes `.cause` and `AggregateError#errors` chains). Use it in catch blocks when you want all errors normalized and cleaned up.

`non-error` only wraps non-errors. Real `Error` instances pass through unchanged. It's a more low-level component.

## Related

- [ensure-error](https://github.com/sindresorhus/ensure-error) - Ensures a value is a valid error by making it one if not
