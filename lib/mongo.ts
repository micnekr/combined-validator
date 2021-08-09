import { PreMiddlewareFunction, Schema, SchemaDefinition } from "mongoose";
import injectValidationCreators, { callOverallValidationFunction } from "./validateUtils"
import { fieldTypesByTypeName, flatten, flattenIfNeeded, visit } from "./utils";
import { FieldConstraintsCollection, Flattened, FlattenedValue } from "./";

const { stringValidate, numberValidate } = injectValidationCreators(mongoCreateValidation, mongoCreateValidateMiddleware);

export const mongoValuesToApply = ["default", "enum", "unique"];

export const mongoValidateCallbacks = {
    maxLength: stringValidate.maxLength,
    exactLength: stringValidate.exactLength
}

export const mongoFinalValidationCallbacks = {
    greaterOrEqualTo: numberValidate.greaterOrEqualTo
}

export function constructSchema(inputFields: FieldConstraintsCollection | Flattened) {
    const flattened = flattenIfNeeded(inputFields);

    let finalValidationCallbacksForThisSchema: any[] = [];

    const schemaDef = visit(flattened,
        (variableName, out, type, variableSettings) => {
            const target = out[variableName] = {} as { [key: string]: any };

            target.required = variableSettings.required;
            target.type = variableSettings.array === true ? [type] : type;

            mongoValuesToApply.forEach(name => { if (variableSettings[name] !== undefined) target[name] = variableSettings[name] })
            Object.entries(mongoValidateCallbacks).forEach(([cbName, cb]) => {
                if (variableSettings[cbName] !== undefined) target.validate = cb(variableSettings[cbName]);
            })
            Object.entries(mongoFinalValidationCallbacks).forEach(([cbName, cb]) => {
                if (variableSettings[cbName] === undefined) return;
                // the first value is the validation callback, the others are the values to check (starting with self)
                const outVals = [cb, variableName];

                const options = variableSettings[cbName];

                if (Array.isArray(options)) outVals.push(...options);
                else outVals.push(options);

                finalValidationCallbacksForThisSchema.push(outVals);
            })
        },
        (variableName, out, childObj, variableSettings) => {
            const target = out[variableName] = {} as { [key: string]: any };

            target.required = variableSettings.required;
            target.type = variableSettings.array === true ? [new Schema(childObj)] : new Schema(childObj);
        },
        fieldTypesByTypeName
    );

    const out = new Schema(schemaDef)

    finalValidationCallbacksForThisSchema.forEach((settings) => {
        const validator = settings.shift();

        out.pre("validate", validator(settings));
    })

    return out;
}

// "current" means that those values are no longer general
export function mongoCreateValidation<T>(message: string, validate: (toCheck: T, ...referenceVals: any[]) => boolean) { // options specific to the check in general
    return function (...checkSettings: any[]) { // options specific to the current value
        return {
            message,
            validator: (value: T) => validate.apply(null, [value, ...checkSettings])
        }
    }
}

export function mongoCreateValidateMiddleware(message: string, automaticResponseToUndefined: boolean | null, callback: (resolvedFields: any[], toValidate: any, fields: any[]) => boolean) {
    return function (fieldsRequiredToValidate: any[]) {
        const out: PreMiddlewareFunction<any> = function (next) {
            if (callOverallValidationFunction(fieldsRequiredToValidate, this, automaticResponseToUndefined, callback)) return next();
            throw new Error(`${message}; Fields for validation: ${fieldsRequiredToValidate}`);
        }
        return out;
    }
}