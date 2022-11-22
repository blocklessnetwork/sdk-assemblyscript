import "wasi";
import { Console } from "as-wasi/assembly";
import { CgiCommand, Env} from "../assembly/cgi";

let command = new CgiCommand("ls", ["-l", "."] ,[]);
let rs = command.exec();
if (rs == true) {
    let buf = new Array<u8>(1024);
    let l = command.stdoutRead(buf);
    Console.log(`read len:${l}`);
    let read_string = String.UTF8.decodeUnsafe(buf.dataStart, l);
    Console.log(read_string);
}