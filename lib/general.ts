import { Flattened, FieldConstraintsCollection } from ".";
import { fieldTypesByTypeName, flattenIfNeeded, visit } from "./utils";
import injectValidationCreators, {
  callOverallValidationFunction,
} from "./validateUtils";

const { stringValidate, numberValidate } = injectValidationCreators(
  createGeneralValidation,
  createGeneralValidateMiddleware
);

export const generalValidateCallbacks = {
  maxLength: stringValidate.maxLength,
  exactLength: stringValidate.exactLength,
};

export const generalFinalValidationCallbacks = {
  greaterOrEqualTo: numberValidate.greaterOrEqualTo,
};

function basicVisitWithFollowerVerification(
  variableName: string,
  type: any,
  variableSettings: { [key: string]: any },
  follower?: any,
  valueArrayCb?: (value: any) => void
) {
  function constructError(
    value: any,
    variableName: string,
    follower: any,
    s: string
  ) {
    return `The value "${value}" that belongs to the key "${variableName}" in the object "${JSON.stringify(
      follower
    )}" ${s}`;
  }

  if (follower === undefined)
    throw new Error("Please supply an object to be validated");

  const value = follower[variableName];

  const isCorrectType = (v: any) => {
    try {
      return typeof v === variableSettings.type || v instanceof (type as any);
    } catch {
      return false;
    }
  };

  let valueArray;
  if (variableSettings.array === true) {
    if (!Array.isArray(value))
      throw new Error(
        constructError(value, variableName, follower, `is not an array`)
      );
    valueArray = value;
  } else valueArray = [value];

  valueArray.forEach((value) => {
    // do more processing to check if it works
    if (!isCorrectType(value))
      throw new Error(
        constructError(
          value,
          variableName,
          follower,
          `is not of the expected type "${variableSettings.type}"`
        )
      );
    valueArrayCb?.(value);
  });
  return value;
}

export function extract(
  follower: any,
  rules: FieldConstraintsCollection | Flattened
) {
  const flattened = flattenIfNeeded(rules);

  return visit(
    flattened,
    (variableName, toModify, type, variableSettings, follower) => {
      const value = basicVisitWithFollowerVerification(
        variableName,
        type,
        variableSettings,
        follower
      );

      toModify[variableName] = value;
    },
    (variableName, toModify, childObj) => {
      toModify[variableName] = childObj;
    },
    fieldTypesByTypeName,
    follower
  );
}

export function conditionalKeep(
  follower: any,
  rules: FieldConstraintsCollection | Flattened,
  key: string,
  predicate: (v: any) => boolean
) {
  const flattened = flattenIfNeeded(rules);

  return visit(
    flattened,
    (variableName, toModify, type, variableSettings, follower) => {
      const value = basicVisitWithFollowerVerification(
        variableName,
        type,
        variableSettings,
        follower
      );

      if (key in variableSettings && !predicate(variableSettings[key])) return;

      toModify[variableName] = value;
    },
    (variableName, toModify, childObj, variableSettings) => {
      if (key in variableSettings && !predicate(variableSettings[key])) return;

      toModify[variableName] = childObj;
    },
    fieldTypesByTypeName,
    follower
  );
}

export function extractAndValidate(
  follower: any,
  rules: FieldConstraintsCollection | Flattened
) {
  const flattened = flattenIfNeeded(rules); // make sure that all the needed keys are there

  const finalValidationCalls: any[][] = [];
  const out = visit(
    flattened,
    (variableName, toModify, type, variableSettings, follower) => {
      const value = basicVisitWithFollowerVerification(
        variableName,
        type,
        variableSettings,
        follower,
        (v) => {
          if (variableSettings.enum !== undefined) {
            if (!variableSettings.enum.includes(v))
              throw new Error(
                `The enum "${variableName}" with the value "${follower[variableName]}" must have one of the following values: "${variableSettings.enum}"`
              );
          }

          Object.entries(generalValidateCallbacks).forEach(([cbName, cb]) => {
            if (variableSettings[cbName] !== undefined) {
              try {
                cb(v, variableSettings[cbName]);
              } catch (e: any) {
                throw new Error(
                  `The "${cbName}" constraint with the value "${variableSettings[cbName]}" was not met by the field "${variableName}" with the value "${v}" with an error message saying "${e.message}"`
                );
              }
            }
          });

          Object.entries(generalFinalValidationCallbacks).forEach(
            ([cbName, cb]) => {
              if (variableSettings[cbName] !== undefined) {
                const options = variableSettings[cbName];
                // the first value is the validation callback, the others are the values to check
                const outVals = [cb, variableName];
                if (Array.isArray(options)) outVals.push(...options);
                // TODO: test this
                else outVals.push(options);
                finalValidationCalls.push(outVals);
              }
            }
          );
        }
      );

      toModify[variableName] = value;
    },
    (variableName, toModify, childObj) => {
      toModify[variableName] = childObj;
    },
    fieldTypesByTypeName,
    follower
  );

  Object.entries(finalValidationCalls).forEach(([callName, callOptions]) => {
    const validator = callOptions.shift();

    try {
      validator(callOptions, follower);
    } catch (e: any) {
      throw new Error(
        `A constraint failed with an error message saying "${e.message}"`
      );
    }
  });

  return out;
}

function createGeneralValidation<T>(
  message: string,
  validate: (toCheck: T, ...referenceVals: any[]) => boolean
) {
  return function (value: T, ...checkSettings: any[]) {
    // options specific to the current value
    const result = validate.apply(null, [value, ...checkSettings]);
    if (!result) throw new Error(message);
    return result;
  };
}

export function createGeneralValidateMiddleware(
  message: string,
  automaticResponseToUndefined: boolean | null,
  callback: (resolvedFields: any[], toValidate: any, fields: any[]) => boolean
) {
  return function (fieldsRequiredToValidate: any[], toValidate: any) {
    if (
      callOverallValidationFunction(
        fieldsRequiredToValidate,
        toValidate,
        automaticResponseToUndefined,
        callback
      )
    )
      return true;
    throw new Error(
      `${message}; Fields for validation: ${fieldsRequiredToValidate}`
    );
  };
}
