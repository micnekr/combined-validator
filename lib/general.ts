import { Flattened, fieldTypesByTypeName } from ".";

export function pickNeededEntries(target: any, rules: Flattened) {
    const constructErrorMessage = (v: any, s: string) => `The data does not comply with the rules: ${v} ${s}`;
    if (target === null || target === undefined || !Object.getPrototypeOf(target).isPrototypeOf(Object)) throw new Error(constructErrorMessage(target, "should be an object"))

    const out: any = {}

    for (let requiredKey in rules) {
        const entry = target[requiredKey];
        const entryRequirementsInfo = rules[requiredKey];
        if (entry === undefined) {
            if (entryRequirementsInfo.required) throw new Error(constructErrorMessage(entry, "is required and should be present"));
            else continue;
        }


        if (typeof entryRequirementsInfo.type === "string") {
            // check if the data is correct
            console.log([entry])
            const dataClass = (fieldTypesByTypeName as any)[entryRequirementsInfo.type];
            console.log(dataClass, entry instanceof dataClass)
            if (dataClass !== undefined && (entry instanceof dataClass || typeof entry === entryRequirementsInfo.type)) out[requiredKey] = entry;
            else throw new Error(constructErrorMessage(entry, `should be a ${entryRequirementsInfo.type}`));
        } else {
            // if it is a nested array, recurse
            out[requiredKey] = pickNeededEntries(entry, entryRequirementsInfo.type);
        }
    }

    return out;
}