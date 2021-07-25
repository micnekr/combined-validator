import { deleteEmptyObjectsAndUndefined, FieldConstraintsCollection, flatten, Flattened } from ".";
import { deepAssign } from "./utils";


const fieldTypesByTypeName = {
    string: "string",
    number: "float64",
    boolean: "boolean",
    date: "timestamp",
}

export function createAjvJTDSchema(inputFields: FieldConstraintsCollection) {
    const flattened = flatten(inputFields);

    let refCounter = 0;
    function* genRef() {
        while (true) { yield "_ref_" + refCounter++ }
    }

    const refGenerator = genRef()

    const definitions = {};


    function recursivelyApplySettings(fields: Flattened) {
        const out = {
            properties: {

            },
            optionalProperties: {

            }
        };

        for (let paramName in fields) {
            const paramOptions = fields[paramName];

            if (typeof paramOptions.type === "string") {
                if (!(paramOptions.type in fieldTypesByTypeName)) throw new Error(`unknown type: ${paramOptions.type}`)
                const fieldType = (fieldTypesByTypeName as any)[paramOptions.type] as string;
                const target = paramOptions.required ? out.properties : out.optionalProperties;
                (target as any)[paramName] = { type: fieldType }
            } else {
                const nextRef = refGenerator.next().value as string
                const target = paramOptions.required ? out.properties : out.optionalProperties;
                (target as any)[paramName] = { ref: nextRef };
                (definitions as any)[nextRef] = recursivelyApplySettings(paramOptions.type);
            }
        }
        return out
    }

    const out = deepAssign(recursivelyApplySettings(flattened) as any, { definitions });

    return deleteEmptyObjectsAndUndefined(out);
}