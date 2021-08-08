import { FinalValidationCreator, ValidationCreator } from "./"

export function isGreaterOrEqualTo(resolvedFields: any[]) {
    return resolvedFields.slice(1).every(v => resolvedFields[0] >= v)
}

export const isExactLength = (value: string, length: number) => value.length == length;
export const isMaxLength = (value: string, length: number) => value.length <= length;

export default function injectValidationCreators(createValidation: ValidationCreator<any>, createFinalValidation: FinalValidationCreator<any>) {
    return {
        stringValidate: {

            exactLength: createValidation("This string field size does not match the required size", isExactLength),
            maxLength: createValidation("This string field is too long", isMaxLength),
        },

        numberValidate: {
            greaterOrEqualTo: createFinalValidation("The fields need to be in descending order or equal", false, isGreaterOrEqualTo)
        }
    }
}

export function callOverallValidationFunction(fieldsRequiredToValidate: any[], toValidate: any, automaticResponseToUndefined: boolean | null, callback: (resolvedFields: any[], toValidate: any, fields: any[]) => boolean) {
    // the first one is the value, the others are the arguments
    const resolvedRawvalues = toValidate[fieldsRequiredToValidate[0]]
    const values = Array.isArray(resolvedRawvalues) ? resolvedRawvalues : [resolvedRawvalues]
    const unresolvedArgs = fieldsRequiredToValidate.slice(1);

    const resolvedArgs: any[] = [];
    unresolvedArgs.forEach((v: any) => {
        const out = toValidate[v]
        if (Array.isArray(out)) resolvedArgs.push(...out) // TODO: test this separately
        else resolvedArgs.push(out)
    });

    return values.every((v: any, i: number) =>{
        const resolvedInputArray = [v].concat(resolvedArgs)
        return automaticResponseToUndefined !== null && resolvedInputArray.some((k) => k === undefined) ? // if has undefined fields and we need to care about them,
            automaticResponseToUndefined : // return the pre-defined value
            callback(resolvedInputArray, toValidate, [fieldsRequiredToValidate[0]].concat(unresolvedArgs)) // else, validate
    })

}