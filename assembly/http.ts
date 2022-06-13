import {errno, handle, ptr, StatusCode} from "./types";
import * as err from "./error";

@external("blockless_http", "http_req")
declare function httpOpen(url: ptr<u8>, url_len: u32, opts: ptr<u8>, opts_len: u32, fd: ptr<handle>, code: ptr<u32>): errno


@external("blockless_http", "http_read_header")
declare function httpReadHeader(fd: ptr<handle>, header: ptr<u8>, header_len: u32, buf: ptr<u8>, buf_len: u32, num: ptr<u32>): errno

@external("blockless_http", "http_read_body")
declare function httpReadBody(fd: ptr<handle>, buf: ptr<u8>, buf_len: u32, num: ptr<u32>): errno

@external("blockless_http", "http_close")
declare function httpClose(fd: ptr<handle>): errno

class HttpOptions {
    
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

    readBody(buf: u8[]): u32|null {
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
                return null;
            }
        }
        return null;
    }

    close():void {
        httpClose(this.inner)
    }

    toString(): string {
        return `handle:${this.inner}, code:${this.code}`
    }
}

function HttpOpen(url: string, opts: string):  HttpHandle|null {
    let url_utf8_buf = String.UTF8.encode(url);
    let url_utf8_len: usize = url_utf8_buf.byteLength;
    let opts_utf8_buf = String.UTF8.encode(opts);
    let opts_utf8_len: usize = opts_utf8_buf.byteLength;
    let url_utf8 = changetype<usize>(url_utf8_buf);
    let opts_utf8 = changetype<usize>(opts_utf8_buf);
    let fd_buf = memory.data(8);
    let code_buf = memory.data(8);
    let rs = httpOpen(url_utf8, url_utf8_len, opts_utf8, opts_utf8_len, fd_buf, code_buf);
    if (rs != 0) {
        return null;
    }
    let fd = load<u32>(fd_buf);
    let code = load<u32>(code_buf);
    return new HttpHandle(fd, code);
}

export {
    HttpOpen
}