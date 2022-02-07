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
          value: { line: 1, column: 0, pos: 0, linePos: 0 },
          valueEnd: { line: 11, column: 1, pos: 101, linePos: 100 },
        },
        "/foo": {
          key: { line: 2, column: 2, pos: 4, linePos: 2 },
          keyEnd: { line: 2, column: 7, pos: 9, linePos: 2 },
          value: { line: 2, column: 9, pos: 11, linePos: 2 },
          valueEnd: { line: 10, column: 3, pos: 99, linePos: 96 },
        },
        "/foo/0": {
          value: { line: 3, column: 4, pos: 17, linePos: 13 },
          valueEnd: { line: 5, column: 5, pos: 42, linePos: 37 },
        },
        "/foo/0/bar": {
          key: { line: 4, column: 6, pos: 25, linePos: 19 },
          keyEnd: { line: 4, column: 11, pos: 30, linePos: 19 },
          value: { line: 4, column: 13, pos: 32, linePos: 19 },
          valueEnd: { line: 4, column: 17, pos: 36, linePos: 19 },
        },
        "/foo/1": {
          value: { line: 6, column: 4, pos: 48, linePos: 44 },
          valueEnd: { line: 9, column: 5, pos: 95, linePos: 90 },
        },
        "/foo/1/baz": {
          key: { line: 7, column: 6, pos: 56, linePos: 50 },
          keyEnd: { line: 7, column: 11, pos: 61, linePos: 50 },
          value: { line: 7, column: 13, pos: 63, linePos: 50 },
          valueEnd: { line: 7, column: 16, pos: 66, linePos: 50 },
        },
        "/foo/1/quux": {
          key: { line: 8, column: 6, pos: 74, linePos: 68 },
          keyEnd: { line: 8, column: 12, pos: 80, linePos: 68 },
          value: { line: 8, column: 14, pos: 82, linePos: 68 },
          valueEnd: { line: 8, column: 21, pos: 89, linePos: 68 },
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
          value: { line: 1, column: 0, pos: 0, linePos: 0 },
          valueEnd: { line: 7, column: 1, pos: 39, linePos: 38 },
        },
        "/foo": {
          key: { line: 2, column: 4, pos: 3, linePos: 2 },
          keyEnd: { line: 2, column: 9, pos: 8, linePos: 2 },
          value: { line: 2, column: 11, pos: 10, linePos: 2 },
          valueEnd: { line: 6, column: 5, pos: 37, linePos: 35 },
        },
        "/foo/0": {
          value: { line: 3, column: 8, pos: 14, linePos: 12 },
          valueEnd: { line: 5, column: 9, pos: 34, linePos: 31 },
        },
        "/foo/0/bar": {
          key: { line: 4, column: 12, pos: 19, linePos: 16 },
          keyEnd: { line: 4, column: 17, pos: 24, linePos: 16 },
          value: { line: 4, column: 19, pos: 26, linePos: 16 },
          valueEnd: { line: 4, column: 23, pos: 30, linePos: 16 },
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
          value: { line: 1, column: 0, pos: 0, linePos: 0 },
          valueEnd: { line: 7, column: 1, pos: 54, linePos: 53 },
        },
        "/foo": {
          key: { line: 2, column: 2, pos: 5, linePos: 3 },
          keyEnd: { line: 2, column: 7, pos: 10, linePos: 3 },
          value: { line: 2, column: 9, pos: 12, linePos: 3 },
          valueEnd: { line: 6, column: 3, pos: 51, linePos: 48 },
        },
        "/foo/0": {
          value: { line: 3, column: 4, pos: 19, linePos: 15 },
          valueEnd: { line: 5, column: 5, pos: 46, linePos: 41 },
        },
        "/foo/0/bar": {
          key: { line: 4, column: 6, pos: 28, linePos: 22 },
          keyEnd: { line: 4, column: 11, pos: 33, linePos: 22 },
          value: { line: 4, column: 13, pos: 35, linePos: 22 },
          valueEnd: { line: 4, column: 17, pos: 39, linePos: 22 },
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

    Object.values(pointers).forEach((pointer) => {
      Object.values(pointer).forEach((loc) => {
        expect(loc.linePos).toBeLessThanOrEqual(loc.pos);
      });
    });
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
        value: { line: 1, column: 0, pos: 0, linePos: 0 },
        valueEnd: { line: 11, column: 1, pos: 90, linePos: 89 },
      },
      "/foo": {
        key: { line: 2, column: 2, pos: 4, linePos: 2 },
        keyEnd: { line: 2, column: 7, pos: 9, linePos: 2 },
        value: { line: 2, column: 9, pos: 11, linePos: 2 },
        valueEnd: { line: 10, column: 3, pos: 88, linePos: 85 },
      },
      "/foo/0": {
        value: { line: 3, column: 4, pos: 17, linePos: 13 },
        valueEnd: { line: 5, column: 5, pos: 39, linePos: 34 },
      },
      "/foo/0/bar": {
        key: { line: 4, column: 6, pos: 25, linePos: 19 },
        keyEnd: { line: 4, column: 11, pos: 30, linePos: 19 },
        value: { line: 4, column: 13, pos: 32, linePos: 19 },
        valueEnd: { line: 4, column: 14, pos: 33, linePos: 19 },
      },
      "/foo/1": {
        value: { line: 6, column: 4, pos: 45, linePos: 41 },
        valueEnd: { line: 9, column: 5, pos: 84, linePos: 79 },
      },
      "/foo/1/baz": {
        key: { line: 7, column: 6, pos: 53, linePos: 47 },
        keyEnd: { line: 7, column: 11, pos: 58, linePos: 47 },
        value: { line: 7, column: 13, pos: 60, linePos: 47 },
        valueEnd: { line: 7, column: 14, pos: 61, linePos: 47 },
      },
      "/foo/1/quux": {
        key: { column: 6, line: 8, pos: 69, linePos: 63 },
        keyEnd: { column: 12, line: 8, pos: 75, linePos: 63 },
        value: { column: 14, line: 8, pos: 77, linePos: 63 },
        valueEnd: { column: 15, line: 8, pos: 78, linePos: 63 },
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
        value: { line: 1, column: 0, pos: 0, linePos: 0 },
        valueEnd: { line: 10, column: 1, pos: 172, linePos: 171 },
      },
      "/str": {
        key: { line: 2, column: 2, pos: 4, linePos: 2 },
        keyEnd: { line: 2, column: 7, pos: 9, linePos: 2 },
        value: { line: 2, column: 9, pos: 11, linePos: 2 },
        valueEnd: { line: 2, column: 14, pos: 16, linePos: 2 },
      },
      "/null": {
        key: { line: 3, column: 2, pos: 20, linePos: 18 },
        keyEnd: { line: 3, column: 8, pos: 26, linePos: 18 },
        value: { line: 3, column: 10, pos: 28, linePos: 18 },
        valueEnd: { line: 3, column: 14, pos: 32, linePos: 18 },
      },
      "/arr": {
        key: { line: 4, column: 2, pos: 36, linePos: 34 },
        keyEnd: { line: 4, column: 7, pos: 41, linePos: 34 },
        value: { line: 4, column: 9, pos: 43, linePos: 34 },
        valueEnd: { line: 4, column: 11, pos: 45, linePos: 34 },
      },
      "/obj": {
        key: { line: 5, column: 2, pos: 49, linePos: 47 },
        keyEnd: { line: 5, column: 7, pos: 54, linePos: 47 },
        value: { line: 5, column: 9, pos: 56, linePos: 47 },
        valueEnd: { line: 5, column: 11, pos: 58, linePos: 47 },
      },
      "/date": {
        key: { line: 6, column: 2, pos: 62, linePos: 60 },
        keyEnd: { line: 6, column: 8, pos: 68, linePos: 60 },
        value: { line: 6, column: 10, pos: 70, linePos: 60 },
        valueEnd: { line: 6, column: 36, pos: 96, linePos: 60 },
      },
      "/custom": {
        key: { line: 7, column: 2, pos: 100, linePos: 98 },
        keyEnd: { line: 7, column: 10, pos: 108, linePos: 98 },
        value: { line: 7, column: 12, pos: 110, linePos: 98 },
        valueEnd: { line: 7, column: 20, pos: 118, linePos: 98 },
      },
      "/control": {
        key: { column: 2, line: 8, pos: 122, linePos: 120 },
        keyEnd: { column: 11, line: 8, pos: 131, linePos: 120 },
        value: { column: 13, line: 8, pos: 133, linePos: 120 },
        valueEnd: { column: 29, line: 8, pos: 149, linePos: 120 },
      },
      "/esc~1aped~0": {
        key: { line: 9, column: 2, pos: 153, linePos: 151 },
        keyEnd: { line: 9, column: 13, pos: 164, linePos: 151 },
        value: { line: 9, column: 15, pos: 166, linePos: 151 },
        valueEnd: { line: 9, column: 19, pos: 170, linePos: 151 },
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
        value: { line: 1, column: 0, pos: 0, linePos: 0 },
        valueEnd: { line: 1, column: 19, pos: 19, linePos: 0 },
      },
      "/foo": {
        key: { line: 1, column: 1, pos: 1, linePos: 0 },
        keyEnd: { line: 1, column: 6, pos: 6, linePos: 0 },
        value: { line: 1, column: 7, pos: 7, linePos: 0 },
        valueEnd: { line: 1, column: 18, pos: 18, linePos: 0 },
      },
      "/foo/0": {
        value: { line: 1, column: 8, pos: 8, linePos: 0 },
        valueEnd: { line: 1, column: 17, pos: 17, linePos: 0 },
      },
      "/foo/0/bar": {
        key: { line: 1, column: 9, pos: 9, linePos: 0 },
        keyEnd: { line: 1, column: 14, pos: 14, linePos: 0 },
        value: { line: 1, column: 15, pos: 15, linePos: 0 },
        valueEnd: { line: 1, column: 16, pos: 16, linePos: 0 },
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
      jsonMap.stringify(data, null, Array(11).join(" ")),
      jsonMap.stringify(data, null, Array(20).join(" ")),
    ]);

    expect(jsonMap.stringify(data, null, 10)).not.toEqual(jsonMap.stringify(data, null, Array(10).join(" ")));
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

    Object.values(pointers).forEach((pointer) => {
      Object.values(pointer).forEach((loc) => {
        expect(loc.linePos).toBeLessThanOrEqual(loc.pos);
      });
    });
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
