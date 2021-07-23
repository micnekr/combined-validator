/*
combined-validator - A parser for a unified format for validation of both front-end and back-end

Copyright (C) 2021  micnekr

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { PreMiddlewareFunction } from "mongoose"

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