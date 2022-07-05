// The entry file of your WebAssembly.
import "wasi";

import { Console } from "as-wasi/assembly";
import { json, http } from "../assembly";

let handle: http.HttpHandle | null = http.HttpOpen(
  "https://demo.bls.dev/tokens",
  new http.HttpOptions("GET")
);

if (handle != null) {
  Console.log(`code:${handle!}`);
  Console.log(handle!.getHeader("Content-Type")!);
  let body = handle!.getAllBody()!;
  let jsonObj = <json.JSON.Obj>json.JSON.parse(body);
  let arr = jsonObj.getArr("tokens");
  if (arr != null) {
    let vals = arr.valueOf();
    vals.forEach((v) => {
      Console.log(v.toString());
    });
  }
  handle!.close();
}
