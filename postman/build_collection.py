"""
Generates postman/HustleHub-Part2.postman_collection.json.
Kept as a script so every request follows the same conventions.
Run: python3 postman/build_collection.py
"""
import json, os

def req(name, method, path, body=None, auth=None, tests=(), prereq=(), headers=None):
    h = [{"key": "Content-Type", "value": "application/json"}] if body is not None else []
    if auth:
        h.append({"key": "Authorization", "value": f"Bearer {{{{{auth}}}}}"})
    if headers:
        h += [{"key": k, "value": v} for k, v in headers.items()]
    item = {
        "name": name,
        "event": [],
        "request": {
            "method": method,
            "header": h,
            "url": {"raw": "{{baseUrl}}" + path, "host": ["{{baseUrl}}"], "path": [p for p in path.split("?")[0].strip("/").split("/")]},
        },
    }
    if "?" in path:
        item["request"]["url"]["query"] = [
            {"key": kv.split("=")[0], "value": kv.split("=")[1]} for kv in path.split("?")[1].split("&")
        ]
    if body is not None:
        item["request"]["body"] = {"mode": "raw", "raw": json.dumps(body, indent=2) if not isinstance(body, str) else body}
    if tests:
        item["event"].append({"listen": "test", "script": {"type": "text/javascript", "exec": list(tests)}})
    if prereq:
        item["event"].append({"listen": "prerequest", "script": {"type": "text/javascript", "exec": list(prereq)}})
    return item

def status(code):
    return f"pm.test('Status code is {code}', () => pm.response.to.have.status({code}));"

ENVELOPE_FAIL = [
    "pm.test('Error uses the safe envelope (success=false, message, nothing internal)', () => {",
    "  const j = pm.response.json();",
    "  pm.expect(j.success).to.eql(false);",
    "  pm.expect(j.message).to.be.a('string');",
    "  const raw = JSON.stringify(j);",
    "  pm.expect(raw).to.not.match(/\\.js:\\d+|stack|node_modules|Mongo|Cast to/i);",
    "});",
]
ENVELOPE_OK = [
    "pm.test('Success envelope', () => { const j = pm.response.json(); pm.expect(j.success).to.eql(true); pm.expect(j.data).to.be.an('object'); });",
]
NO_PASSWORD = "pm.test('Password hash never returned', () => pm.expect(pm.response.text()).to.not.include('$2a$'));"

def fail(code, extra=()):
    return [status(code), *ENVELOPE_FAIL, *extra]

def ok(code, extra=()):
    return [status(code), *ENVELOPE_OK, *extra]

def msg_match(pattern):
    return f"pm.test('Message explains the problem', () => pm.expect(pm.response.json().message).to.match({pattern}));"

def save(var, expr):
    return f"pm.collectionVariables.set('{var}', {expr});"

STRONG = "StrongP@ss1"

# ---------------------------------------------------------------- 0 Setup
setup = {
    "name": "0. Setup (unique users per run)",
    "item": [
        req("Health check", "GET", "/health", tests=ok(200) if False else [status(200), "pm.test('API running', () => pm.expect(pm.response.json().success).to.eql(true));"],
            prereq=[
                "// Unique suffix so the collection can be run repeatedly against the same database",
                "const run = Date.now().toString(36);",
                "pm.collectionVariables.set('run', run);",
                "pm.collectionVariables.set('freelancerEmail', `freelancer_${run}@example.com`);",
                "pm.collectionVariables.set('freelancer2Email', `freelancer2_${run}@example.com`);",
                "pm.collectionVariables.set('clientEmail', `client_${run}@example.com`);",
                "pm.collectionVariables.set('floodEmail', `flood_${run}@example.com`);",
            ]),
        req("Register freelancer", "POST", "/auth/register",
            body={"username": "fl_{{run}}", "email": "{{freelancerEmail}}", "password": STRONG, "role": "freelancer"},
            tests=ok(201, [NO_PASSWORD,
                "pm.test('Role is freelancer and token returned', () => { const d = pm.response.json().data; pm.expect(d.user.role).to.eql('freelancer'); pm.expect(d.token).to.be.a('string'); });",
                save("freelancerToken", "pm.response.json().data.token"),
                save("freelancerId", "pm.response.json().data.user.id")])),
        req("Register second freelancer (used for ownership tests)", "POST", "/auth/register",
            body={"username": "fl2_{{run}}", "email": "{{freelancer2Email}}", "password": STRONG, "role": "freelancer"},
            tests=ok(201, [save("freelancer2Token", "pm.response.json().data.token"), save("freelancer2Id", "pm.response.json().data.user.id")])),
        req("Register client (role omitted defaults to client)", "POST", "/auth/register",
            body={"username": "cl_{{run}}", "email": "{{clientEmail}}", "password": STRONG},
            tests=ok(201, ["pm.test('Defaults to client role', () => pm.expect(pm.response.json().data.user.role).to.eql('client'));"])),
        req("Login client", "POST", "/auth/login", body={"email": "{{clientEmail}}", "password": STRONG},
            tests=ok(200, [NO_PASSWORD,
                "pm.test('JWT has three parts and carries sub/role/iss/aud', () => {",
                "  const t = pm.response.json().data.token; const parts = t.split('.'); pm.expect(parts).to.have.length(3);",
                "  const header = JSON.parse(atob(parts[0].replace(/-/g,'+').replace(/_/g,'/')));",
                "  const p = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));",
                "  pm.expect(header.alg).to.eql('HS256');",
                "  pm.expect(p).to.include.keys('sub','role','iss','aud','exp');",
                "  pm.expect(p).to.not.have.property('email'); pm.expect(p).to.not.have.property('password');",
                "});",
                save("clientToken", "pm.response.json().data.token"),
                save("clientId", "pm.response.json().data.user.id")])),
        req("Login admin (seeded account)", "POST", "/auth/login", body={"email": "{{adminEmail}}", "password": "{{adminPassword}}"},
            tests=ok(200, ["pm.test('Role is admin', () => pm.expect(pm.response.json().data.user.role).to.eql('admin'));",
                           save("adminToken", "pm.response.json().data.token")])),
    ],
}

# ---------------------------------------------------------------- 1 Auth edge cases
auth = {
    "name": "1. Authentication - invalid scenarios",
    "item": [
        req("Register - duplicate email (409)", "POST", "/auth/register",
            body={"username": "dup_{{run}}", "email": "{{clientEmail}}", "password": STRONG}, tests=fail(409)),
        req("Register - missing fields (400)", "POST", "/auth/register", body={"email": "nobody@example.com"},
            tests=fail(400, [msg_match("/Username is required/")])),
        req("Register - weak password (400)", "POST", "/auth/register",
            body={"username": "weak_{{run}}", "email": "weak_{{run}}@example.com", "password": "password"},
            tests=fail(400, [msg_match("/uppercase|number|special/")])),
        req("Register - self-assign admin role (400)", "POST", "/auth/register",
            body={"username": "evil_{{run}}", "email": "evil_{{run}}@example.com", "password": STRONG, "role": "admin"},
            tests=fail(400, [msg_match("/client.*freelancer/")])),
        req("Register - unexpected field rejected (400) [Part 1 fix]", "POST", "/auth/register",
            body={"username": "mass_{{run}}", "email": "mass_{{run}}@example.com", "password": STRONG, "isAdmin": True},
            tests=fail(400, [msg_match("/unexpected field/")])),
        req("Register - script in username (400)", "POST", "/auth/register",
            body={"username": "<script>alert(1)</script>", "email": "xss_{{run}}@example.com", "password": STRONG},
            tests=fail(400)),
        req("Login - unexpected field rejected (400) [Part 1 fix]", "POST", "/auth/login",
            body={"email": "{{clientEmail}}", "password": STRONG, "rememberMe": True}, tests=fail(400, [msg_match("/unexpected field/")])),
        req("Login - NoSQL operator injection (400)", "POST", "/auth/login",
            body={"email": {"$gt": ""}, "password": {"$ne": ""}}, tests=fail(400)),
        req("Login - wrong password (401, generic message)", "POST", "/auth/login",
            body={"email": "{{clientEmail}}", "password": "WrongP@ss1"}, tests=fail(401, [msg_match("/^Invalid email or password\\.$/")])),
        req("Login - unknown email (401, same message)", "POST", "/auth/login",
            body={"email": "ghost_{{run}}@example.com", "password": STRONG}, tests=fail(401, [msg_match("/^Invalid email or password\\.$/")])),
        req("Login - malformed JSON (400)", "POST", "/auth/login", body='{"email": "a@b.co", ', tests=fail(400, [msg_match("/not valid JSON/")])),
        req("Profile - valid token (200)", "GET", "/auth/profile", auth="clientToken", tests=ok(200, [NO_PASSWORD])),
        req("Profile - no token (401)", "GET", "/auth/profile", tests=fail(401)),
        req("Profile - tampered token (401)", "GET", "/auth/profile", auth="tamperedToken", tests=fail(401),
            prereq=["// Flip the role inside the payload without re-signing",
                    "const [h,p,s] = pm.collectionVariables.get('clientToken').split('.');",
                    "const payload = JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/')));",
                    "payload.role = 'admin';",
                    "const enc = btoa(JSON.stringify(payload)).replace(/=+$/,'').replace(/\\+/g,'-').replace(/\\//g,'_');",
                    "pm.collectionVariables.set('tamperedToken', `${h}.${enc}.${s}`);"]),
        req("Profile - unsigned alg:none token (401) [Part 1 fix]", "GET", "/auth/profile", auth="noneToken", tests=fail(401),
            prereq=["const b64 = (o) => btoa(JSON.stringify(o)).replace(/=+$/,'').replace(/\\+/g,'-').replace(/\\//g,'_');",
                    "pm.collectionVariables.set('noneToken', b64({alg:'none',typ:'JWT'}) + '.' + b64({sub: pm.collectionVariables.get('clientId'), role:'admin', iss:'hustlehub-plus-api', aud:'hustlehub-plus-client'}) + '.');"]),
    ],
}

# ---------------------------------------------------------------- 2 Gigs
GIG = {"title": "Logo design for small businesses", "description": "I will design a clean, modern logo with three concepts and two rounds of revisions.",
       "category": "design", "price": 850, "deliveryDays": 5}
gigs = {
    "name": "2. Gigs - CRUD, ownership and validation",
    "item": [
        req("Create gig - freelancer (201)", "POST", "/gigs", auth="freelancerToken", body=GIG,
            tests=ok(201, ["pm.test('Owner is the logged-in freelancer', () => pm.expect(pm.response.json().data.gig.freelancer).to.eql(pm.collectionVariables.get('freelancerId')));",
                           save("gigId", "pm.response.json().data.gig.id")])),
        req("Create gig - HTML/script is stripped (201)", "POST", "/gigs", auth="freelancerToken",
            body={**GIG, "title": "<script>alert('xss')</script>Website copywriting", "description": "Clear website copy <img src=x onerror=alert(1)> that converts visitors.", "category": "writing", "price": 1200},
            tests=ok(201, ["pm.test('No HTML stored', () => { const g = pm.response.json().data.gig; pm.expect(g.title).to.eql('Website copywriting'); pm.expect(g.description).to.not.match(/[<>]|onerror/); });",
                           save("gig2Id", "pm.response.json().data.gig.id")])),
        req("Create gig - client role forbidden (403)", "POST", "/gigs", auth="clientToken", body=GIG, tests=fail(403)),
        req("Create gig - no token (401)", "POST", "/gigs", body=GIG, tests=fail(401)),
        req("Create gig - invalid values (400)", "POST", "/gigs", auth="freelancerToken",
            body={**GIG, "price": -5, "category": "hacking", "deliveryDays": 0}, tests=fail(400, [msg_match("/Price|Category|Delivery/")])),
        req("Create gig - price with 3 decimals (400)", "POST", "/gigs", auth="freelancerToken", body={**GIG, "price": 10.999}, tests=fail(400)),
        req("Create gig - cannot set owner (400)", "POST", "/gigs", auth="freelancerToken",
            body={**GIG, "freelancer": "{{freelancer2Id}}"}, tests=fail(400, [msg_match("/unexpected field/")])),
        req("Browse gigs - client (200)", "GET", "/gigs", auth="clientToken",
            tests=ok(200, ["pm.test('Returns gigs with pagination', () => { const d = pm.response.json().data; pm.expect(d.gigs).to.be.an('array').that.is.not.empty; pm.expect(d.pagination).to.include.keys('page','total'); });",
                           "pm.test('Only active gigs listed', () => pm.response.json().data.gigs.forEach(g => pm.expect(g.isActive).to.eql(true)));",
                           "pm.test('Freelancer email not exposed', () => pm.response.json().data.gigs.forEach(g => pm.expect(g.freelancer).to.not.have.property('email')));"])),
        req("Browse gigs - search + category filter (200)", "GET", "/gigs?search=logo&category=design", auth="clientToken",
            tests=ok(200, ["pm.test('Filter applied', () => pm.response.json().data.gigs.forEach(g => pm.expect(g.category).to.eql('design')));"])),
        req("Browse gigs - unknown query param (400)", "GET", "/gigs?debug=true", auth="clientToken", tests=fail(400)),
        req("Browse gigs - limit too high (400)", "GET", "/gigs?limit=5000", auth="clientToken", tests=fail(400)),
        req("Get gig by id (200)", "GET", "/gigs/{{gigId}}", auth="clientToken", tests=ok(200)),
        req("Get gig - invalid id format (400)", "GET", "/gigs/not-an-id", auth="clientToken", tests=fail(400)),
        req("Get gig - non-existent id (404)", "GET", "/gigs/000000000000000000000000", auth="clientToken", tests=fail(404)),
        req("My gigs - freelancer (200)", "GET", "/gigs/mine", auth="freelancerToken",
            tests=ok(200, ["pm.test('Only own gigs', () => pm.response.json().data.gigs.forEach(g => pm.expect(g.freelancer).to.eql(pm.collectionVariables.get('freelancerId'))));"])),
        req("My gigs - client forbidden (403)", "GET", "/gigs/mine", auth="clientToken", tests=fail(403)),
        req("Update own gig (200)", "PATCH", "/gigs/{{gigId}}", auth="freelancerToken", body={"price": 900, "deliveryDays": 4},
            tests=ok(200, ["pm.test('Price updated', () => pm.expect(pm.response.json().data.gig.price).to.eql(900));"])),
        req("Update gig - empty body (400)", "PATCH", "/gigs/{{gigId}}", auth="freelancerToken", body={}, tests=fail(400)),
        req("Update gig - another freelancer's gig (404, no IDOR)", "PATCH", "/gigs/{{gigId}}", auth="freelancer2Token", body={"price": 1}, tests=fail(404)),
        req("Delete gig - another freelancer's gig (404, no IDOR)", "DELETE", "/gigs/{{gigId}}", auth="freelancer2Token", tests=fail(404)),
        req("Delete gig - client forbidden (403)", "DELETE", "/gigs/{{gigId}}", auth="clientToken", tests=fail(403)),
        req("Pause own gig (200)", "PATCH", "/gigs/{{gig2Id}}", auth="freelancerToken", body={"isActive": False}, tests=ok(200)),
        req("Paused gig hidden from clients (404)", "GET", "/gigs/{{gig2Id}}", auth="clientToken", tests=fail(404)),
        req("Delete own gig (200)", "DELETE", "/gigs/{{gig2Id}}", auth="freelancerToken", tests=ok(200)),
        req("Deleted gig is gone (404)", "GET", "/gigs/{{gig2Id}}", auth="freelancerToken", tests=fail(404)),
    ],
}

# ---------------------------------------------------------------- 3 Bookings
bookings = {
    "name": "3. Bookings and transaction recording",
    "item": [
        req("Create booking - client (201) creates transaction", "POST", "/bookings", auth="clientToken",
            body={"gigId": "{{gigId}}", "notes": "Please use blue and gold. <script>alert(1)</script>"},
            tests=ok(201, [
                "const d = pm.response.json().data;",
                "pm.test('Booking linked to client and freelancer', () => { pm.expect(d.booking.client).to.eql(pm.collectionVariables.get('clientId')); pm.expect(d.booking.freelancer).to.eql(pm.collectionVariables.get('freelancerId')); });",
                "pm.test('Amount taken from the gig, not the request', () => pm.expect(d.booking.amount).to.eql(900));",
                "pm.test('Notes sanitised', () => pm.expect(d.booking.notes).to.not.include('<'));",
                "pm.test('Transaction recorded for this booking', () => { pm.expect(d.transaction.booking).to.eql(d.booking.id); pm.expect(d.transaction.reference).to.match(/^HH-/); pm.expect(d.transaction.paymentMethod).to.eql('simulated'); });",
                "pm.test('Fee and earnings add up', () => pm.expect(d.transaction.platformFee + d.transaction.freelancerEarnings).to.be.closeTo(d.transaction.amount, 0.01));",
                save("bookingId", "d.booking.id"), save("transactionRef", "d.transaction.reference")])),
        req("Create booking - freelancer forbidden (403)", "POST", "/bookings", auth="freelancerToken", body={"gigId": "{{gigId}}"}, tests=fail(403)),
        req("Create booking - admin forbidden (403)", "POST", "/bookings", auth="adminToken", body={"gigId": "{{gigId}}"}, tests=fail(403)),
        req("Create booking - price tampering rejected (400)", "POST", "/bookings", auth="clientToken", body={"gigId": "{{gigId}}", "amount": 1}, tests=fail(400, [msg_match("/unexpected field/")])),
        req("Create booking - missing gigId (400)", "POST", "/bookings", auth="clientToken", body={}, tests=fail(400)),
        req("Create booking - deleted gig (404)", "POST", "/bookings", auth="clientToken", body={"gigId": "{{gig2Id}}"}, tests=fail(404)),
        req("Create booking - no token (401)", "POST", "/bookings", body={"gigId": "{{gigId}}"}, tests=fail(401)),
        req("My bookings - client (200)", "GET", "/bookings/mine", auth="clientToken",
            tests=ok(200, ["pm.test('Contains the new booking', () => pm.expect(pm.response.json().data.bookings.map(b => b.id)).to.include(pm.collectionVariables.get('bookingId')));"])),
        req("My bookings - freelancer sees bookings received (200)", "GET", "/bookings/mine", auth="freelancerToken",
            tests=ok(200, ["pm.test('Contains the booking on their gig', () => pm.expect(pm.response.json().data.bookings.map(b => b.id)).to.include(pm.collectionVariables.get('bookingId')));"])),
        req("My bookings - other freelancer sees none of it (200)", "GET", "/bookings/mine", auth="freelancer2Token",
            tests=ok(200, ["pm.test('Does not contain other people\\'s booking', () => pm.expect(pm.response.json().data.bookings.map(b => b.id)).to.not.include(pm.collectionVariables.get('bookingId')));"])),
        req("Get booking - client owner (200)", "GET", "/bookings/{{bookingId}}", auth="clientToken",
            tests=ok(200, ["pm.test('Includes its transaction', () => pm.expect(pm.response.json().data.transaction.reference).to.eql(pm.collectionVariables.get('transactionRef')));"])),
        req("Get booking - unrelated freelancer (404, no IDOR)", "GET", "/bookings/{{bookingId}}", auth="freelancer2Token", tests=fail(404)),
        req("All bookings - client forbidden (403)", "GET", "/bookings", auth="clientToken", tests=fail(403)),
        req("All bookings - admin (200)", "GET", "/bookings", auth="adminToken", tests=ok(200)),
        req("Complete booking - client forbidden (403)", "PATCH", "/bookings/{{bookingId}}/complete", auth="clientToken", tests=fail(403)),
        req("Complete booking - other freelancer (404)", "PATCH", "/bookings/{{bookingId}}/complete", auth="freelancer2Token", tests=fail(404)),
        req("Complete booking - owning freelancer (200)", "PATCH", "/bookings/{{bookingId}}/complete", auth="freelancerToken",
            tests=ok(200, ["pm.test('Status completed', () => pm.expect(pm.response.json().data.booking.status).to.eql('completed'));"])),
    ],
}

# ---------------------------------------------------------------- 4 Transactions & income
money = {
    "name": "4. Transactions and income tracking",
    "item": [
        req("My transactions - client (200)", "GET", "/transactions/mine", auth="clientToken",
            tests=ok(200, ["pm.test('Contains the booking transaction', () => pm.expect(pm.response.json().data.transactions.map(t => t.reference)).to.include(pm.collectionVariables.get('transactionRef')));"])),
        req("My transactions - freelancer (200)", "GET", "/transactions/mine", auth="freelancerToken",
            tests=ok(200, ["pm.test('All belong to this freelancer', () => pm.response.json().data.transactions.forEach(t => pm.expect(t.freelancer.id).to.eql(pm.collectionVariables.get('freelancerId'))));"])),
        req("My transactions - other freelancer has none (200)", "GET", "/transactions/mine", auth="freelancer2Token",
            tests=ok(200, ["pm.test('Empty', () => pm.expect(pm.response.json().data.transactions).to.have.length(0));"])),
        req("Income summary - freelancer (200)", "GET", "/income/summary", auth="freelancerToken",
            tests=ok(200, ["const d = pm.response.json().data;",
                           "pm.test('Income matches the booking (R900 gross, 10% fee, R810 net)', () => { pm.expect(d.grossIncome).to.eql(900); pm.expect(d.platformFees).to.eql(90); pm.expect(d.netIncome).to.eql(810); pm.expect(d.transactionCount).to.eql(1); });",
                           "pm.test('Monthly breakdown present', () => pm.expect(d.byMonth).to.be.an('array').with.length(1));"])),
        req("Income summary - client forbidden (403)", "GET", "/income/summary", auth="clientToken", tests=fail(403)),
        req("Income summary - no token (401)", "GET", "/income/summary", tests=fail(401)),
        req("All transactions - admin (200)", "GET", "/transactions", auth="adminToken", tests=ok(200)),
        req("All transactions - freelancer forbidden (403)", "GET", "/transactions", auth="freelancerToken", tests=fail(403)),
        req("Transactions are read-only - POST not available (404)", "POST", "/transactions", auth="adminToken", body={"amount": 1000000}, tests=fail(404)),
    ],
}

# ---------------------------------------------------------------- 5 Admin
admin = {
    "name": "5. Admin capabilities",
    "item": [
        req("Platform stats - admin (200)", "GET", "/admin/stats", auth="adminToken", tests=ok(200)),
        req("Users list - admin (200)", "GET", "/admin/users", auth="adminToken", tests=ok(200, [NO_PASSWORD])),
        req("Users list - client forbidden (403)", "GET", "/admin/users", auth="clientToken", tests=fail(403)),
        req("Users list - freelancer forbidden (403)", "GET", "/admin/users", auth="freelancerToken", tests=fail(403)),
        req("Admin removes a gig (moderation) - setup gig", "POST", "/gigs", auth="freelancer2Token",
            body={**GIG, "title": "Spam listing to be moderated", "category": "other"}, tests=ok(201, [save("spamGigId", "pm.response.json().data.gig.id")])),
        req("Admin removes a gig (200)", "DELETE", "/gigs/{{spamGigId}}", auth="adminToken", tests=ok(200)),
        req("Suspend user - admin (200)", "PATCH", "/admin/users/{{freelancer2Id}}/status", auth="adminToken", body={"isActive": False},
            tests=ok(200, ["pm.test('User inactive', () => pm.expect(pm.response.json().data.user.isActive).to.eql(false));"])),
        req("Suspended user's existing token stops working (401)", "GET", "/auth/profile", auth="freelancer2Token", tests=fail(401)),
        req("Suspended user cannot log in (401)", "POST", "/auth/login", body={"email": "{{freelancer2Email}}", "password": STRONG}, tests=fail(401)),
        req("Suspend user - invalid body (400)", "PATCH", "/admin/users/{{freelancer2Id}}/status", auth="adminToken", body={"isActive": "maybe"}, tests=fail(400)),
        req("Reactivate user - admin (200)", "PATCH", "/admin/users/{{freelancer2Id}}/status", auth="adminToken", body={"isActive": True}, tests=ok(200)),
        req("Suspend user - client forbidden (403)", "PATCH", "/admin/users/{{freelancerId}}/status", auth="clientToken", body={"isActive": False}, tests=fail(403)),
    ],
}

# ---------------------------------------------------------------- 6 Rate limiting
flood_login_tests = [
    "const attempts = (pm.collectionVariables.get('floodAttempts') || 0) + 1;",
    "pm.collectionVariables.set('floodAttempts', attempts);",
    "if (pm.response.code === 429) {",
    "  pm.test('Login limiter triggers 429 after repeated failures', () => pm.response.to.have.status(429));",
    "  pm.test('429 has a clear message and retry time', () => { const j = pm.response.json(); pm.expect(j.success).to.eql(false); pm.expect(j.message).to.match(/Too many sign-in attempts/); pm.expect(j.retryAfterSeconds).to.be.above(0); });",
    "  pm.test('Standard RateLimit headers present', () => { pm.expect(pm.response.headers.has('RateLimit-Policy')).to.be.true; pm.expect(pm.response.headers.has('RateLimit')).to.be.true; });",
    "  pm.test('Limit reached within the configured window (<= 11 attempts)', () => pm.expect(attempts).to.be.at.most(11));",
    "  pm.collectionVariables.set('floodAttempts', 0);",
    "} else if (attempts < 25) {",
    "  pm.test('Wrong-password attempt ' + attempts + ' returns 401', () => pm.response.to.have.status(401));",
    "  pm.execution.setNextRequest('Rate limit - login brute force');",
    "} else {",
    "  pm.test('Rate limiter should have triggered', () => pm.expect.fail('No 429 after 25 attempts'));",
    "}",
]
flood_booking_tests = [
    "const attempts = (pm.collectionVariables.get('bookAttempts') || 0) + 1;",
    "pm.collectionVariables.set('bookAttempts', attempts);",
    "if (pm.response.code === 429) {",
    "  pm.test('Booking limiter triggers 429', () => pm.response.to.have.status(429));",
    "  pm.test('429 has a clear message and retry time', () => { const j = pm.response.json(); pm.expect(j.message).to.match(/Too many bookings/); pm.expect(j.retryAfterSeconds).to.be.above(0); });",
    "  pm.collectionVariables.set('bookAttempts', 0);",
    "} else if (attempts < 25) {",
    "  pm.test('Booking ' + attempts + ' accepted before the limit', () => pm.response.to.have.status(201));",
    "  pm.execution.setNextRequest('Rate limit - booking flood');",
    "} else {",
    "  pm.test('Rate limiter should have triggered', () => pm.expect.fail('No 429 after 25 bookings'));",
    "}",
]
rate = {
    "name": "6. Rate limiting (run last)",
    "item": [
        req("Rate limit - login brute force", "POST", "/auth/login", body={"email": "{{floodEmail}}", "password": "Guess1ng!Pass"}, tests=flood_login_tests),
        req("Rate limit - booking flood", "POST", "/bookings", auth="clientToken", body={"gigId": "{{gigId}}"}, tests=flood_booking_tests),
        req("Unknown route - safe 404", "GET", "/does-not-exist", tests=fail(404)),
    ],
}

collection = {
    "info": {
        "name": "HustleHub+ API - Part 2 (Secure Stack)",
        "description": "End-to-end tests for HustleHub+ Part 2: authentication, RBAC, gigs, bookings, transactions, income, admin, validation/sanitisation and rate limiting.\n\nRun with Newman from the api folder: npm run test:api\n\nThe API uses a self-signed certificate, so run Newman with --insecure (already in the npm script) or turn off SSL verification in Postman settings.\n\nRequests must run in order: later requests use ids and tokens saved by earlier ones. Each run creates fresh users, so the collection can be run repeatedly. Rate-limit counters are kept in memory; restart the API if you run the collection several times inside 15 minutes.",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "variable": [{"key": k, "value": ""} for k in [
        "run", "freelancerEmail", "freelancer2Email", "clientEmail", "floodEmail", "freelancerToken", "freelancer2Token",
        "clientToken", "adminToken", "freelancerId", "freelancer2Id", "clientId", "gigId", "gig2Id", "spamGigId",
        "bookingId", "transactionRef", "tamperedToken", "noneToken"]],
    "item": [setup, auth, gigs, bookings, money, admin, rate],
}

here = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(here, "HustleHub-Part2.postman_collection.json"), "w") as f:
    json.dump(collection, f, indent=2)
env = {
    "name": "HustleHub+ Local",
    "values": [
        {"key": "baseUrl", "value": "https://localhost:5000/api", "enabled": True},
        {"key": "adminEmail", "value": "admin@hustlehub.local", "enabled": True},
        {"key": "adminPassword", "value": "ChangeMe!Admin2026", "enabled": True},
    ],
}
with open(os.path.join(here, "HustleHub-local.postman_environment.json"), "w") as f:
    json.dump(env, f, indent=2)
count = sum(len(f["item"]) for f in collection["item"])
print(f"Wrote collection with {count} requests")
