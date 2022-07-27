import "wasi";
import { Bucket ,S3Configure} from "../assembly/awss3";
import { Console } from "as-wasi/assembly";


let s3_cfg = new S3Configure("fO2ksBwh3YJ6TKm9mJJJ", "5mT0XTyIoXfPxWOo5EDvgnNHgTxr5QgcsAINrzhJ", "https://i6e8.va12.idrivee2-9.com");

let bucketName = "akash-postgres-backup";
let bucket = new Bucket(bucketName, s3_cfg)
let success = bucket.putObject("/test.file", [61,62,63,64,65,66,79])
Console.log(`put object: ${success}`)
let rs = bucket.list("/");
Console.log(`${rs!}`);

