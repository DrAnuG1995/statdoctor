import{l as ye,i as ge,r as m,j as e,B as r,M as N,D as U,n as Q,o as J,p as G,E as we,I as x,h as oe,S as ie,F as je,b as c,a as f}from"./index-GkbvhW2q.js";import{L as u}from"./label-_jIw9W3M.js";import{T as be}from"./textarea-BG9VpjRg.js";import{C as w,d as j}from"./card-q8rh13GV.js";import{B as C}from"./badge-D54rMspG.js";import{S as ve,a as Ne,b as Se,c as De,d as F,e as Z,f as K}from"./select-Rex5ryNG.js";import{S as Ae}from"./EmailPage-BNXKi9DV.js";import{P as V}from"./plus-Ds14FfQx.js";import{Z as ke}from"./zap-DgC3mTOh.js";import{C as S}from"./clock-Bu0XTbSD.js";import{P as X,a as ee}from"./play-CmU3k6EO.js";import{C as Ce,E as I}from"./eye-D2ROvgMm.js";import{T as te}from"./trash-2-DXADcedK.js";import{U as re}from"./users-CN5v_eM5.js";import"./index-BeCDXEaY.js";import"./PageHeader-CROtSdM0.js";import"./tabs-DLYGXZW3.js";function se(l){return{id:l.id,name:l.name,description:l.description||"",audience:l.audience,status:l.status,steps:l.steps||[],createdAt:l.created_at,updatedAt:l.updated_at}}function Fe(l,b,B="{{name}}"){return`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F5F5F7; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #1F3A6A; padding: 32px 40px; text-align: center; }
    .header img { height: 32px; }
    .header h1 { color: #ffffff; font-size: 24px; font-weight: 600; margin: 12px 0 0; letter-spacing: -0.3px; }
    .body { padding: 40px; color: #1E293B; font-size: 15px; line-height: 1.7; }
    .body p { margin: 0 0 16px; }
    .cta-btn { display: inline-block; background: #A4D65E; color: #1F3A6A; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 8px 0 16px; }
    .divider { height: 1px; background: #E2E8F0; margin: 24px 0; }
    .footer { background: #F8FAFC; padding: 24px 40px; text-align: center; color: #94A3B8; font-size: 12px; line-height: 1.6; }
    .footer a { color: #1F3A6A; text-decoration: none; }
    .social-link { display: inline-block; margin: 0 6px; color: #64748B; text-decoration: none; font-size: 13px; }
    .accent-bar { height: 4px; background: linear-gradient(90deg, #1F3A6A, #A4D65E); }
  </style>
</head>
<body>
  <div class="container">
    <div class="accent-bar"></div>
    <div class="header">
      <img src="https://cdn.prod.website-files.com/688db6d677516719c3925d01/6890a03498323d7b7c29d34e_statdoc_logo.svg" alt="StatDoctor" style="height:40px;" />
    </div>
    <div class="body">
      ${b.replace(/\{\{name\}\}/g,B).split(`
`).map(n=>n.trim()===""?'<div style="height:12px;"></div>':n.trim().startsWith("•")||n.trim().match(/^\d+\./)?`<p style="margin:4px 0 4px 20px;">${n}</p>`:`<p>${n}</p>`).join(`
`)}
    </div>
    <div class="footer">
      <img src="https://cdn.prod.website-files.com/688db6d677516719c3925d01/68f895894dea0b8dd1abb404_statodoctor_logo_ico.svg" alt="StatDoctor" style="height:24px;margin-bottom:8px;" />
      <p style="margin:0 0 4px;">Connecting hospitals with locum doctors — directly.</p>
      <p style="margin:0;">
        <a href="https://statdoctor.app" class="social-link">statdoctor.app</a> ·
        <a href="https://linkedin.com/company/statdoctor" class="social-link">LinkedIn</a>
      </p>
      <div style="margin-top:12px;font-size:11px;color:#CBD5E1;">
        © ${new Date().getFullYear()} StatDoctor Pty Ltd · ABN 123 456 789
      </div>
    </div>
  </div>
</body>
</html>`}const ae=[{id:"hospital-onboarding",name:"Hospital Onboarding",description:"Welcome sequence for new hospital sign-ups",audience:"hospitals",status:"draft",steps:[{id:"s1",type:"email",subject:"Welcome to StatDoctor – Let's get you set up",body:`Hi {{name}},

Welcome to StatDoctor! We're thrilled to have your hospital on board.

StatDoctor is the easiest way to fill locum shifts — no agencies, no middlemen. Here's what makes us different:

• Direct connection with verified doctors
• No placement fees or commissions
• Post shifts in under 60 seconds
• Real-time notifications when doctors apply

To get started, simply log into your dashboard and post your first shift. Our team is here to help every step of the way.

Best regards,
Anurag
Co-Founder, StatDoctor`},{id:"s2",type:"delay",delayDays:3},{id:"s3",type:"email",subject:"Have you posted your first shift yet?",body:`Hi {{name}},

Just checking in — have you had a chance to post your first shift on StatDoctor?

If you need any help getting set up, I'm happy to jump on a quick 10-minute call to walk you through the process.

Here's what other hospitals love about the platform:

• Fill shifts 3x faster than traditional agencies
• Save up to 30% on locum costs
• Access a growing pool of 250+ verified doctors

Would any time this week work for a quick chat?

Best,
Anurag
Co-Founder, StatDoctor`},{id:"s4",type:"delay",delayDays:5},{id:"s5",type:"email",subject:"Quick tips to get the most out of StatDoctor",body:`Hi {{name}},

I wanted to share a few tips that our most successful hospitals use:

1. Post shifts at least 2 weeks in advance — you'll get 3x more applications
2. Include shift details (department, requirements) — doctors apply faster to detailed posts
3. Set up recurring shifts — save time on repeat rosters
4. Respond to applications within 24 hours — top doctors get snapped up quickly

If you'd like a personalised demo or have any questions, just reply to this email.

We're building StatDoctor to make your life easier — your feedback matters!

Best,
Anurag
Co-Founder, StatDoctor`}],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{id:"cold-outreach-hospital",name:"Hospital Cold Outreach",description:"Cold outreach sequence for prospective hospitals",audience:"hospitals",status:"draft",steps:[{id:"c1",type:"email",subject:"Filling locum shifts without agency fees",body:`Hi {{name}},

I'm Anurag, co-founder of StatDoctor. We help hospitals fill locum shifts directly — without agency fees.

I noticed your hospital may be looking for a more efficient way to manage locum staffing. StatDoctor connects you directly with verified doctors, saving you time and money.

Here's what we offer:

• No placement fees or commissions
• 250+ verified doctors on the platform
• Post shifts and receive applications within hours
• Simple dashboard — post a shift in under 60 seconds

Would you be open to a quick 15-minute call to see if StatDoctor could help?

Best regards,
Anurag
Co-Founder, StatDoctor
anu@statdoctor.net`},{id:"c2",type:"delay",delayDays:4},{id:"c3",type:"email",subject:"Re: Filling locum shifts without agency fees",body:`Hi {{name}},

Just wanted to follow up on my previous email about StatDoctor.

I understand you're busy — here's a 30-second summary:

StatDoctor = post a shift → doctors apply → you choose → done. No agencies.

Hospitals using StatDoctor are saving an average of 30% on locum costs. Happy to show you a quick demo if you're interested.

Best,
Anurag`},{id:"c4",type:"delay",delayDays:7},{id:"c5",type:"email",subject:"Last follow up — StatDoctor for {{name}}",body:`Hi {{name}},

This is my final follow up — I don't want to spam your inbox!

If you're ever looking for an easier way to fill locum shifts without agency fees, StatDoctor is here. You can check us out at statdoctor.app.

No pressure at all — just wanted to make sure you knew the option exists.

Wishing you and your team all the best.

Cheers,
Anurag
Co-Founder, StatDoctor`}],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{id:"doctor-engagement",name:"Doctor Re-engagement",description:"Re-engage inactive doctors who haven't applied to shifts",audience:"doctors",status:"draft",steps:[{id:"d1",type:"email",subject:"New locum shifts available near you",body:`Hi {{name}},

We've noticed you haven't checked StatDoctor in a while — and there are some great shifts waiting!

Hospitals are actively looking for doctors like you. Here's what's new:

• New shifts posted daily across Australia
• Flexible scheduling — pick the shifts that work for you
• Transparent pay rates — no agency cuts

Log back in and browse the latest shifts. Your next locum opportunity could be one tap away.

Best,
The StatDoctor Team`},{id:"d2",type:"delay",delayDays:5},{id:"d3",type:"email",subject:"Doctors are earning more with StatDoctor",body:`Hi {{name}},

Quick update — doctors on StatDoctor are earning more because there are no agency fees eating into their pay.

Here's how it works:

1. Browse available shifts on the app
2. Apply to the ones you like
3. Work directly with the hospital — no middleman

It's that simple. And the best part? You keep more of what you earn.

See you on the platform!

Best,
The StatDoctor Team`}],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{id:"agency-poach-sequence",name:"Agency-Listed Hospital Outreach",description:"Target hospitals posting locum shifts through agencies — pitch StatDoctor as a cheaper direct alternative",audience:"hospitals",status:"draft",steps:[{id:"a1",type:"email",subject:"Noticed you're hiring locum doctors — there's a cheaper way",body:`Hi {{name}},

I'm Anurag from StatDoctor. I came across your hospital's locum listings and wanted to reach out.

We built StatDoctor specifically to help hospitals like yours fill locum shifts without the agency markup. Here's the difference:

Agency route: Post with an agency → pay 20-30% on top → limited visibility into who applies
StatDoctor: Post directly → verified doctors apply within hours → zero commission

We have 250+ verified doctors across Australia already on the platform. Hospitals that have switched are saving an average of 30% per locum placement.

Would you be open to a 10-minute call to see if it could work for your ED?

Best,
Anurag
Co-Founder, StatDoctor
anu@statdoctor.net`},{id:"a2",type:"delay",delayDays:3},{id:"a3",type:"email",subject:"Re: Locum staffing without the agency fees",body:`Hi {{name}},

Quick follow up — I know how hectic running an ED can be, so I'll keep this brief.

StatDoctor is free for hospitals to use. You post a shift, doctors apply, you pick who you want. No contracts, no commissions, no lock-in.

Here's what takes 60 seconds on our platform:
1. Post your shift details (dates, rates, requirements)
2. Get notified as verified doctors apply
3. Confirm the doctor you want — done

We handle the verification so you don't have to chase documents. Every doctor on the platform has verified credentials, references, and AHPRA registration.

Happy to set up a quick demo if you'd like to see it in action.

Cheers,
Anurag`},{id:"a4",type:"delay",delayDays:5},{id:"a5",type:"email",subject:"What {{name}} could save on locum costs",body:`Hi {{name}},

Last one from me — I promise!

I ran some quick numbers. If your ED fills even 2 locum shifts per month through agencies, you're likely paying $5,000–$15,000 in placement fees alone.

With StatDoctor, that cost drops to $0. Same quality doctors, same speed, zero commission.

If the timing isn't right now, no worries at all. But when you're ready to try a different approach to locum staffing, we're here: statdoctor.app

All the best to you and your team.

Cheers,
Anurag
Co-Founder, StatDoctor`}],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{id:"acem-hospital-outreach",name:"ACEM Job Board Hospital Outreach",description:"Tailored sequence for hospitals found posting on the ACEM job board",audience:"hospitals",status:"draft",steps:[{id:"m1",type:"email",subject:"Saw your ACEM listing — a quicker way to fill ED shifts",body:`Hi {{name}},

I noticed your hospital has positions listed on the ACEM job board — so I know you're actively building your ED team.

While ACEM is great for training positions, if you also need to fill locum or short-term shifts, I wanted to introduce StatDoctor.

We're an Australian platform that connects hospitals directly with verified emergency doctors — no agencies, no placement fees. Hospitals post a shift and get applications within hours.

What makes us different:
• Every doctor is credential-verified (AHPRA, references, documents)
• Zero commission — hospitals and doctors connect directly
• Post a shift in under 60 seconds from your dashboard
• 250+ doctors across Australia already on the platform

Would a quick 15-minute call be useful to explore how StatDoctor could complement your existing recruitment?

Best regards,
Anurag
Co-Founder, StatDoctor
anu@statdoctor.net`},{id:"m2",type:"delay",delayDays:4},{id:"m3",type:"email",subject:"Re: Quick way to fill ED locum shifts",body:`Hi {{name}},

Just circling back on my earlier email. I know recruiting for ED is always a juggle.

One thing I hear from ED directors is that agency locums are expensive and unpredictable. StatDoctor fixes both:

• You control the rates (post what you're willing to pay)
• You see who's applying and their full profile
• Doctors are verified before they even apply to your shifts

Several hospitals have told us they fill shifts 3x faster than going through an agency, and at a fraction of the cost.

Happy to send through a quick demo link or jump on a call — whatever works best.

Cheers,
Anurag`},{id:"m4",type:"delay",delayDays:6},{id:"m5",type:"email",subject:"Final thought on locum staffing for your ED",body:`Hi {{name}},

This is my last follow up — I don't want to be that person!

If your hospital ever needs a fast, free way to find verified locum doctors for your ED, StatDoctor is here. No setup fees, no contracts, no commission.

You can check us out anytime at statdoctor.app or just reply to this email and I'll personally walk you through it.

Wishing your ED team all the best — it's tough work and you're doing an incredible job.

Cheers,
Anurag
Co-Founder, StatDoctor`}],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}];function D(){return Math.random().toString(36).slice(2,10)}const E={hospitals:{icon:oe,label:"Hospitals",color:"bg-purple-100 text-purple-800"},doctors:{icon:ie,label:"Doctors",color:"bg-blue-100 text-blue-800"},investors:{icon:re,label:"Investors",color:"bg-green-100 text-green-800"}},H={draft:{label:"Draft",color:"bg-slate-100 text-slate-700"},active:{label:"Active",color:"bg-green-100 text-green-800"},paused:{label:"Paused",color:"bg-amber-100 text-amber-800"}};function Qe(){const l=ye(),{data:b=[],isLoading:B}=ge({queryKey:["email-flows"],queryFn:async()=>{const{data:t,error:a}=await f.from("email_flows").select("*").order("created_at",{ascending:!1});return a?ae:(t||[]).length>0?t.map(se):ae}}),[s,n]=m.useState(null),[ne,P]=m.useState(!1),[v,le]=m.useState(null),[ce,y]=m.useState(!1),[de,q]=m.useState(null),g=()=>l.invalidateQueries({queryKey:["email-flows"]}),[A,W]=m.useState(""),[O,T]=m.useState(""),[z,me]=m.useState("hospitals"),ue=async()=>{if(!A.trim()){c.error("Flow name is required");return}const t=[{id:D(),type:"email",subject:"",body:`Hi {{name}},



Best regards,
The StatDoctor Team`}],{data:a,error:o}=await f.from("email_flows").insert({name:A.trim(),description:O.trim(),audience:z,status:"draft",steps:t}).select().single();if(o){c.error(o.message);return}g(),n(se(a)),y(!1),W(""),T(""),c.success("Flow created")},p=t=>{s&&n({...s,...t,updatedAt:new Date().toISOString()})},_=async()=>{if(!s)return;const{error:t}=await f.from("email_flows").update({name:s.name,description:s.description,audience:s.audience,status:s.status,steps:s.steps,updated_at:new Date().toISOString()}).eq("id",s.id);if(t){c.error(t.message);return}g(),c.success("Flow saved")},he=async t=>{const{error:a}=await f.from("email_flows").delete().eq("id",t);if(a){c.error(a.message);return}g(),(s==null?void 0:s.id)===t&&n(null),c.success("Flow deleted")},pe=async t=>{const{error:a}=await f.from("email_flows").insert({name:`${t.name} (copy)`,description:t.description,audience:t.audience,status:"draft",steps:t.steps.map(o=>({...o,id:D()}))});if(a){c.error(a.message);return}g(),c.success("Flow duplicated")},L=async t=>{const a=t.status==="active"?"paused":"active",{error:o}=await f.from("email_flows").update({status:a,updated_at:new Date().toISOString()}).eq("id",t.id);if(o){c.error(o.message);return}g(),(s==null?void 0:s.id)===t.id&&n({...s,status:a}),c.success(`Flow ${a==="active"?"activated":"paused"}`)},$=t=>{if(!s)return;const a=t==="email"?{id:D(),type:"email",subject:"",body:`Hi {{name}},



Best regards,
The StatDoctor Team`}:{id:D(),type:"delay",delayDays:3};p({steps:[...s.steps,a]}),q(a.id)},k=(t,a)=>{s&&p({steps:s.steps.map(o=>o.id===t?{...o,...a}:o)})},xe=t=>{s&&p({steps:s.steps.filter(a=>a.id!==t)})},M=(t,a)=>{if(!s)return;const o=s.steps.findIndex(h=>h.id===t);if(o<0)return;const d=a==="up"?o-1:o+1;if(d<0||d>=s.steps.length)return;const i=[...s.steps];[i[o],i[d]]=[i[d],i[o]],p({steps:i})},R=t=>{le(t),P(!0)};if(!s)return e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center justify-between mb-6",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-lg font-semibold text-[#1F3A6A]",children:"Email Flows"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:"Automated email sequences with StatDoctor branding"})]}),e.jsxs(r,{onClick:()=>y(!0),className:"bg-[#1F3A6A] hover:bg-[#1F3A6A]/90",children:[e.jsx(V,{className:"mr-1.5 h-4 w-4"}),"New Flow"]})]}),b.length===0?e.jsx(w,{children:e.jsxs(j,{className:"py-16 text-center",children:[e.jsx(ke,{className:"h-12 w-12 mx-auto mb-3 text-muted-foreground/40"}),e.jsx("h3",{className:"text-lg font-medium mb-1",children:"No email flows yet"}),e.jsx("p",{className:"text-sm text-muted-foreground mb-4",children:"Create automated email sequences to engage hospitals and doctors"}),e.jsxs(r,{onClick:()=>y(!0),className:"bg-[#1F3A6A] hover:bg-[#1F3A6A]/90",children:[e.jsx(V,{className:"mr-1.5 h-4 w-4"}),"Create your first flow"]})]})}):e.jsx("div",{className:"grid gap-3",children:b.map(t=>{const a=t.steps.filter(h=>h.type==="email").length,o=t.steps.reduce((h,fe)=>h+(fe.delayDays||0),0),d=E[t.audience].icon,i=H[t.status];return e.jsx(w,{className:"cursor-pointer hover:shadow-md transition-shadow border-l-4",style:{borderLeftColor:t.status==="active"?"#A4D65E":t.status==="paused"?"#F59E0B":"#CBD5E1"},onClick:()=>n(t),children:e.jsx(j,{className:"p-4",children:e.jsxs("div",{className:"flex items-start justify-between",children:[e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-1",children:[e.jsx("h3",{className:"font-semibold text-[#1F3A6A] truncate",children:t.name}),e.jsx(C,{variant:"secondary",className:i.color,children:i.label}),e.jsxs(C,{variant:"secondary",className:E[t.audience].color,children:[e.jsx(d,{className:"h-3 w-3 mr-1"}),E[t.audience].label]})]}),e.jsx("p",{className:"text-sm text-muted-foreground line-clamp-1",children:t.description}),e.jsxs("div",{className:"flex items-center gap-4 mt-2 text-xs text-muted-foreground",children:[e.jsxs("span",{className:"flex items-center gap-1",children:[e.jsx(N,{className:"h-3 w-3"}),a," email",a!==1?"s":""]}),e.jsxs("span",{className:"flex items-center gap-1",children:[e.jsx(S,{className:"h-3 w-3"}),o," day",o!==1?"s":""," total"]})]})]}),e.jsxs("div",{className:"flex gap-1 ml-3",onClick:h=>h.stopPropagation(),children:[e.jsx(r,{variant:"ghost",size:"icon",className:"h-8 w-8",onClick:()=>L(t),title:t.status==="active"?"Pause flow":"Activate flow",children:t.status==="active"?e.jsx(X,{className:"h-4 w-4"}):e.jsx(ee,{className:"h-4 w-4"})}),e.jsx(r,{variant:"ghost",size:"icon",className:"h-8 w-8",onClick:()=>pe(t),title:"Duplicate flow",children:e.jsx(Ce,{className:"h-4 w-4"})}),e.jsx(r,{variant:"ghost",size:"icon",className:"h-8 w-8 text-red-500 hover:text-red-700",onClick:()=>he(t.id),title:"Delete flow",children:e.jsx(te,{className:"h-4 w-4"})})]})]})})},t.id)})}),e.jsx(U,{open:ce,onOpenChange:y,children:e.jsxs(Q,{className:"max-w-md",children:[e.jsxs(J,{children:[e.jsx(G,{children:"Create Email Flow"}),e.jsx(we,{children:"Set up an automated email sequence with StatDoctor branding"})]}),e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(u,{children:"Flow Name *"}),e.jsx(x,{placeholder:"e.g. Hospital Onboarding",value:A,onChange:t=>W(t.target.value)})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(u,{children:"Description"}),e.jsx(x,{placeholder:"Brief description of this flow",value:O,onChange:t=>T(t.target.value)})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(u,{children:"Audience"}),e.jsxs(ve,{value:z,onValueChange:t=>me(t),children:[e.jsx(Ne,{children:e.jsx(Se,{})}),e.jsxs(De,{children:[e.jsx(F,{value:"hospitals",children:e.jsxs("span",{className:"flex items-center gap-2",children:[e.jsx(oe,{className:"h-4 w-4"})," Hospitals"]})}),e.jsx(F,{value:"doctors",children:e.jsxs("span",{className:"flex items-center gap-2",children:[e.jsx(ie,{className:"h-4 w-4"})," Doctors"]})}),e.jsx(F,{value:"investors",children:e.jsxs("span",{className:"flex items-center gap-2",children:[e.jsx(re,{className:"h-4 w-4"})," Investors"]})})]})]})]})]}),e.jsxs(je,{children:[e.jsx(r,{variant:"outline",onClick:()=>y(!1),children:"Cancel"}),e.jsx(r,{onClick:ue,className:"bg-[#1F3A6A] hover:bg-[#1F3A6A]/90",children:"Create Flow"})]})]})})]});const Y=s.steps.filter(t=>t.type==="email").length;return e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center justify-between mb-6",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(r,{variant:"ghost",size:"sm",onClick:()=>{_(),n(null)},children:"← Back"}),e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("h2",{className:"text-lg font-semibold text-[#1F3A6A]",children:s.name}),e.jsx(C,{variant:"secondary",className:H[s.status].color,children:H[s.status].label})]}),e.jsx("p",{className:"text-sm text-muted-foreground",children:s.description||"No description"})]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(r,{variant:"outline",size:"sm",onClick:()=>L(s),children:s.status==="active"?e.jsxs(e.Fragment,{children:[e.jsx(X,{className:"mr-1.5 h-4 w-4"})," Pause"]}):e.jsxs(e.Fragment,{children:[e.jsx(ee,{className:"mr-1.5 h-4 w-4"})," Activate"]})}),e.jsx(r,{size:"sm",onClick:_,className:"bg-[#1F3A6A] hover:bg-[#1F3A6A]/90",children:"Save Flow"})]})]}),e.jsx(w,{className:"mb-4",children:e.jsx(j,{className:"p-4",children:e.jsxs("div",{className:"grid gap-3 sm:grid-cols-2",children:[e.jsxs("div",{className:"space-y-1.5",children:[e.jsx(u,{className:"text-xs",children:"Flow Name"}),e.jsx(x,{value:s.name,onChange:t=>p({name:t.target.value})})]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsx(u,{className:"text-xs",children:"Description"}),e.jsx(x,{value:s.description,onChange:t=>p({description:t.target.value})})]})]})})}),e.jsxs("div",{className:"space-y-0",children:[s.steps.map((t,a)=>{const o=de===t.id;let d=0;return t.type==="email"&&(d=s.steps.slice(0,a+1).filter(i=>i.type==="email").length),e.jsxs("div",{children:[a>0&&e.jsx("div",{className:"flex justify-center py-1",children:e.jsx("div",{className:"w-px h-6 bg-slate-300"})}),e.jsx(w,{className:`border-l-4 ${t.type==="email"?"border-l-[#1F3A6A]":"border-l-amber-400"}`,children:e.jsxs(j,{className:"p-0",children:[e.jsxs("div",{className:"flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/50 transition-colors",onClick:()=>q(o?null:t.id),children:[e.jsx("div",{className:`rounded-full p-1.5 ${t.type==="email"?"bg-[#1F3A6A]/10 text-[#1F3A6A]":"bg-amber-100 text-amber-700"}`,children:t.type==="email"?e.jsx(N,{className:"h-4 w-4"}):e.jsx(S,{className:"h-4 w-4"})}),e.jsx("div",{className:"flex-1 min-w-0",children:t.type==="email"?e.jsxs("div",{children:[e.jsxs("span",{className:"text-xs font-medium text-muted-foreground",children:["Email ",d]}),e.jsx("p",{className:"text-sm font-medium truncate",children:t.subject||e.jsx("span",{className:"text-muted-foreground italic",children:"No subject"})})]}):e.jsxs("div",{children:[e.jsx("span",{className:"text-xs font-medium text-muted-foreground",children:"Wait"}),e.jsxs("p",{className:"text-sm font-medium",children:[t.delayDays," day",t.delayDays!==1?"s":""]})]})}),e.jsxs("div",{className:"flex items-center gap-1",onClick:i=>i.stopPropagation(),children:[t.type==="email"&&e.jsx(r,{variant:"ghost",size:"icon",className:"h-7 w-7",onClick:()=>R(t),title:"Preview branded email",children:e.jsx(I,{className:"h-3.5 w-3.5"})}),e.jsx(r,{variant:"ghost",size:"icon",className:"h-7 w-7",onClick:()=>M(t.id,"up"),disabled:a===0,children:e.jsx(Z,{className:"h-3.5 w-3.5"})}),e.jsx(r,{variant:"ghost",size:"icon",className:"h-7 w-7",onClick:()=>M(t.id,"down"),disabled:a===s.steps.length-1,children:e.jsx(K,{className:"h-3.5 w-3.5"})}),e.jsx(r,{variant:"ghost",size:"icon",className:"h-7 w-7 text-red-500 hover:text-red-700",onClick:()=>xe(t.id),children:e.jsx(te,{className:"h-3.5 w-3.5"})})]}),o?e.jsx(Z,{className:"h-4 w-4 text-muted-foreground"}):e.jsx(K,{className:"h-4 w-4 text-muted-foreground"})]}),o&&e.jsx("div",{className:"px-4 pb-4 border-t bg-slate-50/30",children:t.type==="email"?e.jsxs("div",{className:"space-y-3 pt-3",children:[e.jsxs("div",{className:"space-y-1.5",children:[e.jsx(u,{className:"text-xs",children:"Subject Line"}),e.jsx(x,{value:t.subject||"",onChange:i=>k(t.id,{subject:i.target.value}),placeholder:"Email subject..."})]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(u,{className:"text-xs",children:"Email Body"}),e.jsxs("span",{className:"text-[10px] text-muted-foreground",children:["Use ","{{name}}"," for personalization"]})]}),e.jsx(be,{value:t.body||"",onChange:i=>k(t.id,{body:i.target.value}),rows:10,placeholder:"Write your email...",className:"font-mono text-sm"})]}),e.jsxs(r,{variant:"outline",size:"sm",onClick:()=>R(t),children:[e.jsx(I,{className:"mr-1.5 h-4 w-4"}),"Preview with StatDoctor branding"]})]}):e.jsxs("div",{className:"pt-3",children:[e.jsx(u,{className:"text-xs",children:"Wait (days)"}),e.jsxs("div",{className:"flex items-center gap-2 mt-1.5",children:[e.jsx(x,{type:"number",min:1,max:90,value:t.delayDays||3,onChange:i=>k(t.id,{delayDays:parseInt(i.target.value)||1}),className:"w-24"}),e.jsx("span",{className:"text-sm text-muted-foreground",children:"days before next step"})]})]})})]})})]},t.id)}),e.jsx("div",{className:"flex justify-center py-1",children:e.jsx("div",{className:"w-px h-4 bg-slate-300"})}),e.jsxs("div",{className:"flex justify-center gap-2",children:[e.jsxs(r,{variant:"outline",size:"sm",onClick:()=>$("email"),className:"text-[#1F3A6A]",children:[e.jsx(N,{className:"mr-1.5 h-4 w-4"}),"Add Email"]}),e.jsxs(r,{variant:"outline",size:"sm",onClick:()=>$("delay"),className:"text-amber-700",children:[e.jsx(S,{className:"mr-1.5 h-4 w-4"}),"Add Delay"]})]})]}),e.jsx(w,{className:"mt-6 bg-[#1F3A6A]/5 border-[#1F3A6A]/20",children:e.jsx(j,{className:"p-3",children:e.jsxs("div",{className:"flex items-center justify-between text-sm",children:[e.jsxs("div",{className:"flex gap-4",children:[e.jsxs("span",{className:"flex items-center gap-1.5",children:[e.jsx(N,{className:"h-4 w-4 text-[#1F3A6A]"}),e.jsx("strong",{children:Y})," email",Y!==1?"s":""]}),e.jsxs("span",{className:"flex items-center gap-1.5",children:[e.jsx(S,{className:"h-4 w-4 text-amber-600"}),e.jsx("strong",{children:s.steps.reduce((t,a)=>t+(a.delayDays||0),0)})," days total"]})]}),e.jsx("span",{className:"text-xs text-muted-foreground",children:"Emails will be sent via Gmail with StatDoctor branding"})]})})}),e.jsx(U,{open:ne,onOpenChange:P,children:e.jsxs(Q,{className:"max-w-2xl max-h-[85vh]",children:[e.jsx(J,{children:e.jsxs(G,{className:"flex items-center gap-2",children:[e.jsx(I,{className:"h-5 w-5"}),"Email Preview — StatDoctor Branded"]})}),v&&e.jsxs("div",{children:[e.jsx("div",{className:"mb-3 rounded-lg bg-slate-50 p-3 text-sm",children:e.jsxs("div",{className:"flex gap-2",children:[e.jsx("span",{className:"font-medium text-muted-foreground",children:"Subject:"}),e.jsx("span",{children:v.subject})]})}),e.jsx(Ae,{className:"h-[500px] border rounded-lg",children:e.jsx("iframe",{srcDoc:Fe(v.subject||"",v.body||"","Dr. Sarah Jones"),className:"w-full h-[800px] border-0",title:"Email preview"})})]})]})})]})}export{Qe as default};
