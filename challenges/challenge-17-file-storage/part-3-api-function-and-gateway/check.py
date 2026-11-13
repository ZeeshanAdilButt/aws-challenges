"""Check part 3: the role, the function, the API routes, the throttle, and one real upload through the API."""
import base64
import json

from lib.drive import API_FN, API_NAME, API_ROLE, Checker, api_base, client, get_file, http, safe

c = Checker("Part 3: API function and gateway")
iam, lam, gw = client("iam"), client("lambda"), client("apigatewayv2")

names = safe(lambda: iam.list_role_policies(RoleName=API_ROLE)["PolicyNames"], [])
c.check(f"role {API_ROLE} has the logs and api-access policies", {"logs", "api-access"} <= set(names),
        "put-role-policy twice: logs-policy.json and api-policy.json")
doc = safe(lambda: iam.get_role_policy(RoleName=API_ROLE, PolicyName="api-access")["PolicyDocument"], {})
text = json.dumps(doc)
c.check("the api-access policy has no wildcard action and does not mention the queue",
        bool(doc) and '"*"' not in text and ":*\"" not in text.replace("files/*", "") and "sqs" not in text,
        "use part-3-api-function-and-gateway/api-policy.json as it is")
fn = safe(lambda: lam.get_function(FunctionName=API_FN)["Configuration"], {})
c.check(f"function {API_FN} is Active and runs as {API_ROLE}",
        fn.get("State") == "Active" and fn.get("Role", "").endswith("/" + API_ROLE), "create the function and wait")

api = next((a for a in safe(lambda: gw.get_apis()["Items"], []) if a["Name"] == API_NAME), None)
c.check(f"HTTP API {API_NAME} exists", api is not None, "aws apigatewayv2 create-api ...")
if api:
    routes = {r["RouteKey"] for r in gw.get_routes(ApiId=api["ApiId"])["Items"]}
    want = {"GET /health", "POST /files", "GET /files", "GET /files/{id}", "GET /files/{id}/content", "DELETE /files/{id}"}
    c.check("all six routes exist", want <= routes, f"missing: {sorted(want - routes)}")
    stage = safe(lambda: gw.get_stage(ApiId=api["ApiId"], StageName="$default"), {})
    limits = stage.get("DefaultRouteSettings", {})
    c.check("the stage has a throttle (rate 20, burst 10)",
            limits.get("ThrottlingRateLimit") == 20 and limits.get("ThrottlingBurstLimit") == 10,
            "create-stage with --default-route-settings ThrottlingRateLimit=20,ThrottlingBurstLimit=10")
    base = api_base()
    status, body = http("GET", base + "/health")
    c.check("GET /health answers 200 through the gateway", status == 200 and body == {"ok": True},
            f"got {status} {body}. Did you run add-permission?")
    payload = {"name": "check-3.txt", "owner": "checker", "content_b64": base64.b64encode(b"part 3 works").decode()}
    status, body = http("POST", base + "/files", payload)
    ok = c.check("POST /files answers 201 with an id", status == 201 and "id" in body, f"got {status} {body}")
    if ok:
        rec = get_file(body["id"])
        c.check("the record is in the table", rec is not None and rec["name"] == "check-3.txt")
        status, _ = http("GET", f"{base}/files/{body['id']}")
        c.check("GET /files/{id} finds it", status == 200)
        status, _ = http("DELETE", f"{base}/files/{body['id']}")
        c.check("DELETE /files/{id} removes it", status == 200 and get_file(body["id"]) is None)
    status, _ = http("GET", base + "/files/nope")
    c.check("an unknown id answers 404", status == 404)
c.done()
