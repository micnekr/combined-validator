import { expect } from "chai"
import { flatten } from "../lib"
import { pickNeededEntries } from "../lib/general"

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

        expect(pickNeededEntries(inputWithJunk, schema)).to.deep.equal(input);
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

        expect(pickNeededEntries(input, schema)).to.deep.equal(input);
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

        expect(() => pickNeededEntries(input, schema)).to.throw(/should be a/);

        input = {}
        expect(() => pickNeededEntries(input, schema)).to.throw(/is required and should be present/);
        input = "hello?"
        expect(() => pickNeededEntries(input, schema)).to.throw(/should be an object/);
        input = undefined
        expect(() => pickNeededEntries(input, schema)).to.throw(/should be an object/);
        input = null
        expect(() => pickNeededEntries(input, schema)).to.throw(/should be an object/);
    })
})