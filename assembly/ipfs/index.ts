import {errno, handle, ptr, StatusCode} from "../types";
import {SUCCESS} from "../error";
import {JSONEncoder} from "../json";
import { json } from "..";
import { Console } from "as-wasi/assembly";

@external("blockless_ipfs", "ipfs_command")
declare function ipfs_command(opts: ptr<u8>, opts_len: u32, fd: ptr<handle>, code: ptr<u32>): errno

@external("blockless_ipfs", "ipfs_read_body")
declare function ipfs_read_body(h: handle, buf: ptr<u32>, len: u32, num: ptr<u32>): errno

@external("blockless_ipfs", "ipfs_write")
declare function ipfs_write(h: handle, buf: ptr<u32>, len: u32, num: ptr<u32>): errno

@external("blockless_ipfs", "ipfs_close")
declare function ipfs_close(h: handle): errno

class CommanResult {
    handle: handle
    statusCode: u32
    respBody: Array<u8>|null
    constructor(statusCode: u32, respBody: Array<u8>|null) {
        this.statusCode = statusCode
        this.respBody = respBody;
    }
}
class Args {
    name: string
    value: string
    constructor(name:string, value:string) {
        this.name = name;
        this.value = value;
    }
}

class IpfsOptions {
    api: string
    args: Array<Args>

    constructor(api: string) {
        this.api = api
        this.args = new Array()
    }

    toJson(): string {
        let encoder = new JSONEncoder();
        encoder.pushObject("");
        encoder.setString("api", this.api)
        encoder.pushArray("args");
        for (let i = 0; i < this.args.length; i++) {
            let arg = this.args[i];
            encoder.pushObject("");
            encoder.setString("name", arg.name);
            encoder.setString("value", arg.value);
            encoder.popObject();
        }
        encoder.popArray();
        encoder.popObject();
        return encoder.toString();
    }
}

function ipfsCommandResult(opts: IpfsOptions):  CommanResult|null {
    let result = ipfsCommand(opts);
    if (result == null) return null;
    let body = getAllBody(result.handle);
    ipfs_close(result.handle);
    return new CommanResult(result.code, body)
}

class CommandRs {
    code: StatusCode
    handle: handle
    constructor(code: StatusCode, handle: handle) {
        this.code = code;
        this.handle = handle
    }
}

function ipfsCommand(opts: IpfsOptions):  CommandRs|null {
    let tbuf: u8[] = new Array(1024);
    let opts_utf8_buf = String.UTF8.encode(opts.toJson());
    let opts_utf8_len = opts_utf8_buf.byteLength;
    let opts_ptr = changetype<usize>(opts_utf8_buf);
    let num_buf = memory.data(8);
    let handle_buf = memory.data(8);
    let rs = ipfs_command(opts_ptr, opts_utf8_len, handle_buf, num_buf);
    if (rs != SUCCESS) 
        return null;
    let handle = load<u32>(handle_buf);
    let num = load<u32>(num_buf);
    return new CommandRs(num, handle);
}

class WriteRs {
    writen: u32
    result: u32
    constructor(writen: u32, result: u32) {
        this.result = result
        this.writen = writen
    }
}

function writeBody(h:handle, buf: Array<u8>): WriteRs | null {
    let num_buf = memory.data(8);
    let buffer_ptr = changetype<usize>(buf.dataStart);
    let rs = ipfs_write(h, buffer_ptr, buf.length, num_buf);
    if (rs != SUCCESS) return null;
    let num = load<u32>(num_buf);
    return new WriteRs(num, rs);
}

function readBody(h:handle, buf: Array<u8>): i32 {
    let num_buf = memory.data(8);
    let buffer_ptr = changetype<usize>(new ArrayBuffer(buf.length));
    let rs = ipfs_read_body(h, buffer_ptr, buf.length, num_buf);
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

function getAllBody(h: handle): Array<u8>|null {
    let rs = new Array<u8>(0);
    for (;;) {
        let tbuf: u8[] = new Array(1024);
        let num: i32 = readBody(h, tbuf);
        if (num < 0)
            return null;
        else if (num == 0)
            break;
        rs = rs.concat(tbuf.slice(0, num));
    }
    return rs;
}

class File {
    name:string;
    type:i64;
    size:i64;
    hash:string;
    constructor() {
        this.name = "";
        this.type = 0;
        this.size = 0
        this.hash = "";
    }
    toString(): string {
        return `name:${this.name}, size:${this.size}, type:${this.type}, hash:${this.hash}`
    }
}

export function ipfsCreateDir(path: string, parents: boolean): boolean {
    let opts = new IpfsOptions("files/mkdir");
    opts.args.push(new Args("arg", path));
    opts.args.push(new Args("parents", `${parents}`));
    let result = ipfsCommandResult(opts);
    if (result == null)
        return false;
    if (result.statusCode != 200)
        return false;
    else
        return true;
}


export function ipfsFileRemove(path: string, recursive: boolean, force: boolean): boolean {
    let opts = new IpfsOptions("files/rm");
    opts.args.push(new Args("arg", path));
    opts.args.push(new Args("recursive", `${recursive}`));
    opts.args.push(new Args("force", `${force}`));
    let result = ipfsCommandResult(opts);
    if (result == null)
        return false;
    if (result.statusCode != 200)
        return false;
    else
        return true;
}

export function ipfsFileCopy(source: string, dest: string, parents: boolean): boolean {
    let opts = new IpfsOptions("files/cp");
    opts.args.push(new Args("arg", source));
    opts.args.push(new Args("arg", dest));
    opts.args.push(new Args("parents", `${parents}`));
    let result = ipfsCommandResult(opts);
    if (result == null)
        return false;
    if (result.statusCode != 200)
        return false;
    else
        return true;
}

export class FileWriteOptions {
    file: string;
    offset: i64;
    create: boolean
    parents: boolean
    truncate: boolean
    constructor(file:string) {
        this.file = file;
        this.offset = 0;
        this.create = true;
        this.parents = false;
        this.truncate = false;

    }
}

export class ReadResult {
    num: i64
    constructor(num: i64) {
        this.num = num;
    }
    toString(): string {
        return `num:${this.num}`
    }
}

export function ipfsFileRead(path:string, offset: u64, buf: Array<u8>): i32 {
    let opts = new IpfsOptions("files/read");
    opts.args.push(new Args("arg", path));
    opts.args.push(new Args("offset", `${offset}`));
    opts.args.push(new Args("count", `${buf.length}`));
    let rs = ipfsCommand(opts);
    if (rs == null) {
        return -1;
    }
    let rnum = readBody(rs.handle, buf);
    ipfs_close(rs.handle);
    return rnum;
}

export function ipfsFileWrite(wopts: FileWriteOptions, buf: Array<u8>): boolean {
    let opts = new IpfsOptions("files/write");
    let file: string = wopts.file;
    let offset: i64 = wopts.offset; 
    let create: boolean = wopts.create; 
    let parents: boolean = wopts.parents;
    let truncate: boolean = wopts.truncate; 
    opts.args.push(new Args("arg", file));
    opts.args.push(new Args("offset", `${offset}`));
    opts.args.push(new Args("create", `${create}`));
    opts.args.push(new Args("parents", `${parents}`));
    opts.args.push(new Args("truncate", `${truncate}`));
    let rs = ipfsCommand(opts);
    if (rs == null) {
        return false;
    }
    let wn = writeBody(rs.handle, buf);
    if (wn == null) {
        ipfs_close(rs.handle);
        return false;
    }
    let rbuf = getAllBody(rs.handle);
    ipfs_close(rs.handle);
    if (rbuf != null) {
        return true;
    } else {
        return false;
    }
}

export function ipfsFileList(path: string|null): Array<File>|null {
    let opts = new IpfsOptions("files/ls");
    if (path != null)
        opts.args.push(new Args("args", path));
    let result = ipfsCommandResult(opts);
    if (result == null) 
        return null;
    if (result.statusCode != 200)
        return null;
    let bs = result.respBody;
    if (bs == null) return null; 
    let rs = String.UTF8.decodeUnsafe(bs.dataStart, bs.length);
    let jsonObj = <json.JSON.Obj>json.JSON.parse(rs);
    let arr = jsonObj.getArr("Entries");
    let files = new Array<File>();
    if (arr != null) {
        let vals = arr.valueOf();
        for (let i = 0; i < vals.length; i++) {
            let v = vals[i];
            if (v.isObj) {
                let obj = <json.JSON.Obj>v;
                let f = new File();
                f.name = obj.getString("Name")!.stringify();
                f.type = obj.getInteger("Type")!.valueOf();
                f.size = obj.getInteger("Size")!.valueOf();
                f.hash = obj.getString("Hash")!.stringify();
                files.push(f);
            }
        }
    }
    return files;
}

export class FileStat {
    hash: string;
    size: u64;
    blocks: u64;
    type: string;
    cumulativeSize: u64;
    constructor() {
        this.hash = "";
        this.size = 0;
        this.blocks = 0;
        this.type = "";
        this.cumulativeSize = 0;
    }
    toString(): string {
        return `hash:${this.hash}, size:${this.size}, blocks:${this.blocks}, type:${this.type}, cumulativeSize:${this.cumulativeSize}`
    }
}


export function ipfsFileStat(path: string): FileStat|null {
    let opts = new IpfsOptions("files/stat");
    opts.args.push(new Args("arg", path));
    let result = ipfsCommandResult(opts);
    if (result == null) 
        return null;
    if (result.statusCode != 200)
        return null;
    let bs = result.respBody;
    if (bs == null) return null; 
    let rs = String.UTF8.decodeUnsafe(bs.dataStart, bs.length);
    
    let jsonObj = <json.JSON.Obj>json.JSON.parse(rs);;
    if (jsonObj.isNull) return null;
    if (jsonObj.getString("Hash") == null) return null;
    let s = new FileStat();
    s.hash = jsonObj.getString("Hash")!.stringify();
    s.type = jsonObj.getString("Type")!.stringify();
    s.size = jsonObj.getInteger("Size")!.valueOf();
    s.blocks = jsonObj.getInteger("Blocks")!.valueOf();
    s.cumulativeSize = jsonObj.getInteger("CumulativeSize")!.valueOf();
    return s;
}