import { PreMiddlewareFunction, Schema, SchemaDefinition } from "mongoose";
import injectValidationCreators from "./validateUtils"
import { fieldTypesByTypeName, flatten } from "./utils";
import { FieldConstraintsCollection, Flattened, FlattenedValue } from "./";

export const { stringValidate, numberValidate } = injectValidationCreators(createValidation, createValidateMiddleware);

export const valuesToApply = ["default", "enum", "unique"];

export const validateCallbacks = {
    maxLength: stringValidate.maxLength,
    exactLength: stringValidate.exactLength
}

export const finalValidationCallbacks = {
    greaterOrEqualTo: numberValidate.greaterOrEqualTo
}

export function constructSchema(inputFields: FieldConstraintsCollection) {
    const flattened = flatten(inputFields);

    function recursivelyApplySettings(fields: Flattened) {
        const schemaSettings: SchemaDefinition<undefined> = {};
        let finalValidationCallbacksForThisSchema: any[] = [];

        for (let paramName in fields) {
            const paramOptions = fields[paramName];

            // if a flattened object, do it recursively
            if (typeof paramOptions.type !== "string") {
                (schemaSettings as any)[paramName] = {
                    type: recursivelyApplySettings(paramOptions.type),
                    required: paramOptions.required,
                }
                continue;
            }

            const currentEntry: FlattenedValue = { type: (fieldTypesByTypeName as any)[paramOptions.type], required: paramOptions.required };

            for (let paramOptionName in paramOptions) {
                if (paramOptionName === "type" || paramOptionName === "required") continue
                const paramOption = paramOptions[paramOptionName];

                if (paramOptionName in validateCallbacks) {
                    currentEntry["validate"] = (validateCallbacks as any)[paramOptionName](paramOption);
                    continue;
                }

                if (valuesToApply.includes(paramOptionName)) {
                    currentEntry[paramOptionName] = paramOption;
                    continue;
                }

                if (paramOptionName in finalValidationCallbacks) {
                    // the first value is the validation callback, the others are the values to check
                    const outVals = [(finalValidationCallbacks as any)[paramOptionName], paramName];

                    if (Array.isArray(paramOption)) outVals.push(...paramOption);
                    else outVals.push(paramOption);

                    finalValidationCallbacksForThisSchema.push(outVals);

                    continue;
                }
            }

            (schemaSettings as any)[paramName] = currentEntry;
        }

        const out = new Schema(schemaSettings)
        finalValidationCallbacksForThisSchema.forEach((settings) => {
            const validator = settings.shift();

            out.pre("validate", validator(settings));
        })
        return out;
    }

    return recursivelyApplySettings(flattened);
}

// "current" means that those values are no longer general
export function createValidation<T>(message: string, validate: (toCheck: T, ...referenceVals: any[]) => boolean) { // options specific to the check in general
    return function (...currentReferenceVals: any[]) { // options specific to the current value
        return {
            message,
            validator: (value: T) => validate.apply(null, [value, ...currentReferenceVals])
        }
    }
}

export function createValidateMiddleware(message: string, automaticResponseToUndefined: boolean | null, callback: (resolvedFields: any[], toValidate: any, fields: any[]) => boolean) {
    return function (fields: any[]) {
        const out: PreMiddlewareFunction<any> = function (next) {
            const resolvedFields = fields.map((k) => this[k]);

            const hasSucceeded = automaticResponseToUndefined !== null && resolvedFields.some((k) => k === undefined) ? // if has undefined fields and we need to care about them,
                automaticResponseToUndefined : // return the pre-defined value
                callback(resolvedFields, this, fields); // else, validate
            if (hasSucceeded) return next();
            throw new Error(`${message}; Fields for validation: ${fields}`);
        }
        return out;
    }
}