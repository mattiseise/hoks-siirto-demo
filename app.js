// Haastattelupolku – testiversio.
// Prototyypin polku; ”Siirto Wilmaan” kytketty synteettiseen Wilma v2:een, joka pyörii
// selaimessa (wilma-silta.js). Periaate: sovellus täyttää näkyvästi, ihminen painaa Wilman omaa
// Tallenna-painiketta, sovellus lukee tallennetun takaisin ja vertaa. Kaikki tiedot keksittyjä.
// Wilman lomakkeiden kentät ja niiden vastineet haastattelussa: kentat.json.
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
// Synteettisen Wilman siemenestä (W.call('seed')) ja kenttäluettelosta käynnistyksessä.
let SEED = null;
let SPEC = {};    // kentat.json: lomake → {fields, exceptions, …}
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

// Haastattelun osiot keskustelun järjestyksessä. Otsikot ovat Wilman sanat (kentat.json); help on
// selkokielinen apuselite. Kenttäavaimet vastaavat kentat.jsonin key-arvoja.
const SECTIONS = [
  {id: 'perus', title: 'Perustiedot', lead: 'Kuka hakija on, mihin tutkintoon hän hakee ja millä sopimuksella.', goes: ['Opiskelijan sidonta', 'Henkilökohtaistaminen', 'Oppisopimus'], fields: [
    {k: 'name', label: 'Nimi', full: true, help: 'Etunimi ja sukunimi'},
    {k: 'qual', label: 'Haettava tutkinto', type: 'select', options: QUALIFICATIONS, full: true, hint: 'Avoimet koulutukset. Esitäytetty hakijatiedoista, vaihda tarvittaessa.'},
    {k: 'contractType', label: 'Sopimusmuoto', type: 'select', options: CONTRACT_TYPES, full: true, hint: 'Ratkaisee, mikä sopimuslomake Wilmaan täytetään.'},
    {k: 'start', label: 'Opiskeluaika alkaa', type: 'date'},
    {k: 'end', label: 'Opiskeluaika päättyy', type: 'date'},
  ]},
  {id: 'tyopaikka', title: 'Työpaikka', lead: 'Kysy ensin Y-tunnus. Samalla Y-tunnuksella voi olla useita toimipaikkoja, joten varmista toimipaikka.', goes: ['Työpaikkarekisteri', 'Oppisopimus', 'Näyttösuunnitelmat'], fields: [
    {k: 'businessId', label: 'Y-tunnus', hint: 'Muoto 1234567-8. Sovellus hakee tällä ensin työpaikkarekisteristä.'},
    {k: 'employer', label: 'Nimi', help: 'Työpaikan (yrityksen) nimi'},
    {k: 'street', label: 'Lähiosoite', full: true, help: 'Toimipaikan katuosoite'},
    {k: 'postal', label: 'Postiosoite', help: 'Postinumero ja -toimipaikka'},
    {k: 'municipality', label: 'Toimipisteen paikkakunta', hint: 'Valitaan Wilman listasta (synteettisessä: Kouvola, Kotka, Hamina, Lahti).'},
    {k: 'country', label: 'Maa (jos muu kuin Suomi)', optional: true, hint: 'Jätä tyhjäksi, jos Suomi.'},
    {k: 'wpPhone', label: 'Puhelin', optional: true, help: 'Työpaikan puhelin'},
    {k: 'wpEmail', label: 'Sähköpostiosoite', optional: true, help: 'Työpaikan sähköposti'},
    {k: 'wpActive', label: 'Työpaikka on aktiivinen', type: 'checkbox', optional: true},
    {k: 'wpPublic', label: 'Julkinen', type: 'checkbox', optional: true, help: 'Työpaikka näkyy muillekin'},
    {k: 'wpApprentice', label: 'Oppisopimuspaikka', type: 'checkbox', optional: true},
  ]},
  {id: 'ohjaaja', title: 'Ohjaaja', lead: 'Kuka ohjaa opiskelijaa työpaikalla? Yhteyshenkilö vain, jos se on eri henkilö.', goes: ['Ohjaajarekisteri', 'Oppisopimus'], fields: [
    {k: 'insLast', label: 'Sukunimi', help: 'Työpaikkaohjaajan sukunimi'},
    {k: 'insFirst', label: 'Etunimet', help: 'Työpaikkaohjaajan etunimet'},
    {k: 'insPhone', label: 'Puhelin', help: 'Ohjaajan puhelin'},
    {k: 'insEmail', label: 'Sähköpostiosoite', help: 'Ohjaajan sähköposti'},
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
  {id: 'naytot', title: 'Näytöt', lead: 'Näyttösuunnitelma kullekin valitulle tutkinnon osalle: päivät, ympäristö ja suunnitelma jokaiselle ammattitaitovaatimukselle. Usein tarkentuvat myöhemmin; voit ohittaa osion.', goes: ['Näyttösuunnitelmat'], demo: true},
  {id: 'ura', title: 'Urasuunnitelma', lead: 'Opiskelijan omat suunnitelmat. Kirjaa hänen sanoillaan.', goes: ['Urasuunnitelma'], fields: [
    {k: 'goal', label: 'Opiskelijan tavoite', optional: true, full: true},
    {k: 'further', label: 'Suunnitelma jatko-opintoihin siirtymisestä', type: 'textarea', full: true, help: 'Jatko-opinnot'},
    {k: 'working', label: 'Suunnitelma työelämään siirtymisestä', type: 'textarea', full: true, help: 'Työelämään siirtyminen'},
    {k: 'career', label: 'Suunnitelma työuralla etenemiseksi', type: 'textarea', full: true, optional: true, help: 'Uralla eteneminen'},
    {k: 'continuation', label: 'Suunnitelma opintojen jatkamiseksi (kirjataan, jos opiskelija eroaa oppilaitoksesta)', type: 'textarea', full: true, optional: true},
    {k: 'docDate', label: 'Asiakirjan laatimispäivä', type: 'date', hint: 'Esitäytetty haastattelun päivästä'},
    {k: 'teachers', label: 'Vastuuopettajat (suunnitelman laatijat)', optional: true},
    {k: 'others', label: 'Muut vastuuhenkilöt', optional: true, full: true},
    {k: 'participants', label: 'Asiakirjan laatimiseen osallistuneet', type: 'textarea', full: true, hint: 'Esitäytetty: hakija ja haastattelija'},
  ]},
  {id: 'yhteenveto', title: 'Yhteenveto', lead: 'Mitä kullekin Wilman lomakkeelle on kertynyt. Puuttuvat tiedot voi täydentää nyt tai myöhemmin.', summary: true},
];

// Wilman lomakkeet siirtojärjestyksessä ja niiden vaatimat haastattelukentät.
const FORMS = [
  {id: 'sidonta', title: 'Opiskelijan sidonta', what: 'Etsitään hakija Wilmasta opiskelijana', needs: ['name']},
  {id: 'hk', title: 'Henkilökohtaistaminen', what: 'Opintojen alku- ja loppupäivämäärä', needs: ['start', 'end']},
  {id: 'tyopaikka', title: 'Työpaikka', what: 'Rekisteri: haku Y-tunnuksella, uusi vain jos ei löydy', needs: ['businessId', 'employer'], group: 'Rekisteri'},
  {id: 'ohjaaja', title: 'Työpaikkaohjaaja', what: 'Rekisteri: haku nimellä, uusi työpaikan alle', needs: ['insLast', 'insFirst'], group: 'Rekisteri'},
  {id: 'sopimus', title: 'Oppisopimus', what: 'Sopimuslomake sopimusmuodon mukaan', needs: ['contractType', 'qual', 'start', 'end', 'tasks', 'hours', 'signed']},
  {id: 'polku', title: 'Tutkintokoulutuksen suunnittelu', what: 'Tutkinnon osien lukuvuosi ja jakso (opintopolku)', needs: ['@parts']},
  {id: 'ura', title: 'Urasuunnitelma', what: 'Uusi urasuunnitelma, ellei jo ole', needs: ['further', 'working']},
  {id: 'naytot', title: 'Näyttösuunnitelmat', what: 'Suunnitelmaosa tutkinnon osittain. Arviointiosaa sovellus ei täytä.', needs: ['@parts', '@demo']},
];
function formTitle(st, f) { return f.id === 'sopimus' && st && st.v.contractType ? st.v.contractType : f.title; }
function formUnsupported(st, f) { return f.id === 'sopimus' && st && st.v.contractType && st.v.contractType !== 'Oppisopimus'; }
const FIELD = {};
SECTIONS.forEach(s => (s.fields || []).forEach(f => { FIELD[f.k] = f; }));
// Tarkista tiedot -näkymän kentät: haastattelun omat (ei Wilma v2:ssa) + kentat.jsonin vastineet.
const PICK_EXTRA = {
  sidonta: ['name', 'qual'], hk: ['start', 'end'],
  sopimus: ['contractType', 'qual', 'start', 'end', 'tasks', 'hours', 'partTime', 'trialStart', 'trialEnd', 'salary', 'signed'],
  polku: ['@parts'], naytot: ['@parts', '@demo'],
};
const PICK = {};
const LABELS = {};
SECTIONS.forEach(s => (s.fields || []).forEach(f => { LABELS[f.k] = f.label; }));
LABELS['@parts'] = 'vähintään yksi tutkinnon osa aikataulutettuna';
LABELS['@demo'] = 'näyttöympäristö ja suunnitelma jokaiselle ammattitaitovaatimukselle';
const DATE_KEYS = new Set(['start', 'end', 'trialStart', 'trialEnd', 'signed', 'docDate']);
const LONG_KEYS = new Set(['tasks', 'further', 'working', 'career', 'continuation', 'participants', 'goal', 'others']);

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
  const req = cid => ((SEED && SEED.requirements[cid]) || []).length;
  return {
    space: 'interviews', screen: 'list', studentId: null, search: null,
    students: [
      {id: 's1', phase: 'interview', section: 2, savedAt: '9.42', prefilled: ['name', 'qual', 'contractType', 'employer', 'businessId'],
        v: {name: 'Leo Östman', qual: 'Liiketoiminnan perustutkinto', contractType: 'Oppisopimus', start: '1.12.2026', end: '30.11.2028', businessId: '2740151-7', employer: 'Synteettinen Kahvila Oy', street: 'Kahvikuja 1', postal: '45100 Kouvola', municipality: 'Kouvola'},
        parts: {}, demo: {}, transfer: null},
      {id: 's2', phase: 'waiting', section: 7, savedAt: 'eilen', prefilled: ['name', 'qual', 'employer', 'businessId'],
        v: {name: 'Aino Virtanen', qual: 'Liiketoiminnan perustutkinto', contractType: 'Oppisopimus', start: '15.11.2026', end: '14.11.2028',
          businessId: (SEED && SEED.new_business_id) || '2740184-0', employer: 'Leipomo Esimerkki Oy', street: 'Leipurinkatu 4', postal: '45100 Kouvola', municipality: 'Kouvola', country: '', wpPhone: '040 000 0201', wpEmail: 'leipomo@example.test',
          wpActive: true, wpPublic: false, wpApprentice: true,
          insLast: 'Koskinen', insFirst: 'Sanna', insPhone: '040 000 1204', insEmail: 'sanna@example.test', contact: '',
          tasks: 'Asiakaspalvelu ja myynti leipomomyymälässä', hours: '38', trialStart: '15.11.2026', trialEnd: '14.5.2027', signed: '10.11.2026',
          goal: 'Valmistua liiketoiminnan perustutkintoon oppisopimuksella.', further: 'Ei suunnitelmia nyt.', working: 'Jatkaa nykyisessä työpaikassa.', career: '', continuation: '',
          docDate: '1.11.2026', teachers: 'Opettaja Synteettinen', others: '', participants: 'Hakija ja haastattelija'},
        parts: {'8101': {on: true, year: y0, period: '2'}, '8102': {on: true, year: y0, period: '3'}},
        demo: {
          '8101': {start: '1.3.2027', end: '31.3.2027', env: 'Leipomomyymälä: asiakaspalvelu ja kassatyö tavallisessa työvuorossa',
            plan: ['Palvelee asiakkaita myymälässä; työpaikkaohjaaja havainnoi kolme vuoroa.', 'Toimii leipomon palveluperiaatteiden mukaisesti ja kertoo valinnoistaan arviointikeskustelussa.'].slice(0, req('8101')),
            docs: ['Havainnointilomake', 'Asiakaspalautteet'].slice(0, req('8101'))},
          '8102': {start: '1.4.2027', end: '30.4.2027', env: 'Leipomomyymälä: tuote-esittely ja myynti',
            plan: ['Suunnittelee viikon myyntikampanjan ohjaajan kanssa.', 'Esittelee tuotteita asiakkaille ja kertoo raaka-aineista.'].slice(0, req('8102')),
            docs: ['Kampanjasuunnitelma', ''].slice(0, req('8102'))},
        },
        transfer: null},
      {id: 's3', phase: 'transfer', section: 7, savedAt: '29.10.', prefilled: ['name', 'qual'], sid: '1105', wilmaName: 'Lahtinen Eero',
        v: {name: 'Eero Lahtinen', qual: 'Logistiikan perustutkinto', contractType: 'Oppisopimus', start: '1.11.2026', end: '31.10.2028',
          businessId: '2740162-1', employer: 'Testivarasto Ab', street: 'Varastotie 2', postal: '48100 Kotka', municipality: 'Kotka', wpPhone: '040 000 0102', wpEmail: 'varasto@example.test',
          insLast: 'Mäkinen', insFirst: 'Pekka', insPhone: '040 000 1103', insEmail: 'pekka@example.test',
          tasks: 'Varastotyö ja keräily', hours: '38', trialStart: '1.11.2026', trialEnd: '30.4.2027', signed: '25.10.2026',
          further: 'Ammattikorkeakoulu myöhemmin.', working: 'Vakituinen paikka nykyisessä työpaikassa.', docDate: '29.10.2026', participants: 'Hakija ja haastattelija'},
        parts: {'8105': {on: true, year: y0, period: '2'}},
        demo: {'8105': {start: '', end: '', env: 'Varaston keräily ja lähetys', plan: [], docs: []}},
        transfer: {done: 1, step: 0, log: ['real']}},
    ],
  };
}
let state = null;
let pending = null;   // {studentId}: odotetaan käyttäjän tallennusta Wilmassa

// ---- Apufunktiot ----
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const cur = () => state.students.find(s => s.id === state.studentId);
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
function requirements(cid) { return (SEED && SEED.requirements[cid]) || []; }
function onParts(st) { return PARTS.filter(p => (st.parts[p.code] || {}).on); }
function selectedParts(st) {
  return PARTS.filter(p => { const v = st.parts[p.code]; return v && v.on && v.year && v.period; })
    .filter(p => partsOf(st.sid).some(w => w.catalog_id === p.code));
}
function cidFor(st) { const sel = selectedParts(st); return sel.length ? sel[0].code : (partsOf(st.sid)[0] || {}).catalog_id; }
function demoOf(st, cid) {
  st.demo = st.demo || {};
  return (st.demo[cid] = st.demo[cid] || {start: '', end: '', env: '', plan: [], docs: []});
}
function demoFilled(st) {
  const on = onParts(st);
  return on.length > 0 && on.every(p => {
    const d = (st.demo || {})[p.code] || {};
    return norm(d.env) && requirements(p.code).every((_r, i) => norm((d.plan || [])[i]));
  });
}
function filled(st, k) {
  if (k === '@parts') return Object.values(st.parts).some(p => p.on && p.year && p.period);
  if (k === '@demo') return demoFilled(st);
  const v = st.v[k];
  return typeof v === 'boolean' ? v : !!String(v || '').trim();
}
function shown(v) { return v === true ? 'Kyllä' : (v === false ? 'Ei' : (v || '')); }

function sectionStatus(st, sec) {
  if (sec.summary) return null;
  if (sec.parts) return filled(st, '@parts') ? 'full' : 'empty';
  if (sec.demo) {
    if (demoFilled(st)) return 'full';
    return Object.values(st.demo || {}).some(d => norm(d.env) || (d.plan || []).some(norm)) ? 'partial' : 'empty';
  }
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
    return {mode: 'partial', reason: 'Sovellus avaa oppisopimuslomakkeen ja täyttää sen kentät, mutta tallennus ei vielä toimi synteettisessä Wilmassa (D2) – simuloitu.'};
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

function hintHtml(f) {
  const parts = [f.help ? `Eli: ${f.help}.` : '', f.hint || ''].filter(Boolean);
  return parts.length ? `<div class="hint">${esc(parts.join(' '))}</div>` : '';
}
function fieldHtml(st, f, missing) {
  const raw = st.v[f.k];
  if (f.type === 'checkbox') {
    return `<label class="field check${f.full ? ' full' : ''}" for="f-${f.k}" data-field="${f.k}"><span class="check-row"><input type="checkbox" id="f-${f.k}" data-k="${f.k}"${raw === true ? ' checked' : ''}><span>${esc(f.label)}</span></span>${hintHtml(f)}</label>`;
  }
  const val = raw || '';
  const pre = st.prefilled.includes(f.k) && val;
  const cls = 'control' + (pre ? ' prefilled' : '');
  let ctl;
  if (f.type === 'select') ctl = `<select class="${cls}" id="f-${f.k}" data-k="${f.k}"><option value="">Valitse…</option>${f.options.map(o => `<option${o === val ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  else if (f.type === 'textarea') ctl = `<textarea class="${cls}" id="f-${f.k}" data-k="${f.k}" rows="3">${esc(val)}</textarea>`;
  else ctl = `<input class="${cls}" id="f-${f.k}" data-k="${f.k}" value="${esc(val)}"${f.type === 'date' ? ' placeholder="pp.kk.vvvv" inputmode="numeric"' : ''} autocomplete="off">`;
  return `<label class="field${f.full ? ' full' : ''}${missing ? ' missing' : ''}" for="f-${f.k}" data-field="${f.k}"><span class="lbl">${esc(f.label)}${missing ? '<span class="miss-chip">Puuttuu</span>' : ''}${f.optional ? '<span class="opt">valinnainen</span>' : ''}${pre ? '<span class="src">Hakijatiedoista</span>' : ''}</span>${ctl}${hintHtml(f)}</label>`;
}

function partsHtml(st, highlight) {
  const rows = PARTS.map(p => {
    const v = st.parts[p.code] || {};
    const rowMissing = highlight && v.on && !(v.year && v.period);
    const label = `${p.wcode} ${p.name}`;
    return `<tr${rowMissing ? ' class="missing"' : ''}><td><input type="checkbox" data-part="${p.code}" data-pk="on"${v.on ? ' checked' : ''} aria-label="${esc(label)}"></td><td>${esc(label)}</td><td><select class="control" data-part="${p.code}" data-pk="year"${v.on ? '' : ' disabled'} aria-label="Valinnan lukuvuosi: ${esc(label)}"><option value="">–</option>${YEARS.map(y => `<option${y === v.year ? ' selected' : ''}>${esc(y)}</option>`).join('')}</select></td><td><select class="control" data-part="${p.code}" data-pk="period"${v.on ? '' : ' disabled'} aria-label="Valinnan jakso: ${esc(label)}"><option value="">–</option>${PERIODS.map(y => `<option${y === v.period ? ' selected' : ''}>${y}</option>`).join('')}</select></td></tr>`;
  }).join('');
  const none = highlight && !filled(st, '@parts') ? '<div class="check-head warn" style="margin-bottom:10px"><span class="miss-chip">Puuttuu</span> Valitse vähintään yksi osa ja sille lukuvuosi ja jakso.</div>' : '';
  return `${none}<div class="table-wrap"><table class="parts"><thead><tr><th><span class="sr-only">Valittu</span></th><th>Tutkinnon osa</th><th>Valinnan lukuvuosi</th><th>Valinnan jakso</th></tr></thead><tbody>${rows}</tbody></table></div><div class="hint">Osat ovat synteettisen Wilman HOPS-puusta. Jaksoa ”Muu” ei käytetä.</div>`;
}

// Näytöt: valituille tutkinnon osille päivät, ympäristö ja vaatimustaulukon rivit (Wilman otsikoin).
function demoHtml(st, highlight) {
  const on = onParts(st);
  if (!on.length) return `<div class="note${highlight ? ' warn' : ''}">Valitse ensin tutkinnon osat osiossa ”Tutkinnon osat”. Näyttösuunnitelma tehdään osa kerrallaan.</div>`;
  const ctl = (cid, dk, row, label, value, opts = {}) => {
    const id = `d-${cid}-${dk}${row === null ? '' : `-${row}`}`;
    const miss = highlight && opts.req && !norm(value);
    const input = opts.area
      ? `<textarea class="control" id="${id}" rows="2" data-demo="${cid}" data-dk="${dk}"${row === null ? '' : ` data-row="${row}"`}${opts.req ? ' data-req="1"' : ''}>${esc(value)}</textarea>`
      : `<input class="control" id="${id}" data-demo="${cid}" data-dk="${dk}" value="${esc(value)}"${opts.date ? ' placeholder="pp.kk.vvvv" inputmode="numeric"' : ''} autocomplete="off">`;
    return `<label class="field${opts.full ? ' full' : ''}${miss ? ' missing' : ''}" for="${id}" data-demo-field><span class="lbl">${esc(label)}${miss ? '<span class="miss-chip">Puuttuu</span>' : ''}${opts.req ? '' : '<span class="opt">valinnainen</span>'}</span>${input}${opts.help ? `<div class="hint">${esc(opts.help)}</div>` : ''}</label>`;
  };
  return on.map(p => {
    const d = demoOf(st, p.code);
    const reqs = requirements(p.code);
    const rows = reqs.map((text, i) => `<div class="req"><p class="req-text"><span>Ammattitaitovaatimus ${i + 1}/${reqs.length}</span>${esc(text)}</p><div class="fields">${ctl(p.code, 'plan', i, 'Suunnitelma osaamisen osoittamisesta', (d.plan || [])[i] || '', {area: true, req: true, full: true, help: 'Miten opiskelija osoittaa tämän osaamisen työssä.'})}${ctl(p.code, 'docs', i, 'Tekemisessä syntyvät dokumentit', (d.docs || [])[i] || '', {area: true, full: true})}</div></div>`).join('');
    return `<fieldset class="demo-part"><legend>${esc(`${p.wcode} ${p.name}`)}</legend><div class="fields">${ctl(p.code, 'start', null, 'Näytön aloituspvm', d.start, {date: true})}${ctl(p.code, 'end', null, 'Näytön päättymispäivä', d.end, {date: true})}${ctl(p.code, 'env', null, 'Näyttöympäristö', d.env, {area: true, req: true, full: true, help: 'Työpaikka ja työtehtävät, joissa näyttö annetaan.'})}</div>${rows || '<p class="hint">Synteettisessä Wilmassa tälle osalle ei ole ammattitaitovaatimuksia.</p>'}</fieldset>`;
  }).join('') + '<div class="hint">Näytön arviointiosaa (arvosana, arvioijat, arviointitekstit) sovellus ei täytä.</div>';
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
  else if (sec.demo) body = demoHtml(st, false);
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
  const keys = PICK[form.id] || [];
  const parts = keys.includes('@parts') ? onParts(st).map(p => `<div><dt>${esc(`${p.wcode} ${p.name}`)}</dt><dd>${esc(st.parts[p.code].year || '–')}, jakso ${esc(st.parts[p.code].period || '–')}</dd></div>`).join('') : '';
  const demo = keys.includes('@demo') ? onParts(st).map(p => {
    const d = (st.demo || {})[p.code] || {};
    const reqs = requirements(p.code);
    const done = reqs.filter((_r, i) => norm((d.plan || [])[i])).length;
    return `<div class="long"><dt>Näyttö: ${esc(`${p.wcode} ${p.name}`)}</dt><dd>${esc([d.start || d.end ? `${d.start || '–'} – ${d.end || '–'}` : '', d.env || '', reqs.length ? `suunnitelma ${done}/${reqs.length} vaatimukselle` : ''].filter(Boolean).join(' · ') || '–')}</dd></div>`;
  }).join('') : '';
  const pick = keys.filter(k => !k.startsWith('@'));
  return `<dl class="readout">${parts}${demo}${pick.map(k => `<div class="${LONG_KEYS.has(k) ? 'long' : ''}"><dt>${esc(LABELS[k])}</dt><dd>${esc(shown(st.v[k]) || '–')}</dd></div>`).join('')}</dl>`;
}

function cmpTable(rows) {
  const state_ = r => r.na ? '<span class="badge">Ei luettavissa</span>' : (r.ok ? '<span class="badge ok">Täsmää</span>' : '<span class="badge warn">Eroaa</span>');
  return `<div class="table-wrap"><table class="cmp"><thead><tr><th scope="col">Kenttä</th><th scope="col">Hyväksytty</th><th scope="col">Tallennettu Wilmaan</th><th scope="col">Tila</th></tr></thead><tbody>${rows.map(r => `<tr class="${r.ok ? '' : 'diff'}"><th scope="row">${esc(r.label)}</th><td>${esc(shown(r.expected) || '–')}</td><td>${r.na ? '<span class="muted">synteettinen Wilma ei tallenna</span>' : esc(r.saved || '–')}</td><td>${state_(r)}</td></tr>`).join('')}</tbody></table></div>`;
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
  const head = `<header class="page-head"><div class="eyebrow">Siirto · lomake ${tr.done + 1} / ${FORMS.length}</div><h1 tabindex="-1" id="h">${esc(formTitle(st, form))}</h1><p>${esc(form.what)}${form.what.endsWith('.') ? '' : '.'}</p></header>`;
  let inner;
  if (form.id === 'sidonta') {
    inner = head + bindView(st, tr);
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
      body = `<div id="check-head">${checkHead(st, form)}</div><div class="panel"><div class="panel-head"><h3>Wilma / ${esc(formTitle(st, form))}</h3><span class="badge accent">Muokattavissa</span></div>${editFields(st, form)}<div class="hint" style="margin-top:14px">Muutokset tallentuvat myös haastatteluun. Kenttien otsikot ovat samat kuin Wilmassa.</div></div>${exceptionsHtml(form)}`;
    } else if (tr.step === 1) {
      body = `<div class="turn" aria-live="off"><span class="spinner"></span><div><h3>Sovellus täyttää lomaketta Wilmassa…</h3><p id="fill-progress" class="fill-progress">${esc(filling ? filling.text : 'Aloitetaan…')}</p><p>Seuraa Chrome-paneelia. Älä koske Wilmaan sillä aikaa.</p></div><div class="turn-actions">${SHOW_WILMA}<button class="btn slim" id="abort-fill">Keskeytä täyttö</button></div></div><div class="panel">${readout(st, form)}</div>`;
    } else if (tr.step === 2) {
      const queue = tr.queue && tr.queue.length > 1 ? ` Tutkinnon osa ${tr.qi + 1}/${tr.queue.length}: ${esc(partName(tr.queue[tr.qi]))}.` : '';
      if (tr.sim) {
        body = `<div class="turn info"><span class="big">≈</span><div><h3>Simuloitu tallennus</h3><p>${sup.mode === 'partial' && !tr.failed ? 'Lomake on avattu ja täytetty Wilmassa (korostettu). Tallennus ei vielä toimi synteettisessä Wilmassa; jos painat siellä Tallenna, Wilma vastaa virheellä. ' : ''}Jatka painamalla ”Tallensin (simuloitu)”.</p></div>${sup.mode === 'partial' ? SHOW_WILMA : ''}</div><div class="panel"><div class="panel-head"><h3>Wilma / ${esc(formTitle(st, form))}</h3><span class="badge sim">Simuloitu</span></div>${readout(st, form)}</div>`;
      } else {
        body = `<div class="turn"><span class="big" aria-hidden="true">→</span><div><h3>Nyt sinun vuorosi Wilmassa</h3><p>Tarkista korostetut kentät ja paina Wilman omaa Tallenna-painiketta.${queue} Voit muuttaa arvoja ennen tallennusta. Sovellus huomaa tallennuksen itse.</p></div>${SHOW_WILMA}</div><div class="panel">${readout(st, form)}</div>`;
      }
    } else {
      body = resultView(st, tr, form);
    }
    inner = head + stepsHtml(tr) + noteHtml + body;
  }
  return `<div class="tr"><nav aria-label="Lomakkeet"><ol class="forms">${forms}</ol></nav><section>${inner}</section></div>`;
}

// Wilman kentät, joita sovellus ei täytä (kentat.json exceptions), näkyvästi perusteltuina.
function exceptionsHtml(form) {
  const spec = SPEC[form.id];
  if (!spec || !spec.exceptions.length) return '';
  return `<details class="panel exceptions"><summary>Wilman kentät, joita sovellus ei täytä (${spec.exceptions.length})</summary><ul>${spec.exceptions.map(e => `<li><strong>${esc(e.label)}</strong> – ${esc(e.reason)}</li>`).join('')}</ul><p class="hint">Tallenna- ja Peruuta-painikkeita sekä Lisää uusi -linkkejä sovellus ei koskaan paina.</p></details>`;
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
  else if (ok) turn = `<div class="turn ok"><span class="big">✓</span><div><h3>Varmennettu</h3><p>Wilmaan tallennettu tieto luettiin takaisin ja se täsmää hyväksyttyyn.${res.rows.some(r => r.na) ? ' Kentät, joita synteettinen Wilma ei tallenna, on merkitty erikseen.' : ''}</p></div></div>`;
  else turn = `<div class="turn"><span class="big">!</span><div><h3>Tallennettu tieto eroaa hyväksytystä</h3><p>Wilmaan tallentui eri arvo kuin haastattelussa hyväksyttiin (korostettu). Hyväksy Wilman arvot tai palaa korjaamaan ja täytä uudelleen.</p></div></div>`;
  return `${turn}<div class="panel"><div class="panel-head"><h3>Takaisinluku Wilmasta</h3>${res.where ? `<span class="badge accent">${esc(res.where)}</span>` : ''}</div>${res.rows.length ? cmpTable(res.rows) : '<p class="small muted">Ei vertailtavia kenttiä.</p>'}</div>`;
}

function bindView(st, tr) {
  if (tr.searching) return `<div class="turn"><span class="spinner"></span><div><h3>Haetaan Wilmasta opiskelijana…</h3><p id="fill-progress" class="fill-progress">${esc(filling ? filling.text : '')}</p><p>Sovellus avaa opiskelijalistan sukunimen kirjaimella ja lukee osumat. Haku vain lukee.</p></div><div class="turn-actions">${SHOW_WILMA}<button class="btn slim" id="abort-fill">Keskeytä</button></div></div>`;
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
  const keys = PICK[form.id] || [];
  const parts = keys.includes('@parts') ? `<h3 class="sub-h">Tutkinnon osat</h3>${partsHtml(st, true)}` : '';
  const demo = keys.includes('@demo') ? `<h3 class="sub-h">Näyttösuunnitelmat</h3>${demoHtml(st, true)}` : '';
  const fields = keys.filter(k => !k.startsWith('@')).map(k => {
    const f = FIELD[k];
    return fieldHtml(st, form.needs.includes(k) ? {...f, optional: false} : f, form.needs.includes(k) && !filled(st, k));
  }).join('');
  return `${parts}${demo}${fields ? `<div class="fields"${parts || demo ? ' style="margin-top:18px"' : ''}>${fields}</div>` : ''}`;
}
function refreshMissing(st) {
  const form = FORMS[(st.transfer || {done: 0}).done];
  const head = $('#check-head'); if (head) head.innerHTML = checkHead(st, form);
  const toggle = (el, miss) => {
    el.classList.toggle('missing', miss);
    const chip = el.querySelector('.miss-chip');
    if (miss && !chip) el.querySelector('.lbl').insertAdjacentHTML('beforeend', '<span class="miss-chip">Puuttuu</span>');
    if (!miss && chip) chip.remove();
  };
  document.querySelectorAll('#main [data-field]').forEach(el => { const k = el.dataset.field; if (el.querySelector('.lbl')) toggle(el, form.needs.includes(k) && !filled(st, k)); });
  document.querySelectorAll('#main [data-demo-field]').forEach(el => { const c = el.querySelector('[data-demo]'); if (c && c.dataset.req) toggle(el, !norm(c.value)); });
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
    } else if (tr.step === 1) right = '<button class="btn" id="abort-fill">Keskeytä täyttö</button>';
    else if (tr.step === 2 && tr.sim) right = '<button class="btn" id="cancel-fill">← Palaa tietoihin</button><button class="btn primary big" id="saved-btn">Tallensin (simuloitu) →</button>';
    else if (tr.step === 2) { left = '<span class="meta"><span class="spinner"></span> Odotetaan tallennusta Wilmassa…</span>'; right = '<button class="btn" id="cancel-fill">← Palaa tietoihin</button>'; }
    else if (tr.step === 3) {
      const ok = tr.sim || (tr.result && tr.result.rows.every(r => r.ok));
      const next = tr.done + 1 < FORMS.length ? `<button class="btn primary big" id="next-form">Seuraava lomake: ${esc(formTitle(st, FORMS[tr.done + 1]))} →</button>` : '<button class="btn primary big" id="next-form">Valmis ✓</button>';
      if (ok) right = next;
      else if (tr.result && tr.result.existing) right = '<button class="btn" id="next-form">Jatka muuttamatta →</button><button class="btn primary big" id="accept-wilma">Hyväksy Wilman tiedot haastatteluun</button>';
      else right = '<button class="btn" id="refill">← Korjaa ja täytä uudelleen</button><button class="btn primary big" id="accept-wilma">Hyväksy Wilman arvot</button>';
    }
  } else if (state.screen === 'transfer' && st) {
    right = '<button class="btn primary big" data-go="list">Takaisin siirtojonoon</button>';
  }
  el.hidden = !left && !right;
  el.innerHTML = `${left}<span class="right">${right}</span>`;
}

// ---- Näkymä: Sovellus | Wilma (kapea ikkuna) ----
const narrowQuery = window.matchMedia('(max-width: 999px)');
const isNarrow = () => narrowQuery.matches;
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

// ---- Täytön tahti ja näkyvyys (kuten demoajo: slow_mo ~350 ms, tauot, vaiheteksti) ----
const SPEEDS = {
  hidas: {label: 'Hidas', act: 750, nav: 1600, char: 70, cap: 3000},
  normaali: {label: 'Normaali', act: 350, nav: 900, char: 30, cap: 1500},
  nopea: {label: 'Nopea', act: 0, nav: 0, char: 0, cap: 0},
};
let speed = 'normaali';
try { const s = localStorage.getItem('haastattelupolku.tahti'); if (SPEEDS[s]) speed = s; } catch (e) { /* ei tallennusta */ }
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const pace = () => SPEEDS[speed] || SPEEDS.normaali;
class FillAborted extends Error {}
let filling = null;   // {aborted, n, total, prefix, text}
function checkAbort() { if (filling && filling.aborted) throw new FillAborted('Täyttö keskeytettiin.'); }
async function hold(ms) { checkAbort(); if (ms > 0) await sleep(ms); checkAbort(); }
function progress(text) {
  if (filling) filling.text = text;
  ['#fill-progress', '#w-fill-text'].forEach(s => { const el = $(s); if (el) el.textContent = text; });
}
async function say(text, ms) { W.setStep(text); progress(text); await hold(ms === undefined ? pace().nav : ms); }
function sayField(label) {
  if (!filling) return;
  filling.n += 1;
  W.setStep(`Täytetään: ${label}`);
  progress(`${filling.prefix || ''}Kenttä ${filling.n}/${filling.total}: ${label}`);
}

// ---- Wilma-täyttö (sama polku kuin adapterit; kentät ja otsikot kentat.jsonista) ----
const SAVE_SELECTOR = 'input[type=submit], button[type=submit], #btn-save-choices, [name=savebtn], [name=cancelbtn]';
const fdoc = () => W.doc();
const q = (sel, root) => (root || fdoc()).querySelector(sel);
function must(el, what) { if (!el) throw new Error(`Wilmasta ei löytynyt: ${what}.`); return el; }
function mark(el) { if (el && el.classList) { el.classList.remove('ota-active', 'ota-target'); el.classList.add('ota-filled'); } }
function pointerEl() {
  const d = fdoc();
  let p = d.getElementById('ota-pointer');
  if (!p) { p = d.createElement('div'); p.id = 'ota-pointer'; p.setAttribute('aria-hidden', 'true'); d.body.appendChild(p); }
  return p;
}
function hidePointer() { try { const p = fdoc().getElementById('ota-pointer'); if (p) p.remove(); } catch (e) { /* sivu vaihtui */ } }
// Klikattava tai täytettävä kohde: vieritys näkyviin, rengas ja osoitin hetken ennen toimintoa.
async function point(el) {
  const p = pace();
  const quick = !p.act || reduceMotion.matches;
  try { el.scrollIntoView({block: 'center', inline: 'nearest', behavior: quick ? 'auto' : 'smooth'}); } catch (e) { /* piilotettu */ }
  if (!quick) await hold(220);
  el.classList.add('ota-target');
  const r = el.getBoundingClientRect();
  if (r.width && p.act) {
    const ptr = pointerEl();
    ptr.style.left = `${r.left + Math.min(r.width / 2, 40)}px`;
    ptr.style.top = `${r.top + r.height / 2}px`;
  }
  await hold(p.act);
  return el;
}
async function wClick(el, what) {
  must(el, what);
  if (el.matches(SAVE_SELECTOR)) throw new Error('Sovellus ei paina Wilman Tallenna- tai Peruuta-painiketta.');
  await point(el);
  el.click();
  el.classList.remove('ota-target');
  await hold(pace().act / 2);
}
async function wFollow(el, what, text) {
  must(el, what);
  if (text) { W.setStep(text); progress(text); }
  const loaded = W.nextLoad();
  await wClick(el, what);
  await loaded;
  hidePointer();
  await hold(pace().nav);
}
async function wGo(url, text) {
  if (text) { W.setStep(text); progress(text); }
  await W.navigate(url);
  await hold(pace().nav);
}
function fire(el, name) { el.dispatchEvent(new (W.win().Event)(name, {bubbles: true})); }
// Teksti merkki kerrallaan (input-tapahtumat); pitkä teksti paloina, jotta kenttä ei kestä liian kauan.
async function typeInto(el, value) {
  const p = pace();
  if (!p.char || reduceMotion.matches || !value) { el.value = value; fire(el, 'input'); return; }
  el.value = '';
  fire(el, 'input');
  const ticks = Math.max(1, Math.min(value.length, Math.round(p.cap / p.char)));
  const chunk = Math.ceil(value.length / ticks);
  for (let i = chunk; ; i += chunk) {
    el.value = value.slice(0, Math.min(i, value.length));
    fire(el, 'input');
    if (i >= value.length) break;
    await hold(p.char);
  }
}
async function wType(el, value, label) {
  sayField(label);
  await point(el);
  el.focus();
  el.classList.add('ota-active');
  await typeInto(el, value);
  fire(el, 'change');
  mark(el);
  await hold(pace().act / 2);
}
async function wCheck(el, label) {
  sayField(label);
  const box = el.closest('label') || el;
  await point(box);
  if (!el.checked) el.click();
  mark(box);
  await hold(pace().act / 2);
}
async function wRadio(input, label) {
  sayField(label);
  const lab = fdoc().querySelector(`label[for="${CSS.escape(input.id)}"]`) || input;
  await point(lab);
  input.click();
  mark(lab);
  await hold(pace().act / 2);
}
// Combobox: sivun oma haku (input-tapahtumat), ehdotuslista näkyviin, valittava rivi korostetaan
// ja valitaan kuten käyttäjä tekisi.
async function wCombo(el, typed, pick, label) {
  sayField(label);
  await point(el);
  el.focus();
  el.classList.add('ota-active');
  await typeInto(el, typed);
  for (let i = 0; i < 80 && !el.hasAttribute('data-searchresult'); i++) await hold(40);
  if (!el.hasAttribute('data-searchresult')) throw new Error(`haku ei valmistunut (${label}).`);
  const options = [...fdoc().querySelectorAll(`#${CSS.escape(el.id)}_option-list li[role=option] > a`)];
  const hit = options.find(a => pick(norm(a.textContent)));
  if (!hit) { mark(el); return null; }
  W.setStep(`Valitaan: ${norm(hit.textContent)}`);
  await point(hit.closest('li') || hit);
  hit.click();
  mark(el);
  await hold(pace().act / 2);
  const hidden = el.parentElement.querySelector(`input[name="${CSS.escape(el.name)}__id"]`);
  return hidden ? hidden.value : '';
}
function linkByText(root, text, prefix = false) {
  return [...must(root, 'linkkien alue').querySelectorAll('a')].find(a => prefix ? norm(a.textContent).startsWith(text) : norm(a.textContent) === text);
}
async function openStudent(sid) { await wGo(`/profiles/students/${sid}`, 'Avataan opiskelijan sivu'); }
async function openPartPanel(sid, cid) {
  if (W.current() !== `/profiles/students/${sid}/choices`) {
    await openStudent(sid);
    const tab = q(`.ds-subtabs a[href="/profiles/students/${sid}/choices"]`);
    if (tab) await wFollow(tab, 'Opinnot-välilehti', 'Avataan välilehti Opinnot (HOPS)');
    else await wGo(`/profiles/students/${sid}/choices`, 'Avataan opintopolku');
  }
  W.setStep(`Avataan tutkinnon osa: ${partName(cid)}`);
  progress(`Avataan tutkinnon osa: ${partName(cid)}`);
  await wClick(q(`#choices-tree a.a-val[href$="/catalog/${cid}"]`), `tutkinnon osan rivi (${partName(cid)})`);
  const code = (PARTS.find(p => p.code === cid) || {}).wcode || '';
  const title = norm((q('#sidepanel-title-1') || {}).textContent);
  if (!title.startsWith(`${code} - `)) throw new Error(`paneeli näyttää väärän osan (${title || 'tyhjä'}).`);
  await hold(pace().nav / 2);
}
async function openFormsTab() {
  W.setStep('Avataan paneelin Lomakkeet-välilehti');
  progress('Avataan paneelin Lomakkeet-välilehti');
  await wClick(q('#choices-nav-tabs a[href$="#forms-tab"]'), 'Lomakkeet-välilehti');
  await hold(pace().nav / 2);
}
async function openHost(st) {
  await openPartPanel(st.sid, cidFor(st));
  await openFormsTab();
  await wFollow(linkByText(q('#forms-tab > div'), 'Luo uusi: Oppisopimus'), 'Luo uusi: Oppisopimus', 'Avataan: Luo uusi: Oppisopimus');
  if (!q('#f-pfield4')) throw new Error('oppisopimuslomake ei auennut.');
}
function heading(text) {
  const ok = [...fdoc().querySelectorAll('main h1')].some(h => norm(h.textContent) === text);
  if (!ok) throw new Error(`odotettu lomake ”${text}” ei auennut.`);
}

// Kentän arvo haastattelusta (kentat.jsonin key). ctx: {cid, row} näyttösuunnitelmalle.
function valueOf(st, key, ctx = {}) {
  if (key.startsWith('@demo.')) {
    const d = (st.demo || {})[ctx.cid] || {};
    const k = key.slice(6);
    if (k === 'plan' || k === 'docs') return String((d[k] || [])[ctx.row] || '').trim();
    if (k === 'start' || k === 'end') return d[k] ? normDate(d[k]) : '';
    return String(d[k] || '').trim();
  }
  if (key === '@wpId') return st.wpId || '';
  const v = st.v[key];
  if (typeof v === 'boolean') return v;
  if (DATE_KEYS.has(key)) return v ? normDate(v) : '';
  return v == null ? '' : String(v).trim();
}
// Kentän otsikko Wilmassa: label[for], ympäröivä label tai taulukon sarakeotsikko.
function labelOf(el) {
  const d = el.ownerDocument;
  if (el.id) { const l = d.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) return norm(l.textContent); }
  const wrap = el.closest('label');
  if (wrap) return norm(wrap.textContent);
  const td = el.closest('td');
  const table = el.closest('table');
  if (td && table) { const th = table.querySelectorAll('thead th')[[...td.parentElement.children].indexOf(td)]; if (th) return norm(th.textContent); }
  return '';
}
function locate(scope, f) {
  const el = must(scope.querySelector(`[name="${CSS.escape(f.control)}"]`), `kenttä ”${f.label}”`);
  const shownLabel = labelOf(el);
  if (shownLabel !== f.label) throw new Error(`kentän otsikko ei täsmää: odotettiin ”${f.label}”, Wilmassa ”${shownLabel}”.`);
  return el;
}
function tableCells(scope, header) {
  const table = [...scope.querySelectorAll('table')].find(t => [...t.querySelectorAll('thead th')].some(th => norm(th.textContent) === header));
  must(table, `taulukko ”${header}”`);
  const col = [...table.querySelectorAll('thead th')].findIndex(th => norm(th.textContent) === header);
  return [...table.querySelectorAll('tbody > tr')].map(r => ({
    el: r.children[col] && r.children[col].querySelector('textarea'),
    req: norm((r.children[0] && (r.children[0].querySelector('textarea') || r.children[0])).value || (r.children[0] || {}).textContent),
  })).filter(c => c.el);
}
// Täytä lomakkeen kentät kentat.jsonin järjestyksessä yksi kerrallaan. Palauttaa comboboxien id:t.
async function fillFields(st, formId, ctx = {}) {
  const spec = SPEC[formId];
  const scope = must(q(spec.scope === 'form' ? '#main-content form' : spec.scope), 'lomake');
  const items = [];
  for (const f of spec.fields) {
    if (f.key.startsWith('@parts')) continue;
    if (f.control.startsWith('table:')) {
      tableCells(scope, f.label).forEach((cell, i) => {
        const v = valueOf(st, f.key, {...ctx, row: i});
        if (v) items.push({f, el: cell.el, v, label: `${f.label} (rivi ${i + 1})`});
      });
      continue;
    }
    const v = valueOf(st, f.key, ctx);
    if (v === '' || v === false) continue;
    items.push({f, el: locate(scope, f), v, label: f.label});
  }
  filling.total = items.length;
  filling.n = 0;
  const ids = {};
  for (const it of items) {
    if (it.el.type === 'checkbox') await wCheck(it.el, it.label);
    else if (it.f.pick) {
      const instructor = it.f.pick === 'instructor';
      const want = instructor ? `${norm(st.v.insLast)} ${norm(st.v.insFirst)}` : norm(it.v);
      const pick = it.f.pick === 'exact' ? (t => t === want) : (instructor ? (t => t.startsWith(want)) : (t => t.includes(want)));
      ids[it.f.control] = await wCombo(it.el, instructor ? norm(st.v.insLast) : String(it.v), pick, it.label);
    } else await wType(it.el, String(it.v), it.label);
  }
  return ids;
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
function cmpRow(st, f, label, saved, ctx) {
  const expected = valueOf(st, f.expect || f.key, ctx);
  const isDate = /date|Date|@demo\.(start|end)/.test(f.key) || DATE_KEYS.has(f.key);
  const ok = isDate ? normDate(expected) === normDate(saved) : norm(expected) === norm(saved);
  const row = {key: f.key, label, expected, saved: saved ?? '', ok};
  if (f.expect) row.apply = () => {};   // viitettä ei kirjoiteta haastatteluun
  else if (f.key.startsWith('@demo.')) {
    const k = f.key.slice(6);
    row.apply = () => { const d = demoOf(st, ctx.cid); if (k === 'plan' || k === 'docs') { d[k] = d[k] || []; d[k][ctx.row] = row.saved; } else d[k] = row.saved; };
  }
  return row;
}
// Vertailurivit kentat.jsonin mukaan: takaisinluettavat vertaillaan, muut merkitään ”ei luettavissa”.
function readForm(st, formId, url, ctx = {}) {
  const spec = SPEC[formId];
  const {doc, fields} = readView(url, spec.readback_prefix);
  const prefix = ctx.prefix || '';
  const rows = [];
  for (const f of spec.fields) {
    if (f.control.startsWith('table:')) {
      [...doc.querySelectorAll('[data-testid=demonstration-row]')].forEach((tr, i) => {
        const text = norm((tr.querySelector('[data-testid=row-text]') || {}).textContent);
        const saved = (tr.querySelector(`[data-testid=${f.readback}]`) || {}).textContent;
        rows.push(cmpRow(st, f, `${prefix}${f.label} – ${text}`, saved, {...ctx, row: i}));
      });
      continue;
    }
    if (!f.readback) {
      const v = valueOf(st, f.key, ctx);
      if (v !== '' && v !== false) rows.push({key: f.key, label: prefix + f.label, expected: v, saved: '', ok: true, na: true});
      continue;
    }
    rows.push(cmpRow(st, f, prefix + f.label, fields[f.readback], ctx));
  }
  return rows;
}
function acceptRows(st, rows) {
  rows.filter(r => !r.ok).forEach(r => {
    if (r.apply) r.apply();
    else if (r.key && !r.key.startsWith('@')) st.v[r.key] = r.saved;
    r.ok = true;
  });
}
function readWorkplace(st, rid, existing) {
  st.wpId = rid;
  return {rows: readForm(st, 'tyopaikka', `/synthetic/tyopaikat/${rid}`), existing, title: existing ? `Löytyi työpaikkarekisteristä (${rid})` : '', where: `Työpaikkarekisteri, tietue ${rid}`};
}
function readInstructor(st, rid, existing) {
  return {rows: readForm(st, 'ohjaaja', `/synthetic/ohjaajat/${rid}`), existing, title: existing ? `Löytyi ohjaajarekisteristä (${rid})` : '', where: `Ohjaajarekisteri, tietue ${rid}`};
}
function readCareer(st, rid, existing) {
  return {rows: readForm(st, 'ura', `/specedu/view/${rid}/21/${st.sid}`), existing, title: existing ? 'Urasuunnitelma on jo olemassa – ei luoda uutta' : '', where: `Suunnitelmat, tietue ${rid}`};
}
function yearLabel(value) { const y = SEED.school_years.find(([v]) => v === value); return y ? y[1] : (value === '0' ? 'Ei valintaa' : value); }
function readChoices(st, cids) {
  const r = W.request('GET', `/profiles/students/${st.sid}/choices`, '', {skin: false});
  const doc = parser.parseFromString(r.body, 'text/html');
  const data = JSON.parse(must(doc.getElementById('v2-choices-data'), 'opintopolun tiedot').textContent);
  const [fy, fp] = SPEC.polku.fields;
  const rows = [];
  cids.forEach(cid => {
    const saved = data.parts[cid] || {};
    const want = st.parts[cid] || {};
    const yl = yearLabel(saved.year);
    const pl = saved.period && saved.period !== '0' ? saved.period : '';
    rows.push({key: fy.key, label: `${partName(cid)}: ${fy.label}`, expected: want.year, saved: yl, ok: norm(want.year) === norm(yl),
      apply: () => { if (YEARS.includes(yl)) want.year = yl; }});
    rows.push({key: fp.key, label: `${partName(cid)}: ${fp.label}`, expected: want.period ? `${want.period}. jakso` : '', saved: pl ? `${pl}. jakso` : (saved.period === '0' ? 'Ei jaksoa' : ''), ok: want.period === pl,
      apply: () => { if (PERIODS.includes(pl)) want.period = pl; }});
  });
  return rows;
}

// Lomakekohtaiset täytöt. Palauttaa 'await' (odotetaan tallennusta), 'sim' tai 'verify'.
const FILL = {
  async sim(st, tr) { await say('Simuloidaan: lomaketta ei ole synteettisessä Wilmassa.', Math.max(600, pace().nav)); tr.sim = true; return 'sim'; },

  async tyopaikka(st, tr) {
    await say(`Haetaan työpaikkarekisteristä Y-tunnuksella ${st.v.businessId}`);
    const found = W.call('workplaces_with', st.v.businessId);
    if (found.length) {
      await wGo(`/synthetic/tyopaikat/${found[0].record_id}`, 'Työpaikka löytyi rekisteristä: avataan tietue');
      tr.result = readWorkplace(st, found[0].record_id, true);
      if (found.length > 1) tr.info = `Y-tunnuksella löytyi ${found.length} toimipaikkaa; käytetään ensimmäistä (${found[0].record_id}).`;
      return 'verify';
    }
    tr.info = `Y-tunnusta ${st.v.businessId} ei löytynyt työpaikkarekisteristä, joten sovellus avaa uuden työpaikan lomakkeen.`;
    if (hasTree(st)) {
      await openHost(st);
      await wFollow(linkByText(q('#main-content'), ADD_WORKPLACE, true), 'Lisää uusi työpaikka', 'Avataan: Lisää uusi työpaikka');
    } else {
      tr.info += ' Opiskelijalla ei ole HOPS-puuta, joten lomake avataan suoraan osoitteella.';
      await wGo('/forms/744/new', 'Avataan uuden työpaikan lomake');
    }
    heading('Uusi työpaikka');
    const ids = await fillFields(st, 'tyopaikka');
    if (ids.pfield61 === null) tr.info += ` Paikkakuntaa ”${st.v.municipality}” ei ole Wilman listassa; kirjoitettu teksti jää kenttään.`;
    tr.expect = 'workplace';
    return 'await';
  },

  async ohjaaja(st, tr) {
    const last = norm(st.v.insLast);
    const first = norm(st.v.insFirst);
    await say(`Haetaan ohjaajarekisteristä: ${last} ${first}`);
    const found = W.call('instructors_named', last, first);
    const mine = found.filter(i => !st.wpId || i.workplace_id === st.wpId);
    if (mine.length) {
      await wGo(`/synthetic/ohjaajat/${mine[0].record_id}`, 'Ohjaaja löytyi rekisteristä: avataan tietue');
      tr.result = readInstructor(st, mine[0].record_id, true);
      return 'verify';
    }
    tr.info = found.length ? 'Samanniminen ohjaaja löytyi toisesta työpaikasta. Lisätään uusi ohjaaja tämän työpaikan alle.' : `Ohjaajaa ”${last} ${first}” ei löytynyt rekisteristä, joten sovellus avaa uuden ohjaajan lomakkeen.`;
    if (hasTree(st)) {
      await openHost(st);
      await wFollow(linkByText(q('#main-content'), ADD_INSTRUCTOR, true), 'Lisää uusi työpaikkaohjaaja', 'Avataan: Lisää uusi työpaikkaohjaaja');
    } else {
      tr.info += ' Opiskelijalla ei ole HOPS-puuta, joten lomake avataan suoraan osoitteella.';
      await wGo('/forms/745/new', 'Avataan uuden ohjaajan lomake');
    }
    heading('Uusi työpaikkaohjaaja');
    const ids = await fillFields(st, 'ohjaaja');
    if (!ids.pfield60) throw new Error(`työpaikkaa ${st.v.businessId} ei löytynyt ohjaajalomakkeen listasta.`);
    if (st.wpId && ids.pfield60 !== st.wpId) tr.info += ` Valittu työpaikka (${ids.pfield60}) ei ole varmennettu työpaikka (${st.wpId}); tarkista.`;
    tr.expect = 'instructor';
    return 'await';
  },

  async sopimus(st, tr) {
    await openHost(st);
    const ids = await fillFields(st, 'sopimus');
    const notes = [];
    if (ids.pfield4 === null) notes.push(`Työnantajaa ${st.v.businessId} ei löytynyt Wilman listasta.`);
    else if (st.wpId && ids.pfield4 && ids.pfield4 !== st.wpId) notes.push(`Työnantajan tunniste (${ids.pfield4}) ei ole varmennettu työpaikka (${st.wpId}).`);
    if (ids['prepeater5-1-pfield5'] === null) notes.push(`Ohjaajaa ${st.v.insLast} ${st.v.insFirst} ei löytynyt työnantajan ohjaajista.`);
    tr.info = notes.join(' ') || null;
    tr.sim = true;
    tr.overlay = 'Sovellus täytti oppisopimuksen kentät.\nTallennus ei vielä toimi synteettisessä Wilmassa (D2) – simuloitu.';
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
    const link = q(`.ds-subtabs a[href="/profiles/students/${st.sid}/specedu"]`) || q(`a[href="/profiles/students/${st.sid}/specedu"]`);
    await wFollow(link, 'Suunnitelmat', 'Avataan välilehti Suunnitelmat');
    const h2 = [...fdoc().querySelectorAll('#main-content > div > h2')].find(h => norm(h.firstChild && h.firstChild.textContent) === 'Urasuunnitelmat');
    const section = must(h2, 'Urasuunnitelmat-osio').parentElement;
    const existing = [...section.querySelectorAll('table a.specedu-copiable')];
    if (existing.length) {
      const last = existing[existing.length - 1];
      await say('Urasuunnitelma on jo olemassa – ei luoda uutta', 0);
      await point(last);
      mark(last);
      const rid = last.getAttribute('href').split('/')[3];
      tr.result = readCareer(st, rid, true);
      return 'verify';
    }
    const create = must(h2.querySelector('ul.dropdown-menu a'), 'urasuunnitelman luontilinkki');
    tr.formType = (create.getAttribute('href').match(/^\/forms\/(\d+)\/new/) || [])[1];
    await wFollow(create, 'Lisää uusi: Urasuunnitelma', 'Avataan: Lisää uusi urasuunnitelma');
    await fillFields(st, 'ura');
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
  filling.prefix = tr.queue.length > 1 ? `Osa ${tr.qi + 1}/${tr.queue.length} · ` : '';
  await openPartPanel(st.sid, cid);
  const [fy, fp] = SPEC.polku.fields;
  const labelOfRadio = r => norm((fdoc().querySelector(`label[for="${CSS.escape(r.id)}"]`) || {}).textContent);
  filling.total = 2;
  filling.n = 0;
  const year = [...fdoc().querySelectorAll(`input[name="${fy.control}"]`)].find(r => labelOfRadio(r) === want.year);
  await wRadio(must(year, `lukuvuosi ${want.year}`), `${fy.label}: ${want.year}`);
  const period = [...fdoc().querySelectorAll(`input[name="${fp.control}"]`)].find(r => labelOfRadio(r) === `${want.period}. jakso`);
  must(period, `jakso ${want.period}`);
  if (period.disabled) throw new Error('jakson valinta ei aktivoitunut lukuvuoden jälkeen.');
  await wRadio(period, `${fp.label}: ${want.period}. jakso`);
  tr.expect = 'choice';
  tr.overlay = `Tarkista valinta (osa ${tr.qi + 1}/${tr.queue.length}) ja paina Tallenna.`;
}

async function fillDemo(st, tr) {
  const cid = tr.queue[tr.qi];
  filling.prefix = tr.queue.length > 1 ? `Osa ${tr.qi + 1}/${tr.queue.length} · ` : '';
  await openPartPanel(st.sid, cid);
  await openFormsTab();
  await wFollow(linkByText(q('#forms-tab'), 'Luo uusi: HOKS Näyttösuunnitelma', true), 'Luo uusi: näyttösuunnitelma', 'Avataan: Luo uusi: HOKS Näyttösuunnitelma');
  const code = (PARTS.find(p => p.code === cid) || {}).wcode;
  if (!norm((q('#f-pfield3') || {}).textContent).includes(code)) throw new Error('näyttölomake on eri tutkinnon osalle.');
  const reqs = requirements(cid);
  const cells = tableCells(q('#main-content form'), SPEC.naytot.fields.find(f => f.key === '@demo.plan').label);
  if (cells.length !== reqs.length || cells.some((c, i) => c.req !== norm(reqs[i]))) throw new Error('ammattitaitovaatimusten rivit eroavat haastattelusta.');
  const ids = await fillFields(st, 'naytot', {cid});
  if (ids.pfield6 === null) tr.info = `Suorituspaikkaa ${st.v.businessId} ei löytynyt Wilman listasta.`;
  tr.expect = 'demo';
  tr.overlay = `Tarkista näyttösuunnitelma (osa ${tr.qi + 1}/${tr.queue.length}) ja paina Tallenna tiedot.`;
}

const DEFAULT_OVERLAY = 'Tarkista ja paina Tallenna';

// Täyttövaihe: tahti, keskeytys, Chrome-paneelin edistymispalkki; kapeana Wilma-välilehti.
async function fillPhase(fn, show = true) {
  filling = {aborted: false, n: 0, total: 0, prefix: '', text: 'Aloitetaan…'};
  if (show && isNarrow()) setView('wilma');
  else if (show) pinChrome();
  $('#w-fill').hidden = false;
  progress('Aloitetaan…');
  try {
    return await fn();
  } finally {
    $('#w-fill').hidden = true;
    hidePointer();
    filling = null;
  }
}

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
    out = await fillPhase(() => (sup.mode === 'sim' ? FILL.sim(st, tr) : FILL[form.id](st, tr)), sup.mode !== 'sim');
  } catch (err) {
    if (err instanceof FillAborted) {
      leaveStep(tr);
      tr.info = 'Täyttö keskeytettiin. Wilmaan ei tallennettu mitään; voit täyttää uudelleen.';
      W.setStep('Täyttö keskeytetty.');
      if (isNarrow()) setView('app');
      render();
      announce('Täyttö keskeytettiin.');
      return;
    }
    tr.failed = err.message;
    tr.sim = true;
    out = 'sim';
  }
  if (out === 'verify') {
    tr.step = 3;
    W.setStep(tr.result && tr.result.existing ? 'Löytyi Wilmasta – katso tulos sovelluksesta.' : null);
    if (isNarrow()) setView('app');
    announce('Tarkista tallennus.');
  } else {
    tr.step = 2;
    if (out === 'await') {
      pending = {studentId: st.id};
      W.setStep(tr.overlay || DEFAULT_OVERLAY);
      setAttention(true);
      announce('Lomake täytetty. Tarkista ja tallenna Wilmassa.');
    } else {
      W.setStep(tr.overlay || null);
      if (tr.overlay) setAttention(true);
      if (isNarrow() && !tr.overlay) setView('app');
      announce('Simuloitu kohta.');
    }
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
  const ev = events.find(e => e.kind === tr.expect
    && (e.kind !== 'choice' || (e.sid === st.sid && e.catalog === tr.queue[tr.qi]))
    && (e.kind !== 'record' || (e.sid === st.sid && (!tr.formType || e.form_type === tr.formType))));
  if (!ev) return;
  W.setStep('Tallennus nähty: luetaan tallennettu takaisin');
  try {
    if (form.id === 'tyopaikka') tr.result = readWorkplace(st, ev.id, false);
    else if (form.id === 'ohjaaja') tr.result = readInstructor(st, ev.id, false);
    else if (form.id === 'ura') tr.result = readCareer(st, ev.id, false);
    else if (form.id === 'polku' || form.id === 'naytot') {
      const cid = tr.queue[tr.qi];
      tr.rows.push(...(form.id === 'polku' ? readChoices(st, [cid]) : readForm(st, 'naytot', `/synthetic/naytot/${ev.id}`, {cid, prefix: `${partName(cid)}: `})));
      if (tr.qi + 1 < tr.queue.length) {
        tr.qi += 1;
        tr.step = 1;
        render();
        announce(`Tallennus nähty. Täytetään seuraava tutkinnon osa (${tr.qi + 1}/${tr.queue.length}).`);
        try {
          await fillPhase(async () => {
            await say(`Tallennus nähty. Seuraava tutkinnon osa: ${partName(tr.queue[tr.qi])}`);
            await (form.id === 'polku' ? fillChoice(st, tr) : fillDemo(st, tr));
          });
          tr.step = 2;
          W.setStep(tr.overlay || DEFAULT_OVERLAY);
        } catch (err) {
          pending = null;
          setAttention(false);
          if (err instanceof FillAborted) {
            leaveStep(tr);
            tr.info = 'Täyttö keskeytettiin. Jo tallennetut osat jäävät Wilmaan; voit täyttää uudelleen.';
            W.setStep('Täyttö keskeytetty.');
          } else {
            tr.failed = err.message;
            tr.sim = true;
            tr.step = 2;
            W.setStep(null);
          }
          if (isNarrow()) setView('app');
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
  if (isNarrow()) setView('app');
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
  Object.assign(tr, {searching: true, hits: null, notYet: false, error: null, pick: null, info: null});
  render();
  try {
    await fillPhase(async () => {
      const last = splitName(st.v.name)[1] || norm(st.v.name);
      await wGo('/profiles/students', 'Avataan opiskelijalista');
      const letter = last.charAt(0).toLocaleUpperCase('fi');
      await wFollow([...fdoc().querySelectorAll('a.letter-link')].find(a => norm(a.textContent) === letter), `kirjain ${letter}`, `Avataan kirjain ${letter}`);
      const links = [...fdoc().querySelectorAll('a.profile-link.opp')].filter(a => { const t = norm(a.textContent); return t === last || t.startsWith(`${last} `); });
      for (const a of links) { await say(`Osuma: ${norm(a.textContent)}`, 0); await point(a); mark(a); }
      tr.hits = links.map(a => {
        const sid = a.getAttribute('href').split('/').pop();
        const r = W.request('GET', `/profiles/students/${sid}`, '', {skin: false});
        const doc = parser.parseFromString(r.body, 'text/html');
        return {sid, listName: norm(a.textContent), number: valueAfterLabel(doc, 'Opiskelijanumero:'), qual: norm((doc.getElementById('f-pfield920') || {}).textContent)};
      });
      tr.notYet = !tr.hits.length;
      W.setStep(links.length ? 'Valitse oikea opiskelija sovelluksessa.' : 'Ei osumia.');
    });
  } catch (err) {
    if (err instanceof FillAborted) { tr.info = 'Haku keskeytettiin.'; W.setStep(null); }
    else tr.error = err.message;
  }
  tr.searching = false;
  if (isNarrow()) setView('app');
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
  state.students.unshift({id, phase: 'interview', section: 0, savedAt: nowTime(), prefilled: app ? ['name', 'qual', 'contractType', 'employer', 'businessId', 'docDate', 'participants'] : ['docDate', 'participants'], v, parts: {}, demo: {}, transfer: null});
  state.studentId = id; state.space = 'interviews'; state.search = null;
  state.screen = 'interview'; render(); focusHead();
}
function leaveStep(tr) {
  if (pending) { pending = null; setAttention(false); }
  W.setStep(null);
  Object.assign(tr, {step: 0, result: null, sim: false, failed: null, info: null, queue: null, rows: null, expect: null, overlay: null});
}
function resetAll() {
  if (filling) filling.aborted = true;
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
  if (t.id === 'w-stop' || t.id === 'abort-fill') { if (filling) { filling.aborted = true; progress('Keskeytetään…'); } return; }
  if (t.dataset.view) { setView(t.dataset.view); return; }
  if (filling && (t.closest('#main') || t.closest('#actions')) && !t.dataset.view) return;   // täyttö kesken
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
    const idx = k === '@parts' ? SECTIONS.findIndex(s => s.parts) : (k === '@demo' ? SECTIONS.findIndex(s => s.demo) : SECTIONS.findIndex(s => (s.fields || []).some(f => f.k === k)));
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

function onField(e, isChange) {
  if (!state) return;
  const t = e.target;
  if (t.id === 'w-speed') {
    if (SPEEDS[t.value]) { speed = t.value; try { localStorage.setItem('haastattelupolku.tahti', speed); } catch (err) { /* ei tallennusta */ } }
    return;
  }
  const st = cur();
  if (isChange && t.dataset.bindPick) {
    st.transfer.pick = t.dataset.bindPick;
    const b = $('#bind-ok'); if (b) b.disabled = false;
    W.navigate(`/profiles/students/${st.transfer.pick}`);
    return;
  }
  if (!st) return;
  if (isChange && t.dataset.part) {
    const p = st.parts[t.dataset.part] = st.parts[t.dataset.part] || {};
    const k = t.dataset.pk;
    p[k] = k === 'on' ? t.checked : t.value;
    if (k === 'on' || state.screen === 'transfer') render();
    touch(st); refreshSectionMarks(st); return;
  }
  if (t.dataset.demo) {
    const d = demoOf(st, t.dataset.demo);
    const k = t.dataset.dk;
    if (k === 'plan' || k === 'docs') { d[k] = d[k] || []; d[k][Number(t.dataset.row)] = t.value; } else d[k] = t.value;
    touch(st); refreshSectionMarks(st); if (state.screen === 'transfer') refreshMissing(st);
    return;
  }
  if (t.dataset.k) {
    if (t.type === 'checkbox') { if (!isChange) return; st.v[t.dataset.k] = t.checked; } else st.v[t.dataset.k] = t.value;
    touch(st); refreshSectionMarks(st); if (state.screen === 'transfer') refreshMissing(st);
  }
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
  document.addEventListener('change', e => onField(e, true));
  document.addEventListener('input', e => onField(e, false));
  document.addEventListener('keydown', onKey);
  W.onEvents(events => { onWilmaEvents(events); });
  $('#w-speed').value = speed;
  const status = t => { $('#boot-text').textContent = t; $('#w-boot-text').textContent = t; };
  try {
    const registry = await (await fetch('kentat.json', {cache: 'no-cache'})).json();
    registry.forms.forEach(f => { SPEC[f.id] = f; });
    SEED = await W.start(status);
  } catch (err) {
    const msg = `Synteettisen Wilman käynnistys epäonnistui: ${err.message} Tarkista verkkoyhteys (cdn.jsdelivr.net) ja lataa sivu uudelleen.`;
    $('#main').innerHTML = `<div class="note warn" role="alert" style="margin-top:20px">${esc(msg)}</div><p style="margin-top:14px"><button class="btn primary" onclick="location.reload()">Lataa uudelleen</button></p>`;
    $('#w-boot').classList.add('error');
    $('#w-boot').innerHTML = `<p>${esc(msg)}</p>`;
    return;
  }
  FORMS.forEach(f => {
    const fromSpec = SPEC[f.id] ? SPEC[f.id].fields.map(x => x.key).filter(k => !k.startsWith('@')) : [];
    PICK[f.id] = [...new Set([...(PICK_EXTRA[f.id] || []), ...fromSpec])].filter(k => k.startsWith('@') || FIELD[k]);
  });
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
