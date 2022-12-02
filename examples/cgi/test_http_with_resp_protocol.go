package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"strconv"
)

type HttpRequest struct {
	Url    string
	Method string
}

const LINE_END string = "\r\n"

func main() {
	var buf []byte
	var err error
	reader := bufio.NewReader(os.Stdin)
	//protocol is simple
	// number for len\r\nbody\r\n
	for {
		var b_len int
		//head for the body len
		if buf, _, err = reader.ReadLine(); err != nil {
			panic(err)
		}

		if b_len, err = strconv.Atoi(string(buf)); err != nil {
			panic(err)
		}
		//body
		if buf, err = ioutil.ReadAll(io.LimitReader(reader, int64(b_len))); err != nil {
			panic(err)
		}
		var req HttpRequest
		var resp *http.Response
		if err = json.Unmarshal(buf, &req); err != nil {
			panic(err)
		}
		if resp, err = http.Get(req.Url); err != nil {
			panic(err)
		}
		if buf, err = ioutil.ReadAll(resp.Body); err != nil {
			panic(err)
		}
		//Use the simple protocol for wrap the resp
		//len of body\r\nbody\r\n
		head := fmt.Sprintf("%d%s", len(buf), LINE_END)
		os.Stdout.Write([]byte(head))
		if os.Stdout.Write(buf); err != nil {
			panic(err)
		}
		os.Stdout.Write([]byte(LINE_END))
		//end
		if buf, _, err = reader.ReadLine(); err != nil {
			panic(err)
		}
	}

}
