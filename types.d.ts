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


// storage
interface Field<T> {
    enum?: T extends StringConstructor ? Array<string> : undefined,
    maxLength?: T extends StringConstructor ? number : undefined
    exactLength?: T extends StringConstructor ? number : undefined
    greaterOrEqualTo?: T extends NumberConstructor ? string | string[] : undefined
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