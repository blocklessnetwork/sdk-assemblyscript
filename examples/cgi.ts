import "wasi";
import { Console } from "as-wasi/assembly";
import { CgiCommand, Env} from "../assembly/cgi";
import { buffer2string} from "../assembly/strings";


function test_read_stdout(): void {
    let command = new CgiCommand("ls", ["-l", "."], null);
    let rs = command.exec();
    if (rs == true) {
        let buf = new Array<u8>(1024);
        let l = command.stdoutRead(buf);
        Console.log(`stdout readbytes len:${l}`);
        let read_string = buffer2string(buf, l);
        Console.log(read_string);
    }
    command.close();
}

function test_read_stderr(): void {
    let command = new CgiCommand("ls", ["-l", "/eeeee"], null);
    let rs = command.exec();
    if (rs == true) {
        let buf = new Array<u8>(1024);
        let l = command.stderrRead(buf);
        Console.log(`stderr readbytes len:${l}`);
        let read_string = buffer2string(buf, l);
        Console.log(read_string);
    }
    command.close();
}

//stdout test with the correct command.
test_read_stdout();

//stderr test with the error command.
test_read_stderr();