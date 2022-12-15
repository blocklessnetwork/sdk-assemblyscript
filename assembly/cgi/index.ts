import {SUCCESS} from "../error";
import {errno, handle, ptr, StatusCode} from "../types";
import {JSONEncoder} from "../json";
import { buffer2string } from "../strings";
import { Console } from "as-wasi/assembly";
import { json } from "..";

@external("blockless_cgi", "cgi_open")
declare function cgi_open(opts: ptr<u8>, opts_len: u32, cgi_handle: ptr<handle>): errno

@external("blockless_cgi", "cgi_stdout_read")
declare function cgi_stdout_read(h: handle, buf: ptr<u32>, len: u32, num: ptr<u32>): errno

@external("blockless_cgi", "cgi_stderr_read")
declare function cgi_stderr_read(h: handle, buf: ptr<u32>, len: u32, num: ptr<u32>): errno

@external("blockless_cgi", "cgi_stdin_write")
declare function cgi_stdin_write(h: handle, buf: ptr<u32>, len: u32, num: ptr<u32>): errno

@external("blockless_cgi", "cgi_close")
declare function cgi_close(h: handle): errno

@external("blockless_cgi", "cgi_list_exec")
declare function cgi_list_exec(cgi_handle: ptr<handle>): errno

@external("blockless_cgi", "cgi_list_read")
declare function cgi_list_read(h: handle, buf: ptr<u32>, len: u32, num: ptr<u32>): errno

export class Env {
    name: string
    value: string
    constructor(name:string, value:string) {
        this.name = name;
        this.value = value;
    }
}

export class CGIExtension {
    fileName: string

    constructor(fileName:string) {
        this.fileName = fileName
    }

    toString(): string {
        return `{fileName:${this.fileName}}`
    }
}

export function cgiExtendsList(): Array<CGIExtension>|null {
    let handle_buf = memory.data(8);
    let rs = cgi_list_exec(handle_buf);
    if (rs != SUCCESS) {
        return null;
    }
    let fd = load<u32>(handle_buf);
    let rlist= cgiListReadAll(fd);
    cgi_close(fd);
    let arr = <json.JSON.Arr>json.JSON.parse(rlist);
    let result: CGIExtension[] = new Array();
    if (arr.isNull) return null;
    if (arr.isArr) {
        let vals = arr.valueOf();
        for (let i = 0; i < vals.length; i++) {
            let val = vals[i];
            if (val.isObj) {
                let obj = <json.JSON.Obj>val;
                let fn = obj.getString("fileName");
                if (fn != null) {
                    let ext = new CGIExtension(fn.toString());
                    result.push(ext);
                }
            }
        }

    }
    return result;
}

function cgiListReadAll(fd: handle): string|null {
    let arr_rs: u8[] = new Array(0);
    for (;;) {
        let tbuf: u8[] = new Array(1024);
        let num: i32 = cgiListRead(fd, tbuf);
        if (num < 0)
            return null;
        else if (num == 0)
            break;
        arr_rs = arr_rs.concat(tbuf.slice(0, num))
    }
    return buffer2string(arr_rs, arr_rs.length);
}

function cgiListRead(fd: handle, buf: u8[]): i32 {
    let num_buf = memory.data(8);
    let buffer_ptr = changetype<usize>(new ArrayBuffer(buf.length));
    let rs = cgi_list_read(fd, buffer_ptr, buf.length, num_buf);
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

export class CgiCommand {
    command: string
    envs: Array<Env>|null
    args: Array<string>|null
    handle: handle

    constructor(command: string, args: Array<string>|null, envs: Array<Env>|null) {
        this.command = command;
        this.args = args;
        this.envs = envs;
        this.handle = 0;
    }

    params2json(): string {
        let encoder = new JSONEncoder();
        encoder.pushObject("");
        encoder.setString("command", this.command)
        if (this.args != null) {
            encoder.pushArray("args");
            for (let i = 0; i < this.args!.length; i++) {
                let arg = this.args![i];
                encoder.setString(null, arg);
            }
            encoder.popArray();
        }

        if (this.envs != null) {
            encoder.pushArray("envs");
            for (let i = 0; i < this.envs!.length; i++) {
                let arg = this.envs![i];
                encoder.pushObject("");
                encoder.setString("name", arg.name);
                encoder.setString("value", arg.value);
                encoder.popObject();
            }
            encoder.popArray();
        }
        encoder.popObject();
        return encoder.toString();
    }

    read(buf: Array<u8>, is_stdout: boolean): i32 {
        if (this.handle == 0) {
            return -1;
        }
        let num_buf = memory.data(8);
        let buffer_ptr = changetype<usize>(new ArrayBuffer(buf.length));
        let rs = 0;
        if (is_stdout) {
            rs = cgi_stdout_read(this.handle, buffer_ptr, buf.length, num_buf);
        } else {
            rs = cgi_stderr_read(this.handle, buffer_ptr, buf.length, num_buf);
        }
        
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

    exec(): boolean {
        let params = this.params2json()
        let params_utf8_buf: ArrayBuffer = String.UTF8.encode(params);
        let params_utf8_len = params_utf8_buf.byteLength;
        let params_ptr = changetype<usize>(params_utf8_buf);
        let handle_buf = memory.data(8);
        let rs = cgi_open(params_ptr, params_utf8_len, handle_buf);
        if (rs != SUCCESS) 
            return false;
        this.handle = load<u32>(handle_buf);
        return true;
    }

    stdoutRead(buf: Array<u8>): i32 {
        return this.read(buf, true);
    }

    stderrRead(buf: Array<u8>): i32 {
        return this.read(buf, false);
    }

    close(): void {
        if (this.handle > 0) {
            cgi_close(this.handle);
            this.handle = 0;
        }
    }

    stdinWriteString(s: string): i32 {
        let buf_buf = String.UTF8.encode(s);
        let buf_utf8_len = buf_buf.byteLength;
        let buf_ptr = changetype<usize>(buf_buf);
        let num_buf = memory.data(8);
        let rs = cgi_stdin_write(this.handle, buf_ptr, buf_utf8_len, num_buf);
        if (rs != SUCCESS) {
            return -1;
        }
        return load<u32>(num_buf);
    }

    stdinWrite(buf: Array<u8>): i32 {
        let num_buf = memory.data(8);
        let buf_ptr = changetype<usize>(buf.dataStart);
        let rs = cgi_stdin_write(this.handle, buf_ptr, buf.length, num_buf);
        if (rs != SUCCESS) {
            return -1;
        }
        return load<u32>(num_buf);
    }
    
}

