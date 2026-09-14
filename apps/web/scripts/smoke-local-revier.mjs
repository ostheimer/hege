import assert from "node:assert/strict";
const base = "http://127.0.0.1:3000/api/v1";
async function api(path, session, method = "GET", body) {
  const response = await fetch(base + path, {method, headers:{"content-type":"application/json", ...(session ? {authorization:`Bearer ${session.tokens.accessToken}`} : {})}, ...(body ? {body:JSON.stringify(body)} : {})});
  return {status:response.status,data:await response.json()};
}
const login = await api("/auth/login", null, "POST", {identifier:"ostheimer",pin:process.env.HEGE_LOCAL_SMOKE_PIN ?? "9526",membershipId:"member-ostheimer-gaenserndorf"});
assert.equal(login.status,200);
const session=login.data;
assert.equal(session.user.name,"Andreas Ostheimer");
assert.equal(session.revier.name,"Jagdgesellschaft Gänserndorf");
const map = await api("/revier-map",session);
assert.equal(map.status,200);
assert.equal(map.data.map.areas.length,3);
assert.equal((await api("/revier-map",null)).status,401);
const dashboard = await api("/dashboard",session);
assert.equal(dashboard.status,200);
assert.equal(dashboard.data.activeAnsitze.length,0);
assert.equal(dashboard.data.recentFallwild.length,0);
const history = await api("/activities",session);
assert.equal(history.data.overview.letzteBenachrichtigungen.length,0);
const samples = [[48,16],[48,16.001],[48.0005,16.001],[48.0005,16]].map(([latitude,longitude])=>({latitude,longitude,accuracy:5,timestamp:10000}));
assert.equal((await api("/revier-map",session,"POST",{samples})).status,409);
const users = await api("/platform/users",session);
assert.equal(users.status,200);
for (const role of ["jaeger","ausgeher","schriftfuehrer","revier-admin"]) {
  const target = users.data.users.flatMap(entry=>entry.memberships).find(membership=>membership.role===role);
  assert.ok(target,`Testrolle ${role} fehlt`);
  const impersonated = await api("/auth/impersonation",session,"POST",{membershipId:target.id});
  assert.equal(impersonated.status,200);
  assert.equal(impersonated.data.membership.role,role);
  assert.equal((await api("/platform/users",impersonated.data)).status,403);
  assert.equal((await api("/revier-map",impersonated.data)).data.map,null);
  if (role!=="revier-admin") assert.equal((await api("/revier-map",impersonated.data,"POST",{samples})).status,403);
  const restored = await api("/auth/impersonation",impersonated.data,"DELETE");
  assert.equal(restored.status,200);
  assert.equal(restored.data.membership.id,session.membership.id);
  assert.equal(restored.data.user.name,"Andreas Ostheimer");
  console.log(`OK: Impersonation ${role}, Zielrechte/Isolation, Rückkehr zu Andreas`);
}
console.log("OK: echtes Revier ohne Demo-Aktivitäten, drei Kartenobjekte, Authentifizierung und Überschreibschutz");
