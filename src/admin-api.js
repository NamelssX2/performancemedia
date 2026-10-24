// Merge into the existing Worker. Do NOT add another default export.
const adminJson = (data, status=200) => new Response(JSON.stringify(data), {
  status, headers: {"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
});
async function adminDb(env,path,opts={}) {
  if(!env.SUPABASE_URL||!env.SUPABASE_SECRET_KEY) throw new Error("Missing Supabase Worker bindings");
  const r=await fetch(env.SUPABASE_URL.replace(/\/$/,"")+"/rest/v1/"+path,{
    ...opts,headers:{apikey:env.SUPABASE_SECRET_KEY,Authorization:"Bearer "+env.SUPABASE_SECRET_KEY,
    "Content-Type":"application/json",Prefer:"return=representation",...(opts.headers||{})}
  });
  const t=await r.text(); if(!r.ok) throw new Error("Supabase "+r.status+": "+t.slice(0,300));
  return t?JSON.parse(t):[];
}
async function adminGuard(request,env) {
  const token=(request.headers.get("Authorization")||"").replace(/^Bearer /,"");
  if(!token||token===request.headers.get("Authorization")) return {response:adminJson({error:"Sign in required"},401)};
  const r=await fetch(env.SUPABASE_URL.replace(/\/$/,"")+"/auth/v1/user",{
    headers:{apikey:env.SUPABASE_SECRET_KEY,Authorization:"Bearer "+token}
  });
  if(!r.ok)return {response:adminJson({error:"Invalid or expired session"},401)};
  const user=await r.json();
  const admins=await adminDb(env,"admin_users?select=user_id,role&user_id=eq."+encodeURIComponent(user.id)+"&limit=1");
  if(!admins.length||admins[0].role!=="admin")return {response:adminJson({error:"Admin access required"},403)};
  return {user};
}
const txt=(v,max=5000)=>typeof v==="string"?v.trim().slice(0,max):"";
const parseBody=async req=>{const s=await req.text();if(s.length>100000)throw Error("Body too large");return JSON.parse(s||"{}")};
export async function handleAdminApi(request,env) {
 const u=new URL(request.url),p=u.pathname,m=request.method.toUpperCase();
 if(!p.startsWith("/api/admin/"))return null;
 try {
  const g=await adminGuard(request,env);if(g.response)return g.response;
  if(p==="/api/admin/me"&&m==="GET")return adminJson({user:{id:g.user.id,email:g.user.email}});
  if(p==="/api/admin/pages"&&m==="GET")return adminJson({data:await adminDb(env,"pages?select=id,slug,title,meta_title,meta_description,status,updated_at&order=slug.asc")});
  let x=p.match(/^\/api\/admin\/pages\/([0-9a-f-]+)$/i);
  if(x&&m==="PUT"){const b=await parseBody(request),d={};for(const k of ["title","meta_title","meta_description"])if(k in b)d[k]=txt(b[k],k==="meta_description"?320:180);if("status"in b&&["draft","published"].includes(b.status))d.status=b.status;if(!Object.keys(d).length)return adminJson({error:"No valid fields"},400);d.updated_at=new Date().toISOString();const a=await adminDb(env,"pages?id=eq."+encodeURIComponent(x[1]),{method:"PATCH",body:JSON.stringify(d)});return a.length?adminJson({data:a[0]}):adminJson({error:"Page not found"},404)}
  if(p==="/api/admin/faqs"&&m==="GET")return adminJson({data:await adminDb(env,"faqs?select=id,question,answer,status,sort_order&order=sort_order.asc")});
  x=p.match(/^\/api\/admin\/faqs(?:\/([0-9a-f-]+))?$/i);
  if(x&&m==="POST"){const b=await parseBody(request),q=txt(b.question,500),a=txt(b.answer,10000);if(!q||!a)return adminJson({error:"Question and answer required"},400);const rows=await adminDb(env,"faqs",{method:"POST",body:JSON.stringify([{question:q,answer:a,status:b.status==="draft"?"draft":"published",sort_order:Number.isInteger(b.sort_order)?b.sort_order:0}])});return adminJson({data:rows[0]},201)}
  if(x&&x[1]&&m==="PUT"){const b=await parseBody(request),d={};if("question"in b)d.question=txt(b.question,500);if("answer"in b)d.answer=txt(b.answer,10000);if("status"in b&&["draft","published"].includes(b.status))d.status=b.status;if(Number.isInteger(b.sort_order))d.sort_order=b.sort_order;if(!Object.keys(d).length)return adminJson({error:"No valid fields"},400);d.updated_at=new Date().toISOString();const a=await adminDb(env,"faqs?id=eq."+encodeURIComponent(x[1]),{method:"PATCH",body:JSON.stringify(d)});return a.length?adminJson({data:a[0]}):adminJson({error:"FAQ not found"},404)}
  if(x&&x[1]&&m==="DELETE"){const a=await adminDb(env,"faqs?id=eq."+encodeURIComponent(x[1]),{method:"DELETE"});return a.length?adminJson({ok:true}):adminJson({error:"FAQ not found"},404)}
  if(p==="/api/admin/networks"&&m==="GET")return adminJson({data:await adminDb(env,"networks?select=id,name,slug,description,website_url,application_url,status,sort_order&order=sort_order.asc")});
  x=p.match(/^\/api\/admin\/networks(?:\/([0-9a-f-]+))?$/i);
  if(x&&m==="POST"){const b=await parseBody(request),name=txt(b.name,180),slug=txt(b.slug,180).toLowerCase().replace(/[^a-z0-9-]/g,"-");if(!name||!slug)return adminJson({error:"Name and slug required"},400);const rows=await adminDb(env,"networks",{method:"POST",body:JSON.stringify([{name,slug,description:txt(b.description),website_url:txt(b.website_url,1000),application_url:txt(b.application_url,1000),status:b.status==="draft"?"draft":"published",sort_order:Number.isInteger(b.sort_order)?b.sort_order:0}])});return adminJson({data:rows[0]},201)}
  if(x&&x[1]&&m==="PUT"){const b=await parseBody(request),d={};for(const k of ["name","slug","description","website_url","application_url"])if(k in b)d[k]=txt(b[k],k==="description"?5000:1000);if("slug"in d)d.slug=d.slug.toLowerCase().replace(/[^a-z0-9-]/g,"-");if("status"in b&&["draft","published"].includes(b.status))d.status=b.status;if(Number.isInteger(b.sort_order))d.sort_order=b.sort_order;if(!Object.keys(d).length)return adminJson({error:"No valid fields"},400);d.updated_at=new Date().toISOString();const a=await adminDb(env,"networks?id=eq."+encodeURIComponent(x[1]),{method:"PATCH",body:JSON.stringify(d)});return a.length?adminJson({data:a[0]}):adminJson({error:"Network not found"},404)}
  if(x&&x[1]&&m==="DELETE"){const a=await adminDb(env,"networks?id=eq."+encodeURIComponent(x[1]),{method:"DELETE"});return a.length?adminJson({ok:true}):adminJson({error:"Network not found"},404)}
  return adminJson({error:"Not found"},404);
} catch (e) {
  console.error("Admin API error:", e?.message || e);

  return adminJson({
    error: "Admin API request failed",
    details: e?.message || String(e)
  }, 500);
}
}
