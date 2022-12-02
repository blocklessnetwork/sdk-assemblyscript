import "wasi";
import { Console } from "as-wasi/assembly";
import { CgiCommand, Env} from "../assembly/cgi";
import { buffer2string, string2buffer, arrayIndex} from "../assembly/strings";


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

function test_simple_protocol_for_req_stream(): void {
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

        req = '{"Url":"http://www.baidu.com"}';
        req_len = req.length;
        head = `${req_len}${SEP}`;
        command.stdinWriteString(head);
        command.stdinWriteString(`${req}${SEP}`);
        buf = new Array<u8>(1024);
        l = command.stdoutRead(buf);
        Console.log(`baidu.com readbytes len:${l}`);
        read_string = buffer2string(buf, l);
        Console.log(read_string);
    }
    command.close();
}



function test_simple_protocol_full_stream(): void {
    let command = new CgiCommand("/Users/join/Downloads/sdk-assemblyscript/examples/cgi/test_http_with_resp_protocol", null, null);
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
        let body_len_idx = arrayIndex(buf, [13, 10]);
        let body_len_buf = buf.slice(0, body_len_idx);
        let body_len = parseInt(buffer2string(body_len_buf, body_len_buf.length)) as i32;
        Console.log(`protocol len: ${body_len}`);
        let body = buf.slice(body_len_idx + 2, body_len + body_len_idx + 2)
        let read_string = buffer2string(body, body.length);
        

        Console.log(read_string);

        req = '{"Url":"http://www.baidu.com"}';
        req_len = req.length;
        head = `${req_len}${SEP}`;
        command.stdinWriteString(head);
        command.stdinWriteString(`${req}${SEP}`);
        buf = new Array<u8>(1024);
        l = command.stdoutRead(buf);
        
        Console.log(`baidu.com readbytes len:${l}`);
        body_len_idx = arrayIndex(buf, [13, 10]);
        body_len_buf = buf.slice(0, body_len_idx);
        body_len = parseInt(buffer2string(body_len_buf, body_len_buf.length)) as i32;
        Console.log(`protocol len: ${body_len}`);
        body = buf.slice(body_len_idx + 2, body_len + body_len_idx + 2)
        buffer2string(body, body.length);
        read_string = buffer2string(body, body.length);
        

        Console.log(read_string);
    }
    command.close();
}

//stdout test with the correct command.
test_read_stdout();

//stderr test with the error command.
test_read_stderr();

test_pwd();

test_simple_protocol_for_req_stream();

test_simple_protocol_full_stream();