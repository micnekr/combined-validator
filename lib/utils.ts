import { FieldConstraintsCollection, Flattened, FieldTypeContainer, FieldGroup } from "./";

//NOTE: this function is NOT SAFE and therefore should never be used with user input
export function deepAssign<T>(target: T, src: T) {
    if (src === undefined) return target; // return target if there is nothing in src to override target with
    const isRecursible = (val: any): val is object => typeof val === "object" && val !== null;
    if (!isRecursible(target) || !isRecursible(src)) return src; // if we can not recurse anymore, then choose src

    const keys = new Set(Object.keys(target))
    Object.keys(src).forEach((k) => keys.add(k)); // a set allows us not to bother about duplicates

    const out = (Array.isArray(target)) ? [] : {}; // the original Object.assign seems to select the type based on the target
    keys.forEach((k) => {
        (out as any)[k] = deepAssign((target as any)[k], (src as any)[k])
    })
    return out as T;
}

//NOTE: this function is NOT SAFE and therefore should never be used with user input
export function flatten(fields: FieldConstraintsCollection) {

    const out: Flattened = {};

    for (let typeContainerKey in fields) {
        const typeContainer: FieldTypeContainer = (fields as any)[typeContainerKey];
        const isRequired = typeContainerKey === "required";

        for (let groupName in typeContainer) {
            // if an object, recurse
            const fieldGroup: FieldGroup<any> | FieldConstraintsCollection = (typeContainer as any)[groupName];
            for (let entryName in fieldGroup) {
                const additionalData = (fieldGroup as any)[entryName];

                // recurse if needed
                if (groupName === "object") {
                    out[entryName] = {
                        type: flatten(additionalData),
                        "required": isRequired,
                    }
                    continue;
                }

                // else, copy over all the needed values
                out[entryName] = {
                    type: groupName,
                    required: isRequired,
                };
                for (let additionalDataName in additionalData) {
                    out[entryName][additionalDataName] = additionalData[additionalDataName];
                }
            }
        }
    }
    return out;
}

// NOTE: also deletes undefined
export function deleteEmptyObjectsAndUndefined<T>(target: T): any {
    // if not a plain object, skip
    if (target === null || target === undefined || !Object.getPrototypeOf(target).isPrototypeOf(Object)) return target;
    if (Object.keys(target).length === 0) return undefined;

    const out: any = {}
    for (let objKey in target) {
        // if an empty object, do not add
        const newVal = deleteEmptyObjectsAndUndefined(target[objKey]);
        if (newVal !== undefined) out[objKey] = newVal;
    }

    return out;
}

export const fieldTypesByTypeName = {
    string: String,
    number: Number,
    boolean: Boolean,
    date: Date,
    object: Object,
}