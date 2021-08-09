import { FieldConstraintsCollection, Flattened, FieldTypeContainer, FieldGroup, AdditionalObjectFieldConstraintsCollection, FlattenedValue } from "./";

//NOTE: this function is NOT SAFE and therefore should never be used with user input
export function deepAssign<T>(target: T, src: T) {
    if (src === undefined) return target; // return target if there is nothing in src to override target with
    const isRecursible = (val: any): val is object => typeof val === "object" && val !== null;
    if (!isRecursible(target) || !isRecursible(src)) return src; // if we can not recurse anymore, then choose src

    const keys = new Set(Object.keys(target))
    Object.keys(src).forEach((k) => keys.add(k)); // a set allows us not to bother about duplicates

    const out = (Array.isArray(target)) ? [] : {}; // the original Object.assign seems to select the type based on the target
    keys.forEach((k) => {
        if (src.hasOwnProperty(k) && (src as any)[k] === undefined) return; // if the property was specifically overwritten, leave it out
        (out as any)[k] = deepAssign((target as any)[k], (src as any)[k])
    })
    return out as T;
}

//NOTE: this function is NOT SAFE and therefore should never be used with user input
export function flatten(fields: FieldConstraintsCollection | (FieldConstraintsCollection & AdditionalObjectFieldConstraintsCollection)) {
    const out: Flattened = {};

    Object.entries(fields).forEach(([typeContainerKey, typeContainer]: [string, FieldTypeContainer]) => {
        // if it is an additional setting of an object, do not touch it because it has been recorded already. NOTE: the type before this point is incorrect because the supplied value could be AdditionalObjectFieldConstraintsCollection 
        if (!["required", "optional"].includes(typeContainerKey)) return;

        const isRequired = typeContainerKey === "required";

        Object.entries(typeContainer).forEach(([groupName, fieldGroup]: [string, FieldGroup<any> | FieldConstraintsCollection]) => {
            Object.entries(fieldGroup).forEach(([variableName, variableSettings]) => {
                // recurse if needed
                let variableSettingsOut: { [key: string]: any } = {}
                if (groupName === "object") {
                    const fieldConstraintsCollection: FieldConstraintsCollection & AdditionalObjectFieldConstraintsCollection = variableSettings;
                    // add all the other keys, e.g. "array" if needed
                    variableSettingsOut = Object.assign({}, fieldConstraintsCollection)
                    delete variableSettingsOut.required;
                    delete variableSettingsOut.optional; // removing those entries so that it becomes an AdditionalObjectFieldConstraintsCollection

                    out[variableName] = {
                        type: flatten(fieldConstraintsCollection),
                        "required": isRequired,
                    } // e.g. type: {Object}, required: true
                } else {
                    // else, copy over all the needed values
                    out[variableName] = {
                        type: groupName,
                        required: isRequired,
                    };
                    variableSettingsOut = variableSettings;
                }

                out[variableName] = {
                    ...out[variableName],
                    ...variableSettingsOut
                }
            })
        })
    })
    return out;
}

export function flattenIfNeeded(input: FieldConstraintsCollection | Flattened): Flattened {
    function isFlattened(v: FieldConstraintsCollection | Flattened): v is Flattened {
        return Object.entries(v).every(([k, v]: [string, FieldTypeContainer | FlattenedValue]) => {
            return "type" in v;
        })
    }

    return isFlattened(input) ? input : flatten(input)
}

function tryFollow(obj: any, key: string) {
    try {
        return obj[key]
    } catch {
        return undefined
    }
}


export function visit<ConvertedType>(fields: Flattened,
    resolvePrimitive: (variableName: string, toModify: { [key: string]: any }, type: ConvertedType | string, variableSettings: { [key: string]: any }, follower?: any) => void,
    addObject: (variableName: string, toModify: { [key: string]: any }, childObj: { [key: string]: any }, variableSettings: { [key: string]: any }) => void,
    typeMap?: { [key: string]: ConvertedType },
    follower?: any,
) {
    const out: { [key: string]: any } = {};

    Object.entries(fields).forEach(([variableName, variableSettings]) => {
        // const followerVariable = tryFollow(follower, variableName);
        const type = variableSettings.type

        // if it is not an object or an array, make sure that it can't be passed down because everything will break
        if (follower !== undefined && (follower === null || !(Array.isArray(follower) || Object.getPrototypeOf(follower).isPrototypeOf(Object)))) throw new Error(`The supplied value ${JSON.stringify(follower)} should be an object or an array, but it is not`);
        // if the key is not present or can not be extracted
        if (follower !== undefined && tryFollow(follower, variableName) === undefined) {
            if (variableSettings.required) throw new Error(`The passed value "${JSON.stringify(follower)}" does not have the required key "${variableName}" as requested by the schema "${JSON.stringify(fields)}"`)
            else return;
        }

        if (typeof type === "string") { // if it is a primitive
            const convertedType = typeMap ? typeMap[type] : type;

            resolvePrimitive(variableName, out, convertedType, variableSettings, follower); // modifies "out"
        }
        else if (typeof type === "object") {
            const followerValue = tryFollow(follower, variableName);
            let nested;
            if (follower !== undefined && variableSettings.array === true) {
                if(!Array.isArray(followerValue)) throw new Error(`The passed value "${JSON.stringify(followerValue)}" corresponding to the key ${variableName} was expected to be an array as requested by the schema "${JSON.stringify(fields)}"`)
                nested = followerValue.map((followerEl: any) => visit(type, resolvePrimitive, addObject, typeMap, followerEl))
            }else nested = visit(type, resolvePrimitive, addObject, typeMap, followerValue);
            addObject(variableName, out, nested, variableSettings);
        }
    })


    return out
}

// NOTE: also deletes undefined
export function deleteEmptyAndUndefined<T>(target: T): any {
    // if not a plain object, skip
    if (target === null || target === undefined || !Object.getPrototypeOf(target).isPrototypeOf(Object)) return target;
    if (Object.keys(target).length === 0) return undefined;

    const out: any = {}
    for (let objKey in target) {
        // if an empty object, do not add
        const newVal = deleteEmptyAndUndefined(target[objKey]);
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