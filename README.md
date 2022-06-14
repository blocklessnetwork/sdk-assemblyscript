# Blockless-sdk-assembly-script

![](blockless.png)

This is blockless sandbox assembly-script sdk, we can use it develop the app with the typescript.

The sdk is work with assembly-script, built-in json tools and http tools.

The example for http request run in blockless sandbox.

```ts
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
```

### How to compile

1. npm install the node modules dependencies.

```bash
$ npm install
```

2. run the compile command.

```bash
$ npm run build:release
```
