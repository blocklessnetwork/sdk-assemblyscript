import "wasi";
import { Console } from "as-wasi/assembly";
import { CgiCommand, Env} from "../assembly/cgi";

let command = new CgiCommand("ls", ["-l", "."] ,[]);
let rs = command.exec();
Console.log(`${rs}`)