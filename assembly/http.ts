import { Console } from "as-wasi/assembly";
import {errno, handle, ptr, StatusCode} from "./types"

@external("blockless_http", "http_req")
declare function httpOpen(url: ptr<u8>, url_len: u32, opts: ptr<u8>, opts_len: u32, fd: ptr<handle>, code: ptr<u32>): errno


class HttpOptions {
    
}

class HttpHandle {
    private inner: handle
    private code: StatusCode
    constructor(inner: handle, code: StatusCode) {
        this.inner = inner
        this.code = code
    }

    getHeader(params:string): usize|null {
        return 0 
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
    let rs = httpOpen(url_utf8, url_utf8_len, opts_utf8, opts_utf8_len, fd_buf, code_buf)
    if (rs != 0) {
        return null
    }
    let fd = load<u32>(fd_buf);
    let code = load<u32>(code_buf);
    return new HttpHandle(fd, code);
}

export {
    HttpOpen
}