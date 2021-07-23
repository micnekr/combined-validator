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
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var _a;
import { Schema } from "mongoose";
import injectValidationCreators from "./validateUtils";
import { deepAssign, flatten } from "./utils";
export var stringValidate = (_a = injectValidationCreators(createValidation, createValidateMiddleware), _a.stringValidate), numberValidate = _a.numberValidate;
var fieldTypesByTypeName = {
    string: String,
    number: Number,
    boolean: Boolean,
    date: Date,
    object: Object,
};
export var valuesToApply = ["default", "enum", "unique"];
export var validateCallbacks = {
    maxLength: stringValidate.maxLength,
    exactLength: stringValidate.exactLength
};
export var finalValidationCallbacks = {
    greaterOrEqualTo: numberValidate.greaterOrEqualTo
};
export function constructSchema(fieldsPublic, fieldsPrivate) {
    if (fieldsPrivate === void 0) { fieldsPrivate = {}; }
    // since Object.assign gives us a shallow copy, we can't use it
    var mergedFields = flatten(deepAssign(fieldsPublic, fieldsPrivate));
    function recursivelyApplySettings(fields) {
        var schemaSettings = {};
        var finalValidationCallbacksForThisSchema = [];
        for (var paramName in fields) {
            var paramOptions = fields[paramName];
            // if a flattened object
            if (typeof paramOptions.type !== "string") {
                schemaSettings[paramName] = {
                    type: recursivelyApplySettings(paramOptions.type),
                    required: paramOptions.required,
                };
                continue;
            }
            var currentEntry = { type: fieldTypesByTypeName[paramOptions.type], required: paramOptions.required };
            for (var paramOptionName in paramOptions) {
                if (paramOptionName === "type" || paramOptionName === "required")
                    continue;
                var paramOption = paramOptions[paramOptionName];
                if (paramOptionName in validateCallbacks) {
                    currentEntry["validate"] = validateCallbacks[paramOptionName](paramOption);
                    continue;
                }
                if (valuesToApply.includes(paramOptionName)) {
                    currentEntry[paramOptionName] = paramOption;
                    continue;
                }
                if (paramOptionName in finalValidationCallbacks) {
                    console.log("final validation");
                    var outVals = [finalValidationCallbacks[paramOptionName], paramName];
                    if (Array.isArray(paramOption))
                        outVals.push.apply(outVals, paramOption);
                    else
                        outVals.push(paramOption);
                    finalValidationCallbacksForThisSchema.push(outVals);
                    continue;
                }
            }
            schemaSettings[paramName] = currentEntry;
        }
        var out = new Schema(schemaSettings);
        finalValidationCallbacksForThisSchema.forEach(function (settings) {
            var validator = settings.shift();
            // make sure all the parameters are required (otherwise the functions do not make much sense)
            out.pre("validate", validator(settings));
        });
        return out;
    }
    return recursivelyApplySettings(mergedFields);
}
// "current" means that those values are no longer general
export function createValidation(message, validate) {
    return function () {
        var currentReferenceVals = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            currentReferenceVals[_i] = arguments[_i];
        }
        return {
            message: message,
            validator: function (value) { return validate.apply(null, __spreadArray([value], currentReferenceVals)); }
        };
    };
}
export function createValidateMiddleware(message, automaticResponseToUndefined, callback) {
    return function (fields) {
        var out = function (next) {
            var _this = this;
            var resolvedFields = fields.map(function (k) { return _this[k]; });
            var hasSucceeded = automaticResponseToUndefined !== null && resolvedFields.some(function (k) { return k === undefined; }) ? // if has undefined fields and we need to care about them,
                automaticResponseToUndefined : // return the pre-defined value
                callback(resolvedFields, this, fields); // else, validate
            if (hasSucceeded)
                return next();
            throw new Error(message + "; Fields for validation: " + fields);
        };
        return out;
    };
}
//# sourceMappingURL=mongo.js.map