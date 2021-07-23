import * as sinon from "sinon";

// Restores the default sandbox after every test
export const mochaHooks = {
    afterEach() {
        sinon.restore();
    },
};