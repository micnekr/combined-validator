import { Flattened, fieldTypesByTypeName, mongoCreateValidateMiddleware, mongoCreateValidation } from ".";
import injectValidationCreators, { callOverallValidationFunction } from "./validateUtils";

const { stringValidate, numberValidate } = injectValidationCreators(createGeneralValidation, createGeneralValidateMiddleware);

export const generalValidateCallbacks = {
    maxLength: stringValidate.maxLength,
    exactLength: stringValidate.exactLength
}

export const generalFinalValidationCallbacks = {
    greaterOrEqualTo: numberValidate.greaterOrEqualTo
}


export function extract(target: any, rules: Flattened) {
    const constructErrorMessage = (v: any, s: string) => `The data does not comply with the rules: ${v} ${s}`;
    if (target === null || target === undefined || !Object.getPrototypeOf(target).isPrototypeOf(Object)) throw new Error(constructErrorMessage(target, "should be an object"))

    const out: any = {}

    for (let requiredKey in rules) {
        const entry = target[requiredKey];
        const entryRequirementsInfo = rules[requiredKey];
        if (entry === undefined) {
            if (entryRequirementsInfo.required) throw new Error(constructErrorMessage(entry, "is required and should be present"));
            else continue;
        }


        if (typeof entryRequirementsInfo.type === "string") {
            // check if the data is correct
            const dataType = (fieldTypesByTypeName as any)[entryRequirementsInfo.type];
            const isArray = entryRequirementsInfo.array === true;

            const isCorrectType = (v: any) => v instanceof dataType || typeof v === entryRequirementsInfo.type

            if (dataType === undefined) throw new Error(constructErrorMessage(entry, ` can not be processed because the type ${dataType} is not defined`));
            if (!isArray) {
                // checking that the type is correct
                if (isCorrectType(entry)) out[requiredKey] = entry;
                else throw new Error(constructErrorMessage(entry, `should be a ${entryRequirementsInfo.type}`));
            } else {
                if (!Array.isArray(entry)) throw new Error(constructErrorMessage(entry, `should be an array of ${entryRequirementsInfo.type}[]`));
                if (!entry.every((v) => isCorrectType(v))) throw new Error(constructErrorMessage(entry, `should be an array of ${entryRequirementsInfo.type}[]`));
                out[requiredKey] = entry
            }
        } else {
            const isArray = entryRequirementsInfo.array === true;
            const type = entryRequirementsInfo.type

            // if it is a nested array, recurse
            if (isArray) out[requiredKey] = entry.map(((v: any) => extract(v, type)))
            else out[requiredKey] = extract(entry, type);
        }
    }

    return out;
}

export function extractAndValidate(target: any, rules: Flattened) {
    const extractedTarget = extract(target, rules) // make sure that all the needed keys are there

    const finalValidationCalls: any[][] = [];

    function recursivelyApplySettings(currentTarget: any, currentRules: Flattened) {
        for (let currentElementName in currentTarget) {
            let currentElementArray = currentTarget[currentElementName];
            const currentRule = currentRules[currentElementName];

            if (currentRule.array !== true) currentElementArray = [currentElementArray]

            for (let currentElement of currentElementArray) { // TODO: this loop is not needed for final validation callbacks

                // if a flattened object, do it recursively
                if (typeof currentRule.type !== "string") {
                    recursivelyApplySettings(currentElement, currentRule.type);
                    continue;
                }

                for (let optionName in currentRule) {
                    if (optionName === "type" || optionName === "required") continue // skip if it is not a rule
                    const option = currentRule[optionName];

                    if (optionName === "enum") {
                        if (!option.includes(currentElement)) throw new Error(`The enum "${currentElementName}" with the value "${currentElement}" must have one of the following values: "${option}"`)
                    }

                    if (optionName in generalValidateCallbacks) {
                        try {
                            (generalValidateCallbacks as any)[optionName](currentElement, option);
                        } catch (e) {
                            throw new Error(`The "${optionName}" constraint with the value "${option}" was not met by the field "${currentElementName}" with the value "${currentElement}" with an error message saying "${e.message}"`)
                        }
                    }

                    if (optionName in generalFinalValidationCallbacks) {
                        // the first value is the validation callback, the others are the values to check
                        const outVals = [(generalFinalValidationCallbacks as any)[optionName], currentElementName];

                        if (Array.isArray(option)) outVals.push(...option); // TODO: test this
                        else outVals.push(option);

                        finalValidationCalls.push(outVals);

                        continue;
                    }
                }
            }
        }
    }

    recursivelyApplySettings(extractedTarget, rules);

    for (let callName in finalValidationCalls) {
        const callOptions = finalValidationCalls[callName];
        const validator = callOptions.shift();

        try {
            validator(callOptions, extractedTarget);
        } catch (e) {
            throw new Error(`A constraint failed with an error message saying "${e.message}"`);
        }
    }
    return extractedTarget;
}

function createGeneralValidation<T>(message: string, validate: (toCheck: T, ...referenceVals: any[]) => boolean) {
    return function (value: T, ...checkSettings: any[]) { // options specific to the current value
        const result = validate.apply(null, [value, ...checkSettings])
        if (!result) throw new Error(message);
        return result;
    }
}

export function createGeneralValidateMiddleware(message: string, automaticResponseToUndefined: boolean | null, callback: (resolvedFields: any[], toValidate: any, fields: any[]) => boolean) {
    return function (fieldsRequiredToValidate: any[], toValidate: any) {
        if (callOverallValidationFunction(fieldsRequiredToValidate, toValidate, automaticResponseToUndefined, callback)) return true;
        throw new Error(`${message}; Fields for validation: ${fieldsRequiredToValidate}`);
    }
}