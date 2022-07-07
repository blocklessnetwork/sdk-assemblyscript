import "wasi";

import { Console } from "as-wasi/assembly";
import { json, ipfs } from "../assembly";
import { FileWriteOptions } from "../assembly/ipfs";

let files = ipfs.ipfsFileList("/");
if (files != null)
    Console.log(`remove ${files!.toString()}`);
let is_rm = ipfs.ipfsFileRemove("/1", true, true);
Console.log(`remove ${is_rm}`);

let is_rm_2 = ipfs.ipfsFileRemove("/2", true, true);
Console.log(`remove2 ${is_rm}`);

let is_create = ipfs.ipfsCreateDir("/1", true);
Console.log(`crate dir "/1" ${is_create}`);

if (files != null) Console.log(`${files!}`);

let wopts = new FileWriteOptions("/2.txt");
let is_write = ipfs.ipfsFileWrite(wopts, [65,66, 67, 68, 69, 70]);
Console.log(`write file "/1" ${is_write}`)

