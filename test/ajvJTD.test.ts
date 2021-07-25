import Ajv, { SchemaObject } from "ajv/dist/jtd"
import { expect } from "chai";
import { createAjvJTDSchema } from "../lib/ajvJTD"
import { FieldConstraintsCollection } from "../lib/"
const ajv = new Ajv({
    // strict: true,
    strictRequired: true,
    allErrors: true,
    removeAdditional: "all"
});

describe("ajvJTD.ts", function () {
    describe("#createAjvJTDSchema()", function () {

        it("should specify primitive values", function () {
            const out = createAjvJTDSchema({
                required: {
                    string: {
                        foo: {}
                    },
                    number: {
                        num: {}
                    },
                    date: {
                        dat: {}
                    },
                    boolean: {
                        bool: {}
                    }
                },

                optional: {
                    string: {
                        str: {}
                    }
                }
            })

            expect(out).to.deep.equal({
                properties: {
                    foo: { type: "string" },
                    num: { type: "float64" },
                    dat: { type: "timestamp" },
                    bool: { type: "boolean" }
                },
                optionalProperties: { str: { type: "string" } }
            })
        })

        describe("it should correctly record whether primitives are required or optional", function () {
            it("should handle a mix of the two", function () {
                const out = createAjvJTDSchema({
                    required: {
                        string: {
                            foo: {}
                        },
                    },

                    optional: {
                        string: {
                            str: {}
                        }
                    }
                })

                expect(out).to.deep.equal({
                    properties: { foo: { type: "string" } },
                    optionalProperties: { str: { type: "string" } }
                })
            })

            it("should handle the case where only one is present without creating empty objects", function () {
                const out1 = createAjvJTDSchema({
                    required: {
                        string: {
                            foo: {}
                        },
                    },
                })

                const out2 = createAjvJTDSchema({
                    optional: {
                        string: {
                            foo: {}
                        },
                    },
                })

                const out3 = createAjvJTDSchema({
                    required: {
                        string: {
                            foo: {}
                        },
                    },
                    optional: {
                        boolean: {
                            test: {}
                        }
                    }
                })

                expect(out1).to.deep.equal({
                    properties: { foo: { type: "string" } },
                })
                expect(out2).to.deep.equal({
                    optionalProperties: { foo: { type: "string" } },
                })
                expect(out3).to.deep.equal({
                    properties: { foo: { type: "string" } },
                    optionalProperties: { test: { type: "boolean" } }
                })
            })

            it("should correctly generate definitions for nested classes", function () {
                const out = createAjvJTDSchema({
                    required: {
                        string: {
                            foo: {}
                        },
                        object: {
                            obj: {
                                optional: {
                                    string: {
                                        foo: {}
                                    }
                                }
                            }
                        }
                    },

                    optional: {
                        string: {
                            str: {}
                        },
                        object: {
                            obj2: {
                                required: {
                                    number: {
                                        num: {}
                                    }
                                }
                            }
                        }
                    }
                })

                const parser = ajv.compileParser(out)

                let expectedToBeParsed: any = {
                    foo: "bar",
                    obj: { foo: "bar2" },
                    obj2: { num: 4 }
                }

                expect(parser(JSON.stringify(expectedToBeParsed))).to.deep.equal(expectedToBeParsed);

                expectedToBeParsed = {
                    foo: "bar",
                    obj: {}
                }

                expect(parser(JSON.stringify(expectedToBeParsed))).to.deep.equal(expectedToBeParsed);

                expectedToBeParsed = {
                    foo: "bar",
                    obj: {},
                    obj2: {}
                }

                expect(parser(JSON.stringify(expectedToBeParsed))).to.deep.equal(undefined);
            })

            it("should throw if the type is not recognised", function () {
                const triggerException = () => createAjvJTDSchema({
                    required: {
                        notExist: {
                            foo: {}
                        },
                    },
                } as any)

                expect(triggerException).to.throw(/unknown type:/)
            })
        })
    })
})
