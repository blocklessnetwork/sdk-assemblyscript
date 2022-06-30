import "wasi"

import {Console} from "as-wasi/assembly"
import {json, ipfs} from "./assembly"

let files = ipfs.ipfsFileList();
if (files != null)
    Console.log(files!.toString());
