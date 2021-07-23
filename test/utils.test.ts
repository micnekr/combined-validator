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

import { expect } from "chai";
import { describe } from "mocha"
import { deepAssign, flatten } from "../lib/utils"

describe("utils.ts", function () {
    describe("#deepAssign()", function () {
        it("should prefer src with non-indexable arguments", async function () {
            expect(deepAssign(1, 2)).to.equal(2);
            expect(deepAssign(undefined, 2)).to.equal(2);
            expect(deepAssign(1, undefined)).to.equal(1);
        })

        it("should determine the return type based on the first argument", async function () {
            expect(deepAssign([], {})).to.deep.equal([]);
            expect(deepAssign([], [])).to.deep.equal([]);
            expect(deepAssign({}, {})).to.deep.equal({});
            expect(deepAssign({}, [])).to.deep.equal({});
        })

        it("should copy and override properties", async function () {
            expect(deepAssign({ test: 4 }, { test2: 5 })).to.deep.equal({
                test: 4,
                test2: 5
            });
            expect(deepAssign({ test: 4 }, { test: 5 })).to.deep.equal({
                test: 5
            });
            expect(deepAssign({ test: 4 } as any, [4] as any)).to.deep.equal({
                test: 4,
                0: 4
            });
            expect(deepAssign([4] as any, { 0: 5 } as any)).to.deep.equal([5]);
        })

        it("should copy and override properties recursively", function () {
            expect(deepAssign({ test: 4, rec: { value: 4 } }, { test2: 5, otherRec: { value: 5 } })).to.deep.equal({
                test: 4,
                test2: 5,
                rec: { value: 4 },
                otherRec: { value: 5 },
            });
            expect(deepAssign({ test: 4, rec: { value: 4 } }, { test2: 5, rec: { value: 5 } })).to.deep.equal({
                test: 4,
                test2: 5,
                rec: { value: 5 },
            });

            expect(deepAssign({ test: 4, rec: { value: 4 } }, { test2: 5, rec: {} })).to.deep.equal({
                test: 4,
                test2: 5,
                rec: { value: 4 },
            });
        })
    })

    describe("#flatten()", function () {
        it("should create 'required' and 'type' fields on normal types", function () {
            const out = flatten({
                required: {
                    string: {
                        str: {}
                    },
                    number: {
                        num: {}
                    },
                    date: {
                        dat: {}
                    }
                },
                optional: {
                    boolean: {
                        bool: {},
                        true: {},
                        false: {}
                    }
                }
            })

            expect(out).to.deep.equal({
                str: { type: "string", required: true },
                num: { type: "number", required: true },
                dat: { type: "date", required: true },
                bool: { type: "boolean", required: false },
                true: { type: "boolean", required: false },
                false: { type: "boolean", required: false },
            })
        })

        it("should create nested objects with the 'object' type", function () {
            const out = flatten({
                required: {
                    string: {
                        str: {}
                    },
                    object: {
                        obj: {
                            required: {
                                object: {
                                    nested: {
                                        optional: {
                                            string: {
                                                nest: {}
                                            }
                                        }
                                    }
                                },
                                string: {
                                    hello: {}
                                }
                            }
                        }
                    }
                },
            })

            expect(out).to.deep.equal({
                str: { type: "string", required: true },
                obj: {
                    type: {
                        nested: {
                            type: {
                                nest: {
                                    type: "string",
                                    required: false
                                },
                            },
                            required: true
                        },
                        hello: {
                            type: "string",
                            required: true
                        }
                    }, required: true
                },
            })
        })

        it("should preserve additional information", function () {
            const out = flatten({
                required: {
                    string: {
                        str: { maxLength: 6, default: "hello" }
                    },
                    number: {
                        num: { default: 3 }
                    },
                    date: {
                        dat: {}
                    }
                },
            })

            expect(out).to.deep.equal({
                str: { type: "string", maxLength: 6, default: "hello", required: true },
                num: { type: "number", default: 3, required: true },
                dat: { type: "date", required: true },
            })
        })

        it("should ignore proto properties", function () {
            const out = flatten({
                required: {
                    string: {
                        str: { maxLength: 6, default: "hello" }
                    },
                    number: {
                        num: { default: 3 }
                    },
                    date: {
                        dat: {
                            // @ts-ignore
                            __proto__: {
                                shouldNotBeAround: "test"
                            }
                        },
                        // @ts-ignore
                        __proto__: {
                            // @ts-ignore
                            shouldNotBeAround: "test"
                        }
                    },
                    // @ts-ignore
                    __proto__: {
                        shouldNotBeAround: "test"
                    }
                },
                // @ts-ignore
                __proto__: {
                    shouldNotBeAround: "test"
                }
            })

            expect(out).to.deep.equal({
                str: { type: "string", maxLength: 6, default: "hello", required: true },
                num: { type: "number", default: 3, required: true },
                dat: { type: "date", required: true },
            })
        })
    })
})
