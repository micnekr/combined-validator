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

            it("should correctly process enums", function () {
                const out1 = createAjvJTDSchema({
                    optional: {
                        string: {
                            foo: { enum: ["3", "4", "5"] }
                        },
                    },
                })

                expect(out1).to.deep.equal({
                    optionalProperties: {
                        foo:
                            { enum: ["3", "4", "5"] }
                    }
                })

                const parser = ajv.compileParser(out1)

                let expectedToBeParsed = {
                    foo: "3"
                }

                expect(parser(JSON.stringify(expectedToBeParsed))).to.deep.equal(expectedToBeParsed)
            })

            it("should correctly process arrays", function () {
                const out1 = createAjvJTDSchema({
                    optional: {
                        string: {
                            foo: { array: true }
                        },
                    },
                })
                const out2 = createAjvJTDSchema({
                    optional: {
                        object: {
                            foo: {
                                required: {
                                    string: {
                                        email: {}
                                    }
                                },
                                array: true
                            }
                        }
                    },
                })
                const out3 = createAjvJTDSchema({
                    optional: {
                        object: {
                            foo: {
                                required: {
                                    object: {
                                        email: {
                                            required: {
                                                string: {
                                                    more: {}
                                                }
                                            },
                                            array: true
                                        }
                                    }
                                },
                                array: true
                            }
                        }
                    },
                })

                const expectedOut1 = {
                    foo: ["bar", "test", "r"]
                }
                const expectedOut2 = {
                    foo: [
                        { email: "bar" },
                        { email: "test" },
                        { email: "r" }
                    ]
                }

                const expectedOut3 = {
                    foo: [
                        { email: [{ more: "bar" }, { more: "test" }] },
                        { email: [{ more: "r" }] }
                    ]
                }

                let parser = ajv.compileParser(out1)
                expect(parser(JSON.stringify(expectedOut1))).to.deep.equal(expectedOut1)
                parser = ajv.compileParser(out2)
                expect(parser(JSON.stringify(expectedOut2))).to.deep.equal(expectedOut2)
                parser = ajv.compileParser(out3)
                expect(parser(JSON.stringify(expectedOut3))).to.deep.equal(expectedOut3)
            })

            it("should throw an exception if the type is not recognised", function () {
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
