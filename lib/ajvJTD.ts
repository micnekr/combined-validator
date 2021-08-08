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

            let target = paramOptions.required ? out.properties : out.optionalProperties;

            if (paramOptions.array === true) {
                const copyWithoutArrayProperty = Object.assign({}, paramOptions);
                (target as any)[paramName] = {
                    elements: {}
                }
                target = (target as any)[paramName] // chage the reference so that the following code will think of it as a normal item
                paramName = "elements" // make it fill up the "elements"
            }

            // if can be resolved straight away
            if (typeof paramOptions.type === "string") {
                if (!(paramOptions.type in fieldTypesByTypeName)) throw new Error(`unknown type: ${paramOptions.type}`)
                const fieldType = (fieldTypesByTypeName as any)[paramOptions.type] as string;

                if (paramOptions.enum !== undefined)
                    (target as any)[paramName] = { enum: paramOptions.enum }
                else
                    (target as any)[paramName] = { type: fieldType }
            }

            else if (typeof paramOptions.type === "object") {
                const nextRef = refGenerator.next().value as string;
                (target as any)[paramName] = { ref: nextRef };
                (definitions as any)[nextRef] = recursivelyApplySettings(paramOptions.type);
            }
        }
        return out
    }

    const out = deepAssign(recursivelyApplySettings(flattened) as any, { definitions });

    return deleteEmptyObjectsAndUndefined(out);
}