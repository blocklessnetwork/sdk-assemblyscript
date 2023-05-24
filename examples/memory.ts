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

let envVars = new memory.EnvVars().read().toJSON();
if (envVars) {
  let environmentValue = envVars.get("ENV_VAR_NAME");
  if (environmentValue) {
    Console.log("Hello " + environmentValue.toString());
  }
}
