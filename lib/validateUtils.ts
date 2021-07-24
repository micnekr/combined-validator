import { FinalValidationCreator, ValidationCreator } from "./"

export function isDescendingOrder(resolvedFields: any[]) {
    return resolvedFields.every((value: any, index: number) => {
        return index == resolvedFields.length - 1 || value >= resolvedFields[index + 1]
    })
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
            greaterOrEqualTo: createFinalValidation("The fields need to be in descending order or equal", false, isDescendingOrder)
        }
    }
}