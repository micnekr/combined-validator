import { expect } from "chai";
import { isGreaterOrEqualTo, isExactLength, isMaxLength } from "../lib/validateUtils";
describe("Predicates", function () {
    describe("#isGreaterOrEqualTo", function () {
        it("Should return true when the first value is greater than the second value", function () {
            expect(isGreaterOrEqualTo([6, 5, 4, 3, 2, 1])).to.be.true;
        })
        it("Should return false when the first value is smaller than the second value", function () {
            expect(isGreaterOrEqualTo([4, 10, 3, 9])).to.be.false;
        })
        it("Should return true when the first value is equal to the second one", function () {
            expect(isGreaterOrEqualTo([1, 1, 3, 4, 5, 6])).to.be.true;
        })
    })

    describe("#exactLength()", function () {
        it("should return true when the length matches", function () {
            expect(isExactLength("1234", 4)).to.be.true;
        })
        it("should return false if the length is different", function () {
            expect(isExactLength("1234", 1)).to.be.false;
            expect(isExactLength("1234", 10)).to.be.false;
        })
    })

    describe("#maxLength()", function () {
        it("should return true when the length matches or is smaller", function () {
            expect(isMaxLength("1234", 4)).to.be.true;
            expect(isMaxLength("12", 4)).to.be.true;
        })
        it("should return false if the length is different", function () {
            expect(isMaxLength("123456", 4)).to.be.false;
        })
    })
})