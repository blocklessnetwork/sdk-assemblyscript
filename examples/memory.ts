import "wasi";
import { Console } from "as-wasi/assembly";
import { memory } from "../assembly";

let stdin = new memory.Stdin().read().toJSON();
if (stdin) {
  let results = stdin.get("results");
  if (results) {
    let newValue = Number.parseFloat(results.toString()) + 1000;
    Console.log("Hello " + newValue.toString());
  }
}
