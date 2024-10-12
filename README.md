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

```js
// The entry file of your WebAssembly.
import "wasi";

import { Console } from "as-wasi/assembly";
import { http } from "@blockless/sdk";

const client = new http.Client();
const data = client.get("https://httpbin.org/json");

console.log(data.toString())
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
