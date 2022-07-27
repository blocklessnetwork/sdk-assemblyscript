import "wasi";
import { PutCommand, S3BucketList, S3BucketPutObject ,S3Configure} from "../assembly/awss3";
import { Console } from "as-wasi/assembly";


let s3_cfg = new S3Configure("fO2ksBwh3YJ6TKm9mJJJ", "5mT0XTyIoXfPxWOo5EDvgnNHgTxr5QgcsAINrzhJ", "https://i6e8.va12.idrivee2-9.com");

let bucketName = "akash-postgres-backup";
let success = S3BucketPutObject(new PutCommand(bucketName, "/test.file", [61,62,63,64,65,66]), s3_cfg)
Console.log(`put object ${success}`)
let rs = S3BucketList(bucketName, "/", s3_cfg);
Console.log(`${rs!}`);

