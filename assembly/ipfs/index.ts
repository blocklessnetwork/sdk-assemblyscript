import {errno, handle, ptr, StatusCode} from "../types";
import {SUCCESS} from "../error";
import {JSONEncoder} from "../json";
import { Console } from "as-wasi/assembly";
import { json } from "..";
import { Integer } from "../json/JSON";

@external("blockless_ipfs", "ipfs_command")
declare function ipfs_command(opts: ptr<u8>, opts_len: u32, fd: ptr<handle>, code: ptr<u32>): errno

@external("blockless_ipfs", "ipfs_read_body")
declare function ipfs_read_body(h: handle, buf: ptr<u32>, len: u32, num: ptr<u32>): errno


class IpfsOptions {
    api: string

    constructor(api: string) {
        this.api = api
    }

    toJson(): string {
        let encoder = new JSONEncoder();
        encoder.pushObject("");
        encoder.setString("api", this.api)
        encoder.popObject();
        return encoder.toString();
    }
}

function ipfsCommand(opts: IpfsOptions):  u8[]|null {
    let tbuf: u8[] = new Array(1024);
    let opts_utf8_buf = String.UTF8.encode(opts.toJson());
    let opts_utf8_len = opts_utf8_buf.byteLength;
    let opts_ptr = changetype<usize>(opts_utf8_buf);
    let num_buf = memory.data(8);
    let handle_buf = memory.data(8);
    
    let rs = ipfs_command(opts_ptr, opts_utf8_len, handle_buf, num_buf);
    let handle = load<u32>(handle_buf);
    let num = load<u32>(num_buf);
    if (rs != SUCCESS) 
        return null;
    if (num != 200) return null;
    return getAllBody(handle);
}

function readBody(h:handle, buf: u8[]): i32 {
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

export function ipfsFileList(): Array<File>|null {
    let opts = new IpfsOptions("files/ls");
    let bs = ipfsCommand(opts);
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