import { parse } from "../src";

describe("This is a simple test", () => {
  test("Check the sampleFunction function", () => {
    const result = parse('{ "foo": bar }');
    console.log("data:");
    console.log(result.data);
    console.log("\npointers:");
    console.log(result.pointers);
    // expect(sampleFunction("hello")).toEqual("hellohello");
  });
});
