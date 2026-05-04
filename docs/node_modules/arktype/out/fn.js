import { Callable, throwParseError } from "@ark/util";
export class InternalFnParser extends Callable {
    constructor($) {
        const attach = {
            $: $,
            raw: $.fn
        };
        super((...signature) => {
            const returnOperatorIndex = signature.indexOf(":");
            const lastParamIndex = returnOperatorIndex === -1 ?
                signature.length - 1
                : returnOperatorIndex - 1;
            const paramDefs = signature.slice(0, lastParamIndex + 1);
            const paramTuple = $.parse(paramDefs).assertHasKind("intersection");
            let returnType = $.intrinsic.unknown;
            if (returnOperatorIndex !== -1) {
                if (returnOperatorIndex !== signature.length - 2)
                    return throwParseError(badFnReturnTypeMessage);
                returnType = $.parse(signature[returnOperatorIndex + 1]);
            }
            return (impl) => new InternalTypedFn(impl, paramTuple, returnType);
        }, { attach });
    }
}
export class InternalTypedFn extends Callable {
    raw;
    params;
    returns;
    expression;
    constructor(raw, params, returns) {
        const typedName = `typed ${raw.name}`;
        const typed = {
            // assign to a key with the expected name to force it to be created that way
            [typedName]: (...args) => {
                const validatedArgs = params.assert(args);
                const returned = raw(...validatedArgs);
                return returns.assert(returned);
            }
        }[typedName];
        super(typed);
        this.raw = raw;
        this.params = params;
        this.returns = returns;
        let argsExpression = params.expression;
        if (argsExpression[0] === "[" &&
            argsExpression[argsExpression.length - 1] === "]")
            argsExpression = argsExpression.slice(1, -1);
        else if (argsExpression.endsWith("[]"))
            argsExpression = `...${argsExpression}`;
        this.expression = `(${argsExpression}) => ${returns?.expression ?? "unknown"}`;
    }
}
export const badFnReturnTypeMessage = `":" must be followed by exactly one return type e.g:
fn("string", ":", "number")(s => s.length)`;
