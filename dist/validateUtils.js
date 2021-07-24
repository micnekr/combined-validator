"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMaxLength = exports.isExactLength = exports.isDescendingOrder = void 0;
function isDescendingOrder(resolvedFields) {
    return resolvedFields.every(function (value, index) {
        return index == resolvedFields.length - 1 || value >= resolvedFields[index + 1];
    });
}
exports.isDescendingOrder = isDescendingOrder;
var isExactLength = function (value, length) { return value.length == length; };
exports.isExactLength = isExactLength;
var isMaxLength = function (value, length) { return value.length <= length; };
exports.isMaxLength = isMaxLength;
function injectValidationCreators(createValidation, createFinalValidation) {
    return {
        stringValidate: {
            exactLength: createValidation("This string field size does not match the required size", exports.isExactLength),
            maxLength: createValidation("This string field is too long", exports.isMaxLength),
        },
        numberValidate: {
            greaterOrEqualTo: createFinalValidation("The fields need to be in descending order or equal", false, isDescendingOrder)
        }
    };
}
exports.default = injectValidationCreators;
//# sourceMappingURL=validateUtils.js.map