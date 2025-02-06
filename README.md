# Blockless SDK for AssemblyScript

![](blockless.png)

**This SDK is configured to work with `AssemblyScript`.**

## Built-in Support for

- `cgi`
- `http`
- `ipfs`
- `llm`

## Install This SDK

This module can be installed into any existing project. For new projects, use `@blockless/app` to start a fresh `WASM` module.

```bash
npm install @blockless/sdk
# Or using Deno
deno add @blockless/sdk
```

## Example Usage

```js
// The entry file of your WebAssembly.
import "wasi";

import { Console } from "as-wasi/assembly";
import { http } from "@blockless/sdk";

const client = new http.Client();
const data = client.get("https://httpbin.org/json");

console.log(data.toString())
```

### How to Build

Use `asc` to build the `TypeScript` source into a deployable `WASM` file.

```bash
asc examples/index.ts --target release
```

Shortcuts for a few examples are available in the `package.json` of this module.

```bash
deno run build:example:debug
```