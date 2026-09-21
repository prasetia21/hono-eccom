import { pinoLogger } from "@/libs/logger";

class PhpUnserializer {
  private pos = 0;

  constructor(private str: string) {}

  public parse(): any {
    const type = this.str.charAt(this.pos);

    switch (type) {
      case "N":
        this.pos += 2;
        return null;

      case "b": {
        const val = this.str.charAt(this.pos + 2) === "1";
        this.pos += 4;
        return val;
      }

      case "i":
      case "d": {
        const end = this.str.indexOf(";", this.pos);
        const val = this.str.substring(this.pos + 2, end);
        this.pos = end + 1;
        return type === "i" ? parseInt(val, 10) : parseFloat(val);
      }

      case "s": {
        const lenEnd = this.str.indexOf(":", this.pos + 2);
        const len = parseInt(this.str.substring(this.pos + 2, lenEnd), 10);

        const startQuote = lenEnd + 2;
        const valStr = this.str.substring(startQuote, startQuote + len);

        this.pos = startQuote + len + 2;
        return valStr;
      }

      case "a": {
        const lenEnd = this.str.indexOf(":", this.pos + 2);
        const len = parseInt(this.str.substring(this.pos + 2, lenEnd), 10);
        this.pos = this.str.indexOf("{", lenEnd) + 1;

        const obj: any = {};
        let isArray = true;
        let expectedKey = 0;

        for (let i = 0; i < len; i++) {
          const key = this.parse();
          const val = this.parse();
          obj[key] = val;

          if (key !== expectedKey) isArray = false;
          expectedKey++;
        }

        this.pos++;
        return isArray ? Object.values(obj) : obj;
      }

      case "O": {
        const lenEnd = this.str.indexOf(":", this.pos + 2);
        const nameLen = parseInt(this.str.substring(this.pos + 2, lenEnd), 10);

        const nameStart = lenEnd + 2;
        const className = this.str.substring(nameStart, nameStart + nameLen);
        this.pos = nameStart + nameLen + 2;

        const propsLenEnd = this.str.indexOf(":", this.pos);
        const propsLen = parseInt(this.str.substring(this.pos, propsLenEnd), 10);
        this.pos = this.str.indexOf("{", propsLenEnd) + 1;

        const obj: any = {};

        for (let i = 0; i < propsLen; i++) {
          let key = this.parse();
          const val = this.parse();

          if (typeof key === "string") {
            // eslint-disable-next-line no-control-regex
            key = key.replace(/\x00\*\x00/g, "");

            key = key.replace(new RegExp(`\\x00${className}\\x00`, "g"), "");

            // eslint-disable-next-line no-control-regex
            key = key.replace(/\x00.*?\x00/g, "");
          }

          obj[key] = val;
        }
        this.pos++;

        if (className === "Illuminate\\Support\\Collection" && obj.items !== undefined) {
          return obj.items;
        }

        return obj;
      }

      default:
        throw new Error(`Tipe PHP Serialization tidak dikenal: ${type} pada posisi ${this.pos}`);
    }
  }
}

export function parsePhpSerialize(str: string): any {
  try {
    const parser = new PhpUnserializer(str);
    return parser.parse();
  } catch (err) {
    pinoLogger.warn(
      { error: err, rawData: str },
      "Gagal membaca format PHP Serialize, mencoba fallback sebagai JSON",
    );
    return null;
  }
}

export function phpSerialize(value: any): string {
  if (value === null || value === undefined) {
    return "N;";
  }

  if (typeof value === "boolean") {
    return `b:${value ? 1 : 0};`;
  }

  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return `i:${value};`;
    } else {
      return `d:${value};`;
    }
  }

  if (typeof value === "string") {
    const byteLength = Buffer.byteLength(value, "utf8");
    return `s:${byteLength}:"${value}";`;
  }

  if (typeof value === "object") {
    if (Array.isArray(value)) {
      let res = `a:${value.length}:{`;
      for (let i = 0; i < value.length; i++) {
        res += phpSerialize(i);
        res += phpSerialize(value[i]);
      }
      res += "}";
      return res;
    } else {
      const keys = Object.keys(value);
      let res = `a:${keys.length}:{`;
      for (const key of keys) {
        res += phpSerialize(key);
        res += phpSerialize(value[key]);
      }
      res += "}";
      return res;
    }
  }

  return "N;";
}
