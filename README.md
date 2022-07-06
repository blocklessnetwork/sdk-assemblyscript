# blockless-sdk-assembly-script

![](blockless.png)

** This sdk is configured to work with `assembly-script`. **

## It currently has built in support for

- json
- http
- ipfs

## Install this SDK

This module can be installed into any existing project. New projects should use `@blockless/app` to start a fresh `WASM` module.

```bash
$ yarn add @blockless/sdk
# or using npm
$ npm i @blockless/sdk
```

## Example of using this SDK.

```ts
// The entry file of your WebAssembly.
import "wasi";

import { Console } from "as-wasi/assembly";
import { json, http } from "@blockless/sdk";

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
```

### How to build

Use `asc` to build the `typescript` source into a deployable `WASM` file.

```bash
$ asc examples/index.ts --target release
```

Shortcuts for a few examples are available in the `package.json` of this module.

```bash
$ yarn build:example:debug
```
