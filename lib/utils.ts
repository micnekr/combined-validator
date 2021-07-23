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

export function deepAssign<T>(target: T, src: T) {
    if (src === undefined) return target; // return target if there is nothing in src to override target with
    const isRecursible = (val: any): val is object => typeof val === "object";
    if (!isRecursible(target) || !isRecursible(src)) return src; // if we can not recurse anymore, then choose src

    const keys = new Set(Object.keys(target))
    Object.keys(src).forEach((k) => keys.add(k)); // a set allows us not to bother about duplicates

    const out = (Array.isArray(target)) ? [] : {}; // the original Object.assign seems to select the type based on the target
    keys.forEach((k) => {
        (out as any)[k] = deepAssign((target as any)[k], (src as any)[k])
    })
    return out as T;
}

export function flatten(fields: FieldConstraintsCollection) {

    const out: Flattened = {};

    for (let typeContainerKey in fields) {
        if (!fields.hasOwnProperty(typeContainerKey)) continue;
        const typeContainer: FieldTypeContainer = (fields as any)[typeContainerKey];
        const isRequired = typeContainerKey === "required";

        for (let groupName in typeContainer) {
            // if an object, recurse
            if (!typeContainer.hasOwnProperty(groupName)) continue;
            const fieldGroup: FieldGroup<any> | FieldConstraintsCollection = (typeContainer as any)[groupName];
            for (let entryName in fieldGroup) {
                if (!fieldGroup.hasOwnProperty(entryName)) continue;
                const additionalData = (fieldGroup as any)[entryName];

                if (groupName === "object") {
                    out[entryName] = {
                        type: flatten(additionalData),
                        "required": isRequired,
                    }
                    continue;
                }
                out[entryName] = {
                    type: groupName,
                    required: isRequired,
                };
                for (let additionalDataName in additionalData) {
                    if (!additionalData.hasOwnProperty(additionalDataName)) continue;
                    out[entryName][additionalDataName] = additionalData[additionalDataName];
                }
            }
        }
    }
    return out;
}