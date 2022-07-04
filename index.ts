import "wasi"

import {Console} from "as-wasi/assembly"
import {json, ipfs} from "./assembly"

let files = ipfs.ipfsFileList("/");
let is_rm = ipfs.ipfsFileRemove("/1", true, true);
Console.log(`remove ${is_rm}`)
let is_create = ipfs.ipfsCreateDir("/1", true);
Console.log(`crate dir "/1" ${is_create}`)
if (files != null)
    Console.log(`${files!}`);
