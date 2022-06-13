// The entry file of your WebAssembly module.
import "wasi"

import {Console} from "as-wasi/assembly"
import * as http from "./http"

let handle = http.HttpOpen("https://demo.bls.dev/tokens","{}");

Console.log(`code:${handle!}`)
Console.log(handle!.getHeader("Content-Type")!)
