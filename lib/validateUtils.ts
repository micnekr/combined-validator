import { FinalValidationCreator, ValidationCreator } from "./"

export function isGreaterOrEqualTo(resolvedFields: any[]) {
    return resolvedFields[0] >= resolvedFields[1]
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
    const resolvedFields = fieldsRequiredToValidate.map((k) => toValidate[k]);

    return automaticResponseToUndefined !== null && resolvedFields.some((k) => k === undefined) ? // if has undefined fields and we need to care about them,
        automaticResponseToUndefined : // return the pre-defined value
        callback(resolvedFields, toValidate, fieldsRequiredToValidate); // else, validate
}