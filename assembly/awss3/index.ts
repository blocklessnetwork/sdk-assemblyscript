import {errno, handle, ptr, StatusCode} from "../types";
import {SUCCESS} from "../error";
import { JSONEncoder } from "../json";
import { json } from "..";
import { Console } from "as-wasi/assembly";

@external("blockless_s3", "bucket_command")
declare function bucket_command(cmd: u16, opts: ptr<u8>, opts_len: u32, fd: ptr<handle>): errno

@external("blockless_s3", "s3_read")
declare function s3_read(h: handle, buf: ptr<u32>, len: u32, num: ptr<u32>): errno

@external("blockless_s3", "bucket_put_object")
declare function bucket_put_object(opts: ptr<u8>, opts_len: u32, buf: ptr<u32>, len: u32): errno

@external("blockless_s3", "s3_close")
declare function s3_close(h: handle): errno

function readBody(h:handle, buf: Array<u8>): i32 {
    let num_buf = memory.data(8);
    let buffer_ptr = changetype<usize>(new ArrayBuffer(buf.length));
    let rs = s3_read(h, buffer_ptr, buf.length, num_buf);
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

export class BucketListContent {
    last_modified: string
    e_tag: string|null
    storage_class: string|null
    key: string
    size: u64
    constructor() {
        this.last_modified = ""
        this.key = ""
    }
    toString(): string {
        let rs = `last_modified:${this.last_modified}, key:${this.key}, size:${this.size}`;
        if (this.e_tag != null)
            rs += `, e_tag:${this.e_tag!}`
        if (this.storage_class != null)
            rs += `, storage_class:${this.storage_class!}`

        return `{${rs}}`;
    }
}

export class BucketListResponse {
    name: string
    prefix: string|null
    is_truncated: bool
    contents: Array<BucketListContent>
    constructor(name: string, prefix: string|null) {
        this.name = name;
        this.contents = new Array();
        this.prefix = prefix;
        this.is_truncated = false;
    }
    setTruncated(is_truncated: bool):void {
        this.is_truncated = is_truncated;
    }
    toString(): string {
        let rs = `name:${this.name}, is_truncated:${this.is_truncated}`;
        if (this.prefix != null)
            rs += `, prefix:${this.prefix!}`
        rs += `,contents: [${this.contents}]`;
        return rs;
    }
}

export class S3Configure {
    accessKey: string
    secretKey: string
    endpoint: string
    region: string|null
    constructor(accessKey: string, secretKey: string, endpoint: string) {
        this.accessKey = accessKey;
        this.secretKey = secretKey;
        this.endpoint = endpoint;
    }
    encodeJson(encoder: JSONEncoder):void {
        encoder.setString("access_key", this.accessKey);
        encoder.setString("secret_key", this.secretKey);
        encoder.setString("endpoint", this.endpoint);
        if (this.region != null)
            encoder.setString("region", this.region!);
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

export class BucketCommand {
    config: S3Configure
    args: Array<Args>
    constructor(config: S3Configure) {
        this.config = config;
        this.args = new Array();
    }
    addArg(name: string, value: string):void {
        this.args.push(new Args(name, value));
    }
    toJson(): string {
        let encoder = new JSONEncoder();
        encoder.pushObject("");
        this.config.encodeJson(encoder);
        for (let i = 0; i < this.args.length; i++) {
            let arg = this.args[i];
            encoder.setString(arg.name, arg.value);
        }
        encoder.popObject();
        return encoder.toString()
    }
}

export class Bucket {
    
    bucketName: string
    s3config: S3Configure

    constructor(bucketName:string, s3config: S3Configure) {
        this.bucketName = bucketName
        this.s3config = s3config
    }

    list(prefix: string): Array<BucketListResponse>|null {
        let cmd = this.getBucketCommand();
        cmd.addArg("prefix", prefix);
        let command = cmd.toJson();
        let cmd_utf8_buf = String.UTF8.encode(command);
        let cmd_utf8_len = cmd_utf8_buf.byteLength;
        let cmd_ptr = changetype<usize>(cmd_utf8_buf);
        let handle_buf = memory.data(8);
        let rs = bucket_command(2, cmd_ptr, cmd_utf8_len, handle_buf);
        if (rs != SUCCESS) {
            return null;
        }
        let handle = load<u32>(handle_buf);
        let bs = getAllBody(handle);
        s3_close(handle);
        let json_str = String.UTF8.decodeUnsafe(bs!.dataStart, bs!.length);
        let jsonObj = <json.JSON.Arr>json.JSON.parse(json_str);
        let vals = jsonObj.valueOf();
        let result = new Array<BucketListResponse>();
        for (let i = 0; i < vals.length; i++) {
            let v = vals[i];
            if (v.isObj) {
                let obj = <json.JSON.Obj>v;
                let name_attr = obj.getString("name");
                let name = "";
                if (name_attr != null && !name_attr.isNull) {
                    let name_str = <json.JSON.Str>name_attr;
                    name = name_str.valueOf();
                }
                let is_truncated = obj.getBool("is_truncated");
                let prefix = obj.getString("is_truncated");
                let prefix_str: string|null = null;
                if (prefix != null)
                    prefix_str = prefix.toString();
                let resp = new BucketListResponse(name, prefix_str);
                if (is_truncated != null && is_truncated.isBool) {
                    let truncated = <json.JSON.Bool>is_truncated;
                    resp.setTruncated(truncated.valueOf());
                }
                let contents_arr = obj.getArr("contents");
                if (contents_arr != null  && contents_arr.isArr) {
                    let arr = (<json.JSON.Arr>contents_arr).valueOf();
                    for (let i = 0; i < arr.length; i++) {
                        let c = <json.JSON.Obj>arr[i];
                        let content = new BucketListContent();
                        let last_mod = c.getString("last_modified")!.valueOf();
                        content.last_modified = last_mod;
                        let e_tag = c.getString("e_tag");
                        if (e_tag != null)
                            content.e_tag = e_tag.valueOf();
                        content.key = c.getString("key")!.valueOf();
                        let storage_class = c.getString("storage_class");
                        if (storage_class != null)
                            content.storage_class = storage_class.valueOf();
                        content.size = c.getInteger("size")!.valueOf();
                        resp.contents.push(content);
                    }
                }
                result.push(resp);
            }
        }
        return result;
    }

    getObject(path: string): Array<u8>|null {
        let cmd = this.getBucketCommand();
        cmd.addArg("path", path);
        let command = cmd.toJson();
        let cmd_utf8_buf = String.UTF8.encode(command);
        let cmd_utf8_len = cmd_utf8_buf.byteLength;
        let cmd_ptr = changetype<usize>(cmd_utf8_buf);
        let handle_buf = memory.data(8);
        let rs = bucket_command(3, cmd_ptr, cmd_utf8_len, handle_buf);
        if (rs != SUCCESS) {
            return null;
        }
        let handle = load<u32>(handle_buf);
        let bs = getAllBody(handle);
        s3_close(handle);
        return bs;
    }

    getBucketCommand(): BucketCommand {
        let cmd = new BucketCommand(this.s3config);
        cmd.addArg("bucket_name", this.bucketName);
        return cmd;
    }

    putObject(path: string, content: Array<u8>): bool {
        let cmd = this.getBucketCommand();
        cmd.addArg("path", path);
        let buf = content;
        let command = cmd.toJson();
        let cmd_utf8_buf = String.UTF8.encode(command);
        let cmd_utf8_len = cmd_utf8_buf.byteLength;
        let cmd_ptr = changetype<usize>(cmd_utf8_buf);
        let buffer_ptr = changetype<usize>(buf.dataStart);
        let rs = bucket_put_object(cmd_ptr, cmd_utf8_len, buffer_ptr, buf.length);
        if (rs != SUCCESS)
            return false;
        return true;
    }

}

