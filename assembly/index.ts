// The entry file of your WebAssembly module.
import "wasi"

import {Console} from "as-wasi/assembly"
import * as http from "./http"

let rs = http.HttpOpen("https://demo.bls.dev/tokens","{}");

Console.log(`code:${rs!}`)
