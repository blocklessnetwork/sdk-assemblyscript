import "wasi";
import { S3BucketList, S3Configure} from "../assembly/awss3";
import { Console } from "as-wasi/assembly";


let s3_cfg = new S3Configure("fO2ksBwh3YJ6TKm9mJJJ", "5mT0XTyIoXfPxWOo5EDvgnNHgTxr5QgcsAINrzhJ", "https://i6e8.va12.idrivee2-9.com");

let rs = S3BucketList("akash-postgres-backup", "/", s3_cfg);
Console.log(`${rs!}`);