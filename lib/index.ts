export * from "./mongo"
export * from "./utils"
export * from "./validateUtils"
export * from "./ajvJTD"
// storage
export interface Field<T> {
    enum?: T extends StringConstructor ? Array<string> : never,
    maxLength?: T extends StringConstructor ? number : never
    exactLength?: T extends StringConstructor ? number : never
    greaterOrEqualTo?: T extends NumberConstructor ? string | string[] : never
    lazyFill?: boolean,
    unique?: boolean,
    default?:
    T extends StringConstructor ? string :
    T extends NumberConstructor ? number :
    T extends DateConstructor ? Date :
    T extends BooleanConstructor ? boolean :
    never
}

export interface FieldGroup<T> {
    [key: string]: Field<T>
}

export interface FieldTypeContainer {
    string?: FieldGroup<StringConstructor>,
    number?: FieldGroup<NumberConstructor>,
    date?: FieldGroup<DateConstructor>,
    boolean?: FieldGroup<BooleanConstructor>,
    object?: {
        [key: string]: FieldConstraintsCollection
    }
}

export interface FieldConstraintsCollection {
    required?: FieldTypeContainer,
    optional?: FieldTypeContainer
}

export interface Flattened {
    [key: string]: FlattenedValue
}

export interface FlattenedValue {
    type: string | Flattened,
    required: boolean,
    [key: string]: any
}

// vallidation
export type ValidationCreator<T> = (message: string, validate: (toCheck: T, ...referenceVals: any[]) => boolean) => any
export type FinalValidationCreator<T> = (message: string, automaticResponseToUndefined: boolean | null, callback: (resolvedFields: any[], toValidate: any, fields: any[]) => boolean) => any