// The entry file of your WebAssembly module.
import "wasi"

import {Console} from "as-wasi/assembly"
import * as http from "./assembly"

let handle = http.HttpOpen("https://demo.bls.dev/tokens", new http.HttpOptions("GET"));

Console.log(`code:${handle!}`)
Console.log(handle!.getHeader("Content-Type")!)
Console.log(handle!.getAllBody()!)
