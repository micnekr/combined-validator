"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.createValidateMiddleware = exports.createValidation = exports.constructSchema = exports.finalValidationCallbacks = exports.validateCallbacks = exports.valuesToApply = exports.numberValidate = exports.stringValidate = void 0;
var mongoose_1 = require("mongoose");
var validateUtils_1 = __importDefault(require("./validateUtils"));
var utils_1 = require("./utils");
exports.stringValidate = (_a = validateUtils_1.default(createValidation, createValidateMiddleware), _a.stringValidate), exports.numberValidate = _a.numberValidate;
var fieldTypesByTypeName = {
    string: String,
    number: Number,
    boolean: Boolean,
    date: Date,
    object: Object,
};
exports.valuesToApply = ["default", "enum", "unique"];
exports.validateCallbacks = {
    maxLength: exports.stringValidate.maxLength,
    exactLength: exports.stringValidate.exactLength
};
exports.finalValidationCallbacks = {
    greaterOrEqualTo: exports.numberValidate.greaterOrEqualTo
};
function constructSchema(fieldsPublic, fieldsPrivate) {
    if (fieldsPrivate === void 0) { fieldsPrivate = {}; }
    // since Object.assign gives us a shallow copy, we can't use it
    var mergedFields = utils_1.flatten(utils_1.deepAssign(fieldsPublic, fieldsPrivate));
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
                if (paramOptionName in exports.validateCallbacks) {
                    currentEntry["validate"] = exports.validateCallbacks[paramOptionName](paramOption);
                    continue;
                }
                if (exports.valuesToApply.includes(paramOptionName)) {
                    currentEntry[paramOptionName] = paramOption;
                    continue;
                }
                if (paramOptionName in exports.finalValidationCallbacks) {
                    console.log("final validation");
                    var outVals = [exports.finalValidationCallbacks[paramOptionName], paramName];
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
        var out = new mongoose_1.Schema(schemaSettings);
        finalValidationCallbacksForThisSchema.forEach(function (settings) {
            var validator = settings.shift();
            // make sure all the parameters are required (otherwise the functions do not make much sense)
            out.pre("validate", validator(settings));
        });
        return out;
    }
    return recursivelyApplySettings(mergedFields);
}
exports.constructSchema = constructSchema;
// "current" means that those values are no longer general
function createValidation(message, validate) {
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
exports.createValidation = createValidation;
function createValidateMiddleware(message, automaticResponseToUndefined, callback) {
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
exports.createValidateMiddleware = createValidateMiddleware;
//# sourceMappingURL=mongo.js.map