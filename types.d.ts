// storage
interface Field<T> {
    enum?: T extends StringConstructor ? Array<string> : undefined,
    maxLength?: T extends StringConstructor ? number : undefined
    exactLength?: T extends StringConstructor ? number : undefined
    greaterOrEqualTo?: T extends NumberConstructor ? string : undefined
    lazyFill?: boolean,
    unique?: boolean,
    default?:
    T extends StringConstructor ? string :
    T extends NumberConstructor ? number :
    T extends DateConstructor ? Date :
    T extends BooleanConstructor ? boolean :
    undefined
}

interface FieldGroup<T> {
    [key: string]: Field<T>
}

interface FieldTypeContainer {
    string?: FieldGroup<StringConstructor>,
    number?: FieldGroup<NumberConstructor>,
    date?: FieldGroup<DateConstructor>,
    boolean?: FieldGroup<BooleanConstructor>,
    object?: {
        [key: string]: FieldConstraintsCollection
    }
}

interface FieldConstraintsCollection {
    required?: FieldTypeContainer,
    optional?: FieldTypeContainer
}

interface Flattened {
    [key: string]: FlattenedValue
}

interface FlattenedValue {
    type: string | Flattened,
    required: boolean,
    [key: string]: any
}

// vallidation
type ValidationCreator<T> = (message: string, validate: (toCheck: T, ...referenceVals: any[]) => boolean) => any
type FinalValidationCreator<T> = (message: string, automaticResponseToUndefined: boolean | null, callback: (resolvedFields: any[], toValidate: any, fields: any[]) => boolean) => any