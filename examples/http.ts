// The entry file of your WebAssembly.
import "wasi";

import { Console } from "as-wasi/assembly";
import { json, http } from "../assembly";

let handle: http.HttpHandle | null = http.HttpOpen(
  "http://httpbin.org/anything",
  new http.HttpHandleOptions("GET")
);

if (handle != null) {
  Console.log(`code:${handle!}`);
  Console.log(handle!.getHeader("Content-Type")!);
  let body = handle!.getAllBody()!;
  Console.log(`${body}`)
  
  let jsonObj = <json.JSON.Obj>json.JSON.parse(body);
  let kvs = jsonObj.valueOf();
  if (kvs != null) {
    let keys = kvs.keys();
    for (let i = 0;  i < keys.length; i++)  {
      let key = keys[i];
      Console.log(`${key}: ${kvs.get(key)}`);
    }
  }
  handle!.close();
}
