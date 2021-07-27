import { PreMiddlewareFunction, Schema, SchemaDefinition } from "mongoose";
import injectValidationCreators, { callOverallValidationFunction } from "./validateUtils"
import { fieldTypesByTypeName, flatten } from "./utils";
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

                if (paramOptionName in mongoValidateCallbacks) {
                    currentEntry["validate"] = (mongoValidateCallbacks as any)[paramOptionName](paramOption);
                    continue;
                }

                if (mongoValuesToApply.includes(paramOptionName)) {
                    currentEntry[paramOptionName] = paramOption;
                    continue;
                }

                if (paramOptionName in mongoFinalValidationCallbacks) {
                    // the first value is the validation callback, the others are the values to check
                    const outVals = [(mongoFinalValidationCallbacks as any)[paramOptionName], paramName];

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