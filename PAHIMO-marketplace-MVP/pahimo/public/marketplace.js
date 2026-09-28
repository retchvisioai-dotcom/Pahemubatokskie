import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
const $ = s => document.querySelector(s);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money = value => `₱${Number(value).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const alertUser = (message, error = false) => { $('#alert').innerHTML = `<p class="${error?'error':'notice'}">${escapeHtml(message)}</p>`; window.scrollTo({top:0,behavior:'smooth'}); };
let client, user, partner, myRequests = [], jobs = [], bookings = [], offers = [], partners = [], adminRole = null, activeTab = 'browse';
const show = (id,visible) => $(id).classList.toggle('hidden',!visible);
const check = ({error,data}) => { if (error) throw error; return data; };
const action = async fn => { try { await fn(); } catch (error) { alertUser(error.message || 'Something went wrong.',true); } };
const formData = form => Object.fromEntries(new FormData(form));
const refresh = async () => {
  const results = await Promise.all([
    client.from('partner_profiles').select('*').eq('user_id',user.id).maybeSingle(),
    client.from('service_requests').select('*').eq('customer_id',user.id).order('created_at',{ascending:false}),
    client.from('service_requests').select('*').eq('status','open').order('created_at',{ascending:false}).limit(100),
    client.from('service_requests').select('*').eq('selected_partner',user.id).order('created_at',{ascending:false})
  ]);
  results.forEach(check); [partner,myRequests,jobs,bookings] = results.map(x=>x.data);
  adminRole=check(await client.from('admin_users').select('label').eq('user_id',user.id).maybeSingle());
  const requestIds = [...new Set([...myRequests,...jobs,...bookings].map(r=>r.id))];
  offers = requestIds.length ? check(await client.from('offers').select('id,request_id,partner_id,amount,note,created_at').in('request_id',requestIds)) : [];
  const partnerIds = [...new Set(offers.map(o=>o.partner_id))];
  partners = partnerIds.length ? check(await client.from('partner_profiles').select('user_id,display_name').in('user_id',partnerIds)) : [];
  render();
};
const reload = async message => { await refresh(); if(message) alertUser(message); };
const render = () => {
  $('#identity').textContent = user.email || '';
  show('#admin-tab',!!adminRole);
  for(const tab of ['browse','mine','partner','admin']) show('#'+tab,activeTab===tab && (tab!=='admin'||!!adminRole));
  if(activeTab==='admin' && adminRole) action(async()=>{
    const overview=check(await client.rpc('admin_overview'));
    $('#admin-overview').innerHTML=`<p><strong>${escapeHtml(adminRole.label)}</strong> · ${overview.customers} customers with requests · ${overview.partners} Partners</p><div class="grid"><article>Open requests: <strong>${overview.open_requests}</strong></article><article>Booked: <strong>${overview.booked_requests}</strong></article><article>Completed: <strong>${overview.completed_requests}</strong></article></div><h3>Recent requests</h3>${overview.recent_requests.map(r=>`<article>${escapeHtml(r.title)} · ${escapeHtml(r.area)} · ${escapeHtml(r.status)} · ${money(r.budget)}</article>`).join('')||'<p>No activity yet.</p>'}`;
  });
  $('#partner-form').elements.display_name.value = partner?.display_name || '';
  $('#partner-form').elements.services.value = (partner?.services || []).join(', ');
  $('#partner-form').elements.service_area.value = partner?.service_area || '';
  $('#partner-form').elements.bio.value = partner?.bio || '';
  $('#partner-form').elements.available.checked = partner?.available ?? true;
  $('#jobs').innerHTML = jobs.length ? jobs.map(r => `<article><span class="pill">${escapeHtml(r.category)}</span><h3>${escapeHtml(r.title)}</h3><p>${escapeHtml(r.details)}</p><p>${escapeHtml(r.area)} · <span class="price">${money(r.budget)} budget</span></p>${partner && r.customer_id !== user.id && partner.available ? `<form class="offer-form" data-id="${r.id}"><label>Your offer (PHP)<input name="amount" type="number" min="50" max="10000000" step="0.01" required></label><label>Note to customer<textarea name="note" maxlength="1000"></textarea></label><button ${offers.some(o=>o.request_id===r.id&&o.partner_id===user.id)?'disabled':''}>${offers.some(o=>o.request_id===r.id&&o.partner_id===user.id)?'Offer sent':'Send offer'}</button></form>` : '<small>Set up an available Partner profile to offer on requests from other customers.</small>'}</article>`).join('') : '<p>No open requests yet.</p>';
  $('#partner-bookings').innerHTML = bookings.length ? bookings.map(r=>`<article><span class="pill">${escapeHtml(r.status)}</span><h3>${escapeHtml(r.title)}</h3><p>${escapeHtml(r.details)} · ${escapeHtml(r.area)}</p><p class="price">Agreed offer: ${money(offers.find(o=>o.id===r.accepted_offer_id)?.amount||r.budget)}</p><div class="messages" data-thread="${r.id}"></div>${r.status==='booked'?`<form class="message-form" data-id="${r.id}"><label>Message to customer<textarea name="body" maxlength="2000" required></textarea></label><button>Send</button></form>`:''}</article>`).join(''):'<p>No confirmed bookings yet.</p>';
  $('#my-requests').innerHTML = myRequests.length ? myRequests.map(r => `<article><span class="pill">${escapeHtml(r.status)}</span><h3>${escapeHtml(r.title)}</h3><p>${escapeHtml(r.details)}</p><p>${escapeHtml(r.area)} · ${money(r.budget)} budget</p>${r.status==='open' ? `<h4>Partner offers</h4>${offers.filter(o=>o.request_id===r.id).map(o=>`<div class="line"><strong>${escapeHtml(partners.find(p=>p.user_id===o.partner_id)?.display_name||'Partner')}</strong> · ${money(o.amount)} · ${escapeHtml(o.note)} <button data-accept="${o.id}" data-request="${r.id}">Accept offer</button></div>`).join('')||'<small>Waiting for offers.</small>'}<p><button class="secondary" data-close="cancelled" data-request="${r.id}">Cancel request</button></p>` : ''}${r.status==='booked'?`<p>Booking confirmed with ${escapeHtml(partners.find(p=>p.user_id===r.selected_partner)?.display_name||'your Partner')}. No payment has been collected.</p><button class="secondary" data-close="completed" data-request="${r.id}">Mark complete</button><p><button class="secondary" data-payment-demo="${r.id}">Pay by e-wallet or QR · test preview</button></p>`:''}${r.status==='booked'||r.status==='completed'?`<div class="line"><h4>Messages</h4><div class="messages" data-thread="${r.id}"></div>${r.status==='booked'?`<form class="message-form" data-id="${r.id}"><label>Message<textarea name="body" minlength="1" maxlength="2000" required></textarea></label><button>Send</button></form>`:''}</div>`:''}</article>`).join('') : '<p>No requests yet. Post one above.</p>';
  document.querySelectorAll('[data-thread]').forEach(el=>action(async()=>{
    const messages=check(await client.from('messages').select('sender_id,body,created_at').eq('request_id',el.dataset.thread).order('created_at'));
    el.innerHTML=messages.map(m=>`<p><strong>${m.sender_id===user.id?'You':'Partner'}:</strong> ${escapeHtml(m.body)}</p>`).join('')||'<small>No messages yet.</small>';
  }));
};
const signedIn = async session => {
  user=session?.user || null; show('#app',!!user); show('#auth',!user); show('#signout',!!user);
  if(user) await refresh(); else { $('#identity').textContent=''; partner=null; adminRole=null; activeTab='browse'; }
};
const init = async () => {
  if(!SUPABASE_URL.startsWith('https://') || SUPABASE_URL.includes('YOUR_PROJECT') || !SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY.includes('YOUR_')) { show('#setup',true); return; }
  client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
  const {data:{session}}=await client.auth.getSession(); await signedIn(session);
  client.auth.onAuthStateChange((_event,session)=>{ if(session?.user?.id!==user?.id) setTimeout(()=>action(()=>signedIn(session)),0); });
};
$('#login').onsubmit=e=>{e.preventDefault();action(async()=>{const {email,password}=formData(e.target);check(await client.auth.signInWithPassword({email,password}));e.target.reset();const {data:{session}}=await client.auth.getSession();await signedIn(session);});};
$('#signup').onsubmit=e=>{e.preventDefault();action(async()=>{const {email,password}=formData(e.target);const {data}=await client.auth.signUp({email,password});e.target.reset();if(data.session) await signedIn(data.session);else alertUser('Check your email to confirm your account, then sign in.');});};
$('#signout').onclick=()=>action(async()=>{check(await client.auth.signOut());await signedIn(null);});
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{activeTab=b.dataset.tab;render();});
$('#request-form').onsubmit=e=>{e.preventDefault();action(async()=>{const d=formData(e.target);check(await client.from('service_requests').insert({category:d.category,title:d.title,details:d.details,area:d.area,budget:Number(d.budget),customer_id:user.id}));e.target.reset();activeTab='mine';await reload('Request posted.');});};
$('#partner-form').onsubmit=e=>{e.preventDefault();action(async()=>{const d=formData(e.target);const services=d.services.split(',').map(s=>s.trim()).filter(Boolean).slice(0,20);if(!services.length)throw Error('Add at least one service.');check(await client.from('partner_profiles').upsert({user_id:user.id,display_name:d.display_name,services,service_area:d.service_area,bio:d.bio,available:e.target.elements.available.checked}));await reload('Partner profile saved.');});};
document.addEventListener('submit',e=>{if(e.target.matches('.offer-form')){e.preventDefault();action(async()=>{const d=formData(e.target);check(await client.from('offers').insert({request_id:e.target.dataset.id,partner_id:user.id,amount:Number(d.amount),note:d.note}));await reload('Offer sent.');});}if(e.target.matches('.message-form')){e.preventDefault();action(async()=>{check(await client.from('messages').insert({request_id:e.target.dataset.id,sender_id:user.id,body:formData(e.target).body.trim()}));e.target.reset();await reload('Message sent.');});}});
document.addEventListener('click',e=>{const accept=e.target.closest('[data-accept]');if(accept)action(async()=>{check(await client.rpc('accept_offer',{p_request:accept.dataset.request,p_offer:accept.dataset.accept}));await reload('Booking confirmed. No payment was charged.');});const close=e.target.closest('[data-close]');if(close)action(async()=>{check(await client.rpc('close_request',{p_request:close.dataset.request,p_status:close.dataset.close}));await reload('Request updated.');});const pay=e.target.closest('[data-payment-demo]');if(pay){const r=myRequests.find(x=>x.id===pay.dataset.paymentDemo);if(r)alertUser(`TEST PREVIEW: You would pay the agreed amount for ${r.title} using a verified e-wallet or QR Ph checkout. No payment link or QR is connected, no money is collected, and this booking remains unpaid.`);}});
action(init);
