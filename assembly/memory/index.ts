import {errno, handle, ptr, StatusCode} from "../types";
import {SUCCESS} from "../error";
import { JSON } from "../json";

@external("blockless_memory", "memory_read")
declare function memory_read(buf: ptr<u32>, len: u32, num: ptr<u32>): errno

@external("blockless_memory", "env_var_read")
declare function env_var_read(buf: ptr<u32>, len: u32, num: ptr<u32>): errno

function readStdin(buf: Array<u8>): i32 {
    let num_buf = memory.data(8);
    let buffer_ptr = changetype<usize>(new ArrayBuffer(buf.length));
    let rs = memory_read(buffer_ptr, buf.length, num_buf);
    let num = load<u32>(num_buf);
    if (rs == SUCCESS) {
        if (num != 0) {
            for(let i = 0; i < buf.length; i += 1)
                buf[i] = load<u8>(buffer_ptr + i);
            return num;
        } else {
            return 0;
        }
    }
    return -1;
}

function readEnvVars(buf: Array<u8>): i32 {
  let num_buf = memory.data(8);
  let buffer_ptr = changetype<usize>(new ArrayBuffer(buf.length));
  let rs = env_var_read(buffer_ptr, buf.length, num_buf);
  let num = load<u32>(num_buf);
  if (rs == SUCCESS) {
      if (num != 0) {
          for(let i = 0; i < buf.length; i += 1)
              buf[i] = load<u8>(buffer_ptr + i);
          return num;
      } else {
          return 0;
      }
  }
  return -1;
}

export class Stdin {
    private buf: u8[] = new Array()
    private bufLen: i32

    constructor(bufLen: i32 = 1024) {
      this.bufLen = bufLen >= 1024 ? bufLen : 1024;
      this.buf = new Array(this.bufLen);
    }

    read(): Stdin {
        let tbuf: u8[] = new Array(this.bufLen);
        let bs = readStdin(tbuf);
        this.buf = tbuf;
        return this;
    }

    toString(): string {
      let string = "";

      if(this.buf != null) {
        string = String.UTF8.decodeUnsafe(this.buf.dataStart, this.buf.length);
       }

      return string
    }

    toJSON(): JSON.Obj {
      let string = "{}";
    
      if(this.buf != null) {
        string = String.UTF8.decodeUnsafe(this.buf.dataStart, this.buf.length);
      }

      let jsonObj: JSON.Obj = <JSON.Obj>(JSON.parse(string));

      return jsonObj;
    }
}

export class EnvVars {
  private static vars: Map<string, string> | null = null;
  private bufLen: i32
  private buf: u8[] = new Array()

  constructor(bufLen: i32 = 1024) {
    this.bufLen = bufLen >= 1024 ? bufLen : 1024;
    this.buf = new Array(this.bufLen);
  }

  read(): EnvVars {
    let tbuf: u8[] = new Array(this.bufLen);
    let bs = readEnvVars(tbuf);
    this.buf = tbuf;
    return this;
  }

  toString(): string {
    let string = "";

    if(this.buf != null) {
      string = String.UTF8.decodeUnsafe(this.buf.dataStart, this.buf.length);
     }

    return string
  }

  toJSON(): JSON.Obj {
    let string = "{}";
  
    if(this.buf != null) {
      string = String.UTF8.decodeUnsafe(this.buf.dataStart, this.buf.length);
    }

    let jsonObj: JSON.Obj = <JSON.Obj>(JSON.parse(string));

    return jsonObj;
  }

  static initalize(): void {
    EnvVars.vars = new Map<string, string>();
    const blsEnv = new EnvVars().read().toJSON()

    if (blsEnv.keys.length > 0) {
      for (let i = 0; i < blsEnv.keys.length; i++) {
        const key = blsEnv.keys[i];

        if (blsEnv.has(key)) {
          EnvVars.vars!.set(key, blsEnv.getString(key)!._str);
        }
      }
    }
  }

  static get(key: string): string {
    if (EnvVars.vars === null) {
      EnvVars.initalize();
    }

    return EnvVars.vars!.has(key) ? EnvVars.vars!.get(key) : '';
  }
}