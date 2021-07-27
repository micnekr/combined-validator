import { expect } from "chai"
import { flatten } from "../lib"
import { extract, extractAndValidate } from "../lib/general"

describe("general.ts", function () {
    describe("#pickNeededEntries()", function () {
        it("should create an object with the requested keys, while ignoring the unspecified ones", function () {
            const input = {
                str: "test string",
                num: 3,
                bool: true,
                dat: new Date(),
                obj: {
                    foo: "bar"
                }
            }

            const inputWithJunk = {
                str: "test string",
                junk: "nope",
                num: 3,
                bool: true,
                dat: new Date(),
                obj: {
                    shouldNotBePresent: 6,
                    foo: "bar"
                }
            }

            const schema = flatten({
                required: {
                    string: {
                        str: {}
                    },
                    number: {
                        num: {}
                    },
                    boolean: {
                        bool: {}
                    },
                    date: {
                        dat: {}
                    },
                    object: {
                        obj: {
                            required: {
                                string: {
                                    foo: {}
                                }
                            }
                        }
                    }
                }
            })

            expect(extract(inputWithJunk, schema)).to.deep.equal(input);
        })
        it("should pick up optional keys when possible, but not require them", function () {
            const input = {
                required: "test",
                optionalPresent: 4,
                obj: {
                    optionalPresent: 5
                }
            }

            const schema = flatten({
                required: {
                    string: {
                        required: {}
                    },
                    object: {
                        obj: {
                            optional: {
                                number: {
                                    optionalPresent: {},
                                    optionalAbsent: {}
                                },
                            }
                        }
                    }
                },
                optional: {
                    number: {
                        optionalPresent: {},
                        optionalAbsent: {}
                    },
                }
            })

            expect(extract(input, schema)).to.deep.equal(input);
        })

        it("should throw errors", function () {
            let input: any = {
                wrongType: "test",
                pi: 3.14
            }

            const schema = flatten({
                optional: {
                    number: {
                        wrongType: {}
                    },
                },
                required: {
                    number: {
                        pi: {}
                    }
                }
            })

            expect(() => extract(input, schema)).to.throw(/should be a/);

            input = {}
            expect(() => extract(input, schema)).to.throw(/is required and should be present/);
            input = "hello?"
            expect(() => extract(input, schema)).to.throw(/should be an object/);
            input = undefined
            expect(() => extract(input, schema)).to.throw(/should be an object/);
            input = null
            expect(() => extract(input, schema)).to.throw(/should be an object/);
        })
    })

    describe("#extractAndValidate()", function () {
        it("should extract needed information", function () {
            const input = {
                str: "test string",
                num: 3,
                bool: true,
                dat: new Date(),
                obj: {
                    foo: "bar"
                }
            }

            const schema = flatten({
                required: {
                    string: {
                        str: {}
                    },
                    number: {
                        num: {}
                    },
                    boolean: {
                        bool: {}
                    },
                    date: {
                        dat: {}
                    },
                    object: {
                        obj: {
                            required: {
                                string: {
                                    foo: {}
                                }
                            }
                        }
                    }
                }
            })

            expect(extractAndValidate(input, schema)).to.deep.equal(input);
        })

        it("should check that enums work", function () {
            let input: any = {
                str: "test string",
                num: 3,
                bool: true,
                dat: new Date(),
                obj: {
                    foo: "bar"
                }
            }

            let schema: any = flatten({
                required: {
                    string: {
                        str: { enum: ["test string", "other"] }
                    },
                    number: {
                        num: {}
                    },
                    boolean: {
                        bool: {}
                    },
                    date: {
                        dat: {}
                    },
                    object: {
                        obj: {
                            required: {
                                string: {
                                    foo: {}
                                }
                            }
                        }
                    }
                }
            })

            expect(extractAndValidate(input, schema)).to.deep.equal(input);

            input = {
                str: "does not exist",
                num: 3,
                bool: true,
                dat: new Date(),
                obj: {
                    foo: "bar"
                }
            }

            expect(() => extractAndValidate(input, schema)).to.throw(/must have one of the following values:/);

            input = {
                test: input
            }

            schema = {
                test: {
                    type: schema
                }
            }

            expect(() => extractAndValidate(input, schema), "It must work on nested objects as well").to.throw(/must have one of the following values:/);
        })

        it("should throw a correct error when one-value constraints are not met", function () {
            let input: any = {
                str: "test string",
                num: 3,
                bool: true,
                dat: new Date(),
                obj: {
                    foo: "bar"
                }
            }

            let schema: any = flatten({
                required: {
                    string: {
                        str: { maxLength: 2 }
                    },
                    number: {
                        num: {}
                    },
                    boolean: {
                        bool: {}
                    },
                    date: {
                        dat: {}
                    },
                    object: {
                        obj: {
                            required: {
                                string: {
                                    foo: {}
                                }
                            }
                        }
                    }
                }
            })

            expect(() => extractAndValidate(input, schema), "It should detect that the string is longer than it is supposed to be").to.throw(`The "maxLength" constraint with the value "2" was not met by the field "str" with the value "test string" with an error message saying "This string field is too long"`);

            input.str = "a";

            expect(extractAndValidate(input, schema), "If the constraints do not fail, there should be no difference to the output").to.deep.equal(input);
        })

        it("should throw a correct error when overall (final) constraints are not met", function () {
            let input: any = {
                num: 3,
                num2: 10,
                bool: true,
                dat: new Date(),
                obj: {
                    foo: "bar"
                }
            }

            let schema: any = flatten({
                required: {
                    number: {
                        num: { greaterOrEqualTo: "num2" },
                        num2: {}
                    },
                    boolean: {
                        bool: {}
                    },
                    date: {
                        dat: {}
                    },
                    object: {
                        obj: {
                            required: {
                                string: {
                                    foo: {}
                                }
                            }
                        }
                    }
                }
            })


            expect(() => extractAndValidate(input, schema), "It should detect that the number is smaller than it is supposed to be").to.throw(`A constraint failed with an error message saying "The fields need to be in descending order or equal; Fields for validation: num,num2"`);

            input.num = 100;

            expect(extractAndValidate(input, schema), "If the constraints do not fail, there should be no difference to the output").to.deep.equal(input);
        })
    })

})