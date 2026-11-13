"""Check part 1: the bucket and the table exist and are set up as the README says."""
from lib.drive import BUCKET, TABLE, Checker, client, safe

c = Checker("Part 1: storage and data")
s3, ddb = client("s3"), client("dynamodb")

c.check(f"bucket {BUCKET} exists", safe(lambda: s3.head_bucket(Bucket=BUCKET)) is not None,
        "aws s3api create-bucket --bucket daftar-drive-files")
block = safe(lambda: s3.get_public_access_block(Bucket=BUCKET)["PublicAccessBlockConfiguration"], {})
c.check("the bucket blocks public access (all four settings)", block and all(block.values()),
        "run the put-public-access-block command")
table = safe(lambda: ddb.describe_table(TableName=TABLE)["Table"], {})
c.check(f"table {TABLE} is ACTIVE", table.get("TableStatus") == "ACTIVE", "create the table and wait for it")
c.check("the table key is id", [k["AttributeName"] for k in table.get("KeySchema", [])] == ["id"],
        "the key schema must be AttributeName=id,KeyType=HASH")
c.check("the table bills per request", table.get("BillingModeSummary", {}).get("BillingMode") == "PAY_PER_REQUEST",
        "use --billing-mode PAY_PER_REQUEST")
leftover = safe(lambda: s3.list_objects_v2(Bucket=BUCKET, Prefix="try/").get("KeyCount", 0), 0)
c.check("the try/ test file is removed", leftover == 0, "aws s3 rm s3://daftar-drive-files/try/hello.txt")
c.done()
