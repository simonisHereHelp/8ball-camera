declare module "node:assert" {
  import assert = require("assert");
  export = assert;
}

declare module "node:test" {
  interface TestFunction {
    (name: string | Function, fn?: (...args: any[]) => any): any;
    beforeEach(fn: (...args: any[]) => any): void;
  }

  const test: TestFunction;
  export = test;
  export default test;
}
