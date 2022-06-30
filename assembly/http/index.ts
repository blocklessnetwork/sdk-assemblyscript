import {errno, handle, ptr, StatusCode} from "../types";
import * as err from "../error";
import { JSONEncoder } from "../json";

@external("blockless_http", "http_req")
declare function httpOpen(url: ptr<u8>, url_len: u32, opts: ptr<u8>, opts_len: u32, fd: ptr<handle>, code: ptr<u32>): errno

@external("blockless_http", "http_read_header")
declare function httpReadHeader(fd: ptr<handle>, header: ptr<u8>, header_len: u32, buf: ptr<u8>, buf_len: u32, num: ptr<u32>): errno

@external("blockless_http", "http_read_body")
declare function httpReadBody(fd: ptr<handle>, buf: ptr<u8>, buf_len: u32, num: ptr<u32>): errno

@external("blockless_http", "http_close")
declare function httpClose(fd: ptr<handle>): errno

export class HttpOptions {
    //http method, GET POST etc.
    public method: string;
    //connect timeout, unit is second.
    public connectTimeout: i32;
    //read timeout, unit is second.
    public readTimeout: i32;
    //request Body
    public body: string|null;

    constructor(method:string) {
        this.method = method;
        this.connectTimeout = 30;
        this.readTimeout = 30;
        this.body = null;
    }
}

function stringFromArray(data: ptr<u8>, len: i32): string {
    let str = "";
    for(let i = 0; i < len; i += 1)
      str += String.fromCharCode(load<u8>(data+i));
    return str;
}

class HttpHandle {
    private inner: handle
    private code: StatusCode
    constructor(inner: handle, code: StatusCode) {
        this.inner = inner
        this.code = code
    }

    getHeader(header: string): string|null {
        let h_utf8_buf = String.UTF8.encode(header);
        let h_utf8_len = h_utf8_buf.byteLength;
        let h_ptr = changetype<usize>(h_utf8_buf);
        let num_buf = memory.data(8);
        let max_buf_len = 1024*2;
        let buffer_ptr = changetype<usize>(new ArrayBuffer(max_buf_len));
        let rs = httpReadHeader(this.inner, h_ptr, h_utf8_len, buffer_ptr, max_buf_len, num_buf);
        let num = load<u32>(num_buf);
        if (rs == err.SUCCESS) {
            if (num != 0) {
                return stringFromArray(buffer_ptr, num);
            } else {
                return null;
            }
        }
        return null;
    }

    readBody(buf: u8[]): i32 {
        let num_buf = memory.data(8);
        let buffer_ptr = changetype<usize>(new ArrayBuffer(buf.length));
        let rs = httpReadBody(this.inner, buffer_ptr, buf.length, num_buf);
        let num = load<u32>(num_buf);
        if (rs == err.SUCCESS) {
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

    getAllBody(): string|null {
        let rs = "";
        for (;;) {
            let tbuf: u8[] = new Array(1024);
            let num: i32 = this.readBody(tbuf);
            if (num < 0)
                return null;
            else if (num == 0)
                break;
            for(let i = 0; i < num; i += 1)
                rs += String.fromCharCode(tbuf[i]);
        }
        return rs;
    }

    close():void {
        httpClose(this.inner)
    }

    toString(): string {
        return `handle:${this.inner}, code:${this.code}`
    }
}

function HttpOpen(url: string, opts: HttpOptions):  HttpHandle|null {
    let url_utf8_buf = String.UTF8.encode(url);
    let url_utf8_len: usize = url_utf8_buf.byteLength;
    let body = opts.body;
    let method = opts.method;
    let c_timeout = opts.connectTimeout;
    let r_timeout = opts.readTimeout;
    let opts_s = "";
    let encoder = new JSONEncoder();
    encoder.pushObject("");
    if (body != null)
        encoder.setString("body", body);
    encoder.setInteger("connectTimeout", c_timeout);
    encoder.setInteger("readTimeout", r_timeout);
    encoder.setString("method", method);
    encoder.popObject();
    let opts_utf8_buf = String.UTF8.encode(encoder.toString());
    let opts_utf8_len: usize = opts_utf8_buf.byteLength;
    let url_utf8 = changetype<usize>(url_utf8_buf);
    let opts_utf8 = changetype<usize>(opts_utf8_buf);
    let fd_buf = memory.data(8);
    let code_buf = memory.data(8);
    let rs = httpOpen(url_utf8, url_utf8_len as u32, opts_utf8, opts_utf8_len as u32, fd_buf, code_buf);
    if (rs != 0) {
        return null;
    }
    let fd = load<u32>(fd_buf);
    let code = load<u32>(code_buf);
    return new HttpHandle(fd, code);
}

export {
    HttpOpen,
    HttpHandle
}