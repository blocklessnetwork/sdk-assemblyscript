// The entry file of your WebAssembly module.
import "wasi"

import {Console} from "as-wasi/assembly"
import {json, http} from "./assembly"

let handle = http.HttpOpen("https://demo.bls.dev/tokens", new http.HttpOptions("GET"));

Console.log(`code:${handle!}`)
Console.log(handle!.getHeader("Content-Type")!);
let jsonObj = <json.JSON.Obj>json.JSON.parse(handle!.getAllBody()!);
let arr = jsonObj.getArr("tokens");
if (arr != null) {
    let vals = arr!.valueOf();
    vals.forEach((v) => {
        Console.log(v.toString());
    })
}
