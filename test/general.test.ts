import { expect } from "chai";
import { flatten } from "../lib";
import {
  filterValues,
  extract,
  extractAndValidate,
  filterRules,
} from "../lib/general";

describe("general.ts", function () {
  describe("#extract()", function () {
    it("should create an object with the requested keys, while ignoring the unspecified ones", function () {
      const input = {
        str: "test string",
        num: 3,
        bool: true,
        dat: new Date(),
        obj: {
          foo: "bar",
        },
        arrayValue: [3, 4, 6],
        objectArray: [
          {
            foo: "other bar",
          },
        ],
      };

      const inputWithJunk = {
        str: "test string",
        junk: "nope",
        num: 3,
        bool: true,
        dat: new Date(),
        obj: {
          shouldNotBePresent: 6,
          foo: "bar",
        },
        arrayValue: [3, 4, 6],
        objectArray: [
          {
            foo: "other bar",
          },
        ],
      };

      const schema = flatten({
        required: {
          string: {
            str: {},
          },
          number: {
            num: {},
            arrayValue: { array: true },
          },
          boolean: {
            bool: {},
          },
          date: {
            dat: {},
          },
          object: {
            obj: {
              required: {
                string: {
                  foo: {},
                },
              },
            },
            objectArray: {
              array: true,
              required: {
                string: {
                  foo: {},
                },
              },
            },
          },
        },
      });

      expect(extract(inputWithJunk, schema)).to.deep.equal(input);
    });
    it("should pick up optional keys when possible, but not require them", function () {
      const input = {
        required: "test",
        optionalPresent: 4,
        obj: {
          optionalPresent: 5,
        },
      };

      const schema = flatten({
        required: {
          string: {
            required: {},
          },
          object: {
            obj: {
              optional: {
                number: {
                  optionalPresent: {},
                  optionalAbsent: {},
                },
              },
            },
          },
        },
        optional: {
          number: {
            optionalPresent: {},
            optionalAbsent: {},
          },
        },
      });

      expect(extract(input, schema)).to.deep.equal(input);
    });

    it("should throw errors", function () {
      let input: any = {
        wrongType: "test",
        pi: 3.14,
      };

      const schema = flatten({
        optional: {
          number: {
            wrongType: {},
            arr: { array: true },
          },
          object: {
            objArr: {
              required: {
                number: {
                  three: {},
                },
              },
              array: true,
            },
          },
        },
        required: {
          number: {
            pi: {},
          },
        },
      });

      expect(() => extract(input, schema)).to.throw(
        /is not of the expected type "number"/
      );

      input = {};
      expect(() => extract(input, schema)).to.throw(
        /does not have the required key/
      );
      input = "hello?";
      expect(() => extract(input, schema)).to.throw(/should be an object/);
      input = undefined;
      expect(() => extract(input, schema)).to.throw(
        `Please supply an object to be validated`
      );
      input = null;
      expect(() => extract(input, schema)).to.throw(/should be an object/);
      input = {
        objArr: [2, 3, 4],
      };
      expect(() => extract(input, schema)).to.throw(/should be an object/);
      input = {
        objArr: [{ three: 2 }, 3, 4],
      };
      expect(() => extract(input, schema)).to.throw(/should be an object/);
      input = {
        arr: [3, "4", 5],
      };
      expect(() => extract(input, schema)).to.throw(
        `The value "4" that belongs to the key "arr" in the object "{"arr":[3,"4",5]}" is not of the expected type "number"`
      );
      input = {
        arr: 7,
      };
      expect(() => extract(input, schema)).to.throw(
        `The value "7" that belongs to the key "arr" in the object "{"arr":7}" is not an array`
      );
    });
  });

  describe("#extractAndValidate()", function () {
    it("should extract needed information", function () {
      const input = {
        str: "test string",
        num: 3,
        bool: true,
        dat: new Date(),
        obj: {
          foo: "bar",
        },
      };

      const schema = flatten({
        required: {
          string: {
            str: {},
          },
          number: {
            num: {},
          },
          boolean: {
            bool: {},
          },
          date: {
            dat: {},
          },
          object: {
            obj: {
              required: {
                string: {
                  foo: {},
                },
              },
            },
          },
        },
      });

      expect(extractAndValidate(input, schema)).to.deep.equal(input);
    });

    it("should check that enums work", function () {
      let input: any = {
        str: "test string",
        num: 3,
        bool: true,
        dat: new Date(),
        obj: {
          foo: "bar",
        },
      };

      let schema: any = flatten({
        required: {
          string: {
            str: { enum: ["test string", "other"] },
          },
          number: {
            num: {},
          },
          boolean: {
            bool: {},
          },
          date: {
            dat: {},
          },
          object: {
            obj: {
              required: {
                string: {
                  foo: {},
                },
              },
            },
          },
        },
      });

      expect(extractAndValidate(input, schema)).to.deep.equal(input);

      input = {
        str: "does not exist",
        num: 3,
        bool: true,
        dat: new Date(),
        obj: {
          foo: "bar",
        },
      };

      expect(() => extractAndValidate(input, schema)).to.throw(
        /must have one of the following values:/
      );

      input = {
        test: input,
      };

      schema = {
        test: {
          type: schema,
        },
      };

      expect(
        () => extractAndValidate(input, schema),
        "It must work on nested objects as well"
      ).to.throw(/must have one of the following values:/);
    });

    it("should throw a correct error when one-value constraints are not met", function () {
      let input: any = {
        str: "test string",
        num: 3,
        bool: true,
        dat: new Date(),
        obj: {
          foo: "bar",
        },
      };

      let schema: any = flatten({
        required: {
          string: {
            str: { maxLength: 2 },
          },
          number: {
            num: {},
          },
          boolean: {
            bool: {},
          },
          date: {
            dat: {},
          },
          object: {
            obj: {
              required: {
                string: {
                  foo: {},
                },
              },
            },
          },
        },
      });

      expect(
        () => extractAndValidate(input, schema),
        "It should detect that the string is longer than it is supposed to be"
      ).to.throw(
        `The "maxLength" constraint with the value "2" was not met by the field "str" with the value "test string" with an error message saying "This string field is too long"`
      );

      input.str = "a";

      expect(
        extractAndValidate(input, schema),
        "If the constraints do not fail, there should be no difference to the output"
      ).to.deep.equal(input);
    });

    it("should throw a correct error when overall (final) constraints are not met", function () {
      let input: any = {
        num: 3,
        num2: 10,
        bool: true,
        dat: new Date(),
        obj: {
          foo: "bar",
        },
      };

      let schema: any = flatten({
        required: {
          number: {
            num: { greaterOrEqualTo: "num2" },
            num2: {},
          },
          boolean: {
            bool: {},
          },
          date: {
            dat: {},
          },
          object: {
            obj: {
              required: {
                string: {
                  foo: {},
                },
              },
            },
          },
        },
      });

      expect(
        () => extractAndValidate(input, schema),
        "It should detect that the number is smaller than it is supposed to be"
      ).to.throw(
        `A constraint failed with an error message saying "The fields need to be in descending order or equal; Fields for validation: num,num2"`
      );

      input.num = 100;

      expect(
        extractAndValidate(input, schema),
        "If the constraints do not fail, there should be no difference to the output"
      ).to.deep.equal(input);
    });

    it("should process arrays correctly", function () {
      let input: any = {
        num: 3,
        num2: [1, 10],
        num3: [10, 5, 4, 6, 3, 15, 16],
        num4: 2,
        obj: {
          foo: "bar",
        },
        str: ["a", "b", "c"],
      };

      let schema: any = flatten({
        required: {
          number: {
            num: { greaterOrEqualTo: "num2" },
            num2: { array: true },
            num3: { greaterOrEqualTo: "num4", array: true },
            num4: {},
          },
          string: {
            str: { maxLength: 3, array: true },
          },
          object: {
            obj: {
              required: {
                string: {
                  foo: {},
                },
              },
            },
          },
        },
      });

      expect(
        () => extractAndValidate(input, schema),
        "It should check against every element in the argument array for a final validation"
      ).to.throw(
        `A constraint failed with an error message saying "The fields need to be in descending order or equal; Fields for validation: num,num2"`
      );

      input.num = 100; // clear up
      input.num4 = 7;

      expect(
        () => extractAndValidate(input, schema),
        "It should check against every element in the value array for a final validation"
      ).to.throw(
        `A constraint failed with an error message saying "The fields need to be in descending order or equal; Fields for validation: num3,num4"`
      );

      input.num4 = 1;

      expect(
        extractAndValidate(input, schema),
        "If the constraints do not fail, there should be no difference to the output"
      ).to.deep.equal(input);

      input.str[1] = "super long string";

      expect(
        () => extractAndValidate(input, schema),
        "It should check every element of the array for the constraint"
      ).to.throw(
        `The "maxLength" constraint with the value "3" was not met by the field "str" with the value "super long string" with an error message saying "This string field is too long"`
      );
    });
  });

  describe("#filterValues()", function () {
    it("should skip data that does not satisfy the predicate", function () {
      const input = {
        str: "test string",
        num: 3,
        bool: true,
        dat: new Date(),
        obj: {
          foo: "bar",
        },
      };

      const expectedOut = {
        num: 3,
        bool: true,
      };

      const schema = flatten({
        required: {
          string: {
            str: { hide: true },
          },
          number: {
            num: {},
          },
          boolean: {
            bool: {},
          },
          date: {
            dat: { hide: true },
          },
          object: {
            obj: {
              required: {
                string: {
                  foo: {},
                },
              },
              hide: true,
            },
          },
        },
      });

      expect(
        filterValues(input, schema, ["hide"], (v: any[]) =>
          v.every((item) => item !== true)
        )
      ).to.deep.equal(expectedOut);
    });
  });

  describe("#filterRules()", function () {
    it("should skip rules that do not satisfy the predicate", function () {
      const schema = flatten({
        required: {
          string: {
            str: { hide: true },
          },
          number: {
            num: {},
          },
          boolean: {
            bool: {},
          },
          date: {
            dat: { hide: true },
          },
          object: {
            obj1: {
              required: {
                string: {
                  foo: {},
                },
              },
              hide: true,
            },
            obj2: {
              required: {
                string: {
                  foo: {},
                },
              },
            },
          },
        },
      });

      const expectedOut = flatten({
        required: {
          number: { num: {} },
          boolean: { bool: {} },
          object: {
            obj2: {
              required: {
                string: {
                  foo: {},
                },
              },
            },
          },
        },
      });

      expect(
        filterRules(schema, ["hide"], (v: any[]) =>
          v.every((item) => item !== true)
        )
      ).to.deep.equal(expectedOut);
    });
  });
});
