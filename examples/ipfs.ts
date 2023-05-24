import { Console } from "as-wasi/assembly";
import { json, ipfs } from "../assembly";
import { FileWriteOptions } from "../assembly/ipfs";

let files = ipfs.ipfsFileList("/");
if (files != null)
    Console.log(`remove ${files!.toString()}`);
let is_rm = ipfs.ipfsFileRemove("/1", true, true);
Console.log(`remove ${is_rm}`);

//this file or directory remove example
let is_rm_2 = ipfs.ipfsFileRemove("/2", true, true);
Console.log(`remove2 ${is_rm}`);

//this directory create example
let is_create = ipfs.ipfsCreateDir("/1", true);
Console.log(`crate dir "/1" ${is_create}`);

if (files != null) Console.log(`${files!}`);

//this file write example
let filename = "/2.txt";
let wopts = new FileWriteOptions(filename);
let is_write = ipfs.ipfsFileWrite(wopts, [65,66, 67, 68, 69, 70]);
Console.log(`write file "${filename}" ${is_write}`)

//this file read example
let buf = new Array<u8>(1024);
let readn = ipfs.ipfsFileRead(filename, 0, buf);
let read_string = String.UTF8.decodeUnsafe(buf.dataStart, readn);
Console.log(`read n: "${readn}" value: "${read_string}"`)

//this file stat example.
let fstat = ipfs.ipfsFileStat(filename);
if (fstat != null)
    Console.log(`filestat file "${filename}" ${fstat!.toString()}`)
