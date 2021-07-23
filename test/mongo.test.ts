import { expect } from "chai";
import { SchemaDefinition } from "mongoose";
import { SinonStub, restore, spy, stub } from "sinon";
import { constructSchema, validateCallbacks, finalValidationCallbacks } from "../lib/mongo"

const mongoose = require("mongoose"); // for stubbing

describe("mongo.ts", function () {
    describe("#constructSchema()", function () {
        let schemaSpy: SinonStub<any[], any>;

        this.beforeEach(function () {
            // stub the dependency
            // @ts-ignore
            schemaSpy = stub(mongoose, "Schema").callsFake((args) => args);
            const stringMaxLengthStub = stub(validateCallbacks, "maxLength").callsFake((args) => `maxLen${args}` as any);
            const stringExactLengthStub = stub(validateCallbacks, "exactLength").callsFake((args) => `exactLength${args}` as any);
            const numberGreaterOrEqualToStub = stub(finalValidationCallbacks, "greaterOrEqualTo").callsFake((args) => `greaterOrEqualTo${args}` as any);
        })

        this.afterEach(function () {
            restore();
        })

        it("should correctly assign types", function () {
            const o: FieldConstraintsCollection = {
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
                                    test: {}
                                }
                            }
                        }
                    }
                },
            }

            const expected: SchemaDefinition<any> = {
                str: {
                    type: String,
                    required: true,
                },
                num: {
                    type: Number,
                    required: true,
                },
                dat: {
                    type: Date,
                    required: true,
                },
                bool: {
                    type: Boolean,
                    required: true,
                },
                obj: {
                    required: true,
                    type: new mongoose.Schema({
                        test: {
                            type: String,
                            required: true
                        }
                    })
                },
            }
            expect(constructSchema(o)).to.deep.equal(expected)
        })

        it("should correctly process enums", function () {
            const o: FieldConstraintsCollection = {
                required: {
                    string: {
                        names: {
                            enum: ["A", "B", "C"]
                        }
                    }
                },
            }

            const expected: SchemaDefinition<any> = {
                names: {
                    type: String,
                    required: true,
                    enum: ["A", "B", "C"]
                },
            }

            expect(constructSchema(o)).to.deep.equal(new mongoose.Schema(expected))
        })

        it("should correctly process unique values", function () {
            const o: FieldConstraintsCollection = {
                required: {
                    string: {
                        name: {
                            unique: true
                        }
                    }
                },
            }

            const expected: SchemaDefinition<any> = {
                name: {
                    type: String,
                    required: true,
                    unique: true
                },
            }

            expect(constructSchema(o)).to.deep.equal(new mongoose.Schema(expected))
        })

        it("should correctly process defaults", function () {
            const o: FieldConstraintsCollection = {
                optional: {
                    string: {
                        names: {
                            default: "hey"
                        }
                    }
                },
            }

            const expected: SchemaDefinition<any> = {
                names: {
                    type: String,
                    required: false,
                    default: "hey"
                },
            }

            expect(constructSchema(o)).to.deep.equal(new mongoose.Schema(expected))
        })

        it("should correctly process 'required' and 'optional'", function () {
            const o: FieldConstraintsCollection = {
                required: {
                    string: {
                        name1: { maxLength: 4 }
                    }
                },
                optional: {
                    string: {
                        name2: {}
                    }
                }
            }

            const expected: SchemaDefinition<any> = {
                name1: {
                    type: String,
                    required: true,
                    validate: validateCallbacks.maxLength(4),
                },
                name2: {
                    type: String,
                    required: false,
                },
            }

            expect(constructSchema(o)).to.deep.equal(new mongoose.Schema(expected))
        })

        it("should merge the two passed objects", function () {
            const o1: FieldConstraintsCollection = {
                required: {
                    string: {
                        name1: { maxLength: 4 }
                    }
                },
                optional: {
                    string: {
                        name2: { lazyFill: true }
                    }
                }
            }

            const o2: FieldConstraintsCollection = {
                optional: {
                    string: {
                        name2: { maxLength: 9 },
                        secret: {}
                    }
                }
            }

            const expected: SchemaDefinition<any> = {
                name1: {
                    type: String,
                    required: true,
                    validate: validateCallbacks.maxLength(4),
                },
                name2: {
                    type: String,
                    required: false,
                    validate: validateCallbacks.maxLength(9),
                },
                secret: {
                    type: String,
                    required: false,
                },
            }

            expect(constructSchema(o1, o2)).to.deep.equal(new mongoose.Schema(expected))
        })

        it("Should set correct validation functions", function () {
            const pre = spy(() => { })
            schemaSpy.callsFake((args) => {
                return Object.assign(args, {
                    pre
                })
            })
            const o: FieldConstraintsCollection = {
                required: {
                    string: {
                        name1: { maxLength: 4 },
                        name2: { exactLength: 4 }
                    },
                    number: {
                        num1: { greaterOrEqualTo: "num2" },
                        num2: {}
                    }
                },
            }

            const expected: SchemaDefinition<any> = {
                name1: {
                    type: String,
                    required: true,
                    validate: validateCallbacks.maxLength(4),
                },
                name2: {
                    type: String,
                    required: true,
                    validate: validateCallbacks.exactLength(4),
                },
                num1: {
                    type: Number,
                    required: true,
                },
                num2: {
                    type: Number,
                    required: true
                },
                pre
            }

            expect(constructSchema(o)).to.deep.equal(expected);
            expect(pre.callCount, "the pre hook should be called once").to.equal(1);
            expect(pre.args).to.deep.include(["validate", finalValidationCallbacks.greaterOrEqualTo(["num1", "num2"])]);
        })
    })
})