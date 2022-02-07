export class DetailedSyntaxError extends SyntaxError {
  line: number;
  column: number;
  token: string;
  message: string;

  constructor(line: number, column: number, token: string) {
    super();
    this.line = line;
    this.column = column;
    this.token = token;
    this.message = this.toString();
  }

  toString(): string {
    return `Unexpected token "${this.token}" in JSON at line ${this.line}, column ${this.column}`;
  }
}

export class UnexpectedEndError extends SyntaxError {
  line: number;
  column: number;
  message: string;

  constructor(line: number, column: number) {
    super();
    this.line = line;
    this.column = column;
    this.message = this.toString();
  }

  toString(): string {
    return `Unexpected end of JSON input (line ${this.line}, column ${this.column})`;
  }
}

export class UnexpectedTypeError extends Error {
  type: string;
  message: string;

  constructor(data: any) {
    super();
    this.type = typeof data;
    this.message = this.toString();
  }

  toString(): string {
    return `unexpected type '${this.type}'`;
  }
}

export interface Location {
  line: number;
  column: number;
  pos: number;
}

export interface ParseResult {
  data: any;
  pointers: Pointers;
}

export type PointerProp = "value" | "valueEnd" | "key" | "keyEnd";

export type Pointers = Record<string, Record<PointerProp, Location>>;

export interface StringifyOptions {
  space?: string | number;
}

export interface StringifyResult {
  json: string;
  pointers: Pointers;
}

const escapedChars = new Map([
  ["b", "\b"],
  ["f", "\f"],
  ["n", "\n"],
  ["r", "\r"],
  ["t", "\t"],
  ['"', '"'],
  ["/", "/"],
  ["\\", "\\"],
]);

const A_CODE = "a".charCodeAt(0);

export function parse(source: string, _?: any): ParseResult {
  let pointers: Pointers = {};
  let line = 1;
  let column = 0;
  let pos = 0;
  let bigint = typeof BigInt != "undefined";

  return {
    data: _parse("", true),
    pointers: pointers,
  };

  function _parse(ptr: string, topLevel: boolean = false): any {
    whitespace();
    let data;
    map(ptr, "value");
    const char = getChar();
    switch (char) {
      case "t":
        read("rue");
        data = true;
        break;
      case "f":
        read("alse");
        data = false;
        break;
      case "n":
        read("ull");
        data = null;
        break;
      case '"':
        data = parseString();
        break;
      case "[":
        data = parseArray(ptr);
        break;
      case "{":
        data = parseObject(ptr);
        break;
      default:
        backChar();
        if ("-0123456789".indexOf(char) >= 0) data = parseNumber();
        else unexpectedToken();
    }
    map(ptr, "valueEnd");
    whitespace();
    if (topLevel && pos < source.length) unexpectedToken();
    return data;
  }

  function whitespace() {
    loop: while (pos < source.length) {
      switch (source[pos]) {
        case " ":
          column++;
          break;
        case "\t":
          column += 4;
          break;
        case "\r":
          column = 0;
          break;
        case "\n":
          column = 0;
          line++;
          break;
        default:
          break loop;
      }
      pos++;
    }
  }

  function parseString(): string {
    let str = "";
    let char;

    while (true) {
      char = getChar();
      if (char == '"') {
        break;
      } else if (char == "\\") {
        char = getChar();
        if (escapedChars.has(char)) str += escapedChars.get(char);
        else if (char == "u") str += getCharCode();
        else wasUnexpectedToken();
      } else {
        str += char;
      }
    }

    return str;
  }

  function parseNumber(): bigint | number {
    let numStr = "";
    let integer = true;

    if (source[pos] == "-") numStr += getChar();

    numStr += source[pos] == "0" ? getChar() : getDigits();

    if (source[pos] == ".") {
      numStr += getChar() + getDigits();
      integer = false;
    }

    if (source[pos] == "e" || source[pos] == "E") {
      numStr += getChar();
      if (source[pos] == "+" || source[pos] == "-") numStr += getChar();
      numStr += getDigits();
      integer = false;
    }

    let result = +numStr;

    return bigint && integer && (result > Number.MAX_SAFE_INTEGER || result < Number.MIN_SAFE_INTEGER)
      ? BigInt(numStr)
      : result;
  }

  function parseArray(ptr: string): Array<any> {
    whitespace();
    let arr = [] as Array<any>;
    let i = 0;
    if (getChar() == "]") return arr;
    backChar();

    while (true) {
      const itemPtr = ptr + "/" + i;
      arr.push(_parse(itemPtr));
      whitespace();
      const char = getChar();
      if (char == "]") break;
      if (char != ",") wasUnexpectedToken();
      whitespace();
      i++;
    }

    return arr;
  }

  function parseObject(ptr: string): { [k: string]: any } {
    whitespace();
    let obj: { [k: string]: any } = {};
    if (getChar() == "}") return obj;
    backChar();

    while (true) {
      const loc = getLoc();
      if (getChar() != '"') wasUnexpectedToken();
      const key = parseString();
      const propPtr = ptr + "/" + escapeJsonPointer(key);
      mapLoc(propPtr, "key", loc);
      map(propPtr, "keyEnd");
      whitespace();
      if (getChar() != ":") wasUnexpectedToken();
      whitespace();
      obj[key] = _parse(propPtr);
      whitespace();
      let char = getChar();
      if (char == "}") break;
      if (char != ",") wasUnexpectedToken();
      whitespace();
    }
    return obj;
  }

  function read(str: string) {
    for (let i = 0; i < str.length; i++) if (getChar() !== str[i]) wasUnexpectedToken();
  }

  function getChar(): string {
    checkUnexpectedEnd();
    const char = source[pos];
    pos++;
    column++; // new line?
    return char;
  }

  function backChar() {
    pos--;
    column--;
  }

  function getCharCode(): string {
    let count = 4;
    let code = 0;

    while (count--) {
      code <<= 4;
      let char = getChar().toLowerCase();
      if (char >= "a" && char <= "f") code += char.charCodeAt(0) - A_CODE + 10;
      else if (char >= "0" && char <= "9") code += +char;
      else wasUnexpectedToken();
    }

    return String.fromCharCode(code);
  }

  function getDigits(): string | undefined {
    let digits = "";
    while (source[pos] >= "0" && source[pos] <= "9") digits += getChar();

    if (digits.length) return digits;
    checkUnexpectedEnd();
    unexpectedToken();
  }

  function map(ptr: string, prop: PointerProp) {
    mapLoc(ptr, prop, getLoc());
  }

  function mapLoc(ptr: string, prop: PointerProp, loc: Location) {
    pointers[ptr] = pointers[ptr] || {};
    pointers[ptr][prop] = loc;
  }

  function getLoc(): Location {
    return {
      line: line,
      column: column,
      pos: pos,
    };
  }

  function unexpectedToken() {
    throw new DetailedSyntaxError(line, column, source[pos]);
  }

  function wasUnexpectedToken() {
    backChar();
    unexpectedToken();
  }

  function checkUnexpectedEnd() {
    if (pos >= source.length) throw new UnexpectedEndError(line, column);
  }
}

export function stringify(data: any, _?: any, options?: string | number | StringifyOptions): StringifyResult {
  if (!validType(data)) throw new UnexpectedTypeError(data);
  let wsLine = 0;
  let wsPos = 0;
  let wsColumn = 0;
  let whitespace: string | number | undefined = typeof options == "object" ? options.space : options;

  switch (typeof whitespace) {
    case "number":
      let len = whitespace > 10 ? 10 : whitespace < 0 ? 0 : Math.floor(whitespace);
      whitespace = len && repeat(len, " ");
      wsPos = len;
      wsColumn = len;
      break;
    case "string":
      whitespace = whitespace.slice(0, 10);
      wsPos = 0;
      wsColumn = 0;
      for (let j = 0; j < whitespace.length; j++) {
        let char = whitespace[j];
        switch (char) {
          case " ":
            wsColumn++;
            break;
          case "\t":
            wsColumn += 4;
            break;
          case "\r":
            wsColumn = 0;
            break;
          case "\n":
            wsColumn = 0;
            wsLine++;
            break;
          default:
            throw new Error("whitespace characters not allowed in JSON");
        }
        wsPos++;
      }
      break;
    default:
      whitespace = undefined;
  }

  let json = "";
  let pointers: Pointers = {};
  let line = 1;
  let column = 0;
  let pos = 0;
  _stringify(data, 0, "");

  return {
    json: json,
    pointers: pointers,
  };

  function _stringify(_data: any, lvl: number, ptr: string) {
    map(ptr, "value");
    switch (typeof _data) {
      case "number":
      case "bigint":
      case "boolean":
        out("" + _data);
        break;
      case "string":
        out(quoted(_data));
        break;
      case "object":
        if (_data === null) {
          out("null");
        } else if (typeof _data.toJSON == "function") {
          out(quoted(_data.toJSON()));
        } else if (Array.isArray(_data)) {
          stringifyArray();
        } else {
          if (_data.constructor.BYTES_PER_ELEMENT) stringifyArray();
          else if (_data instanceof Map) stringifyMapSet();
          else if (_data instanceof Set) stringifyMapSet(true);
          else stringifyObject();
        }
    }
    map(ptr, "valueEnd");

    function stringifyArray() {
      if (_data.length) {
        out("[");
        let itemLvl = lvl + 1;
        for (let i = 0; i < _data.length; i++) {
          if (i) out(",");
          indent(itemLvl);
          let item = validType(_data[i]) ? _data[i] : null;
          let itemPtr = ptr + "/" + i;
          _stringify(item, itemLvl, itemPtr);
        }
        indent(lvl);
        out("]");
      } else {
        out("[]");
      }
    }

    function stringifyObject() {
      let keys = Object.keys(_data);
      if (keys.length) {
        out("{");
        let propLvl = lvl + 1;
        for (let i = 0; i < keys.length; i++) {
          let key = keys[i];
          let value = _data[key];
          if (validType(value)) {
            if (i) out(",");
            let propPtr = ptr + "/" + escapeJsonPointer(key);
            indent(propLvl);
            map(propPtr, "key");
            out(quoted(key));
            map(propPtr, "keyEnd");
            out(":");
            if (whitespace) out(" ");
            _stringify(value, propLvl, propPtr);
          }
        }
        indent(lvl);
        out("}");
      } else {
        out("{}");
      }
    }

    function stringifyMapSet(isSet = false) {
      if (_data.size) {
        out("{");
        const propLvl = lvl + 1;
        let first = true;
        let entries = _data.entries();
        let entry = entries.next();

        while (!entry.done) {
          const item = entry.value;
          const key = item[0];
          const value = isSet ? true : item[1];

          if (validType(value)) {
            if (!first) out(",");
            first = false;
            const propPtr = ptr + "/" + escapeJsonPointer(key);
            indent(propLvl);
            map(propPtr, "key");
            out(quoted(key));
            map(propPtr, "keyEnd");
            out(":");
            if (whitespace) out(" ");
            _stringify(value, propLvl, propPtr);
          }

          entry = entries.next();
        }

        indent(lvl);
        out("}");
      } else {
        out("{}");
      }
    }
  }

  function out(str: string) {
    column += str.length;
    pos += str.length;
    json += str;
  }

  function indent(lvl: number) {
    if (whitespace) {
      json += "\n" + repeat(lvl, whitespace as string);
      line++;
      column = 0;
      while (lvl--) {
        if (wsLine) {
          line += wsLine;
          column = wsColumn;
        } else {
          column += wsColumn;
        }
        pos += wsPos;
      }
      pos += 1; // \n character
    }
  }

  function map(ptr: string, prop: PointerProp) {
    pointers[ptr] = pointers[ptr] || {};
    pointers[ptr][prop] = {
      line: line,
      column: column,
      pos: pos,
    };
  }

  function repeat(n: number, str: string): string {
    return Array(n + 1).join(str);
  }
}

const VALID_TYPES = ["number", "bigint", "boolean", "string", "object"];

function validType(data: any) {
  return VALID_TYPES.indexOf(typeof data) >= 0;
}

const ESC_QUOTE = /"|\\/g;
const ESC_B = /[\b]/g;
const ESC_F = /\f/g;
const ESC_N = /\n/g;
const ESC_R = /\r/g;
const ESC_T = /\t/g;

function quoted(str: string) {
  str = str
    .replace(ESC_QUOTE, "\\$&")
    .replace(ESC_F, "\\f")
    .replace(ESC_B, "\\b")
    .replace(ESC_N, "\\n")
    .replace(ESC_R, "\\r")
    .replace(ESC_T, "\\t");
  return '"' + str + '"';
}

const ESC_0 = /~/g;
const ESC_1 = /\//g;

function escapeJsonPointer(str: string) {
  return str.replace(ESC_0, "~0").replace(ESC_1, "~1");
}
