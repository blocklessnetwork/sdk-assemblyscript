import { JSON } from "../json";
import { HttpHandle, HttpOptions, HttpOpen } from "./handler";
import { HttpStdin } from "./stdin";

class ClientOptions {
	public baseUrl: string;
	public headers: Map<string, string>;

	constructor(baseUrl: string, headers: Map<string, string>) {
		this.baseUrl = baseUrl;
		this.headers = headers;
	}

	public getHeaders(): string {
		const obj = new JSON.Obj();
		const keys = this.headers.keys();

		for (let i = 0; i < this.headers.size; i++) {
			obj.set(keys[i], this.headers.get(keys[i]));
		}

		return obj.toString();
	}
}

class Client {
	options: ClientOptions;

	constructor(options: ClientOptions = new ClientOptions("", new Map())) {
		this.options = options;
	}

	private formatUrl(url: string): string {
		return this.options.baseUrl ? this.options.baseUrl + url : url;
	}

	get(url: string): JSON.Obj {
		const options = new HttpOptions("GET");
		options.headers = this.options.getHeaders();

		return Client.request(this.formatUrl(url), options);
	}

	getList(url: string): JSON.Arr {
		const options = new HttpOptions("GET");
		options.headers = this.options.getHeaders();

		return Client.requestList(this.formatUrl(url), options);
	}

	post(url: string, body: string): JSON.Obj {
		const options = new HttpOptions("POST");
		options.headers = this.options.getHeaders();

		if (body) options.body = body;

		return Client.request(this.formatUrl(url), options);
	}

	static requestList(url: string, options: HttpOptions): JSON.Arr {
		let body: string | null = null;
		let response: JSON.Arr = <JSON.Arr>JSON.parse("[]");
		const handle: HttpHandle | null = HttpOpen(url, options);

		if (handle != null) {
			body = handle.getAllBody()!;
			handle.close();

			// TODO: Parse non JSON content types as well
			if (body) {
				response = <JSON.Arr>JSON.parse(body);
			}
		}

		return response;
	}

	static request(url: string, options: HttpOptions): JSON.Obj {
		let body: string | null = null;
		let response: JSON.Obj = <JSON.Obj>JSON.parse("{}");
		const handle: HttpHandle | null = HttpOpen(url, options);

		if (handle != null) {
			body = handle.getAllBody()!;
			handle.close();

			// TODO: Parse non JSON content types as well
			if (body) {
				response = <JSON.Obj>JSON.parse(body);
			}
		}

		return response;
	}
}

class Request {
	public url: string;
	public method: string;
	public headers: Map<string, string>;
	public query: Map<string, string>;
	public body: string | null;

	constructor(
		method: string,
		url: string,
		query: Map<string, string>,
		headers: Map<string, string>,
		body: string,
	) {
		this.method = method;
		this.url = url;
		this.query = query;
		this.headers = headers;
		this.body = !!body ? body : null;
	}
}

class Response {
	public code: u32 = 200;
	public headers: Map<string, string>;
	public body: string = "";

	constructor(body: string = "") {
		this.body = body;
		this.headers = new Map();
	}

	status(code: u32): Response {
		this.code = code;

		return this;
	}

	header(key: string, value: string): Response {
		this.headers.set(key, value);

		return this;
	}

	getHeaders(): string {
		const obj = new JSON.Obj();
		const keys = this.headers.keys();

		for (let i = 0; i < this.headers.size; i++) {
			obj.set(keys[i], this.headers.get(keys[i]));
		}

		return obj.toString();
	}

	toJSON(): JSON.Obj {
		const obj = new JSON.Obj();
		obj.set("code", this.code.toString());
		obj.set("body", this.body);
		obj.set("headers", this.getHeaders());

		return obj;
	}

	toString(): string {
		let content = "";

		content = this.body;

		return content;
	}
}

class HttpComponent {
	static serve(handler: (request: Request) => Response): void {
		HttpStdin.initalize();

		// Build request
		const request = new Request(
			HttpStdin.method,
			HttpStdin.path,
			HttpStdin.query,
			HttpStdin.headers,
			HttpStdin.body,
		);

		// Call handler, generate response
		const response = handler(request);

		// Encode body into buffer
		if (response && response.body) {
			process.stdout.write(response.toString());
		}
	}

	static getRequest(): Request {
		HttpStdin.initalize();

		// Build request
		return new Request(
			HttpStdin.method,
			HttpStdin.path,
			HttpStdin.query,
			HttpStdin.headers,
			HttpStdin.body,
		);
	}

	static send(response: Response): void {
		// Encode body into buffer
		if (response && response.body) {
			process.stdout.write(response.toString());
		}
	}
}

export {
	HttpHandle,
	HttpOptions,
	HttpOpen,
	Client,
	ClientOptions,
	HttpComponent,
	Request,
	Response,
};
