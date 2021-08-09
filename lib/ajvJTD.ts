import { deleteEmptyAndUndefined, FieldConstraintsCollection, flatten, Flattened } from ".";
import { deepAssign, flattenIfNeeded, visit } from "./utils";


const fieldTypesByTypeName = {
    string: "string",
    number: "float64",
    boolean: "boolean",
    date: "timestamp",
}

export function createAjvJTDSchema(inputFields: FieldConstraintsCollection | Flattened) {
    const flattened = flattenIfNeeded(inputFields);

    let refCounter = 0;
    function* genRef() {
        while (true) { yield "_ref_" + refCounter++ }
    }

    const refGenerator = genRef()

    const definitions: { [key: string]: any } = {};
    function getTarget(variableName: string, out: {
        [key: string]: any;
    }, variableSettings: {
        [key: string]: any;
    }) {
        const isRequired: boolean = variableSettings.required;

        const outCollectionName = isRequired ? "properties" : "optionalProperties";

        out[outCollectionName] = out[outCollectionName] ?? ({} as any);
        let target = out[outCollectionName][variableName] = {} as any
        // if it is an array
        if (variableSettings.array === true) {
            target.elements = {}
            target = target.elements
        }
        return target;
    }
    const out = visit(flattened,
        (variableName, out, type, variableSettings) => {
            const target = getTarget(variableName, out, variableSettings);

            // if an enum
            if (variableSettings.enum !== undefined) target.enum = variableSettings.enum
            else target.type = type;
        },
        (variableName, out, childObj, variableSettings) => {
            const target = getTarget(variableName, out, variableSettings);
            const ref = refGenerator.next().value as string // can not be void
            target.ref = ref
            definitions[ref] = childObj
        },
        fieldTypesByTypeName
    )
    if (Object.keys(definitions).length !== 0) Object.assign(out, { definitions }) // only add defs if they are not empty
    return out;
}