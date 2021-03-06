import { expect } from "chai";
import { SchemaDefinition } from "mongoose";
import { SinonStub, restore, spy, stub } from "sinon";
import { FieldConstraintsCollection } from "..";
import { constructSchema, mongoValidateCallbacks, mongoFinalValidationCallbacks, mongoCreateValidateMiddleware, mongoCreateValidation } from "../lib/mongo"

const mongoose = require("mongoose"); // for stubbing

describe("mongo.ts", function () {
    describe("#constructSchema()", function () {
        let schemaSpy: SinonStub<any[], any>;

        this.beforeEach(function () {
            // stub the dependency
            // @ts-ignore
            schemaSpy = stub(mongoose, "Schema").callsFake(args => {
                return {
                    schema: "Has to be a schema",
                    ...args
                }
            });
            const stringMaxLengthStub = stub(mongoValidateCallbacks, "maxLength").callsFake((args) => `maxLen${args}` as any);
            const stringExactLengthStub = stub(mongoValidateCallbacks, "exactLength").callsFake((args) => `exactLength${args}` as any);
            const numberGreaterOrEqualToStub = stub(mongoFinalValidationCallbacks, "greaterOrEqualTo").callsFake((args) => `greaterOrEqualTo${args}` as any);
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
            expect(constructSchema(o)).to.deep.equal(new mongoose.Schema(expected))
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
                    validate: mongoValidateCallbacks.maxLength(4),
                },
                name2: {
                    type: String,
                    required: false,
                },
            }

            expect(constructSchema(o)).to.deep.equal(new mongoose.Schema(expected))
        })

        it("should correctly handle arrays", function () {
            const o1: FieldConstraintsCollection = {
                required: {
                    string: {
                        name1: { array: true }
                    }
                },
            }
            const o2: FieldConstraintsCollection = {
                required: {
                    object: {
                        name1: {
                            required: {
                                string: {
                                    foo: {}
                                }
                            },
                            array: true
                        }
                    }
                },
            }
            const o3: FieldConstraintsCollection = {
                required: {
                    object: {
                        name1: {
                            required: {
                                string: {
                                    foo: {enum: ["bar1", "bar2"]}
                                }
                            },
                            array: true
                        }
                    }
                },
            }

            const expected1: SchemaDefinition<any> = {
                name1: {
                    type: [String],
                    required: true,
                },
            }
            const expected2: SchemaDefinition<any> = {
                name1: {
                    type: [new mongoose.Schema({
                        foo: {
                            type: String,
                            required: true
                        }
                    })],
                    required: true,
                },
            }
            const expected3: SchemaDefinition<any> = {
                name1: {
                    type: [new mongoose.Schema({
                        foo: {
                            type: String,
                            required: true,
                            enum: ["bar1", "bar2"]
                        }
                    })],
                    required: true,
                },
            }

            expect(constructSchema(o1)).to.deep.equal(new mongoose.Schema(expected1))
            expect(constructSchema(o2)).to.deep.equal(new mongoose.Schema(expected2))
            expect(constructSchema(o3)).to.deep.equal(new mongoose.Schema(expected3))
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
                        num2: {},
                        num3: { greaterOrEqualTo: ["num4", "num5"] },
                        num4: {},
                        num5: {},
                    }
                },
            }

            const expected: SchemaDefinition<any> = {
                name1: {
                    type: String,
                    required: true,
                    validate: mongoValidateCallbacks.maxLength(4),
                },
                name2: {
                    type: String,
                    required: true,
                    validate: mongoValidateCallbacks.exactLength(4),
                },
                num1: {
                    type: Number,
                    required: true,
                },
                num2: {
                    type: Number,
                    required: true
                },
                num3: {
                    type: Number,
                    required: true
                },
                num4: {
                    type: Number,
                    required: true,
                },
                num5: {
                    type: Number,
                    required: true
                },
                pre
            }

            expect(constructSchema(o)).to.deep.equal(expected);
            expect(pre.callCount, "the pre hook should be called twice").to.equal(2);
            expect(pre.args).to.deep.include(["validate", mongoFinalValidationCallbacks.greaterOrEqualTo(["num1", "num2"])]);
            expect(pre.args).to.deep.include(["validate", mongoFinalValidationCallbacks.greaterOrEqualTo(["num3", "num4", "num5"])]);
        })
    })

    describe("#createValidation()", function () {
        const arrowFunctionSpy = spy(() => false);
        const testArgs = ["testarg1", { test: "testarg2" }];
        const out = mongoCreateValidation("Error message", arrowFunctionSpy)(...testArgs);
        out.validator("value");

        it("Should create a correct validation structure", function () {
            expect(out).to.have.all.keys("message", "validator")
        })
        it("should pass all the pre-defined arguments, with the first one being the value from the call arguments", function () {
            expect(arrowFunctionSpy.args[0]).to.have.ordered.members(["value", ...testArgs])
        })
        it("should return exactly what the predicate returned", function () {
            expect(arrowFunctionSpy.returnValues[0]).to.be.false;
        })
        it("Should call the callback on validation", function () {
            expect(arrowFunctionSpy.calledOnce, "the callback must be called once").to.be.true;
        })
    })

    describe("#createValidateMiddleware()", function () {

        function createSpy(returnValue: boolean, automaticResponseToUndefined: boolean | null, obj: any) {
            const spyFun = spy(function (mappedArgs: any[], obj: any, fields: any[]) {
                return returnValue;
            });
            const nextSpy = spy(() => { })
            const middlewareFun = mongoCreateValidateMiddleware("Error message", automaticResponseToUndefined, spyFun)(["testName1", "testName2"]);
            middlewareFun.bind(obj)(nextSpy);
            return [spyFun, nextSpy];
        }

        it("should return true if called with all arguments present", function () {
            const [spyFun, nextSpy] = createSpy(true, false, { testName1: 3, testName2: 4 });

            expect(spyFun.calledOnce, "the callback only needs to be called once").to.be.true;
            expect(spyFun.returnValues[0], "the return value needs to be true").to.be.true;
        })

        it("should fail if the predicate fails", function () {
            const triggerCreateSpy = () => createSpy(false, false, { testName1: 3, testName2: 4 });

            expect(triggerCreateSpy).to.throw("Fields for validation:");
        })

        it("should fail if one of the values is undefined and 'automaticResponseToUndefined' is set to false", function () {
            const triggerCreateSpy = () => createSpy(true, false, { testName1: 3 });

            expect(triggerCreateSpy).to.throw("Fields for validation:");
        })

        it("should keep going if one of the values is undefined and 'automaticResponseToUndefined' is set to null", function () {
            const [spyFun, nextSpy] = createSpy(true, null, { testName1: 3 });

            expect(spyFun.calledOnce, "the predicate should be called").to.be.true;
            expect(nextSpy.calledOnce, "the function must return next()").to.be.true;
        })

        it("should return true if one of the values is undefined and 'automaticResponseToUndefined' is set to true, without calling the predicate", function () {
            const [spyFun, nextSpy] = createSpy(true, true, { testName1: 3 });

            expect(spyFun.notCalled, "the predicate should not be called").to.be.true;
            expect(nextSpy.calledOnce, "the function must return next()").to.be.true;
        })

        it("should provide correct arguments to the callback", function () {
            const [spyFun, nextSpy] = createSpy(true, false, { testName1: 3, testName2: 4 });

            expect(spyFun.calledOnce, "the callback only needs to be called once").to.be.true;
            expect(spyFun.args[0], "the arguments need to be able to be mapped").to.satisfy((args: [any[], any, any[]]) => {
                const [resolvedFields, toValidate, fields] = args;
                const calculatedFields = fields.map(k => toValidate[k]);
                expect(calculatedFields, "toValidate should contain key:value pairs corresponding to fields and resolved args").to.have.ordered.members(resolvedFields);
                return true;
            });
        })
    })
})