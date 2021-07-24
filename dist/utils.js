"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flatten = exports.deepAssign = void 0;
function deepAssign(target, src) {
    if (src === undefined)
        return target; // return target if there is nothing in src to override target with
    var isRecursible = function (val) { return typeof val === "object"; };
    if (!isRecursible(target) || !isRecursible(src))
        return src; // if we can not recurse anymore, then choose src
    var keys = new Set(Object.keys(target));
    Object.keys(src).forEach(function (k) { return keys.add(k); }); // a set allows us not to bother about duplicates
    var out = (Array.isArray(target)) ? [] : {}; // the original Object.assign seems to select the type based on the target
    keys.forEach(function (k) {
        out[k] = deepAssign(target[k], src[k]);
    });
    return out;
}
exports.deepAssign = deepAssign;
function flatten(fields) {
    var out = {};
    for (var typeContainerKey in fields) {
        if (!fields.hasOwnProperty(typeContainerKey))
            continue;
        var typeContainer = fields[typeContainerKey];
        var isRequired = typeContainerKey === "required";
        for (var groupName in typeContainer) {
            // if an object, recurse
            if (!typeContainer.hasOwnProperty(groupName))
                continue;
            var fieldGroup = typeContainer[groupName];
            for (var entryName in fieldGroup) {
                if (!fieldGroup.hasOwnProperty(entryName))
                    continue;
                var additionalData = fieldGroup[entryName];
                if (groupName === "object") {
                    out[entryName] = {
                        type: flatten(additionalData),
                        "required": isRequired,
                    };
                    continue;
                }
                out[entryName] = {
                    type: groupName,
                    required: isRequired,
                };
                for (var additionalDataName in additionalData) {
                    if (!additionalData.hasOwnProperty(additionalDataName))
                        continue;
                    out[entryName][additionalDataName] = additionalData[additionalDataName];
                }
            }
        }
    }
    return out;
}
exports.flatten = flatten;
//# sourceMappingURL=utils.js.map