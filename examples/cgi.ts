import "wasi";
import { Console } from "as-wasi/assembly";
import { CgiCommand, Env} from "../assembly/cgi";
import { buffer2string, string2buffer} from "../assembly/strings";


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

function test_pwd(): void {
    let command = new CgiCommand("pwd", null, null);
    let rs = command.exec();
    if (rs == true) {
        let buf = new Array<u8>(1024);
        let l = command.stdoutRead(buf);
        Console.log(`stdout readbytes len:${l}`);
        let read_string = buffer2string(buf, l);
        Console.log(read_string);
        l = command.stdoutRead(buf);
        Console.log(`${l}`);
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

function test_simple_protocal_stream(): void {
    let command = new CgiCommand("/Users/join/Downloads/sdk-assemblyscript/examples/cgi/test_http", null, null);
    let rs = command.exec();
    if (rs == true) {
        let req = '{"Url":"http://www.163.com"}';
        let req_len = req.length;
        const SEP = "\r\n";
        let head = `${req_len}${SEP}`;
        command.stdinWriteString(head);
        command.stdinWriteString(`${req}${SEP}`);
        let buf = new Array<u8>(1024);
        let l = command.stdoutRead(buf);
        Console.log(`.163.com readbytes len:${l}`);
        let read_string = buffer2string(buf, l);
        Console.log(read_string);

        req = '{"Url":"http://www.bing.com"}';
        req_len = req.length;
        head = `${req_len}${SEP}`;
        command.stdinWriteString(head);
        command.stdinWriteString(`${req}${SEP}`);
        buf = new Array<u8>(1024);
        l = command.stdoutRead(buf);
        Console.log(`bing.com readbytes len:${l}`);
        read_string = buffer2string(buf, l);
        Console.log(read_string);
    }
    command.close();
}

//stdout test with the correct command.
test_read_stdout();

//stderr test with the error command.
test_read_stderr();

test_pwd();

test_simple_protocal_stream();