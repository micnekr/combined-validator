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
import { isDescendingOrder, isExactLength, isMaxLength } from "../lib/validateUtils";
describe("Predicates", function () {
    describe("#isAscendingOrder", function () {
        it("Should return true when every value is greater than the preceding one", function () {
            expect(isDescendingOrder([6, 5, 4, 3, 2, 1])).to.be.true;
        })
        it("Should return false when the values are in neither ascending nor descending order", function () {
            expect(isDescendingOrder([4, 10, 3, 9])).to.be.false;
        })
        it("Should return false when the values are in ascending order", function () {
            expect(isDescendingOrder([1, 2, 3, 4, 5, 6])).to.be.false;
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