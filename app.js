// Haastattelupolku – testiversio.
// Prototyypin polku sellaisenaan; ”Siirto Wilmaan” kytketty synteettiseen Wilma v2:een, joka
// pyörii selaimessa (wilma-silta.js). Periaate: sovellus täyttää, ihminen painaa Wilman omaa
// Tallenna-painiketta, sovellus lukee tallennetun takaisin ja vertaa. Kaikki tiedot keksittyjä.
(() => {
'use strict';

const W = window.WilmaSilta;

// ---- Keksitty data ----
const QUALIFICATIONS = [
  'Liiketoiminnan perustutkinto',
  'Tieto- ja viestintätekniikan perustutkinto',
  'Logistiikan perustutkinto',
  'Liiketoiminnan ammattitutkinto',
];
const CONTRACT_TYPES = ['Oppisopimus', 'Yrittäjän oppisopimus', 'Koulutussopimus'];
const PERIODS = ['1', '2', '3', '4', '5'];
// Synteettisen Wilman siemenestä (W.call('seed')) käynnistyksessä.
let SEED = null;
let PARTS = [];   // [{code: catalog_id, wcode, name}] = Virtanen Ainon (1101) HOPS-puun osat
let YEARS = [];   // lukuvuosien otsikot, esim. '2026–2027'
// Keksityt hakijat vastaavat synteettisen Wilman opiskelijoita, jotta sidonta onnistuu myöhemmin.
const APPLICANTS = [
  {name: 'Iiro Valkama', qual: 'Tieto- ja viestintätekniikan perustutkinto', employer: 'Keksitty Konepaja Oy', businessId: '2740173-6'},
  {name: 'Saga Åberg', qual: 'Liiketoiminnan perustutkinto', employer: 'Kukkakauppa Esimerkki Oy', businessId: '2740195-5'},
  {name: 'Pinja Ärmänen', qual: 'Logistiikan perustutkinto', employer: 'Testivarasto Ab', businessId: '2740162-1'},
];
const ADD_WORKPLACE = 'Lisää uusi työpaikka (';
const ADD_INSTRUCTOR = 'Lisää uusi työpaikkaohjaaja';

// Haastattelun osiot keskustelun järjestyksessä. Kenttäavaimet vastaavat profiilin loogisia avaimia.
const SECTIONS = [
  {id: 'perus', title: 'Perustiedot', lead: 'Kuka hakija on, mihin tutkintoon hän hakee ja millä sopimuksella.', goes: ['Opiskelijan sidonta', 'Henkilökohtaistaminen', 'Oppisopimus'], fields: [
    {k: 'name', label: 'Nimi', full: true},
    {k: 'qual', label: 'Haettava tutkinto', type: 'select', options: QUALIFICATIONS, full: true, hint: 'Avoimet koulutukset. Esitäytetty hakijatiedoista, vaihda tarvittaessa.'},
    {k: 'contractType', label: 'Sopimusmuoto', type: 'select', options: CONTRACT_TYPES, full: true, hint: 'Ratkaisee, mikä sopimuslomake Wilmaan täytetään.'},
    {k: 'start', label: 'Opiskeluaika alkaa', type: 'date'},
    {k: 'end', label: 'Opiskeluaika päättyy', type: 'date'},
  ]},
  {id: 'tyopaikka', title: 'Työpaikka', lead: 'Kysy ensin Y-tunnus. Samalla Y-tunnuksella voi olla useita toimipaikkoja, joten varmista toimipaikka.', goes: ['Työpaikkarekisteri', 'Oppisopimus'], fields: [
    {k: 'businessId', label: 'Y-tunnus', hint: 'Muoto 1234567-8'},
    {k: 'employer', label: 'Työpaikan nimi'},
    {k: 'street', label: 'Toimipaikan lähiosoite', full: true},
    {k: 'postal', label: 'Postinumero ja -toimipaikka'},
    {k: 'municipality', label: 'Paikkakunta', hint: 'Synteettisen Wilman listassa: Kouvola, Kotka, Hamina, Lahti.'},
    {k: 'wpPhone', label: 'Puhelin', optional: true},
    {k: 'wpEmail', label: 'Sähköposti', optional: true},
  ]},
  {id: 'ohjaaja', title: 'Ohjaaja', lead: 'Kuka ohjaa opiskelijaa työpaikalla? Yhteyshenkilö vain, jos se on eri henkilö.', goes: ['Ohjaajarekisteri', 'Oppisopimus'], fields: [
    {k: 'insName', label: 'Työpaikkaohjaajan nimi', full: true, hint: 'Etunimet ja sukunimi.'},
    {k: 'insPhone', label: 'Puhelin'},
    {k: 'insEmail', label: 'Sähköposti'},
    {k: 'contact', label: 'Työpaikan yhteyshenkilö', optional: true, full: true, hint: 'Jätä tyhjäksi, jos sama kuin ohjaaja.'},
  ]},
  {id: 'sopimus', title: 'Oppisopimus', lead: 'Sopimuksen ehdot. Palkkauksen voi jättää myöhemmäksi.', goes: ['Oppisopimus'], fields: [
    {k: 'tasks', label: 'Työtehtävät', type: 'textarea', full: true},
    {k: 'hours', label: 'Työaika (h/vko)', hint: 'Keskimäärin vähintään 25 h/vko'},
    {k: 'partTime', label: 'Osa-aikaisuus (%)', optional: true},
    {k: 'trialStart', label: 'Koeaika alkaa', type: 'date'},
    {k: 'trialEnd', label: 'Koeaika päättyy', type: 'date'},
    {k: 'salary', label: 'Palkkaus alkaessa (€)', optional: true},
    {k: 'signed', label: 'Sopimuksen solmimispäivä', type: 'date'},
  ]},
  {id: 'osat', title: 'Tutkinnon osat', lead: 'Mitkä osat tehdään ja milloin. Osan pitää olla HOKSissa ennen kuin se voidaan aikatauluttaa Wilmassa.', goes: ['Tutkintokoulutuksen suunnittelu', 'Näyttösuunnitelmat'], parts: true},
  {id: 'naytot', title: 'Näytöt', lead: 'Alustavat tiedot näyttösuunnitelmiin. Usein tarkentuvat myöhemmin; voit ohittaa osion.', goes: ['Näyttösuunnitelmat'], fields: [
    {k: 'demoEnv', label: 'Näyttöympäristö (työpaikka ja tehtävät)', type: 'textarea', full: true, optional: true},
    {k: 'demoPlan', label: 'Suunnitelma osaamisen osoittamisesta', type: 'textarea', full: true, optional: true, hint: 'Menee jokaisen ammattitaitovaatimuksen riville. Näytön arviointia sovellus ei täytä.'},
    {k: 'demoStart', label: 'Näyttö alkaa', type: 'date', optional: true},
    {k: 'demoEnd', label: 'Näyttö päättyy', type: 'date', optional: true},
  ]},
  {id: 'ura', title: 'Urasuunnitelma', lead: 'Opiskelijan omat suunnitelmat. Kirjaa hänen sanoillaan.', goes: ['Urasuunnitelma'], fields: [
    {k: 'further', label: 'Jatko-opinnot', type: 'textarea', full: true},
    {k: 'working', label: 'Työelämään siirtyminen', type: 'textarea', full: true},
    {k: 'career', label: 'Uralla eteneminen', type: 'textarea', full: true, optional: true},
    {k: 'docDate', label: 'Laatimispäivä', type: 'date', hint: 'Esitäytetty haastattelun päivästä'},
    {k: 'participants', label: 'Laatimiseen osallistuneet', hint: 'Esitäytetty: hakija ja haastattelija'},
  ]},
  {id: 'yhteenveto', title: 'Yhteenveto', lead: 'Mitä kullekin Wilman lomakkeelle on kertynyt. Puuttuvat tiedot voi täydentää nyt tai myöhemmin.', summary: true},
];

// Wilman lomakkeet siirtojärjestyksessä ja niiden vaatimat haastattelukentät.
const FORMS = [
  {id: 'sidonta', title: 'Opiskelijan sidonta', what: 'Etsitään hakija Wilmasta opiskelijana', needs: ['name']},
  {id: 'hk', title: 'Henkilökohtaistaminen', what: 'Opintojen alku- ja loppupäivämäärä', needs: ['start', 'end']},
  {id: 'tyopaikka', title: 'Työpaikka', what: 'Rekisteri: haku Y-tunnuksella, uusi vain jos ei löydy', needs: ['businessId', 'employer'], group: 'Rekisteri'},
  {id: 'ohjaaja', title: 'Työpaikkaohjaaja', what: 'Rekisteri: haku nimellä, uusi työpaikan alle', needs: ['insName'], group: 'Rekisteri'},
  {id: 'sopimus', title: 'Oppisopimus', what: 'Sopimuslomake sopimusmuodon mukaan', needs: ['contractType', 'qual', 'start', 'end', 'tasks', 'hours', 'signed']},
  {id: 'polku', title: 'Tutkintokoulutuksen suunnittelu', what: 'Tutkinnon osien lukuvuosi ja jakso (opintopolku)', needs: ['@parts']},
  {id: 'ura', title: 'Urasuunnitelma', what: 'Uusi urasuunnitelma, ellei jo ole', needs: ['further', 'working']},
  {id: 'naytot', title: 'Näyttösuunnitelmat', what: 'Suunnitelmaosa tutkinnon osittain. Arviointiosaa sovellus ei täytä.', needs: ['@parts', 'demoEnv', 'demoPlan']},
];
function formTitle(st, f) { return f.id === 'sopimus' && st && st.v.contractType ? st.v.contractType : f.title; }
function formUnsupported(st, f) { return f.id === 'sopimus' && st && st.v.contractType && st.v.contractType !== 'Oppisopimus'; }
const FIELD = {};
SECTIONS.forEach(s => (s.fields || []).forEach(f => { FIELD[f.k] = f; }));
const PICK = {
  sidonta: ['name', 'qual'], hk: ['start', 'end'], tyopaikka: ['businessId', 'employer', 'street', 'postal', 'municipality', 'wpPhone', 'wpEmail'],
  ohjaaja: ['insName', 'insPhone', 'insEmail', 'contact'], sopimus: ['contractType', 'qual', 'start', 'end', 'tasks', 'hours', 'partTime', 'trialStart', 'trialEnd', 'salary', 'signed'],
  polku: ['@parts'], ura: ['further', 'working', 'career', 'docDate', 'participants'], naytot: ['@parts', 'demoEnv', 'demoPlan', 'demoStart', 'demoEnd'],
};
const LABELS = {};
SECTIONS.forEach(s => (s.fields || []).forEach(f => { LABELS[f.k] = f.label; }));
LABELS['@parts'] = 'vähintään yksi tutkinnon osa aikataulutettuna';
const DATE_KEYS = new Set(['start', 'end', 'trialStart', 'trialEnd', 'signed', 'docDate', 'demoStart', 'demoEnd']);

const PHASES = [
  {id: 'interview', short: 'Haastattelu', long: 'Haastattelu'},
  {id: 'waiting', short: 'Opiskelijaksi', long: 'Odottaa opiskelijaksi Wilmaan'},
  {id: 'transfer', short: 'Siirto', long: 'Siirto Wilmaan'},
  {id: 'done', short: 'Valmis', long: 'Valmis'},
];
const STEP_LABELS = ['Tarkista tiedot', 'Sovellus täyttää', 'Tallenna Wilmassa', 'Tarkista tallennus'];

function today() { const d = new Date(); return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`; }

function initialState() {
  const y0 = YEARS[0] || '';
  return {
    space: 'interviews', screen: 'list', studentId: null, search: null, view: 'app',
    students: [
      {id: 's1', phase: 'interview', section: 2, savedAt: '9.42', prefilled: ['name', 'qual', 'contractType', 'employer', 'businessId'],
        v: {name: 'Leo Östman', qual: 'Liiketoiminnan perustutkinto', contractType: 'Oppisopimus', start: '1.12.2026', end: '30.11.2028', businessId: '2740151-7', employer: 'Synteettinen Kahvila Oy', street: 'Kahvikuja 1', postal: '45100 Kouvola', municipality: 'Kouvola'},
        parts: {}, transfer: null},
      {id: 's2', phase: 'waiting', section: 7, savedAt: 'eilen', prefilled: ['name', 'qual', 'employer', 'businessId'],
        v: {name: 'Aino Virtanen', qual: 'Liiketoiminnan perustutkinto', contractType: 'Oppisopimus', start: '15.11.2026', end: '14.11.2028',
          businessId: (SEED && SEED.new_business_id) || '2740184-0', employer: 'Leipomo Esimerkki Oy', street: 'Leipurinkatu 4', postal: '45100 Kouvola', municipality: 'Kouvola', wpPhone: '040 000 0201', wpEmail: 'leipomo@example.test',
          insName: 'Sanna Koskinen', insPhone: '040 000 1204', insEmail: 'sanna@example.test',
          tasks: 'Asiakaspalvelu ja myynti leipomomyymälässä', hours: '38', trialStart: '15.11.2026', trialEnd: '14.5.2027', signed: '10.11.2026',
          demoEnv: 'Leipomomyymälä: asiakaspalvelu, kassatyö ja tuotteiden esillepano', demoPlan: 'Opiskelija työskentelee myymälässä tavallisessa työvuorossa, ohjaaja havainnoi.', demoStart: '1.3.2027', demoEnd: '31.3.2027',
          further: 'Ei suunnitelmia nyt.', working: 'Jatkaa nykyisessä työpaikassa.', docDate: '1.11.2026', participants: 'Hakija ja haastattelija'},
        parts: {'8101': {on: true, year: y0, period: '2'}, '8102': {on: true, year: y0, period: '3'}}, transfer: null},
      {id: 's3', phase: 'transfer', section: 7, savedAt: '29.10.', prefilled: ['name', 'qual'], sid: '1105', wilmaName: 'Lahtinen Eero',
        v: {name: 'Eero Lahtinen', qual: 'Logistiikan perustutkinto', contractType: 'Oppisopimus', start: '1.11.2026', end: '31.10.2028',
          businessId: '2740162-1', employer: 'Testivarasto Ab', street: 'Varastotie 2', postal: '48100 Kotka', municipality: 'Kotka', wpPhone: '040 000 0102', wpEmail: 'varasto@example.test',
          insName: 'Pekka Mäkinen', insPhone: '040 000 1103', insEmail: 'pekka@example.test',
          tasks: 'Varastotyö ja keräily', hours: '38', trialStart: '1.11.2026', trialEnd: '30.4.2027', signed: '25.10.2026',
          demoEnv: 'Varaston keräily ja lähetys', demoPlan: 'Keräily- ja lähetystyö tavallisessa työvuorossa.',
          further: 'Ammattikorkeakoulu myöhemmin.', working: 'Vakituinen paikka nykyisessä työpaikassa.', docDate: '29.10.2026', participants: 'Hakija ja haastattelija'},
        parts: {'8105': {on: true, year: y0, period: '2'}}, transfer: {done: 1, step: 0, log: ['real']}},
    ],
  };
}
let state = null;
let pending = null;   // {studentId}: odotetaan käyttäjän tallennusta Wilmassa

// ---- Apufunktiot ----
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const cur = () => state.students.find(s => s.id === state.studentId);
const filled = (st, k) => k === '@parts' ? Object.values(st.parts).some(p => p.on && p.year && p.period) : !!String(st.v[k] || '').trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));
function announce(t) { $('#announcer').textContent = t; }
function norm(s) { return String(s ?? '').replace(/\r\n/g, '\n').trim().replace(/[ \t]+/g, ' '); }
function normDate(s) {
  const m = norm(s).match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  return m ? `${m[1].padStart(2, '0')}.${m[2].padStart(2, '0')}.${m[3]}` : norm(s);
}
function splitName(name) {
  const t = norm(name).split(' ').filter(Boolean);
  if (t.length < 2) return [t.join(' '), ''];
  const last = t.pop();
  return [t.join(' '), last];
}
function partsOf(sid) { return (SEED && sid && SEED.parts[sid]) || []; }
function hasTree(st) { return partsOf(st.sid).length > 0; }
function partName(cid) { const p = PARTS.find(x => x.code === cid); return p ? `${p.wcode} ${p.name}` : cid; }
function selectedParts(st) {
  return PARTS.filter(p => { const v = st.parts[p.code]; return v && v.on && v.year && v.period; })
    .filter(p => partsOf(st.sid).some(w => w.catalog_id === p.code));
}
function cidFor(st) { const sel = selectedParts(st); return sel.length ? sel[0].code : (partsOf(st.sid)[0] || {}).catalog_id; }

function sectionStatus(st, sec) {
  if (sec.summary) return null;
  if (sec.parts) return filled(st, '@parts') ? 'full' : 'empty';
  const req = sec.fields.filter(f => !f.optional);
  if (!req.length) return sec.fields.some(f => filled(st, f.k)) ? 'full' : 'empty';
  const n = req.filter(f => filled(st, f.k)).length;
  return n === 0 ? 'empty' : (n === req.length ? 'full' : 'partial');
}
function formMissing(st, form) { return form.needs.filter(k => !filled(st, k)); }
function phaseIndex(st) { return PHASES.findIndex(p => p.id === st.phase); }
function phaseText(st) {
  if (st.phase === 'interview') return `Haastattelu kesken · osio ${st.section + 1}/${SECTIONS.length}`;
  if (st.phase === 'waiting') return 'Odottaa opiskelijaksi Wilmaan';
  if (st.phase === 'transfer') return `Siirto kesken · lomake ${st.transfer.done + 1}/${FORMS.length}`;
  return 'Kaikki lomakkeet käsitelty';
}
function nowTime() { const d = new Date(); return `${d.getHours()}.${String(d.getMinutes()).padStart(2, '0')}`; }

// Mitä synteettinen Wilma v2 tukee kunkin lomakkeen kohdalla.
function support(st, f) {
  if (f.id === 'hk') return {mode: 'sim', reason: 'Ei vielä synteettisessä Wilmassa – simuloitu. Henkilökohtaistamisen lomaketta ei ole kartoitettu.'};
  if (f.id === 'sopimus') {
    if (formUnsupported(st, f)) return {mode: 'manual'};
    if (!hasTree(st)) return {mode: 'sim', reason: 'Opiskelijalla ei ole synteettisessä Wilmassa HOPS-puuta, joten oppisopimuslomaketta ei voi avata – simuloitu.'};
    return {mode: 'partial', reason: 'Sovellus avaa oppisopimuslomakkeen ja hakee työnantajan ja ohjaajan, mutta tallennus ei vielä toimi synteettisessä Wilmassa (D2) – simuloitu.'};
  }
  if (f.id === 'polku' || f.id === 'naytot') {
    if (!hasTree(st)) return {mode: 'sim', reason: 'Opiskelijalla ei ole synteettisessä Wilmassa HOPS-puuta (vain Virtanen Aino 1101:llä on) – simuloitu.'};
    if (!selectedParts(st).length) return {mode: 'sim', reason: 'Valittuja tutkinnon osia ei ole opiskelijan HOPS-puussa – simuloitu.'};
  }
  return {mode: 'real'};
}

// ---- Renderöinti ----
function render() {
  renderSpaces();
  renderWhere();
  const st = cur();
  let html = '';
  if (state.screen === 'new') html = viewNew();
  else if (state.screen === 'interview' && st) html = viewInterview(st);
  else if (state.screen === 'transfer' && st) html = viewTransfer(st);
  else html = state.space === 'interviews' ? viewInterviewList() : viewTransferList();
  $('#main').innerHTML = html;
  renderActions();
}

function renderSpaces() {
  const ivCount = state.students.filter(s => s.phase === 'interview').length;
  const trCount = state.students.filter(s => s.phase === 'waiting' || s.phase === 'transfer').length;
  const item = (id, ico, title, small, count) =>
    `<button class="space" data-space="${id}"${state.space === id ? ' aria-current="page"' : ''}><span class="ico">${ico}</span><span><strong>${title}</strong><small>${small}</small></span><span class="count">${count}</span></button>`;
  $('#spaces').innerHTML = item('interviews', '1', 'Haastattelut', 'Kirjaa tiedot keskustelussa', ivCount) +
    item('transfer', '2', 'Siirto Wilmaan', 'Lomake kerrallaan', trCount);
}

function renderWhere() {
  const st = cur();
  const el = $('#where');
  if (!st || state.screen === 'list' || state.screen === 'new') { el.hidden = true; return; }
  el.hidden = false;
  const pi = phaseIndex(st);
  const rail = PHASES.map((p, i) => {
    const cls = i < pi ? 'done' : (i === pi ? 'current' : '');
    return `<li class="${cls}"${i === pi ? ' aria-current="step"' : ''}><span class="dot">${i < pi ? '✓' : i + 1}</span><span><span class="lbl-short">${esc(p.short)}</span></span>${i === pi ? '<span class="here">Olet tässä</span>' : ''}</li>`;
  }).join('');
  let sub = '';
  if (state.screen === 'interview') {
    const sec = SECTIONS[st.section];
    const doneN = SECTIONS.filter(s => sectionStatus(st, s) === 'full').length;
    sub = `<div class="sub"><span>Osio <strong>${st.section + 1}/${SECTIONS.length}</strong>: <strong>${esc(sec.title)}</strong></span><div class="bar" aria-hidden="true"><span style="width:${Math.round((st.section + 1) / SECTIONS.length * 100)}%"></span></div><span class="muted">${doneN}/${SECTIONS.length - 1} osiota valmiina</span></div>`;
  } else if (state.screen === 'transfer' && st.phase !== 'done') {
    const n = st.transfer ? st.transfer.done : 0;
    const f = FORMS[n];
    sub = `<div class="sub"><span>Lomake <strong>${n + 1}/${FORMS.length}</strong>: <strong>${esc(formTitle(st, f))}</strong></span><div class="bar" aria-hidden="true"><span style="width:${Math.round(n / FORMS.length * 100)}%"></span></div><span class="muted">${n}/${FORMS.length} käsitelty</span></div>`;
  }
  const back = state.space === 'interviews' ? 'Kaikki haastattelut' : 'Siirtojono';
  const wilma = st.sid ? ` · Wilmassa ${esc(st.wilmaName || '')} (${esc(st.sid)})` : '';
  el.innerHTML = `<div class="where-top"><span class="where-name">${esc(st.v.name || 'Uusi hakija')}</span><span class="where-detail">${esc(st.v.qual || '')}${wilma}</span><button class="where-back" data-go="list">← ${back}</button></div><ol class="rail" aria-label="Opiskelijan polku">${rail}</ol>${sub}`;
}

function miniRail(st) {
  const pi = phaseIndex(st);
  return `<div class="mini-wrap"><div class="mini" aria-hidden="true">${PHASES.map((p, i) => `<i class="${i < pi ? 'done' : (i === pi ? 'current' : '')}"></i>`).join('')}</div><div class="mini-label">${esc(phaseText(st))}</div></div>`;
}

function viewInterviewList() {
  const open = state.students.filter(s => s.phase === 'interview');
  const ready = state.students.filter(s => s.phase !== 'interview');
  const row = (st, btn) => `<li class="row"><div><div class="row-name">${esc(st.v.name)}</div><div class="row-detail">${esc(st.v.qual)} · tallennettu ${esc(st.savedAt)}</div></div>${miniRail(st)}${btn}</li>`;
  return `<header class="page-head"><div class="eyebrow">Työtila 1 · Haastattelut</div><h1 tabindex="-1" id="h">Haastattelut</h1><p>Kirjaa tiedot keskustelun aikana. Wilmaa ei tarvita. Tässä testiversiossa tiedot ovat vain selaimen muistissa.</p></header>
  <div class="panel"><div class="panel-head"><h3>Aloita</h3></div><button class="btn primary big" data-go="new">+ Uusi haastattelu</button></div>
  <div class="panel"><div class="group-title">Kesken</div><ul class="list">${open.map(s => row(s, `<button class="btn primary" data-open="${s.id}">Jatka</button>`)).join('') || '<li class="no-rows">Ei keskeneräisiä haastatteluja.</li>'}</ul></div>
  <div class="panel"><div class="group-title">Haastateltu</div><ul class="list">${ready.map(s => row(s, `<button class="btn" data-open-iv="${s.id}">Avaa</button>`)).join('')}</ul></div>`;
}

function viewNew() {
  const s = state.search;
  let results = '';
  if (s && s.done) {
    const hits = APPLICANTS.filter(a => a.name.toLowerCase().includes(s.q.toLowerCase()));
    results = hits.length
      ? `<div class="cards">${hits.map(a => `<button class="card" data-pick="${APPLICANTS.indexOf(a)}"><span><strong>${esc(a.name)}</strong><span class="facts"><span>Hakee: <b>${esc(a.qual)}</b></span><span>Työpaikka: <b>${esc(a.employer)}</b></span><span>Y-tunnus: <b>${esc(a.businessId)}</b></span></span></span></button>`).join('')}</div><p class="small muted" style="margin-top:10px">Valitse oikea hakija. Nimi, tutkinto, työpaikka ja Y-tunnus esitäytetään.</p>`
      : `<div class="note warn" style="margin-top:14px">Hakijaa ei löytynyt. Voit aloittaa haastattelun ilman esitäyttöä ja kirjoittaa tiedot itse.</div>`;
  } else if (s && s.busy) {
    results = `<p class="small muted" style="margin-top:12px"><span class="spinner"></span> Haetaan hakijoista…</p>`;
  }
  return `<header class="page-head"><div class="eyebrow">Uusi haastattelu · ennen osiota 1</div><h1 tabindex="-1" id="h">Kenen kanssa puhut?</h1><p>Hae hakija, niin perustiedot esitäytetään. Kokeile esimerkiksi ”Iiro” tai ”Saga”.</p></header>
  <div class="panel"><div class="panel-head"><h3>Hae hakija</h3><span class="badge sim">Simuloitu hakijahaku</span></div>
  <p class="small muted" style="margin-bottom:12px">Synteettisessä Wilmassa ei ole hakijarekisteriä. Keksityt hakijat vastaavat sen opiskelijoita, joten sidonta onnistuu siirrossa.</p>
  <div class="search"><label class="sr-only" for="q">Hakijan nimi</label><input class="control" id="q" placeholder="Hakijan nimi" value="${esc(s ? s.q : '')}" autocomplete="off"><button class="btn primary" id="do-search">Hae</button></div>${results}</div>
  <div class="panel"><div class="panel-head"><h3>Tai aloita ilman esitäyttöä</h3></div><p class="small muted" style="margin-bottom:12px">Esimerkiksi kun hakija ei vielä näy Wilmassa tai tiedot ladataan myöhemmin muualta.</p><button class="btn" id="blank">Aloita tyhjästä</button></div>`;
}

function fieldHtml(st, f, missing) {
  const val = st.v[f.k] || '';
  const pre = st.prefilled.includes(f.k) && val;
  const cls = 'control' + (pre ? ' prefilled' : '');
  let ctl;
  if (f.type === 'select') ctl = `<select class="${cls}" id="f-${f.k}" data-k="${f.k}"><option value="">Valitse…</option>${f.options.map(o => `<option${o === val ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  else if (f.type === 'textarea') ctl = `<textarea class="${cls}" id="f-${f.k}" data-k="${f.k}" rows="3">${esc(val)}</textarea>`;
  else ctl = `<input class="${cls}" id="f-${f.k}" data-k="${f.k}" value="${esc(val)}"${f.type === 'date' ? ' placeholder="pp.kk.vvvv" inputmode="numeric"' : ''} autocomplete="off">`;
  return `<label class="field${f.full ? ' full' : ''}${missing ? ' missing' : ''}" for="f-${f.k}" data-field="${f.k}"><span class="lbl">${esc(f.label)}${missing ? '<span class="miss-chip">Puuttuu</span>' : ''}${f.optional ? '<span class="opt">valinnainen</span>' : ''}${pre ? '<span class="src">Hakijatiedoista</span>' : ''}</span>${ctl}${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}</label>`;
}

function partsHtml(st, highlight) {
  const rows = PARTS.map(p => {
    const v = st.parts[p.code] || {};
    const rowMissing = highlight && v.on && !(v.year && v.period);
    const label = `${p.wcode} ${p.name}`;
    return `<tr${rowMissing ? ' class="missing"' : ''}><td><input type="checkbox" data-part="${p.code}" data-pk="on"${v.on ? ' checked' : ''} aria-label="${esc(label)}"></td><td>${esc(label)}</td><td><select class="control" data-part="${p.code}" data-pk="year"${v.on ? '' : ' disabled'} aria-label="Lukuvuosi: ${esc(label)}"><option value="">–</option>${YEARS.map(y => `<option${y === v.year ? ' selected' : ''}>${esc(y)}</option>`).join('')}</select></td><td><select class="control" data-part="${p.code}" data-pk="period"${v.on ? '' : ' disabled'} aria-label="Jakso: ${esc(label)}"><option value="">–</option>${PERIODS.map(y => `<option${y === v.period ? ' selected' : ''}>${y}</option>`).join('')}</select></td></tr>`;
  }).join('');
  const none = highlight && !filled(st, '@parts') ? '<div class="check-head warn" style="margin-bottom:10px"><span class="miss-chip">Puuttuu</span> Valitse vähintään yksi osa ja sille lukuvuosi ja jakso.</div>' : '';
  return `${none}<div class="table-wrap"><table class="parts"><thead><tr><th><span class="sr-only">Valittu</span></th><th>Tutkinnon osa</th><th>Lukuvuosi</th><th>Jakso</th></tr></thead><tbody>${rows}</tbody></table></div><div class="hint">Osat ovat synteettisen Wilman HOPS-puusta. Jaksoa ”muu” ei käytetä.</div>`;
}

function summaryHtml(st) {
  const items = FORMS.map(f => {
    const miss = formMissing(st, f);
    return `<li><span class="${miss.length ? 'miss' : 'ok'}">${miss.length ? '!' : '✓'}</span><span><strong>${esc(formTitle(st, f))}</strong><small>${formUnsupported(st, f) ? 'Ei vielä tuettu: tehdään käsin Wilmassa. ' : ''}${miss.length ? 'Puuttuu: ' + miss.map(k => esc(LABELS[k] || k)).join(', ') : 'Valmis siirtoon'}</small></span>${miss.length ? `<button class="btn slim" data-jump-field="${esc(miss[0])}">Täydennä</button>` : '<span class="badge ok">Valmis</span>'}</li>`;
  }).join('');
  const missingAny = FORMS.some(f => formMissing(st, f).length);
  return `<ul class="summary">${items}</ul>${missingAny ? '<div class="note warn" style="margin-top:14px">Voit merkitä haastattelun valmiiksi, vaikka tietoja puuttuu. Puuttuvat tiedot kysytään ennen kyseisen lomakkeen siirtoa.</div>' : '<div class="note good" style="margin-top:14px">Kaikki lomakkeet ovat valmiita siirtoon.</div>'}`;
}

function viewInterview(st) {
  const sec = SECTIONS[st.section];
  const nav = SECTIONS.map((s, i) => {
    const ss = sectionStatus(st, s);
    const mark = s.summary ? '≡' : (ss === 'full' ? '✓' : '');
    return `<li><button data-sec="${i}"${i === st.section ? ' aria-current="step"' : ''}><span class="sec-st ${ss || ''}" data-secst="${i}">${mark || i + 1}</span><span class="name">${esc(s.title)}</span></button></li>`;
  }).join('');
  let body;
  if (sec.summary) body = summaryHtml(st);
  else if (sec.parts) body = partsHtml(st);
  else body = `<div class="fields">${sec.fields.map(f => fieldHtml(st, f)).join('')}</div>`;
  const readonly = st.phase !== 'interview' ? '<div class="note" style="margin-bottom:14px">Haastattelu on merkitty valmiiksi. Muutokset tallentuvat ja näkyvät siirrossa.</div>' : '';
  return `<div class="iv"><nav aria-label="Haastattelun osiot"><ol class="sections">${nav}</ol><div class="legend"><span class="sec-st"></span>tyhjä<br><span class="sec-st partial"></span>kesken<br><span class="sec-st full"></span>valmis</div></nav>
  <section><header class="page-head"><div class="eyebrow">Haastattelu · osio ${st.section + 1} / ${SECTIONS.length}</div><h1 tabindex="-1" id="h">${esc(sec.title)}</h1><p>${esc(sec.lead)}</p></header>${readonly}
  <div class="panel">${body}${sec.goes ? `<div class="goes">Menee Wilmassa: ${sec.goes.map(g => `<span>${esc(g)}</span>`).join('')}</div>` : ''}</div></section></div>`;
}

function viewTransferList() {
  const waiting = state.students.filter(s => s.phase === 'waiting');
  const going = state.students.filter(s => s.phase === 'transfer');
  const done = state.students.filter(s => s.phase === 'done');
  const row = (st, btn) => `<li class="row"><div><div class="row-name">${esc(st.v.name)}</div><div class="row-detail">${esc(st.v.qual)}</div></div>${miniRail(st)}${btn}</li>`;
  return `<header class="page-head"><div class="eyebrow">Työtila 2 · Siirto Wilmaan</div><h1 tabindex="-1" id="h">Siirto Wilmaan</h1><p>Valmiit haastattelut siirretään lomake kerrallaan. Sovellus täyttää, sinä tallennat Wilmassa, sovellus tarkistaa tallennuksen. Wilma on oikealla (kapeassa ikkunassa Wilma-välilehdellä).</p></header>
  <div class="panel"><div class="group-title">Siirto kesken</div><ul class="list">${going.map(s => row(s, `<button class="btn primary" data-open-tr="${s.id}">Jatka siirtoa</button>`)).join('') || '<li class="no-rows">Ei keskeneräisiä siirtoja.</li>'}</ul></div>
  <div class="panel"><div class="group-title">Odottaa opiskelijaksi Wilmaan</div><p class="small muted" style="margin-bottom:6px">Hakijalla ei vielä ole opiskelijastatusta eikä opintokorttia. Tarkista tilanne, kun opiskeluoikeus on tehty.</p><ul class="list">${waiting.map(s => row(s, `<button class="btn" data-open-tr="${s.id}">Tarkista Wilmasta</button>`)).join('') || '<li class="no-rows">Ei odottavia.</li>'}</ul></div>
  <div class="panel"><div class="group-title">Valmiit</div><ul class="list">${done.map(s => row(s, '<span class="badge ok">Valmis</span>')).join('') || '<li class="no-rows">Ei vielä valmiita.</li>'}</ul></div>`;
}

function readout(st, form) {
  const pick = PICK[form.id].filter(k => k !== '@parts');
  const parts = PICK[form.id].includes('@parts') ? PARTS.filter(p => (st.parts[p.code] || {}).on).map(p => `<div><dt>${esc(`${p.wcode} ${p.name}`)}</dt><dd>${esc(st.parts[p.code].year || '–')}, jakso ${esc(st.parts[p.code].period || '–')}</dd></div>`).join('') : '';
  return `<dl class="readout">${parts}${pick.map(k => `<div class="${['tasks', 'further', 'working', 'career', 'demoEnv', 'demoPlan'].includes(k) ? 'long' : ''}"><dt>${esc(LABELS[k])}</dt><dd>${esc(st.v[k] || '–')}</dd></div>`).join('')}</dl>`;
}

function cmpTable(rows) {
  return `<div class="table-wrap"><table class="cmp"><thead><tr><th scope="col">Kenttä</th><th scope="col">Hyväksytty</th><th scope="col">Tallennettu Wilmaan</th><th scope="col">Tila</th></tr></thead><tbody>${rows.map(r => `<tr class="${r.ok ? '' : 'diff'}"><th scope="row">${esc(r.label)}</th><td>${esc(r.expected || '–')}</td><td>${esc(r.saved || '–')}</td><td>${r.ok ? '<span class="badge ok">Täsmää</span>' : '<span class="badge warn">Eroaa</span>'}</td></tr>`).join('')}</tbody></table></div>`;
}

function stepsHtml(tr) {
  return `<ol class="steps4" aria-label="Lomakkeen vaiheet">${STEP_LABELS.map((t, i) => `<li class="${i < tr.step ? 'done' : (i === tr.step ? 'current' : '')}${i === 2 ? ' you' : ''}"${i === tr.step ? ' aria-current="step"' : ''}><span>${i + 1}/4</span><b>${t}</b></li>`).join('')}</ol>`;
}

const SHOW_WILMA = '<button class="btn slim narrow-only" data-view="wilma">Näytä Wilma →</button>';

function viewTransfer(st) {
  if (st.phase === 'done') {
    const sims = (st.transfer.log || []).filter(x => x === 'sim').length;
    return `<header class="page-head"><div class="eyebrow">Siirto Wilmaan · valmis</div><h1 tabindex="-1" id="h">Kaikki lomakkeet käsitelty</h1><p>Tiedot on tallennettu synteettiseen Wilmaan ja luettu sieltä uudelleen.${sims ? ` ${sims} kohtaa oli simuloitu, koska synteettinen Wilma ei vielä tue niitä.` : ''}</p></header><div class="turn ok"><span class="big">✓</span><div><h3>${esc(st.v.name)}: valmis</h3><p>Testiversiossa haastattelu ja Wilman tila ovat vain selaimen muistissa. ”Palauta alkutilaan” aloittaa alusta.</p></div></div>`;
  }
  const tr = st.transfer;
  const forms = FORMS.map((f, i) => {
    const cls = i < tr.done ? 'done' : (i === tr.done ? 'current' : 'locked');
    const was = (tr.log || [])[i];
    const note = i < tr.done ? (was === 'sim' ? 'Simuloitu' : (was === 'manual' ? 'Tehty käsin' : 'Varmennettu')) : (i === tr.done ? 'Nyt' : (f.group ? f.group : `Odottaa: ${formTitle(st, FORMS[i - 1]).toLowerCase()}`));
    return `<li class="${cls}"${i === tr.done ? ' aria-current="step"' : ''}><span class="st">${i < tr.done ? '✓' : i + 1}</span><span><span class="fname">${esc(formTitle(st, f))}</span><small>${esc(note)}</small></span></li>`;
  }).join('');
  const form = FORMS[tr.done];
  const head = (extra) => `<header class="page-head"><div class="eyebrow">Siirto · lomake ${tr.done + 1} / ${FORMS.length}</div><h1 tabindex="-1" id="h">${esc(formTitle(st, form))}</h1><p>${esc(form.what)}${form.what.endsWith('.') ? '' : '.'}${extra || ''}</p></header>`;
  let inner;
  if (form.id === 'sidonta') {
    inner = head() + bindView(st, tr);
  } else {
    const sup = support(st, form);
    const notes = [];
    if (sup.mode === 'sim' || sup.mode === 'partial') notes.push(`<div class="note sim"><span class="badge sim">Simuloitu</span> ${esc(sup.reason)}</div>`);
    else if (sup.mode === 'real') notes.push('<div class="note good">Toimii oikeasti synteettisessä Wilmassa: täyttö, tallennuksen tunnistus ja takaisinluku.</div>');
    if (tr.failed) notes.push(`<div class="note warn">Täyttö ei onnistunut synteettisessä Wilmassa: ${esc(tr.failed)} Kohta on merkitty simuloiduksi.</div>`);
    if (tr.info) notes.push(`<div class="note">${esc(tr.info)}</div>`);
    const noteHtml = notes.length ? `<div class="notes">${notes.join('')}</div>` : '';
    let body = '';
    if (tr.step === 0 && sup.mode === 'manual') {
      body = `<div class="note warn" style="margin-bottom:14px">${esc(st.v.contractType)} ei ole vielä sovelluksen tukema. Tee lomake käsin Wilmassa ja merkitse se tehdyksi.</div><div class="panel">${readout(st, form)}</div>`;
    } else if (tr.step === 0) {
      body = `<div id="check-head">${checkHead(st, form)}</div><div class="panel"><div class="panel-head"><h3>Wilma / ${esc(formTitle(st, form))}</h3><span class="badge accent">Muokattavissa</span></div>${editFields(st, form)}<div class="hint" style="margin-top:14px">Muutokset tallentuvat myös haastatteluun.</div></div>`;
    } else if (tr.step === 1) {
      body = `<div class="turn"><span class="spinner"></span><div><h3>Sovellus täyttää lomaketta Wilmassa…</h3><p>Seuraa Chrome-paneelia. Älä koske Wilmaan sillä aikaa.</p></div>${SHOW_WILMA}</div><div class="panel">${readout(st, form)}</div>`;
    } else if (tr.step === 2) {
      const queue = tr.queue && tr.queue.length > 1 ? ` Tutkinnon osa ${tr.qi + 1}/${tr.queue.length}: ${esc(partName(tr.queue[tr.qi]))}.` : '';
      if (tr.sim) {
        body = `<div class="turn info"><span class="big">≈</span><div><h3>Simuloitu tallennus</h3><p>${sup.mode === 'partial' && !tr.failed ? 'Lomake on avattu ja haut tehty Wilmassa (korostettu). Tallennus ei vielä toimi synteettisessä Wilmassa; jos painat siellä Tallenna, Wilma vastaa virheellä. ' : ''}Jatka painamalla ”Tallensin (simuloitu)”.</p></div>${sup.mode === 'partial' ? SHOW_WILMA : ''}</div><div class="panel"><div class="panel-head"><h3>Wilma / ${esc(formTitle(st, form))}</h3><span class="badge sim">Simuloitu</span></div>${readout(st, form)}</div>`;
      } else {
        body = `<div class="turn"><span class="big" aria-hidden="true">→</span><div><h3>Nyt sinun vuorosi Wilmassa</h3><p>Tarkista korostetut kentät ja paina Wilman omaa Tallenna-painiketta.${queue} Voit muuttaa arvoja ennen tallennusta. Sovellus huomaa tallennuksen itse.</p></div>${SHOW_WILMA}</div><div class="panel">${readout(st, form)}</div>`;
      }
    } else {
      body = resultView(st, tr, form);
    }
    inner = head() + stepsHtml(tr) + noteHtml + body;
  }
  return `<div class="tr"><nav aria-label="Lomakkeet"><ol class="forms">${forms}</ol></nav><section>${inner}</section></div>`;
}

function resultView(st, tr, form) {
  if (tr.manual) {
    return `<div class="turn info"><span class="big">✓</span><div><h3>Tehty käsin Wilmassa</h3><p>${esc(st.v.contractType)} ei ole sovelluksen tukema, joten sitä ei täytetty eikä luettu takaisin.</p></div></div><div class="panel">${readout(st, form)}</div>`;
  }
  if (tr.sim) {
    return `<div class="turn info"><span class="big">≈</span><div><h3>Simuloitu</h3><p>Takaisinlukua ei ole, koska tallennus ei toimi synteettisessä Wilmassa. Haastattelun tiedot alla.</p></div></div><div class="panel">${readout(st, form)}</div>`;
  }
  const res = tr.result || {rows: []};
  const ok = res.rows.every(r => r.ok);
  let turn;
  if (res.existing && ok) turn = `<div class="turn ok"><span class="big">✓</span><div><h3>${esc(res.title || 'Löytyi Wilmasta')}</h3><p>Olemassa olevaa ei luotu uudelleen. Tiedot täsmäävät haastatteluun.</p></div></div>`;
  else if (res.existing) turn = `<div class="turn"><span class="big">!</span><div><h3>${esc(res.title || 'Löytyi Wilmasta')}: tiedot eroavat</h3><p>Olemassa olevaa ei luoda uudelleen eikä muuteta tästä sovelluksesta. Hyväksy Wilman tiedot haastatteluun tai jatka muuttamatta mitään.</p></div></div>`;
  else if (ok) turn = `<div class="turn ok"><span class="big">✓</span><div><h3>Varmennettu</h3><p>Wilmaan tallennettu tieto luettiin takaisin ja se täsmää hyväksyttyyn.</p></div></div>`;
  else turn = `<div class="turn"><span class="big">!</span><div><h3>Tallennettu tieto eroaa hyväksytystä</h3><p>Wilmaan tallentui eri arvo kuin haastattelussa hyväksyttiin (korostettu). Hyväksy Wilman arvot tai palaa korjaamaan ja täytä uudelleen.</p></div></div>`;
  return `${turn}<div class="panel"><div class="panel-head"><h3>Takaisinluku Wilmasta</h3>${res.where ? `<span class="badge accent">${esc(res.where)}</span>` : ''}</div>${res.rows.length ? cmpTable(res.rows) : '<p class="small muted">Ei vertailtavia kenttiä.</p>'}</div>`;
}

function bindView(st, tr) {
  if (tr.searching) return `<div class="turn"><span class="spinner"></span><div><h3>Haetaan Wilmasta opiskelijana…</h3><p>Sovellus avaa opiskelijalistan sukunimen kirjaimella ja lukee osumat. Haku vain lukee.</p></div>${SHOW_WILMA}</div>`;
  const err = tr.error ? `<div class="note warn" style="margin-bottom:14px">Haku ei onnistunut: ${esc(tr.error)}</div>` : '';
  if (tr.hits && tr.hits.length) {
    const names = tr.hits.map(h => h.listName);
    const twins = names.length !== new Set(names).size;
    const cards = tr.hits.map(h => {
      const same = norm(h.qual) === norm(st.v.qual);
      return `<label class="card"><input type="radio" name="bind" value="${esc(h.sid)}" data-bind-pick="${esc(h.sid)}"${tr.pick === h.sid ? ' checked' : ''} style="margin-top:5px"><span><strong>${esc(h.listName)}</strong><span class="facts"><span>Opiskelijanumero: <b>${esc(h.number || '–')}</b></span><span>Tutkinto: <b>${esc(h.qual || '–')}</b></span></span>${same ? '<span class="badge ok" style="margin-top:6px">Sama tutkinto kuin haastattelussa</span>' : '<span class="badge warn" style="margin-top:6px">Eri tutkinto kuin haastattelussa</span>'}</span></label>`;
    }).join('');
    return `${err}<div class="panel"><div class="panel-head"><h3>${tr.hits.length === 1 ? 'Löytyi yksi opiskelija' : `Löytyi ${tr.hits.length} opiskelijaa`}</h3><span class="badge ok">Opiskelija</span></div>${twins ? '<div class="note warn" style="margin-bottom:12px">Samannimisiä opiskelijoita on useita. Valitse oikea opiskelijanumeron ja tutkinnon perusteella; sovellus ei valitse puolestasi.</div>' : ''}<div class="cards" role="radiogroup" aria-label="Wilman opiskelijat">${cards}</div><p class="small muted" style="margin-top:10px">Varmista, että valitsemasi on sama henkilö, jota haastattelit. Valinta avaa opiskelijan sivun Wilmassa.</p></div>`;
  }
  if (tr.notYet) return `${err}<div class="note warn">Hakijaa ei vielä löydy Wilmasta opiskelijana sukunimellä ”${esc(splitName(st.v.name)[1])}”. Hän pysyy jonossa kohdassa ”Odottaa opiskelijaksi”.</div>`;
  return `${err}<div class="panel"><p>Ennen siirtoa hakija pitää löytää Wilmasta <strong>opiskelijana</strong>, jolla on opintokortti. Hakijana olo ei riitä. Sovellus hakee Wilman opiskelijalistasta sukunimellä ”${esc(splitName(st.v.name)[1])}”.</p></div>`;
}

function checkHead(st, form) {
  const miss = formMissing(st, form);
  if (!miss.length) return '<div class="check-head good"><b>✓</b><span>Kaikki pakolliset tiedot ovat mukana. Tarkista ne ja jatka täyttöön.</span></div>';
  return `<div class="check-head warn"><b>${miss.length}</b><span>${miss.length === 1 ? 'pakollinen tieto puuttuu' : 'pakollista tietoa puuttuu'}: ${miss.map(k => esc(LABELS[k])).join(', ')}. Täydennä korostetut kentät.</span></div>`;
}
function editFields(st, form) {
  const keys = PICK[form.id];
  const parts = keys.includes('@parts') ? `<h3 style="font-size:13px;margin:0 0 8px">Tutkinnon osat</h3>${partsHtml(st, true)}` : '';
  const fields = keys.filter(k => k !== '@parts').map(k => {
    const f = FIELD[k];
    return fieldHtml(st, form.needs.includes(k) ? {...f, optional: false} : f, form.needs.includes(k) && !filled(st, k));
  }).join('');
  return `${parts}${fields ? `<div class="fields"${parts ? ' style="margin-top:18px"' : ''}>${fields}</div>` : ''}`;
}
function refreshMissing(st) {
  const form = FORMS[(st.transfer || {done: 0}).done];
  const head = $('#check-head'); if (head) head.innerHTML = checkHead(st, form);
  document.querySelectorAll('#main [data-field]').forEach(el => {
    const k = el.dataset.field;
    const miss = form.needs.includes(k) && !filled(st, k);
    el.classList.toggle('missing', miss);
    const chip = el.querySelector('.miss-chip');
    if (miss && !chip) el.querySelector('.lbl').insertAdjacentHTML('beforeend', '<span class="miss-chip">Puuttuu</span>');
    if (!miss && chip) chip.remove();
  });
  const fill = $('#fill'); if (fill) fill.disabled = formMissing(st, form).length > 0;
}

function renderActions() {
  const el = $('#actions');
  const st = cur();
  let left = '', right = '';
  if (state.screen === 'interview' && st) {
    const i = st.section;
    const last = i === SECTIONS.length - 1;
    left = `<span class="meta saved" id="saved">Tallennettu klo ${esc(st.savedAt)}</span><span class="meta"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> seuraava</span>`;
    right = `${i > 0 ? `<button class="btn" data-sec="${i - 1}">← ${esc(SECTIONS[i - 1].title)}</button>` : ''}` +
      (last ? (st.phase === 'interview' ? '<button class="btn primary big" id="finish">Haastattelu valmis ✓</button>' : '<button class="btn primary big" data-go="list">Takaisin listaan</button>')
        : `<button class="btn primary big" data-sec="${i + 1}" id="next">Seuraava: ${esc(SECTIONS[i + 1].title)} →</button>`);
  } else if (state.screen === 'transfer' && st && st.phase !== 'done') {
    const tr = st.transfer;
    const form = FORMS[tr.done];
    const sup = form.id === 'sidonta' ? {mode: 'real'} : support(st, form);
    left = '<span class="meta">Sovellus ei koskaan paina Wilman Tallenna-painiketta.</span>';
    if (form.id === 'sidonta') {
      if (tr.hits && tr.hits.length) right = `<button class="btn" id="bind-search">Hae uudelleen</button><button class="btn primary big" id="bind-ok"${tr.pick ? '' : ' disabled'}>Vahvista: sama henkilö →</button>`;
      else if (!tr.searching) right = '<button class="btn primary big" id="bind-search">Hae Wilmasta opiskelijana</button>';
    } else if (tr.step === 0 && sup.mode === 'manual') right = '<button class="btn primary big" id="manual-done">Tein käsin – seuraava →</button>';
    else if (tr.step === 0) {
      right = `<button class="btn primary big" id="fill"${formMissing(st, form).length ? ' disabled' : ''}>Tiedot oikein – täytä Wilmaan →</button>`;
      if (formMissing(st, form).length) left = '<span class="meta">Täyttö aukeaa, kun puuttuvat tiedot on täydennetty.</span>';
    } else if (tr.step === 2 && tr.sim) right = '<button class="btn" id="cancel-fill">← Palaa tietoihin</button><button class="btn primary big" id="saved-btn">Tallensin (simuloitu) →</button>';
    else if (tr.step === 2) { left = '<span class="meta"><span class="spinner"></span> Odotetaan tallennusta Wilmassa…</span>'; right = '<button class="btn" id="cancel-fill">← Palaa tietoihin</button>'; }
    else if (tr.step === 3) {
      const ok = tr.sim || (tr.result && tr.result.rows.every(r => r.ok));
      const next = tr.done + 1 < FORMS.length ? `<button class="btn primary big" id="next-form">Seuraava lomake: ${esc(formTitle(st, FORMS[tr.done + 1]))} →</button>` : '<button class="btn primary big" id="next-form">Valmis ✓</button>';
      if (ok) right = next;
      else if (tr.result && tr.result.existing) right = `<button class="btn" id="next-form">Jatka muuttamatta →</button><button class="btn primary big" id="accept-wilma">Hyväksy Wilman tiedot haastatteluun</button>`;
      else right = '<button class="btn" id="refill">← Korjaa ja täytä uudelleen</button><button class="btn primary big" id="accept-wilma">Hyväksy Wilman arvot</button>';
    }
  } else if (state.screen === 'transfer' && st) {
    right = '<button class="btn primary big" data-go="list">Takaisin siirtojonoon</button>';
  }
  el.hidden = !left && !right;
  el.innerHTML = `${left}<span class="right">${right}</span>`;
}

// ---- Näkymä: Sovellus | Wilma (kapea ikkuna) ----
function setView(v) {
  document.body.dataset.view = v;
  const app = v === 'app';
  $('#tab-app').setAttribute('aria-selected', String(app));
  $('#tab-wilma').setAttribute('aria-selected', String(!app));
  $('#tab-app').tabIndex = app ? 0 : -1;
  $('#tab-wilma').tabIndex = app ? -1 : 0;
  if (app) $('#dot-app').hidden = true;
  else pinChrome();
}
function setAttention(on) { $('#dot-wilma').hidden = !on; if (on) pinChrome(); }
// Tuo Chrome-paneeli kokonaan näkyviin (paneeli on sticky; demopalkki voi työntää sen alareunan
// näkymän ulkopuolelle, jolloin Wilman vaiheteksti ei näy).
function pinChrome() {
  const chrome = $('#chrome');
  if (!chrome || getComputedStyle(chrome).display === 'none') return;
  const stickyTop = parseFloat(getComputedStyle(chrome).top) || 0;
  const delta = chrome.getBoundingClientRect().top - stickyTop;
  if (delta > 1) window.scrollBy(0, delta);
}
function notifyApp() { if (document.body.dataset.view === 'wilma') $('#dot-app').hidden = false; }

// ---- Wilma-täyttö (sama polku kuin adapterit; valitsimet ja otsikot synteettisestä Wilmasta) ----
const PAUSE = 280;
const SAVE_SELECTOR = 'input[type=submit], button[type=submit], #btn-save-choices, [name=savebtn]';
const fdoc = () => W.doc();
const q = (sel, root) => (root || fdoc()).querySelector(sel);
function must(el, what) { if (!el) throw new Error(`Wilmasta ei löytynyt: ${what}.`); return el; }
function mark(el) { if (el && el.classList) el.classList.add('ota-filled'); }
async function wClick(el, what) {
  must(el, what);
  if (el.matches(SAVE_SELECTOR)) throw new Error('Sovellus ei paina Wilman Tallenna-painiketta.');
  mark(el);
  try { el.scrollIntoView({block: 'center'}); } catch (e) { /* piilotettu iframe */ }
  await sleep(PAUSE);
  el.click();
  await sleep(PAUSE / 2);
}
async function wFollow(el, what) {
  must(el, what);
  const loaded = W.nextLoad();
  await wClick(el, what);
  await loaded;
  await sleep(PAUSE);
}
async function wGo(url) { await W.navigate(url); await sleep(PAUSE); }
function byLabel(text) {
  const label = [...fdoc().querySelectorAll('label[for]')].find(l => norm(l.textContent) === text);
  must(label, `kenttä ”${text}”`);
  return must(fdoc().getElementById(label.htmlFor), `kenttä ”${text}”`);
}
function wSet(el, value) {
  const win = W.win();
  el.focus();
  el.value = value;
  el.dispatchEvent(new win.Event('input', {bubbles: true}));
  el.dispatchEvent(new win.Event('change', {bubbles: true}));
  mark(el);
}
// Combobox: sivun oma haku (input-tapahtuma), valinta ehdotuslistasta kuten käyttäjä tekisi.
async function wCombo(el, typed, pick, what) {
  const win = W.win();
  el.focus();
  el.value = typed;
  el.dispatchEvent(new win.Event('input', {bubbles: true}));
  mark(el);
  for (let i = 0; i < 60 && !el.hasAttribute('data-searchresult'); i++) await sleep(50);
  if (!el.hasAttribute('data-searchresult')) throw new Error(`haku ei valmistunut (${what}).`);
  const options = [...fdoc().querySelectorAll(`#${CSS.escape(el.id)}_option-list li[role=option] > a`)];
  const hit = options.find(a => pick(norm(a.textContent)));
  if (!hit) return null;
  await sleep(PAUSE);
  hit.click();
  await sleep(PAUSE / 2);
  mark(el);
  const hidden = el.parentElement.querySelector(`input[name="${CSS.escape(el.name)}__id"]`);
  return hidden ? hidden.value : '';
}
function linkByText(root, text, prefix = false) {
  return [...must(root, 'linkkien alue').querySelectorAll('a')].find(a => prefix ? norm(a.textContent).startsWith(text) : norm(a.textContent) === text);
}
async function openStudent(sid) { await wGo(`/profiles/students/${sid}`); }
async function openPartPanel(sid, cid) {
  if (W.current() !== `/profiles/students/${sid}/choices`) {
    await openStudent(sid);
    const tab = q(`.ds-subtabs a[href="/profiles/students/${sid}/choices"]`);
    if (tab) await wFollow(tab, 'Opinnot-välilehti');
    else await wGo(`/profiles/students/${sid}/choices`);
  }
  await wClick(q(`#choices-tree a.a-val[href$="/catalog/${cid}"]`), `tutkinnon osan rivi (${partName(cid)})`);
  const code = (PARTS.find(p => p.code === cid) || {}).wcode || '';
  const title = norm((q('#sidepanel-title-1') || {}).textContent);
  if (!title.startsWith(`${code} - `)) throw new Error(`paneeli näyttää väärän osan (${title || 'tyhjä'}).`);
}
async function openHost(st) {
  const cid = cidFor(st);
  await openPartPanel(st.sid, cid);
  await wClick(q('#choices-nav-tabs a[href$="#forms-tab"]'), 'Lomakkeet-välilehti');
  await wFollow(linkByText(q('#forms-tab > div'), 'Luo uusi: Oppisopimus'), 'Luo uusi: Oppisopimus');
  if (!q('#f-pfield4')) throw new Error('oppisopimuslomake ei auennut.');
}
function heading(text) {
  const ok = [...fdoc().querySelectorAll('main h1')].some(h => norm(h.textContent) === text);
  if (!ok) throw new Error(`odotettu lomake ”${text}” ei auennut.`);
}

// Takaisinluku Wilman näkymäreiteiltä (data-testid), teemoittamattomana taustapyyntönä.
const parser = new DOMParser();
function readView(url, prefix) {
  const r = W.request('GET', url, '', {skin: false});
  if (r.status !== 200) throw new Error(`takaisinluku epäonnistui (${r.status}).`);
  const doc = parser.parseFromString(r.body, 'text/html');
  const fields = {};
  doc.querySelectorAll(`[data-testid^="${prefix}"]`).forEach(el => { fields[el.dataset.testid.slice(prefix.length)] = el.textContent; });
  return {doc, fields};
}
function expectedOf(st, key) {
  if (key === '@insLast') return splitName(st.v.insName)[1];
  if (key === '@insFirst') return splitName(st.v.insName)[0];
  if (key === '@wpId') return st.wpId || '';
  return st.v[key] || '';
}
function row(st, key, label, saved, extra = {}) {
  const expected = expectedOf(st, key);
  const isDate = DATE_KEYS.has(key);
  const ok = isDate ? normDate(expected) === normDate(saved) : norm(expected) === norm(saved);
  return {key, label, expected: isDate && expected ? normDate(expected) : expected, saved: saved ?? '', ok, ...extra};
}
function rowsFrom(st, spec, fields, prefix = '') {
  return spec.map(([key, label, field]) => row(st, key, prefix + label, fields[field]));
}
function acceptRows(st, rows) {
  const name = splitName(st.v.insName);
  rows.filter(r => !r.ok).forEach(r => {
    if (r.apply) r.apply();
    else if (r.key === '@insLast') name[1] = r.saved;
    else if (r.key === '@insFirst') name[0] = r.saved;
    else if (r.key && !r.key.startsWith('@')) st.v[r.key] = r.saved;
    r.ok = true;
  });
  if (rows.some(r => r.key === '@insLast' || r.key === '@insFirst')) st.v.insName = name.filter(Boolean).join(' ');
}

const WP_SPEC = [['employer', 'Työpaikan nimi', 'name'], ['businessId', 'Y-tunnus', 'business-id'], ['street', 'Lähiosoite', 'street-address'],
  ['postal', 'Postinumero ja -toimipaikka', 'postal-address'], ['municipality', 'Paikkakunta', 'municipality'], ['wpPhone', 'Puhelin', 'phone'], ['wpEmail', 'Sähköposti', 'email']];
const INS_SPEC = [['@insLast', 'Sukunimi', 'last-name'], ['@insFirst', 'Etunimet', 'first-names'], ['insPhone', 'Puhelin', 'phone'], ['insEmail', 'Sähköposti', 'email'], ['@wpId', 'Työpaikka (rekisteriviite)', 'workplace-id']];
const URA_SPEC = [['further', 'Jatko-opinnot', 'further_studies'], ['working', 'Työelämään siirtyminen', 'working_life'], ['career', 'Uralla eteneminen', 'career_progress'],
  ['docDate', 'Laatimispäivä', 'document_date'], ['participants', 'Laatimiseen osallistuneet', 'participants']];
const DEMO_SPEC = [['demoStart', 'Näyttö alkaa', 'start-date'], ['demoEnd', 'Näyttö päättyy', 'end-date'], ['demoEnv', 'Näyttöympäristö', 'environment'], ['@wpId', 'Suorituspaikka (rekisteriviite)', 'workplace-id']];

function readWorkplace(st, rid, existing) {
  const {fields} = readView(`/synthetic/tyopaikat/${rid}`, 'workplace-');
  st.wpId = rid;
  return {rows: rowsFrom(st, WP_SPEC, fields), existing, title: existing ? `Löytyi työpaikkarekisteristä (${rid})` : '', where: `Työpaikkarekisteri, tietue ${rid}`};
}
function readInstructor(st, rid, existing) {
  const {fields} = readView(`/synthetic/ohjaajat/${rid}`, 'instructor-');
  return {rows: rowsFrom(st, INS_SPEC, fields), existing, title: existing ? `Löytyi ohjaajarekisteristä (${rid})` : '', where: `Ohjaajarekisteri, tietue ${rid}`};
}
function readCareer(st, rid, existing) {
  const {fields} = readView(`/specedu/view/${rid}/21/${st.sid}`, 'field-');
  return {rows: rowsFrom(st, URA_SPEC, fields), existing, title: existing ? 'Urasuunnitelma on jo olemassa – ei luoda uutta' : '', where: `Suunnitelmat, tietue ${rid}`};
}
function readDemo(st, rid, cid) {
  const {doc, fields} = readView(`/synthetic/naytot/${rid}`, 'demonstration-');
  const prefix = `${partName(cid)}: `;
  const rows = rowsFrom(st, DEMO_SPEC, fields, prefix);
  doc.querySelectorAll('[data-testid=demonstration-row]').forEach(tr => {
    const text = norm((tr.querySelector('[data-testid=row-text]') || {}).textContent);
    rows.push(row(st, 'demoPlan', `${prefix}Suunnitelma – ${text}`, (tr.querySelector('[data-testid=row-plan]') || {}).textContent));
  });
  return rows;
}
function yearLabel(value) { const y = SEED.school_years.find(([v]) => v === value); return y ? y[1] : (value === '0' ? 'Ei valintaa' : value); }
function readChoices(st, cids) {
  const r = W.request('GET', `/profiles/students/${st.sid}/choices`, '', {skin: false});
  const doc = parser.parseFromString(r.body, 'text/html');
  const data = JSON.parse(must(doc.getElementById('v2-choices-data'), 'opintopolun tiedot').textContent);
  const rows = [];
  cids.forEach(cid => {
    const saved = data.parts[cid] || {};
    const want = st.parts[cid] || {};
    const yl = yearLabel(saved.year);
    const pl = saved.period && saved.period !== '0' ? saved.period : '';
    rows.push({key: `@part:${cid}:year`, label: `${partName(cid)}: lukuvuosi`, expected: want.year, saved: yl, ok: norm(want.year) === norm(yl),
      apply: () => { want.year = YEARS.includes(yl) ? yl : want.year; }});
    rows.push({key: `@part:${cid}:period`, label: `${partName(cid)}: jakso`, expected: want.period ? `${want.period}. jakso` : '', saved: pl ? `${pl}. jakso` : (saved.period === '0' ? 'Ei jaksoa' : ''), ok: want.period === pl,
      apply: () => { if (PERIODS.includes(pl)) want.period = pl; }});
  });
  return rows;
}

// Lomakekohtaiset täytöt. Palauttaa 'await' (odotetaan tallennusta), 'sim' tai 'verify'.
const FILL = {
  async sim(st, tr) { await sleep(900); tr.sim = true; return 'sim'; },

  async tyopaikka(st, tr) {
    const found = W.call('workplaces_with', st.v.businessId);
    if (found.length) {
      await wGo(`/synthetic/tyopaikat/${found[0].record_id}`);
      tr.result = readWorkplace(st, found[0].record_id, true);
      if (found.length > 1) tr.info = `Y-tunnuksella löytyi ${found.length} toimipaikkaa; käytetään ensimmäistä (${found[0].record_id}).`;
      return 'verify';
    }
    tr.info = `Y-tunnusta ${st.v.businessId} ei löytynyt työpaikkarekisteristä, joten sovellus avaa uuden työpaikan lomakkeen.`;
    if (hasTree(st)) {
      await openHost(st);
      await wFollow(linkByText(q('#main-content'), ADD_WORKPLACE, true), 'Lisää uusi työpaikka');
    } else {
      tr.info += ' Opiskelijalla ei ole HOPS-puuta, joten lomake avataan suoraan osoitteella.';
      await wGo('/forms/744/new');
    }
    heading('Uusi työpaikka');
    wSet(byLabel('Nimi'), st.v.employer);
    wSet(byLabel('Y-tunnus'), st.v.businessId);
    wSet(byLabel('Lähiosoite'), st.v.street || '');
    wSet(byLabel('Postiosoite'), st.v.postal || '');
    if (st.v.municipality) {
      const id = await wCombo(byLabel('Toimipisteen paikkakunta'), st.v.municipality, t => t === norm(st.v.municipality), 'paikkakunta');
      if (id === null) tr.info += ` Paikkakuntaa ”${st.v.municipality}” ei ole Wilman listassa; kirjoitettu teksti jää kenttään.`;
    }
    wSet(byLabel('Puhelin'), st.v.wpPhone || '');
    wSet(byLabel('Sähköpostiosoite'), st.v.wpEmail || '');
    tr.expect = 'workplace';
    return 'await';
  },

  async ohjaaja(st, tr) {
    const [first, last] = splitName(st.v.insName);
    const found = W.call('instructors_named', last, first);
    const mine = found.filter(i => !st.wpId || i.workplace_id === st.wpId);
    if (mine.length) {
      await wGo(`/synthetic/ohjaajat/${mine[0].record_id}`);
      tr.result = readInstructor(st, mine[0].record_id, true);
      return 'verify';
    }
    tr.info = found.length ? 'Samanniminen ohjaaja löytyi toisesta työpaikasta. Lisätään uusi ohjaaja tämän työpaikan alle.' : `Ohjaajaa ”${last} ${first}” ei löytynyt rekisteristä, joten sovellus avaa uuden ohjaajan lomakkeen.`;
    if (hasTree(st)) {
      await openHost(st);
      await wFollow(linkByText(q('#main-content'), ADD_INSTRUCTOR, true), 'Lisää uusi työpaikkaohjaaja');
    } else {
      tr.info += ' Opiskelijalla ei ole HOPS-puuta, joten lomake avataan suoraan osoitteella.';
      await wGo('/forms/745/new');
    }
    heading('Uusi työpaikkaohjaaja');
    wSet(byLabel('Sukunimi'), last);
    wSet(byLabel('Etunimet'), first);
    wSet(byLabel('Puhelin'), st.v.insPhone || '');
    wSet(byLabel('Sähköpostiosoite'), st.v.insEmail || '');
    const id = await wCombo(byLabel('Työpaikka'), st.v.businessId, t => t.includes(st.v.businessId), 'työpaikka');
    if (id === null) throw new Error(`työpaikkaa ${st.v.businessId} ei löytynyt ohjaajalomakkeen listasta.`);
    if (st.wpId && id !== st.wpId) tr.info += ` Valittu työpaikka (${id}) ei ole varmennettu työpaikka (${st.wpId}); tarkista.`;
    tr.expect = 'instructor';
    return 'await';
  },

  async sopimus(st, tr) {
    await openHost(st);
    const notes = [];
    const id = await wCombo(byLabel('Oppisopimuksen työnantaja'), st.v.businessId, t => t.includes(st.v.businessId), 'työnantaja');
    if (id === null) notes.push(`Työnantajaa ${st.v.businessId} ei löytynyt Wilman listasta.`);
    else if (st.wpId && id !== st.wpId) notes.push(`Työnantajan tunniste (${id}) ei ole varmennettu työpaikka (${st.wpId}).`);
    const [first, last] = splitName(st.v.insName);
    const ins = q('#main-content form input[name="prepeater5-1-pfield5"]');
    if (ins && last && id) {
      const iid = await wCombo(ins, last, t => t.startsWith(`${last} ${first}`), 'työpaikkaohjaaja');
      if (iid === null) notes.push(`Ohjaajaa ${last} ${first} ei löytynyt työnantajan ohjaajista.`);
    }
    tr.info = notes.join(' ') || null;
    tr.sim = true;
    tr.overlay = 'Sovellus haki työnantajan ja ohjaajan.\nTallennus ei vielä toimi synteettisessä Wilmassa (D2) – simuloitu.';
    return 'sim';
  },

  async polku(st, tr) {
    tr.queue = selectedParts(st).map(p => p.code);
    tr.qi = 0;
    tr.rows = [];
    await fillChoice(st, tr);
    return 'await';
  },

  async ura(st, tr) {
    await openStudent(st.sid);
    await wFollow(q(`a[href="/profiles/students/${st.sid}/specedu"]`), 'Suunnitelmat');
    const h2 = [...fdoc().querySelectorAll('#main-content > div > h2')].find(h => norm(h.firstChild && h.firstChild.textContent) === 'Urasuunnitelmat');
    const section = must(h2, 'Urasuunnitelmat-osio').parentElement;
    const existing = [...section.querySelectorAll('table a.specedu-copiable')];
    if (existing.length) {
      const last = existing[existing.length - 1];
      mark(last);
      const rid = last.getAttribute('href').split('/')[3];
      tr.result = readCareer(st, rid, true);
      return 'verify';
    }
    const create = must(h2.querySelector('ul.dropdown-menu a'), 'urasuunnitelman luontilinkki');
    tr.formType = (create.getAttribute('href').match(/^\/forms\/(\d+)\/new/) || [])[1];
    await wFollow(create, 'Lisää uusi: Urasuunnitelma');
    wSet(byLabel('Suunnitelma jatko-opintoihin siirtymisestä'), st.v.further || '');
    wSet(byLabel('Suunnitelma työelämään siirtymisestä'), st.v.working || '');
    wSet(byLabel('Suunnitelma työuralla etenemiseksi'), st.v.career || '');
    wSet(byLabel('Asiakirjan laatimispäivä'), st.v.docDate ? normDate(st.v.docDate) : '');
    wSet(byLabel('Asiakirjan laatimiseen osallistuneet'), st.v.participants || '');
    tr.expect = 'record';
    return 'await';
  },

  async naytot(st, tr) {
    tr.queue = selectedParts(st).map(p => p.code);
    tr.qi = 0;
    tr.rows = [];
    await fillDemo(st, tr);
    return 'await';
  },
};

async function fillChoice(st, tr) {
  const cid = tr.queue[tr.qi];
  const want = st.parts[cid];
  await openPartPanel(st.sid, cid);
  const labelOf = r => norm((fdoc().querySelector(`label[for="${CSS.escape(r.id)}"]`) || {}).textContent);
  const year = [...fdoc().querySelectorAll('input[name=year-selection]')].find(r => labelOf(r) === want.year);
  await wClick(must(year, `lukuvuosi ${want.year}`), 'lukuvuosi');
  mark(fdoc().querySelector(`label[for="${CSS.escape(year.id)}"]`));
  const period = [...fdoc().querySelectorAll('input[name=period-selection]')].find(r => labelOf(r) === `${want.period}. jakso`);
  must(period, `jakso ${want.period}`);
  if (period.disabled) throw new Error('jakson valinta ei aktivoitunut lukuvuoden jälkeen.');
  await wClick(period, 'jakso');
  mark(fdoc().querySelector(`label[for="${CSS.escape(period.id)}"]`));
  tr.expect = 'choice';
  tr.overlay = `Tarkista valinta (osa ${tr.qi + 1}/${tr.queue.length}) ja paina Tallenna.`;
}

async function fillDemo(st, tr) {
  const cid = tr.queue[tr.qi];
  await openPartPanel(st.sid, cid);
  await wClick(q('#choices-nav-tabs a[href$="#forms-tab"]'), 'Lomakkeet-välilehti');
  await wFollow(linkByText(q('#forms-tab'), 'Luo uusi: HOKS Näyttösuunnitelma', true), 'Luo uusi: näyttösuunnitelma');
  const code = (PARTS.find(p => p.code === cid) || {}).wcode;
  if (!norm((q('#f-pfield3') || {}).textContent).includes(code)) throw new Error('näyttölomake on eri tutkinnon osalle.');
  if (st.v.demoStart) wSet(byLabel('Näytön aloituspvm'), normDate(st.v.demoStart));
  if (st.v.demoEnd) wSet(byLabel('Näytön päättymispäivä'), normDate(st.v.demoEnd));
  const table = [...fdoc().querySelectorAll('#main-content form table')].find(t => [...t.querySelectorAll('thead th')].some(th => norm(th.textContent) === 'Suunnitelma osaamisen osoittamisesta'));
  must(table, 'ammattitaitovaatimusten taulukko');
  const col = [...table.querySelectorAll('thead th')].findIndex(th => norm(th.textContent) === 'Suunnitelma osaamisen osoittamisesta');
  table.querySelectorAll('tbody > tr').forEach(r => { const ta = r.children[col] && r.children[col].querySelector('textarea'); if (ta) wSet(ta, st.v.demoPlan || ''); });
  wSet(byLabel('Näyttöympäristö'), st.v.demoEnv || '');
  const id = await wCombo(byLabel('Suorituspaikka (työpaikka)'), st.v.businessId, t => t.includes(st.v.businessId), 'suorituspaikka');
  if (id === null) tr.info = `Suorituspaikkaa ${st.v.businessId} ei löytynyt Wilman listasta.`;
  tr.expect = 'demo';
  tr.overlay = `Tarkista näyttösuunnitelma (osa ${tr.qi + 1}/${tr.queue.length}) ja paina Tallenna tiedot.`;
}

const DEFAULT_OVERLAY = 'Tarkista ja paina Tallenna';

async function runFill(st) {
  const tr = st.transfer;
  const form = FORMS[tr.done];
  const sup = support(st, form);
  Object.assign(tr, {step: 1, failed: null, info: null, result: null, sim: false, overlay: null, expect: null});
  W.setStep(null);
  render();
  announce('Sovellus täyttää lomaketta Wilmassa.');
  let out;
  try {
    out = await (sup.mode === 'sim' ? FILL.sim(st, tr) : FILL[form.id](st, tr));
  } catch (err) {
    tr.failed = err.message;
    tr.sim = true;
    out = 'sim';
  }
  if (cur() !== st && state.studentId) { /* käyttäjä vaihtoi opiskelijaa; tila säilyy */ }
  if (out === 'verify') {
    tr.step = 3;
    W.setStep(tr.result && tr.result.existing ? 'Löytyi Wilmasta – katso tulos sovelluksesta.' : null);
    announce('Tarkista tallennus.');
  } else {
    tr.step = 2;
    if (out === 'await') { pending = {studentId: st.id}; W.setStep(tr.overlay || DEFAULT_OVERLAY); setAttention(true); announce('Lomake täytetty. Tarkista ja tallenna Wilmassa.'); }
    else { W.setStep(tr.overlay || null); if (tr.overlay) setAttention(true); announce('Simuloitu kohta.'); }
  }
  render();
}

// Käyttäjän tallennus Wilmassa (kaapattu POST tai opintopolun XHR).
async function onWilmaEvents(events) {
  if (!state) return;
  const st = pending && state.students.find(s => s.id === pending.studentId);
  if (!st || !st.transfer || st.transfer.step !== 2) {
    if (events.some(e => e.kind === 'host_post')) W.flash('Oppisopimusta ei tallennettu: tallennus ei vielä toimi synteettisessä Wilmassa (D2).');
    return;
  }
  const tr = st.transfer;
  const form = FORMS[tr.done];
  if (form.id === 'sopimus' && events.some(e => e.kind === 'host_post')) {
    tr.info = 'Wilma vastasi: oppisopimusta ei tallennettu (D2 tekemättä). Kohta on simuloitu.';
    render();
    return;
  }
  const ev = events.find(e => e.kind === tr.expect
    && (e.kind !== 'choice' || (e.sid === st.sid && e.catalog === tr.queue[tr.qi]))
    && (e.kind !== 'record' || (e.sid === st.sid && (!tr.formType || e.form_type === tr.formType))));
  if (!ev) return;
  try {
    if (form.id === 'tyopaikka') tr.result = readWorkplace(st, ev.id, false);
    else if (form.id === 'ohjaaja') tr.result = readInstructor(st, ev.id, false);
    else if (form.id === 'ura') tr.result = readCareer(st, ev.id, false);
    else if (form.id === 'polku' || form.id === 'naytot') {
      const cid = tr.queue[tr.qi];
      tr.rows.push(...(form.id === 'polku' ? readChoices(st, [cid]) : readDemo(st, ev.id, cid)));
      if (tr.qi + 1 < tr.queue.length) {
        tr.qi += 1;
        tr.step = 1;
        W.setStep(null);
        render();
        announce(`Tallennus nähty. Täytetään seuraava tutkinnon osa (${tr.qi + 1}/${tr.queue.length}).`);
        await sleep(600);
        try {
          await (form.id === 'polku' ? fillChoice(st, tr) : fillDemo(st, tr));
          tr.step = 2;
          W.setStep(tr.overlay || DEFAULT_OVERLAY);
        } catch (err) {
          tr.failed = err.message;
          tr.sim = true;
          tr.step = 2;
          pending = null;
          W.setStep(null);
        }
        render();
        return;
      }
      tr.result = {rows: tr.rows, where: form.id === 'polku' ? 'Opintopolku (HOPS)' : 'Näyttösuunnitelmat'};
    }
  } catch (err) {
    tr.result = {rows: [{label: 'Takaisinluku', expected: 'onnistuu', saved: err.message, ok: false}]};
  }
  pending = null;
  setAttention(false);
  tr.step = 3;
  const ok = tr.result.rows.every(r => r.ok);
  W.setStep(ok ? 'Tallennus luettu takaisin: täsmää.\nJatka sovelluksessa.' : 'Tallennettu tieto eroaa hyväksytystä.\nKatso vertailu sovelluksesta.');
  notifyApp();
  render();
  announce(ok ? 'Tallennus luettu takaisin ja varmennettu.' : 'Tallennettu tieto eroaa hyväksytystä.');
}

// ---- Opiskelijan sidonta: haku Wilman kirjainlistasta sukunimellä ----
function valueAfterLabel(doc, text) {
  const label = [...doc.querySelectorAll('label')].find(l => norm(l.textContent) === text);
  return label && label.nextElementSibling ? norm(label.nextElementSibling.textContent) : '';
}
async function bindSearch(st) {
  const tr = st.transfer;
  Object.assign(tr, {searching: true, hits: null, notYet: false, error: null, pick: null});
  render();
  try {
    const last = splitName(st.v.name)[1] || norm(st.v.name);
    await wGo('/profiles/students');
    const letter = last.charAt(0).toLocaleUpperCase('fi');
    await wFollow([...fdoc().querySelectorAll('a.letter-link')].find(a => norm(a.textContent) === letter), `kirjain ${letter}`);
    const links = [...fdoc().querySelectorAll('a.profile-link.opp')].filter(a => { const t = norm(a.textContent); return t === last || t.startsWith(`${last} `); });
    links.forEach(mark);
    tr.hits = links.map(a => {
      const sid = a.getAttribute('href').split('/').pop();
      const r = W.request('GET', `/profiles/students/${sid}`, '', {skin: false});
      const doc = parser.parseFromString(r.body, 'text/html');
      return {sid, listName: norm(a.textContent), number: valueAfterLabel(doc, 'Opiskelijanumero:'), qual: norm((doc.getElementById('f-pfield920') || {}).textContent)};
    });
    tr.notYet = !tr.hits.length;
    if (links.length) W.setStep('Valitse oikea opiskelija sovelluksessa.');
  } catch (err) {
    tr.error = err.message;
  }
  tr.searching = false;
  render();
  announce(tr.hits && tr.hits.length ? `Löytyi ${tr.hits.length} opiskelijaa. Valitse oikea.` : 'Opiskelijaa ei löytynyt.');
}

// ---- Toiminnot ----
function go(screen) { state.screen = screen; if (screen === 'list') { state.studentId = null; state.search = null; } render(); window.scrollTo(0, 0); focusHead(); }
function focusHead() { const h = $('#h'); if (h) h.focus({preventScroll: true}); }
function openSection(i) {
  const st = cur(); st.section = i; render(); window.scrollTo(0, 0); focusHead();
  announce(`Osio ${i + 1}/${SECTIONS.length}: ${SECTIONS[i].title}`);
  const first = document.querySelector('#main .control');
  if (first && !SECTIONS[i].summary) first.focus({preventScroll: true});
}
function touch(st) { st.savedAt = nowTime(); const s = $('#saved'); if (s) s.textContent = `Tallennettu klo ${st.savedAt}`; }
function refreshSectionMarks(st) {
  SECTIONS.forEach((s, i) => {
    const el = document.querySelector(`[data-secst="${i}"]`);
    if (!el || s.summary) return;
    const ss = sectionStatus(st, s);
    el.className = `sec-st ${ss}`;
    el.textContent = ss === 'full' ? '✓' : String(i + 1);
  });
}
function newStudent(app) {
  const id = 's' + Date.now();
  const v = app ? {name: app.name, qual: app.qual, contractType: 'Oppisopimus', employer: app.employer, businessId: app.businessId} : {};
  v.docDate = today(); v.participants = 'Hakija ja haastattelija';
  state.students.unshift({id, phase: 'interview', section: 0, savedAt: nowTime(), prefilled: app ? ['name', 'qual', 'contractType', 'employer', 'businessId', 'docDate', 'participants'] : ['docDate', 'participants'], v, parts: {}, transfer: null});
  state.studentId = id; state.space = 'interviews'; state.search = null;
  state.screen = 'interview'; render(); focusHead();
}
function leaveStep(tr) {
  if (pending) { pending = null; setAttention(false); }
  W.setStep(null);
  Object.assign(tr, {step: 0, result: null, sim: false, failed: null, info: null, queue: null, rows: null, expect: null, overlay: null});
}
function resetAll() {
  pending = null;
  W.call('reset');
  W.setStep(null);
  W.clearHistory();
  state = initialState();
  setAttention(false);
  $('#dot-app').hidden = true;
  render();
  W.navigate('/', false);
  announce('Sovellus ja synteettinen Wilma palautettu alkutilaan.');
}

function onClick(e) {
  const t = e.target.closest('button, [data-pick]');
  if (!t || !state) return;
  const st = cur();
  if (t.id === 'reset') { resetAll(); return; }
  if (t.id === 'tab-app') { setView('app'); return; }
  if (t.id === 'tab-wilma') { setView('wilma'); return; }
  if (t.id === 'w-back') { W.back(); return; }
  if (t.id === 'w-reload') { W.reload(); return; }
  if (t.dataset.view) { setView(t.dataset.view); return; }
  if (t.dataset.space) { state.space = t.dataset.space; go('list'); return; }
  if (t.dataset.go) { go(t.dataset.go); return; }
  if (t.dataset.open) { state.studentId = t.dataset.open; state.screen = 'interview'; render(); focusHead(); return; }
  if (t.dataset.openIv) { state.studentId = t.dataset.openIv; state.screen = 'interview'; render(); focusHead(); return; }
  if (t.dataset.openTr) {
    state.studentId = t.dataset.openTr; state.screen = 'transfer';
    const s = cur(); s.transfer = s.transfer || {done: 0, step: 0, log: []};
    if (s.sid && s.transfer.step === 0) W.navigate(`/profiles/students/${s.sid}`);
    render(); focusHead(); return;
  }
  if (t.dataset.sec !== undefined) { openSection(Number(t.dataset.sec)); return; }
  if (t.dataset.jumpField) {
    const k = t.dataset.jumpField;
    const idx = k === '@parts' ? SECTIONS.findIndex(s => s.parts) : SECTIONS.findIndex(s => (s.fields || []).some(f => f.k === k));
    openSection(idx);
    const el = document.getElementById('f-' + k); if (el) el.focus();
    return;
  }
  if (t.id === 'do-search') { doSearch(); return; }
  if (t.id === 'blank') { newStudent(null); return; }
  if (t.dataset.pick !== undefined) { newStudent(APPLICANTS[Number(t.dataset.pick)]); return; }
  if (t.id === 'finish') { st.phase = 'waiting'; st.transfer = null; state.space = 'transfer'; state.screen = 'list'; state.studentId = null; render(); focusHead(); announce('Haastattelu valmis. Hakija siirtyi siirtojonoon odottamaan opiskelijaksi.'); return; }
  if (!st || !st.transfer) return;
  const tr = st.transfer;
  if (t.id === 'bind-search') { bindSearch(st); return; }
  if (t.id === 'bind-ok') {
    const hit = (tr.hits || []).find(h => h.sid === tr.pick);
    if (!hit) return;
    st.sid = hit.sid; st.wilmaName = hit.listName;
    st.transfer = {done: 1, step: 0, log: ['real']}; st.phase = 'transfer';
    W.setStep(null);
    render(); focusHead(); announce(`Opiskelija sidottu: ${hit.listName} (${hit.sid}). Seuraavaksi henkilökohtaistaminen.`); return;
  }
  if (t.id === 'fill') { runFill(st); return; }
  if (t.id === 'manual-done') { tr.step = 3; tr.sim = true; tr.manual = true; render(); return; }
  if (t.id === 'saved-btn') { tr.step = 3; W.setStep(null); setAttention(false); render(); announce('Simuloitu tallennus merkitty.'); return; }
  if (t.id === 'cancel-fill' || t.id === 'refill') { leaveStep(tr); render(); focusHead(); return; }
  if (t.id === 'accept-wilma') { acceptRows(st, tr.result.rows); W.setStep(null); render(); announce('Wilman arvot hyväksytty haastatteluun.'); return; }
  if (t.id === 'next-form') {
    tr.log = tr.log || [];
    tr.log[tr.done] = tr.manual ? 'manual' : (tr.sim ? 'sim' : 'real');
    const done = tr.done + 1;
    W.setStep(null);
    st.transfer = {done, step: 0, log: tr.log};
    if (done >= FORMS.length) st.phase = 'done';
    render(); window.scrollTo(0, 0); focusHead(); return;
  }
}

function onChange(e) {
  if (!state) return;
  const st = cur();
  if (e.target.dataset.bindPick) {
    st.transfer.pick = e.target.dataset.bindPick;
    const b = $('#bind-ok'); if (b) b.disabled = false;
    W.navigate(`/profiles/students/${st.transfer.pick}`);
    return;
  }
  if (!st) return;
  if (e.target.dataset.part) {
    const p = st.parts[e.target.dataset.part] = st.parts[e.target.dataset.part] || {};
    const k = e.target.dataset.pk;
    p[k] = k === 'on' ? e.target.checked : e.target.value;
    if (k === 'on' || state.screen === 'transfer') { render(); }
    touch(st); refreshSectionMarks(st); return;
  }
  if (e.target.dataset.k) { st.v[e.target.dataset.k] = e.target.value; touch(st); refreshSectionMarks(st); if (state.screen === 'transfer') refreshMissing(st); }
}
function onInput(e) {
  if (!state) return;
  const st = cur();
  if (st && e.target.dataset.k) { st.v[e.target.dataset.k] = e.target.value; touch(st); refreshSectionMarks(st); if (state.screen === 'transfer') refreshMissing(st); }
}
function onKey(e) {
  if (!state) return;
  if (e.key === 'Enter' && e.target.id === 'q') { doSearch(); return; }
  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target.getAttribute('role') === 'tab') {
    const next = e.target.id === 'tab-app' ? 'wilma' : 'app';
    setView(next); $(next === 'app' ? '#tab-app' : '#tab-wilma').focus(); return;
  }
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    const b = $('#next') || $('#finish');
    if (b) { e.preventDefault(); b.click(); }
  }
}
function doSearch() {
  const q2 = ($('#q') || {}).value || '';
  if (!q2.trim()) return;
  state.search = {q: q2, busy: true}; render();
  setTimeout(() => { state.search = {q: q2, done: true}; render(); }, 500);
}

// ---- Käynnistys ----
async function boot() {
  W.attach($('#wilma-frame'), $('#w-path'), $('#w-note'));
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('input', onInput);
  document.addEventListener('keydown', onKey);
  W.onEvents(events => { onWilmaEvents(events); });
  const status = t => { $('#boot-text').textContent = t; $('#w-boot-text').textContent = t; };
  try {
    SEED = await W.start(status);
  } catch (err) {
    const msg = `Synteettisen Wilman käynnistys epäonnistui: ${err.message} Tarkista verkkoyhteys (cdn.jsdelivr.net) ja lataa sivu uudelleen.`;
    $('#main').innerHTML = `<div class="note warn" role="alert" style="margin-top:20px">${esc(msg)}</div><p style="margin-top:14px"><button class="btn primary" onclick="location.reload()">Lataa uudelleen</button></p>`;
    $('#w-boot').classList.add('error');
    $('#w-boot').innerHTML = `<p>${esc(msg)}</p>`;
    return;
  }
  $('#w-host').textContent = W.host();
  PARTS = (SEED.parts['1101'] || []).map(p => ({code: p.catalog_id, wcode: p.code, name: p.name}));
  YEARS = SEED.school_years.slice(0, 3).map(([, label]) => label);
  state = initialState();
  await W.navigate('/', false);
  $('#w-boot').hidden = true;
  $('#reset').disabled = false;
  render();
  announce('Synteettinen Wilma on käynnissä.');
}

boot();
})();
