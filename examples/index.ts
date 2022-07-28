import "wasi";
import { Bucket ,S3Configure} from "../assembly/awss3";
import { Console } from "as-wasi/assembly";


let s3_cfg = new S3Configure("fO2ksBwh3YJ6TKm9mJJJ", "5mT0XTyIoXfPxWOo5EDvgnNHgTxr5QgcsAINrzhJ", "https://i6e8.va12.idrivee2-9.com");

let bucketName = "akash-postgres-backup";
let bucket = new Bucket(bucketName, s3_cfg)
//this is list bucket the parameter is prefix.
let rs = bucket.list("/");
Console.log(`${rs!}`);

let fileName = "/test.file" ;

//this is put the data to the path.
let success = bucket.putObject(fileName, [64,65,66,67,68,69,64,65,66])
Console.log(`put object: ${success}`)

//this is get the data from the path.
let obj = bucket.getObject(fileName);
if (obj != null) {
    let read_string = String.UTF8.decodeUnsafe(obj!.dataStart, obj!.length);
    Console.log(`get object: ` + read_string)
}
rs = bucket.list("/");
Console.log(`${rs!}`);

//this is delete the file in the bucket.
success = bucket.deleteObject(fileName)
Console.log(`delete object: ${success}`)