import * as jsonMap from "../src";
import jsonPointer from "json-pointer";

describe("parse", () => {
  describe("mappings", () => {
    test("should parse JSON and generate mappings", () => {
      const json = `{\n\
  "foo": [\n\
    {\n\
      "bar": true\n\
    },\n\
    {\n\
      "baz": 123,\n\
      "quux": "hello"\n\
    }\n\
  ]\n\
}`;

      const pointers = testParse(json, JSON.parse(json), null, 2);
      expect(pointers).toStrictEqual({
        "": {
          value: { line: 0, column: 0, pos: 0 },
          valueEnd: { line: 10, column: 1, pos: 101 },
        },
        "/foo": {
          key: { line: 1, column: 2, pos: 4 },
          keyEnd: { line: 1, column: 7, pos: 9 },
          value: { line: 1, column: 9, pos: 11 },
          valueEnd: { line: 9, column: 3, pos: 99 },
        },
        "/foo/0": {
          value: { line: 2, column: 4, pos: 17 },
          valueEnd: { line: 4, column: 5, pos: 42 },
        },
        "/foo/0/bar": {
          key: { line: 3, column: 6, pos: 25 },
          keyEnd: { line: 3, column: 11, pos: 30 },
          value: { line: 3, column: 13, pos: 32 },
          valueEnd: { line: 3, column: 17, pos: 36 },
        },
        "/foo/1": {
          value: { line: 5, column: 4, pos: 48 },
          valueEnd: { line: 8, column: 5, pos: 95 },
        },
        "/foo/1/baz": {
          key: { line: 6, column: 6, pos: 56 },
          keyEnd: { line: 6, column: 11, pos: 61 },
          value: { line: 6, column: 13, pos: 63 },
          valueEnd: { line: 6, column: 16, pos: 66 },
        },
        "/foo/1/quux": {
          key: { line: 7, column: 6, pos: 74 },
          keyEnd: { line: 7, column: 12, pos: 80 },
          value: { line: 7, column: 14, pos: 82 },
          valueEnd: { line: 7, column: 21, pos: 89 },
        },
      });
    });

    test("should support whitespace with tabs", () => {
      const json = `{\n\
\t"foo": [\n\
\t\t{\n\
\t\t\t"bar": true\n\
\t\t}\n\
\t]\n\
}`;

      const pointers = testParse(json, JSON.parse(json), null, "\t");
      expect(pointers).toStrictEqual({
        "": {
          value: { line: 0, column: 0, pos: 0 },
          valueEnd: { line: 6, column: 1, pos: 39 },
        },
        "/foo": {
          key: { line: 1, column: 4, pos: 3 },
          keyEnd: { line: 1, column: 9, pos: 8 },
          value: { line: 1, column: 11, pos: 10 },
          valueEnd: { line: 5, column: 5, pos: 37 },
        },
        "/foo/0": {
          value: { line: 2, column: 8, pos: 14 },
          valueEnd: { line: 4, column: 9, pos: 34 },
        },
        "/foo/0/bar": {
          key: { line: 3, column: 12, pos: 19 },
          keyEnd: { line: 3, column: 17, pos: 24 },
          value: { line: 3, column: 19, pos: 26 },
          valueEnd: { line: 3, column: 23, pos: 30 },
        },
      });
    });

    test("should support whitespace with CRs", () => {
      const json = `{\r\n\
  "foo": [\r\n\
    {\r\n\
      "bar": true\r\n\
    }\r\n\
  ]\r\n\
}`;

      const pointers = testParse(json, JSON.parse(json), true);
      expect(pointers).toStrictEqual({
        "": {
          value: { line: 0, column: 0, pos: 0 },
          valueEnd: { line: 6, column: 1, pos: 54 },
        },
        "/foo": {
          key: { line: 1, column: 2, pos: 5 },
          keyEnd: { line: 1, column: 7, pos: 10 },
          value: { line: 1, column: 9, pos: 12 },
          valueEnd: { line: 5, column: 3, pos: 51 },
        },
        "/foo/0": {
          value: { line: 2, column: 4, pos: 19 },
          valueEnd: { line: 4, column: 5, pos: 46 },
        },
        "/foo/0/bar": {
          key: { line: 3, column: 6, pos: 28 },
          keyEnd: { line: 3, column: 11, pos: 33 },
          value: { line: 3, column: 13, pos: 35 },
          valueEnd: { line: 3, column: 17, pos: 39 },
        },
      });
    });
  });

  describe("simple values", () => {
    test("should throw exception on empty line/whitespace", () => {
      testParseFailEnd("");
      testParseFailEnd(" ");
    });

    test("should parse true/false/null", () => {
      testParse("true", true);
      testParse("false", false);
      testParse("null", null);

      testParseFailToken("ture", "u", 1);
      testParseFailToken("truz", "z", 3);
      testParseFailToken("truetrue", "t", 4);
      testParseFailToken("true true", "t", 5);
      testParseFailToken("undefined", "u", 0);
      testParseFailEnd("tru");
    });

    test("should parse strings", () => {
      testParse('"foo"', "foo");
      testParse('"foo\\bbar"', "foo\bbar");
      testParse('"foo\\fbar"', "foo\fbar");
      testParse('"foo\\nbar"', "foo\nbar");
      testParse('"foo\\rbar"', "foo\rbar");
      testParse('"foo\\tbar"', "foo\tbar");
      testParse('"foo\\"bar"', 'foo"bar');
      testParse('"foo\\/bar"', "foo/bar", true); // reverse check fails because '/' stringifies as '"/"' (backslach is optional)
      testParse('"foo\\\\bar"', "foo\\bar");
      testParse('"foo\\u000Abar"', "foo\nbar", true);
      testParse('"foo\\u000abar"', "foo\nbar", true);
      testParse('"foo\\u2028bar"', "foo\u2028bar", true);

      testParseFailToken('"foo\\abar"', "a", 5);
      testParseFailToken('"foo\\u000Xbar"', "X", 9);
      testParseFailToken('"foo"true', "t", 5);
      testParseFailToken('"foo" "foo"', '"', 6);
      testParseFailEnd('"foo');
    });

    test("should parse numbers", () => {
      testParse("123", 123);
      testParse("123.45", 123.45);
      testParse("-123.45", -123.45);
      testParse("0", 0);
      testParse("0.45", 0.45);
      testParse("1e2", 100, true);
      testParse("1e+2", 100, true);
      testParse("1e-2", 0.01, true);
      testParse("1.23e2", 123, true);
      testParse("1.23e-2", 0.0123, true);
      testParse("1.23e12", 1230000000000, true);

      testParseFailToken("123a", "a", 3);
      testParseFailToken("123.a", "a", 4);
      testParseFailToken("--123", "-", 1);
      testParseFailToken("+123", "+", 0);
      testParseFailToken("01", "1", 1);
      testParseFailToken("00", "0", 1);
      testParseFailToken("1..", ".", 2);
      testParseFailToken("1.e2", "e", 2);
      testParseFailToken("1.23ee", "e", 5);
      testParseFailEnd("1.");
      testParseFailEnd("1.23e");
    });

    describe('option "bigint"', () => {
      test("should parse large integers as BigInt", () => {
        testParseBigInt("" + (Number.MAX_SAFE_INTEGER + 1));
        testParseBigInt("" + (Number.MIN_SAFE_INTEGER - 1));
        testParseBigInt("10000000000000000");
        testParseBigInt("-10000000000000000");
      });

      test("should parse small integers and non-integers as Number", () => {
        testParseNumber("" + Number.MAX_SAFE_INTEGER);
        testParseNumber("" + Number.MIN_SAFE_INTEGER);
        testParseNumber("1e16");
        testParseNumber("-1e16");
        testParseNumber("10000000000000000.1");
        testParseNumber("-10000000000000000.1");
        testParseNumber("10000");
        testParseNumber("-10000");
        testParseNumber("1.1");
        testParseNumber("-1.1");
      });

      function testParseBigInt(str: string) {
        const result = jsonMap.parse(str);
        expect(typeof result.data).toEqual("bigint");
        expect(result.data).toStrictEqual(BigInt(str));
      }

      function testParseNumber(str: string, opt = true) {
        const result = jsonMap.parse(str);
        expect(typeof result.data).toEqual("number");
        expect(result.data).toStrictEqual(+str);
      }
    });
  });

  describe("composite values", () => {
    test("should parse arrays", () => {
      testParse("[]", []);
      testParse("[1]", [1]);
      testParse('[1.23,"foo",true,false,null]', [1.23, "foo", true, false, null]);

      testParseFailToken("[1,]", "]", 3);
      testParseFailToken("[1;", ";", 2);
      testParseFailEnd("[");
      testParseFailEnd("[1");
      testParseFailEnd("[1,");
    });

    test("should parse objects", () => {
      testParse("{}", {});
      testParse('{"foo":"bar"}', { foo: "bar" });
      testParse('{"foo":1,"bar":2}', { foo: 1, bar: 2 });

      testParseFailToken("{'", "'", 1);
      testParseFailToken('{"foo";', ";", 6);
      testParseFailToken('{"foo":1;', ";", 8);

      testParseFailEnd("{");
      testParseFailEnd('{"');
      testParseFailEnd('{"foo');
      testParseFailEnd('{"foo"');
      testParseFailEnd('{"foo":');
      testParseFailEnd('{"foo":"');
      testParseFailEnd('{"foo":"bar');
      testParseFailEnd('{"foo":"bar"');
      testParseFailEnd('{"foo":"bar",');
    });

    test("should parse nested structures", () => {
      var data = {
        foo: [
          {
            bar: true,
          },
          {
            baz: 123,
            quux: "hello",
          },
        ],
      };

      testParse(JSON.stringify(data), data);
      testParse(JSON.stringify(data, null, 2), data, null, 2);
    });
  });

  function testParse(json: string, expectedData: any, skipReverseCheck?: boolean | null, whitespace?: string | number) {
    let result = jsonMap.parse(json);
    let data = result.data;
    let pointers = result.pointers;
    expect(data).toStrictEqual(expectedData);
    testResult(json, pointers, data);

    if (!skipReverseCheck) {
      let reverseResult = jsonMap.stringify(expectedData, null, whitespace);
      expect(json).toEqual(reverseResult.json);
      expect(pointers).toStrictEqual(reverseResult.pointers);
    }
    return pointers;
  }

  function testParseFailToken(json: string, token: string, pos: number) {
    testParseFail(json, `Unexpected token "${token}" in JSON at`);
  }

  function testParseFailEnd(json: string) {
    testParseFail(json, "Unexpected end of JSON input");
  }

  function testParseFail(json: string, expectedMessage: string) {
    const parse = () => {
      jsonMap.parse(json);
    };

    // escape regex
    expectedMessage = expectedMessage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    expect(parse).toThrowError(new RegExp(expectedMessage, "g"));
  }
});

describe("stringify", () => {
  test("should stringify data and generate mappings", () => {
    const data = {
      foo: [
        {
          bar: 1,
        },
        {
          baz: 2,
          quux: 3,
        },
      ],
    };

    const pointers = testStringify(data, data, null, 2);
    expect(pointers).toStrictEqual({
      "": {
        value: { line: 0, column: 0, pos: 0 },
        valueEnd: { line: 10, column: 1, pos: 90 },
      },
      "/foo": {
        key: { line: 1, column: 2, pos: 4 },
        keyEnd: { line: 1, column: 7, pos: 9 },
        value: { line: 1, column: 9, pos: 11 },
        valueEnd: { line: 9, column: 3, pos: 88 },
      },
      "/foo/0": {
        value: { line: 2, column: 4, pos: 17 },
        valueEnd: { line: 4, column: 5, pos: 39 },
      },
      "/foo/0/bar": {
        key: { line: 3, column: 6, pos: 25 },
        keyEnd: { line: 3, column: 11, pos: 30 },
        value: { line: 3, column: 13, pos: 32 },
        valueEnd: { line: 3, column: 14, pos: 33 },
      },
      "/foo/1": {
        value: { line: 5, column: 4, pos: 45 },
        valueEnd: { line: 8, column: 5, pos: 84 },
      },
      "/foo/1/baz": {
        key: { line: 6, column: 6, pos: 53 },
        keyEnd: { line: 6, column: 11, pos: 58 },
        value: { line: 6, column: 13, pos: 60 },
        valueEnd: { line: 6, column: 14, pos: 61 },
      },
      "/foo/1/quux": {
        key: {
          column: 6,
          line: 7,
          pos: 69,
        },
        keyEnd: {
          column: 12,
          line: 7,
          pos: 75,
        },
        value: {
          column: 14,
          line: 7,
          pos: 77,
        },
        valueEnd: {
          column: 15,
          line: 7,
          pos: 78,
        },
      },
    });
  });

  test("should stringify string, null, empty array, empty object, Date", () => {
    const data = {
      str: "foo",
      null: null,
      arr: [],
      obj: {},
      date: new Date("2017-01-09T08:50:13.064Z"),
      custom: {
        toJSON: () => {
          return "custom";
        },
      },
      control: '"\f\b\n\r\t"',
      "esc/aped~": true,
    };

    let reverseData = copy(data);
    reverseData.date = "2017-01-09T08:50:13.064Z";
    reverseData.custom = "custom";

    const pointers = testStringify(data, reverseData, null, "  ");

    expect(pointers).toStrictEqual({
      "": {
        value: { line: 0, column: 0, pos: 0 },
        valueEnd: { line: 9, column: 1, pos: 172 },
      },
      "/str": {
        key: { line: 1, column: 2, pos: 4 },
        keyEnd: { line: 1, column: 7, pos: 9 },
        value: { line: 1, column: 9, pos: 11 },
        valueEnd: { line: 1, column: 14, pos: 16 },
      },
      "/null": {
        key: { line: 2, column: 2, pos: 20 },
        keyEnd: { line: 2, column: 8, pos: 26 },
        value: { line: 2, column: 10, pos: 28 },
        valueEnd: { line: 2, column: 14, pos: 32 },
      },
      "/arr": {
        key: { line: 3, column: 2, pos: 36 },
        keyEnd: { line: 3, column: 7, pos: 41 },
        value: { line: 3, column: 9, pos: 43 },
        valueEnd: { line: 3, column: 11, pos: 45 },
      },
      "/obj": {
        key: { line: 4, column: 2, pos: 49 },
        keyEnd: { line: 4, column: 7, pos: 54 },
        value: { line: 4, column: 9, pos: 56 },
        valueEnd: { line: 4, column: 11, pos: 58 },
      },
      "/date": {
        key: { line: 5, column: 2, pos: 62 },
        keyEnd: { line: 5, column: 8, pos: 68 },
        value: { line: 5, column: 10, pos: 70 },
        valueEnd: { line: 5, column: 36, pos: 96 },
      },
      "/custom": {
        key: { line: 6, column: 2, pos: 100 },
        keyEnd: { line: 6, column: 10, pos: 108 },
        value: { line: 6, column: 12, pos: 110 },
        valueEnd: { line: 6, column: 20, pos: 118 },
      },
      "/control": {
        key: { column: 2, line: 7, pos: 122 },
        keyEnd: { column: 11, line: 7, pos: 131 },
        value: { column: 13, line: 7, pos: 133 },
        valueEnd: { column: 29, line: 7, pos: 149 },
      },
      "/esc~1aped~0": {
        key: { line: 8, column: 2, pos: 153 },
        keyEnd: { line: 8, column: 13, pos: 164 },
        value: { line: 8, column: 15, pos: 166 },
        valueEnd: { line: 8, column: 19, pos: 170 },
      },
    });
  });

  test("should stringify BigInt", () => {
    testStringify(BigInt(100), 100);
  });

  test("should throw UnexpectedTypeError if data is not a valid type", () => {
    expect(() => jsonMap.stringify(undefined)).toThrow(jsonMap.UnexpectedTypeError);
    expect(() => jsonMap.stringify(() => {})).toThrow(jsonMap.UnexpectedTypeError);
    expect(() => jsonMap.stringify(Symbol())).toThrow(jsonMap.UnexpectedTypeError);
  });

  test("should generate JSON without whitespace", () => {
    const data = {
      foo: [
        {
          bar: 1,
        },
      ],
    };

    const pointers = testStringify(data);

    expect(pointers).toStrictEqual({
      "": {
        value: { line: 0, column: 0, pos: 0 },
        valueEnd: { line: 0, column: 19, pos: 19 },
      },
      "/foo": {
        key: { line: 0, column: 1, pos: 1 },
        keyEnd: { line: 0, column: 6, pos: 6 },
        value: { line: 0, column: 7, pos: 7 },
        valueEnd: { line: 0, column: 18, pos: 18 },
      },
      "/foo/0": {
        value: { line: 0, column: 8, pos: 8 },
        valueEnd: { line: 0, column: 17, pos: 17 },
      },
      "/foo/0/bar": {
        key: { line: 0, column: 9, pos: 9 },
        keyEnd: { line: 0, column: 14, pos: 14 },
        value: { line: 0, column: 15, pos: 15 },
        valueEnd: { line: 0, column: 16, pos: 16 },
      },
    });
  });

  test("should skip properties with invalid types", () => {
    const data = {
      foo: {
        bar: null,
        baz: undefined,
        quux: () => {},
        sym: Symbol(),
      },
    };

    expect(jsonMap.stringify(data)).toStrictEqual(jsonMap.stringify({ foo: { bar: null } }));
  });

  test("should stringify items with invalid types as null", () => {
    const data = {
      foo: [null, undefined, () => {}, Symbol()],
    };

    expect(jsonMap.stringify(data)).toStrictEqual(jsonMap.stringify({ foo: [null, null, null, null] }));
  });

  test("should limit whitespace", () => {
    const data = {
      foo: [
        {
          bar: 1,
        },
        {
          baz: 2,
          quux: 3,
        },
      ],
    };

    equal([
      jsonMap.stringify(data),
      jsonMap.stringify(data, null, -1),
      jsonMap.stringify(data, null, 0),
      jsonMap.stringify(data, null, ""),
    ]);

    equal([
      jsonMap.stringify(data, null, 10),
      jsonMap.stringify(data, null, 20),
      jsonMap.stringify(data, null, Array(10 + 1).join(" ")),
      jsonMap.stringify(data, null, Array(20).join(" ")),
    ]);

    expect(jsonMap.stringify(data, null, 10)).not.toEqual(jsonMap.stringify(data, null, Array(9 + 1).join(" ")));
  });

  test("should stringify with CR/LF whitespace", () => {
    const data = {
      foo: [
        {
          bar: 1,
        },
        {
          baz: 2,
          quux: 3,
        },
      ],
    };

    testStringify(data, data, null, "\r");
    testStringify(data, data, null, "\n");
    testStringify(data, data, null, "\r\n");
  });

  test("should throw if whitespace not allowed in JSON is used", () => {
    const data = { foo: "bar" };

    expect(() => {
      jsonMap.stringify(data, null, "$$");
    }).toThrow();
  });

  test("should support whitespace as option", () => {
    const data = { foo: "bar" };
    const result = jsonMap.stringify(data, null, { space: "  " });
    expect(result.json).toEqual('{\n  "foo": "bar"\n}');
  });

  describe("option es6", () => {
    test("should strigify Maps", () => {
      let data = new Map();
      testStringify(data, {}, false);

      data.set("foo", 1);
      data.set("bar", 2);
      testStringify(data, { foo: 1, bar: 2 }, false);
      testStringify(data, { foo: 1, bar: 2 }, false, { space: 2 });
    });

    test("should strigify Sets", () => {
      let data = new Set();
      testStringify(data, {}, false);

      data.add("foo");
      data.add("bar");
      testStringify(data, { foo: true, bar: true }, false);
      testStringify(data, { foo: true, bar: true }, false, { space: 2 });
    });

    test("should strigify Typed arrays", () => {
      let data = new Int8Array(2);
      testStringify(data, [0, 0], false);

      data[0] = 1;
      data[1] = 2;
      testStringify(data, [1, 2], false);
      testStringify(data, [1, 2], false, { space: 2 });
    });

    test("should still strigify Objects", () => {
      testStringify({}, {}, false);
      testStringify({ foo: 1, bar: 2 }, { foo: 1, bar: 2 }, false);
    });
  });

  function equal(objects: Array<any>) {
    for (let i = 1; i < objects.length; i++) expect(objects[0]).toStrictEqual(objects[i]);
  }

  function testStringify(
    data: any,
    reverseData?: any,
    skipReverseCheck?: boolean | null,
    options?: string | number | jsonMap.StringifyOptions
  ) {
    if (reverseData === undefined) reverseData = data;
    const result = jsonMap.stringify(data, null, options);
    const json = result.json;
    const pointers = result.pointers;

    testResult(json, pointers, reverseData);

    if (!skipReverseCheck) {
      const reverseResult = jsonMap.parse(json);
      expect(reverseData).toStrictEqual(reverseResult.data);
      expect(pointers).toStrictEqual(reverseResult.pointers);
    }

    return pointers;
  }
});

function testResult(json: string, pointers: jsonMap.Pointers, data: any) {
  expect(JSON.parse(json)).toStrictEqual(data);
  for (let ptr in pointers) {
    let map = pointers[ptr];
    if (map.key !== undefined) {
      expect(JSON.parse(json.slice(map.key.pos, map.keyEnd.pos))).toStrictEqual(jsonPointer.parse(ptr).slice(-1)[0]);
    }
    expect(JSON.parse(json.slice(map.value.pos, map.valueEnd.pos))).toStrictEqual(jsonPointer.get(data, ptr));
  }
}

function copy(o: any, to?: any) {
  to = to || {};
  for (var key in o) to[key] = o[key];
  return to;
}
