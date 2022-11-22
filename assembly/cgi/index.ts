import {SUCCESS} from "../error";
import {errno, handle, ptr, StatusCode} from "../types";
import {JSONEncoder} from "../json";

@external("blockless_cgi", "cgi_open")
declare function cgi_open(opts: ptr<u8>, opts_len: u32, cgi_handle: ptr<handle>): errno

@external("blockless_cgi", "cgi_stdout_read")
declare function cgi_stdout_read(h: handle, buf: ptr<u32>, len: u32, num: ptr<u32>): errno

@external("blockless_cgi", "cgi_stderr_read")
declare function cgi_stderr_read(h: handle, buf: ptr<u32>, len: u32, num: ptr<u32>): errno

@external("blockless_ipfs", "cgi_stdin_write")
declare function cgi_stdin_write(h: handle, buf: ptr<u32>, len: u32, num: ptr<u32>): errno


export class Env {
    name: string
    value: string
    constructor(name:string, value:string) {
        this.name = name;
        this.value = value;
    }
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

    exec(): boolean {
        let params = this.params2json()
        let params_utf8_buf = String.UTF8.encode(params);
        let params_utf8_len = params_utf8_buf.byteLength;
        let params_ptr = changetype<usize>(params_utf8_buf);
        let handle_buf = memory.data(8);
        let rs = cgi_open(params_ptr, params_utf8_len, handle_buf);
        if (rs != SUCCESS) 
            return false;
        this.handle = load<u32>(handle_buf);
        return true;
    }
}

