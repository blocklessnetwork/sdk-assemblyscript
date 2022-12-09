import { errno, handle, ptr, StatusCode } from "../types";
import * as err from "../error";
import { JSONEncoder, JSON } from "../json";
import { buffer2string, stringFromArray } from "../strings";
import { Buffer } from "../json/util";
import { encode } from "../base64";
import { Console } from "as-wasi/assembly";

@external("blockless_http", "http_req")
    declare function httpOpen(url: ptr<u8>, url_len: u32, opts: ptr<u8>, opts_len: u32, fd: ptr<handle>, code: ptr<u32>): errno

@external("blockless_http", "http_read_header")
    declare function httpReadHeader(fd: ptr<handle>, header: ptr<u8>, header_len: u32, buf: ptr<u8>, buf_len: u32, num: ptr<u32>): errno

@external("blockless_http", "http_read_body")
    declare function httpReadBody(fd: ptr<handle>, buf: ptr<u8>, buf_len: u32, num: ptr<u32>): errno

@external("blockless_http", "http_close")
    declare function httpClose(fd: ptr<handle>): errno

class HttpHandleOptions {
    //http method, GET POST etc.
    public method: string;
    //connect timeout, unit is second.
    public connectTimeout: i32;
    //read timeout, unit is second.
    public readTimeout: i32;
    //request Body
    public body: string | null;
    //request headers
    public headers: string | null;

    constructor(method: string) {
        this.method = method;
        this.connectTimeout = 30;
        this.readTimeout = 30;
        this.body = null;
        this.headers = null;
    }
}

class HttpHandle {
    private inner: handle
    private code: StatusCode
    constructor(inner: handle, code: StatusCode) {
        this.inner = inner
        this.code = code
    }

    getHeader(header: string): string | null {
        let h_utf8_buf = String.UTF8.encode(header);
        let h_utf8_len = h_utf8_buf.byteLength;
        let h_ptr = changetype<usize>(h_utf8_buf);
        let num_buf = memory.data(8);
        let max_buf_len = 1024 * 2;
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
                for (let i = 0; i < buf.length; i += 1)
                    buf[i] = load<u8>(buffer_ptr + i);
                return num;
            } else {
                return 0;
            }
        }
        return -1;
    }

    getAllBody(): string | null {
        let rs = "";
        for (; ;) {
            let tbuf: u8[] = new Array(1024);
            let num: i32 = this.readBody(tbuf);
            if (num < 0)
                return null;
            else if (num == 0)
                break;
            rs += buffer2string(tbuf, num);
        }
        return rs;
    }

    close(): void {
        httpClose(this.inner)
    }

    toString(): string {
        return `handle:${this.inner}, code:${this.code}`
    }
}

class ClientOptions {
    public baseUrl: string
    public headers: Map<string, string>

    constructor(baseUrl: string, headers: Map<string, string>) {
        this.baseUrl = baseUrl
        this.headers = headers
    }

    public getHeaders(): string {
        const obj = new JSON.Obj
        const keys = this.headers.keys()

        for (let i = 0; i < this.headers.size; i++) {
            obj.set(keys[i], this.headers.get(keys[i]))
        }

        return obj.toString()
    }
}

class Client {
    options: HttpClientOptions

    constructor(options: HttpClientOptions = new HttpClientOptions('', new Map())) {
        this.options = options
    }

    private formatUrl(url: string): string {
        return this.options.baseUrl ? this.options.baseUrl + url : url
    }

    get(url: string): JSON.Obj {
        const options = new HttpHandleOptions('GET')
        options.headers = this.options.getHeaders()

        return HttpClient.request(this.formatUrl(url), options)
    }

    post(url: string, body: string): JSON.Obj {
        const options = new HttpHandleOptions("POST")
        options.headers = this.options.getHeaders()

        if (body) options.body = body

        return HttpClient.request(this.formatUrl(url), options)
    }

    static request(url: string, options: HttpHandleOptions): JSON.Obj {
        let body: string | null = null
        let response: JSON.Obj = <JSON.Obj>JSON.parse('{}')
        const handle: HttpHandle | null = HttpOpen(url, options)

        if (handle != null) {
            body = handle.getAllBody()!
            handle.close()

            // TODO: Parse non JSON content types as well
            if (body) {
                response = <JSON.Obj>JSON.parse(body)
            }
        }

        return response
    }
}

class Request {
    public url: string;
    public headers: Map<string, string>

    constructor(url: string) {
        this.url = url;
        this.headers = new Map()
    }
}

class Response {
    public code: u32 = 200;
    public headers: Map<string, string>
    public body: string = '';

    constructor(body: string = "") {
        this.body = body;
        this.headers = new Map();
    }

    status(code: u32): Response {
        this.code = code

        return this
    }

    header(key: string, value: string): Response {
        this.headers.set(key, value)

        return this
    }

    getHeaders(): string {
        const obj = new JSON.Obj
        const keys = this.headers.keys()

        for (let i = 0; i < this.headers.size; i++) {
            obj.set(keys[i], this.headers.get(keys[i]))
        }

        return obj.toString()
    }

    toJSON(): JSON.Obj {
        const obj = new JSON.Obj
        obj.set('code', this.code.toString())
        obj.set('body', encode(Buffer.fromString(this.body)))
        obj.set('headers', this.getHeaders())

        return obj
    }

    toString(): string {
        return this.toJSON().toString()
    }
}

class HttpComponent {
    public handler: (request: Request) => Response;

    constructor(handler: (request: Request) => Response) {
        this.handler = handler;

        // Build request
        let requestPath = '/'
        const request = new Request(requestPath.toString());
        
        // Call handler, generate response
        const response = this.handler(request);
        
        // Encode body into buffer
        if (response && response.body) {
            Console.log(response.toString());
        }
    }
}

function HttpOpen(url: string, opts: HttpHandleOptions): HttpHandle | null {
    let url_utf8_buf = String.UTF8.encode(url);
    let url_utf8_len: usize = url_utf8_buf.byteLength;
    let body = opts.body;
    let headers = opts.headers;
    let method = opts.method;
    let c_timeout = opts.connectTimeout;
    let r_timeout = opts.readTimeout;
    let opts_s = "";
    let encoder = new JSONEncoder();
    encoder.pushObject("");
    if (body != null)
        encoder.setString("body", body);
    if (headers != null)
        encoder.setString("headers", headers);
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
    HttpHandle,
    HttpHandleOptions,
    HttpOpen,
    Client,
    ClientOptions,
    HttpComponent,
    Request,
    Response
}