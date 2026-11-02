# Synteettinen Wilma v2 – testiympäristö. Kaikki henkilöt, yritykset ja tunnisteet
# ovat keksittyjä. Koottu julkaisuun ilman kommentteja.
from __future__ import annotations
import json
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from dataclasses import replace as with_values
from html import escape
from .data import APPRENTICESHIP_FORM_TYPE, CAREER_PLAN_FORM_TYPE, CAREER_PLAN_TEXTAREAS, DEMONSTRATION_HEADERS, DEMONSTRATION_LINK, DOCUMENT_DATE, EMPTY_PERIOD, EMPTY_YEAR, FORMS_TAB_EDIT_LINKS, FORMS_TAB_LINKS, INSTRUCTOR_FORM_TYPE, LETTERS, MUNICIPALITIES, OTHER_PERIOD, OTHER_PERIOD_PLACEHOLDER, PARTICIPANTS, PERIODS, SAVED_FORM, SCHOOL_YEARS, SECTIONS, SPARE_BUSINESS_IDS, TEACHER_ID, TEACHER_NAME, TEXT_MAX_LENGTH, WORKPLACE_FORM_TYPE, DemonstrationRecord, Instructor, Part, Student, Workplace
BANNER = 'Synteettinen Wilma v2 – testiympäristö'
ROLE_TEXT = 'Opettaja (synteettinen)'
_LABEL = 'no-bottom-padding secondary-text semi-bold'
_FORM_LABEL = f'{_LABEL} ellipsis-tooltip'

def _e(value: str) -> str:
    return escape(value, quote=True)

def page(title: str, main: str, *, after_main: str='', header: str='', head: str='') -> str:
    return f'<!doctype html>\n<!-- {BANNER}. Rakenne oikean Wilman rakennekartoista, sisältö keksittyä. -->\n<html lang="fi"><head><meta charset="utf-8"><title>{BANNER} · {_e(title)}</title>{head}</head><body><p data-testid="synthetic-banner">{BANNER}</p>{header}<div id="page-content-area" class="panel-body"><main id="main-content">{main}</main></div>{after_main}</body></html>'

def login_page() -> str:
    return page('Kirjaudu', '<form id="login-form" method="post" action="/login"><label for="username">Käyttäjätunnus</label> <input id="username" name="username" type="text" autocomplete="off"> <button type="submit" id="login-submit">Kirjaudu</button><p>Synteettinen kirjautuminen: mikä tahansa tunnus kelpaa, salasanaa ei ole.</p></form>')

def home_page() -> str:
    return page('Etusivu', '<div><h1>Etusivu</h1><p><a href="/profiles/students">Opiskelijat</a></p></div>', header=f'<p>Rooli: <span id="synthetic-role">{ROLE_TEXT}</span></p>')

def _letter_links() -> str:
    return ''.join((f'<a class="letter-link" href="/profiles/students/{segment}">{_e(letter)}</a>' for letter, segment in LETTERS))

def search_page() -> str:
    return page('Opiskelijat', f'<div><div><div><div><div>{_letter_links()}</div><h2 class="no-bottom-margin">Opiskelijat</h2></div></div></div></div>')

def letter_page(letter: str, students: Sequence[Student]) -> str:
    ordered = sorted(students, key=lambda s: (s.surname, s.first_names, s.student_id))
    size = max(1, -(-len(ordered) // 3))
    columns = [ordered[i:i + size] for i in range(0, len(ordered), size)] or [[]]
    body = ''.join(('<div>' + ''.join((f'<p><a class="profile-link opp" href="/profiles/students/{_e(s.student_id)}">{_e(s.list_name)}</a></p>' for s in column)) + '</div>' for column in columns))
    return page(f'Opiskelijat {letter}', f'<div>{_letter_links()}</div><h2 class="first precede">{_e(letter)}</h2>{body}')

def _field(label: str, value: str, *, value_id: str | None=None, tooltip: bool=False) -> str:
    cls = _FORM_LABEL if tooltip else _LABEL
    shown = f'<div id="{_e(value_id)}">{_e(value)}</div>' if value_id else f'<span>{_e(value)}</span>'
    return f'<div><label class="{cls}">{_e(label)}</label>{shown}</div>'

def _panel(title: str, rows: Iterable[str]) -> str:
    return f"<div><div><h1>{_e(title)}</h1>{''.join(rows)}</div></div>"

def student_page(student: Student) -> str:
    basics = '<div>' + ''.join((_field('Sukunimi:', student.surname), _field('Kutsumanimi:', student.first_names.split(' ')[0]), _field('Syntymäaika:', '1.1.2008'), _field('Ikä:', '18'), _field('Opiskeluoikeuden tila:', 'Läsnä'))) + '</div>'
    group = '<div>' + _field('Ryhmä/Luokka', 'SYN-1', value_id='f-pfield8', tooltip=True) + '</div>'
    filler = '<div></div>' * 3
    degree = '<div>' + ''.join((_field('Tutkinto', student.qualification, value_id='f-pfield920', tooltip=True), _field('Tutkintonimike', '-', value_id='f-pfield921', tooltip=True))) + '</div>'
    panel1 = _panel('Perustiedot', (basics, group, filler, degree))
    panel2 = _panel('Oppilaitos', ('<div>' + _field('Oppilaitos', 'Synteettinen opisto', value_id='f-pfield16', tooltip=True) + '</div>',))
    panel3 = _panel('Opiskelija', ('<div>' + ''.join((_field('Opiskelijanumero:', student.student_number), _field('Henkilötunnus:', '-'))) + '</div>',))
    panel4 = _panel('Yhteystiedot', ('<div>' + _field('Osoite:', 'Synteettinen katu 1') + '</div>',))
    panel5 = _panel('Opinnot', ('<div>' + _field('Opintojen aloituspäivä:', '1.8.2025') + '</div>',))
    guardian = student.guardian_surname or 'Huoltaja'
    panel6 = _panel('Huoltaja', ('<div>' + ''.join((_field('Tyyppi:', 'Huoltaja'), _field('Sukunimi:', guardian), _field('Kutsumanimi:', 'Synteettinen'))) + '</div>',))
    nav = f'<p><a href="/profiles/students/{_e(student.student_id)}/specedu">Suunnitelmat</a></p>'
    return page('Opiskelija', f'<div>{panel1}{panel2}{panel3}{panel4}{panel5}{panel6}</div>', header=nav)

def specedu_page(student: Student, records: Mapping[str, Sequence[tuple[str, str]]], *, create_sid: str | None=None, record_sid: str | None=None) -> str:
    sid = _e(student.student_id)
    link_sid = _e(create_sid if create_sid is not None else student.student_id)
    row_sid = _e(record_sid if record_sid is not None else student.student_id)
    sections = []
    for heading, form_type, form_name in SECTIONS:
        rows = ''.join((f'<tr><td><a class="specedu-copiable bold-link" href="/specedu/view/{_e(rid)}/21/{row_sid}">{_e(title)}</a></td><td><a class="ope profile-link" href="/profiles/teachers/{TEACHER_ID}">{_e(TEACHER_NAME)}</a></td><td><div class="dropdown dropdown-fix" data-dropdownname="kopioi"><a class="icon-link show-text copy-specedu-item new-doc" data-toggle="dropdown" href="/profiles/students/{sid}/specedu">Kopioi</a><ul class="sr-only"></ul></div></td></tr>' for rid, title in records.get(form_type, ())))
        table = f'<div><table class="table index-table"><tbody>{rows}</tbody></table></div>' if rows else ''
        sections.append(f'<div><h2>{_e(heading)}<div><a class="specedu-new new-doc show-text icon-link font-size-base margin-left" data-toggle="dropdown" href="/profiles/students/{sid}/specedu" title="Lisää uusi">Lisää uusi</a><ul class="dropdown-menu"><li><a href="/forms/{form_type}/new?sid={link_sid}&amp;tid={TEACHER_ID}">{_e(form_name)}</a></li></ul></div></h2>{table}</div>')
    forms_menu = ''.join((f'<a data-type="specedu" href="/forms/{t}/new?sid={sid}&amp;tid={TEACHER_ID}">{_e(name)}</a>' for _h, t, name in SECTIONS))
    copy_menu = ''.join((f'<li><a href="/forms/{t}/new?copyid=0&amp;sid={sid}&amp;tid={TEACHER_ID}">{_e(name)}</a></li>' for _h, t, name in SECTIONS))
    return page('Suunnitelmat', ''.join(sections) + f'<div id="specedu-forms" hidden>{forms_menu}</div>', after_main=f'<ul class="dropdown-menu" data-dropdownname="kopioi">{copy_menu}</ul>')

def _textarea(label: str, name: str, value: str, *, help_text: bool=False) -> str:
    field_id = f'f-{name}'
    group_cls = 'form-group margin-bottom-inline col-lg-12 col-md-12 has-helptext' if help_text else 'form-group'
    helper = '<a class="vismaicon vismaicon-sm vismaicon-filled vismaicon-help helptext-opener" data-original-title="Ohje"></a>' if help_text else ''
    return f'<div class="{group_cls}"><label class="{_FORM_LABEL}" for="{field_id}">{_e(label)}</label>{helper}<textarea class="fullwidthmemo ie-resize" id="{field_id}" name="{name}" maxlength="{TEXT_MAX_LENGTH}">{_e(value)}</textarea><span class="memocharcount" id="count-{field_id}">{len(value)} / {TEXT_MAX_LENGTH}</span></div>'

def _repeater(header: str, number: str) -> str:
    field = f'f-prepeater{number}-1-pfield{number}'
    return f'<div><div><div><table class="table-repeater-single no-bottom-margin" data-scrollfloat="" data-stickyheader=""><thead><tr><th>{_e(header)}</th></tr></thead><tbody><tr><td><div><input type="text" class="autocomplete form-control" role="combobox" id="{field}" name="prepeater{number}-1-pfield{number}" maxlength="{TEXT_MAX_LENGTH}"><input type="hidden" name="prepeater{number}-1-pfield{number}__id"></div></td></tr></tbody><tfoot><tr><td><button type="submit" class="btn btn-default btn-icon" id="f-prepeater{number}__add" name="prepeater{number}__add" title="Lisää">+</button><input type="hidden" id="f-prepeater{number}__count" name="prepeater{number}__count" value="1"></td></tr></tfoot></table></div></div></div>'

def career_plan_form_page(student: Student, values: Mapping[str, str], *, sid: str, formid: str=CAREER_PLAN_FORM_TYPE, extra_heading: str | None=None, errors: Sequence[str]=(), replace_url: str | None=None) -> str:
    hidden = f'<input type="hidden" name="formkey" value="synthetic-formkey"><input type="hidden" name="checkcode" value="synthetic-check"><input type="hidden" id="formid" name="formid" value="{_e(formid)}"><input type="hidden" id="EditId" name="editid" value=""><input type="hidden" name="sid" value="{_e(sid)}"><input type="hidden" name="tid" value="{TEACHER_ID}">'
    error_html = ''.join((f'<p class="alert" data-testid="form-error">{_e(e)}</p>' for e in errors))
    section1 = f'<div><div><h1>Opiskelija</h1><div><div><label class="{_FORM_LABEL}">Opiskelija</label><div id="f-pfield2">{_e(student.list_name)}</div></div></div></div></div>'
    textareas = ''.join((f"<div>{_textarea(label, name, values.get(key, ''), help_text=i == 3)}</div>" for i, (key, label, name) in enumerate(CAREER_PLAN_TEXTAREAS)))
    extra = f'<div><div><label class="{_FORM_LABEL}">{_e(extra_heading)}</label><textarea class="fullwidthmemo" name="pfield399"></textarea></div></div>' if extra_heading else ''
    section2 = f"<div><div><h1>Suunnitelma</h1><div></div>{_repeater('Opiskelijan tavoite', '306')}{textareas}{extra}</div></div>"
    date_key, date_label, date_name = DOCUMENT_DATE
    part_key, part_label, part_name = PARTICIPANTS
    section3 = f'''<div><div><h1>Asiakirja</h1><div><div><label class="{_FORM_LABEL}">Asiakirjalaji</label><div id="f-pfield10">Urasuunnitelma</div></div><div><label class="{_FORM_LABEL}" for="f-{date_name}">{_e(date_label)}</label><div><input type="text" class="form-control date is-datepick" data-type="date" id="f-{date_name}" name="{date_name}" maxlength="10" value="{_e(values.get(date_key, ''))}"><input type="button" class="datepick-trigger" value="…"><input type="hidden" id="f-{date_name}__default" value=""></div></div></div>{_repeater('Vastuuopettajat (suunnitelman laatijat)', '17')}{_repeater('Muut vastuuhenkilöt', '18')}<div>{_textarea(part_label, part_name, values.get(part_key, ''))}</div></div></div>'''
    section4 = '<div><div><input type="submit" class="btn btn-primary" name="savebtn" value="Tallenna tiedot"><input type="submit" class="btn btn-default" name="cancelbtn" value="Peruuta"></div></div>'
    script = f"<script>history.replaceState(null, '', {json.dumps(replace_url)});</script>" if replace_url else ''
    return page('Urasuunnitelma', error_html + f'<form class="form-common dock" action="/forms/{_e(formid)}/new" method="post">' + hidden + section1 + section2 + section3 + section4 + '</form>' + script)

def record_view_page(student: Student, record: Mapping[str, object]) -> str:
    fields = record['fields']
    assert isinstance(fields, dict)
    rows = ''.join((f'<dt>{_e(key)}</dt><dd data-testid="field-{_e(key)}">{_e(str(value))}</dd>' for key, value in fields.items()))
    return page('Urasuunnitelma', f"""<div data-testid="record-view"><dl><dt>Opiskelija</dt><dd>{_e(student.list_name)}</dd><dt>Tietue</dt><dd data-testid="record-id">{_e(str(record['record_id']))}</dd><dt>Versio</dt><dd data-testid="record-version">{_e(str(record['version']))}</dd><dt>Tallennettu</dt><dd data-testid="record-saved-at">{_e(str(record['saved_at']))}</dd>{rows}</dl></div>""")

def status_page(status: int, message: str) -> str:
    return page(f'Virhe {status}', f'<p data-testid="error-status">{status}</p><p data-testid="error-message">{_e(message)}</p>')
_CHOICES_CSS = '<style>.hidden{display:none !important}.modal{display:none}.modal.in{display:block}.tab-pane:not(.active){display:none}</style>'
_LEFT = 'col-lg-9 col-lg-3-pull col-md-8 col-md-4-pull col-sm-8 col-sm-4-pull margin-bottom'
_RIGHT = 'col-lg-3 col-lg-9-push col-md-4 col-md-8-push col-sm-4 col-sm-8-push no-side-padding'
_PANEL = 'sidepanel no-load col-lg-8 col-md-8 col-sm-10 col-xs-11'
_FILTERS = (('cb-show-graded', 'Arvioidut'), ('cb-show-selected', 'Valitut'), ('cb-show-failed', 'Hylätyt'), ('cb-show-workexp', 'Työssäoppiminen'), ('cb-show-skilldemo', 'Näytöt'), ('cb-show-crediting', 'Tunnustetut'))

@dataclass(frozen=True, slots=True)
class ChoicesView:
    quick_choice_on: bool = False
    hidden_catalogs: frozenset[str] = frozenset()
    code_overrides: Mapping[str, str] = field(default_factory=dict)
    kind_overrides: Mapping[str, str] = field(default_factory=dict)
    foreign_row_sid: str | None = None
    extra_root: bool = False
    extra_rows: int = 0
    wrong_panel: bool = False
    panel_never_loads: bool = False
    period_stays_disabled: bool = False
    autosave: bool = False
    dialog_after_click: bool = False
    reset_period: bool = False
    old_mismatch: bool = False
    extra_heading: str | None = None
    duplicate_year_value: bool = False
    missing_year_value: bool = False
    replace_path: str | None = None
    active_subtab: int = 0
    autosave_year_only: bool = False
    host_link_sid: str | None = None
    host_link_cid: str | None = None
    host_link_count: int = 1
    forms_tab_never_loads: bool = False
    demo_extra_href: str | None = None
    demo_link_elsewhere: bool = False
    demo_link_twice: bool = False
    demo_link_missing: bool = False
    demo_link_sid: str | None = None
    demo_link_cid: str | None = None
    demo_link_href: str | None = None
    demo_link_nested: bool = False
    forms_extra_href: str | None = None

def _row(sid: str, part: Part, view: ChoicesView, index: int) -> str:
    code = view.code_overrides.get(part.catalog_id, part.code)
    href_sid = view.foreign_row_sid if view.foreign_row_sid and index == 0 else sid
    hidden = ' style="display:none"' if part.catalog_id in view.hidden_catalogs else ''
    return f'<li{hidden}><a class="{_e(part.row_class)} a-val" data-coursenro="" data-original-title="" href="/profiles/students/{_e(href_sid)}/catalog/{_e(part.catalog_id)}"><table class="node-tbl"><tr><td>{_e(code)} {_e(part.name)}</td></tr></table></a></li>'

def _radio(name: str, value: str | None, label: str, *, radio_id: str, checked: bool, disabled: bool, label_cls: str='selectable') -> str:
    attrs = f' value="{_e(value)}"' if value is not None else ''
    return f'''<input type="radio" id="{_e(radio_id)}" name="{name}"{attrs}{(' checked' if checked else '')}{(' disabled' if disabled else '')}><label class="{label_cls}" for="{_e(radio_id)}">{_e(label)}</label>'''

def _selections_table(year: str, period: str, view: ChoicesView) -> str:
    periods_off = year == EMPTY_YEAR[0] or view.period_stays_disabled
    years = [(EMPTY_YEAR[0], EMPTY_YEAR[1], 'no-selection-year')]
    years += [(v, label, f'sely-{v}') for v, label in SCHOOL_YEARS]
    periods = [(EMPTY_PERIOD[0], EMPTY_PERIOD[1], 'no-selection-period')]
    periods += [(v, label, f'selp-{v}') for v, label in PERIODS]
    rows = []
    for i, ((yv, yl, yid), (pv, pl, pid)) in enumerate(zip(years[:-1], periods, strict=True)):
        value: str | None = yv
        if view.duplicate_year_value and i == 2:
            value = years[1][0]
        if view.missing_year_value and i == 3:
            value = None
        rows.append('<tr><td>' + _radio('year-selection', value, yl, radio_id=yid, checked=year == yv, disabled=False) + '</td><td>' + _radio('period-selection', pv, pl, radio_id=pid, checked=period == pv, disabled=periods_off) + '</td></tr>')
    other_v, other_l = OTHER_PERIOD
    last_year_v, last_year_l = SCHOOL_YEARS[-1]
    rows.append('<tr><td>' + _radio('year-selection', last_year_v, last_year_l, radio_id=f'sely-{last_year_v}', checked=year == last_year_v, disabled=False) + '</td><td>' + _radio('period-selection', other_v, other_l, radio_id='selp-other', checked=period == other_v, disabled=periods_off, label_cls='selectable margin-right') + f'<input type="text" id="txt-other-period" placeholder="{OTHER_PERIOD_PLACEHOLDER}">' + '</td></tr>')
    extra = f'<th>{_e(view.extra_heading)}</th>' if view.extra_heading else ''
    return f"""<div id="selections-table"><table id="actions-table" class="table"><thead><tr><th>Valinnan lukuvuosi</th><th>Valinnan jakso</th>{extra}</tr></thead><tbody>{''.join(rows)}</tbody></table><button type="button" id="btn-save-choices" class="btn btn-primary">Tallenna</button></div>"""

def _demo_group(view: ChoicesView, saved: Sequence[str], sid: str, cid: str) -> str:
    text, form_type = DEMONSTRATION_LINK
    link = f'<a class="list-group-item icon-link show-text" href="/forms/{form_type}/new?sid={_e(sid)}&amp;cid={_e(cid)}">{_e(text)}</a>'
    out = '' if view.demo_link_missing else link * (2 if view.demo_link_twice else 1)
    out += ''.join((f'<a class="list-group-item" href="{_e(h)}">Näyttösuunnitelma</a>' for h in saved))
    if view.demo_extra_href:
        out += f'<a class="list-group-item" href="{_e(view.demo_extra_href)}">Muu rivi</a>'
    return f'<div>{out}</div>' if view.demo_link_nested else out

def choices_page(student: Student, parts: Sequence[Part], selections: Mapping[str, tuple[str, str]], *, view: ChoicesView, save_url: str, open_catalog: str | None=None, demonstrations: Mapping[str, Sequence[str]] | None=None) -> str:
    sid = student.student_id
    rows = [_row(sid, part, view, i) for i, part in enumerate(parts)]
    rows += [_row(sid, Part(f'99{k:02d}', f'SYN-X{k}', 'Lisärivi', 'Tutkinnon osa', 5), view, len(rows) + k) for k in range(view.extra_rows)]
    roots = f"<li><ul><li></li>{''.join(rows)}</ul></li>"
    if view.extra_root:
        roots += '<li><ul></ul></li>'
    filters = ''.join((f'<label class="selectable"><input type="checkbox" class="show-hide-nodes" id="{fid}" checked>{_e(text)}</label>' for fid, text in _FILTERS))
    quick = ' checked' if view.quick_choice_on else ''
    right = f'<div id="tree-right-column" class="{_RIGHT}"><div><div><div><div><div><h4>Valinta</h4><div><label><input type="checkbox" id="choice-on-first-click"{quick}>Käytä pikavalintaa</label></div><span id="quick-choice-info" class="vismaicon vismaicon-sm vismaicon-filled vismaicon-help selectable" data-toggle="tooltip" data-original-title="" data-placement=""></span></div><div><h4>Näytä</h4>{filters}</div></div></div></div></div></div>'
    subtabs = ''.join((f'''<li role="presentation"{(' class="active"' if i == view.active_subtab else '')}><a href="/profiles/students/{_e(sid)}/choices?view={v}">{_e(t)}</a></li>''' for i, (v, t) in enumerate((('tree', 'Puu'), ('list', 'Valinnat'), ('plan', 'Ohjelma')))))
    dialogs = '<div id="dialog-choices" class="hidden"></div><div id="dialog-confirm" class="hidden" title="Vahvista">Vahvista toiminto.</div><div id="dialog-messagebox" class="modal modal-error bring-to-front fade" role="dialog"><div class="modal-dialog modal-sm"><h4>Ilmoitus</h4><p id="result-text"></p></div></div><div id="dialog-choice-on-notify" class="modal modal-info"><div class="modal-dialog modal-sm"><h4 class="modal-title">Pikavalinta</h4></div></div>'
    main = '<ul class="nav nav-pills margin-bottom">' + subtabs + f'</ul><div id="tree-left-column" class="{_LEFT}"><ul id="choices-tree" class="shoa choices-tree">{roots}</ul></div>' + right + '<div id="choices-summary" class="col-lg-12 col-md-12 col-sm-12"></div>' + dialogs
    current = next((p for p in parts if p.catalog_id == open_catalog), None)
    year, period = selections.get(current.catalog_id, (EMPTY_YEAR[0], EMPTY_PERIOD[0])) if current is not None else (EMPTY_YEAR[0], EMPTY_PERIOD[0])
    title = _part_title(current, view) if current is not None else ''
    href = f'/profiles/students/{_e(sid)}/catalog/{_e(current.catalog_id)}' if current is not None else '#'
    display = 'block' if current is not None else 'none'
    old_year = ('9999' if view.old_mismatch else year) if current is not None else ''
    old_period = period if current is not None else ''
    tabs = ''.join((f'''<li role="presentation"{(' class="active"' if i == 0 else '')}><a data-toggle="tab" role="tab" href="/profiles/students/{_e(sid)}/choices#{t}">{_e(n)}</a></li>''' for i, (t, n) in enumerate((('frontpage', 'Etusivu'), ('forms-tab', 'Lomakkeet'), ('grading', 'Arviointi')))))
    forms_links = _forms_tab_links(view)
    link_cid = current.catalog_id if current is not None else ''
    saved = demonstrations or {}
    forms_tab = '<div id="forms-tab" class="tab-pane panel-body" role="tabpanel"><div>' + ''.join((f'<a class="list-group-item icon-link show-text" href="/forms/{t}/new?sid={_e(view.host_link_sid or sid)}&amp;cid={_e(view.host_link_cid or link_cid)}">{_e(text)}</a>' for text, t in forms_links)) + (f'<a class="list-group-item" href="{_e(view.forms_extra_href)}">Muu lomake</a>' if view.forms_extra_href else '') + '</div><div id="exp-forms" class="hidden"><div>' + ''.join((f'<a class="list-group-item edit" href="/forms/{t}/">{_e(text)}</a>' for text, t in FORMS_TAB_EDIT_LINKS)) + ('<a class="list-group-item edit" href="/forms/604/">Muokkaa: Näyttösuunnitelma</a>' if view.demo_link_elsewhere else '') + f'</div></div><div>{_demo_group(view, saved.get(link_cid, ()), sid, link_cid)}</div><div><a class="list-group-item" href="/forms/{SAVED_FORM[1]}/{SAVED_FORM[2]}/{SAVED_FORM[3]}">{_e(SAVED_FORM[0])}</a></div></div><div id="grading" class="tab-pane panel-body" role="tabpanel"><div id="grading-forms" class="list-group"></div></div>'
    panel = f'<div class="{_PANEL}" role="dialog" style="display:{display}"><div><a class="sidepanel-close vismaicon vismaicon-expand-circle" aria-label="Sulje"></a></div><h1 id="sidepanel-title-1" class="sidepanel-title">{_e(title)}</h1><p id="sidepanel-desc-1" class="sidepanel-description"></p><ul id="choices-nav-tabs" class="nav nav-tabs nav-tabs-primary">{tabs}</ul><div id="sidepanel-content" class="panel tab-content"><div id="frontpage" class="tab-pane active panel-body" role="tabpanel">' + _selections_table(year, period, view) + f'<div id="alert-selections-table-hidden-info" class="alert alert-sm margin-bottom hidden" role="alert">Osa valinnoista on piilotettu.</div><div><div><a class="list-group-item" href="{href}">Tiedot</a><a id="course-info-link" class="list-group-item info" href="{href}">Lisätiedot</a></div></div></div>' + forms_tab + f'</div><span id="old-year-selection" class="hidden">{_e(old_year)}</span><span id="old-period-selection" class="hidden">{_e(old_period)}</span></div>'
    data = {'save_url': save_url, 'empty_period': EMPTY_PERIOD[0], 'parts': {p.catalog_id: {'title': _part_title(p, view), 'href': f'/profiles/students/{sid}/catalog/{p.catalog_id}', 'year': selections.get(p.catalog_id, (EMPTY_YEAR[0], EMPTY_PERIOD[0]))[0], 'period': selections.get(p.catalog_id, (EMPTY_YEAR[0], EMPTY_PERIOD[0]))[1]} for p in parts}, 'tamper': {'wrong_panel': view.wrong_panel, 'panel_never_loads': view.panel_never_loads, 'period_stays_disabled': view.period_stays_disabled, 'autosave': view.autosave, 'dialog_after_click': view.dialog_after_click, 'reset_period': view.reset_period, 'old_mismatch': view.old_mismatch, 'autosave_year_only': view.autosave_year_only, 'host_link_sid': view.host_link_sid, 'host_link_cid': view.host_link_cid, 'demo_link_sid': view.demo_link_sid, 'demo_link_cid': view.demo_link_cid, 'demo_link_href': view.demo_link_href, 'forms_tab_never_loads': view.forms_tab_never_loads}, 'sid': sid, 'demo_groups': {p.catalog_id: _demo_group(view, saved.get(p.catalog_id, ()), sid, p.catalog_id) for p in parts}}
    payload = json.dumps(data, ensure_ascii=False).replace('</', '<\\/')
    script = f'<script type="application/json" id="v2-choices-data">{payload}</script><script>{_CHOICES_JS}</script>'
    replace = f"<script>history.replaceState(null, '', {json.dumps(view.replace_path)});</script>" if view.replace_path else ''
    return page('Opintopolku', main, after_main=panel + script + replace, head=_CHOICES_CSS)

def _forms_tab_links(view: ChoicesView) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for text, form_type in FORMS_TAB_LINKS:
        if form_type == APPRENTICESHIP_FORM_TYPE:
            out += [(text, form_type)] * view.host_link_count
        else:
            out.append((text, form_type))
    return out

def _part_title(part: Part, view: ChoicesView) -> str:
    code = view.code_overrides.get(part.catalog_id, part.code)
    kind = view.kind_overrides.get(part.catalog_id, part.kind)
    return f'{code} - {part.name} - {kind}, {part.osp} osp'
_CHOICES_JS = "\n(() => {\n  const data = JSON.parse(document.getElementById('v2-choices-data').textContent);\n  const T = data.tamper;\n  const panel = document.querySelector('div.sidepanel');\n  const years = () => Array.from(document.querySelectorAll('input[name=year-selection]'));\n  const periods = () => Array.from(document.querySelectorAll('input[name=period-selection]'));\n  let current = null;\n  const checkValue = (list, value) => list.forEach((r) => { r.checked = r.value === value; });\n  const syncPeriods = () => {\n    const y = years().find((r) => r.checked);\n    const on = !!y && y.id !== 'no-selection-year' && !T.period_stays_disabled;\n    periods().forEach((r) => { r.disabled = !on; });\n  };\n  const showDialog = (id) => {\n    const d = document.getElementById(id);\n    d.classList.remove('hidden');\n    d.classList.add('in');\n  };\n  const openPanel = (cid) => {\n    const ids = Object.keys(data.parts);\n    const shown = T.wrong_panel ? ids[(ids.indexOf(cid) + 1) % ids.length] : cid;\n    const part = data.parts[shown];\n    current = shown;\n    document.getElementById('sidepanel-title-1').textContent = part.title;\n    document.getElementById('course-info-link').setAttribute('href', part.href);\n    document.querySelector('#frontpage > div:nth-of-type(3) a.list-group-item:not(.info)')\n      .setAttribute('href', part.href);\n    checkValue(years(), part.year);\n    checkValue(periods(), part.period);\n    document.getElementById('old-year-selection').textContent =\n      T.old_mismatch ? '9999' : part.year;\n    document.getElementById('old-period-selection').textContent = part.period;\n    // Kaikki luontilinkit (div 1 ja div 3; ei #exp-formsin muokkauslinkkejä eikä tallennettua\n    // riviä). Häiriökytkimet host_link_* koskevat vain div 1:n sopimuslinkkejä (D1a) ja\n    // demo_link_* vain näyttölinkkiä (WC-1).\n    document.querySelector('#forms-tab > div:nth-of-type(3)').innerHTML = data.demo_groups[shown];\n    document.querySelectorAll('#forms-tab > div > a.icon-link').forEach((a) => {\n      const first = a.parentElement === document.querySelector('#forms-tab > div:first-of-type');\n      const cid = (first ? T.host_link_cid : T.demo_link_cid) || shown;\n      const sid = (first ? T.host_link_sid : T.demo_link_sid) || data.sid;\n      const path = a.getAttribute('href').split('?')[0];\n      a.setAttribute('href', `${path}?sid=${sid}&cid=${cid}`);  // oikea järjestys (Cr-K1)\n      if (!first && T.demo_link_href) a.setAttribute('href', T.demo_link_href);\n    });\n    syncPeriods();\n    panel.style.display = 'block';\n  };\n  document.querySelectorAll('#choices-nav-tabs a[data-toggle=tab]').forEach((a) => {\n    a.addEventListener('click', (ev) => {\n      ev.preventDefault();\n      const id = a.getAttribute('href').split('#').pop();\n      if (id === 'forms-tab' && T.forms_tab_never_loads) return;\n      document.querySelectorAll('#choices-nav-tabs > li').forEach((li) => {\n        li.classList.toggle('active', li.contains(a));\n      });\n      document.querySelectorAll('#sidepanel-content > .tab-pane').forEach((pane) => {\n        pane.classList.toggle('active', pane.id === id);\n      });\n    });\n  });\n  const save = () => {\n    if (current === null) return;\n    const y = years().find((r) => r.checked);\n    const p = periods().find((r) => r.checked);\n    const body = new URLSearchParams({\n      catalog: current, year: y ? (y.value || '') : '', period: p ? (p.value || '') : '',\n    });\n    const xhr = new XMLHttpRequest();\n    xhr.open('POST', data.save_url, false);\n    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');\n    xhr.send(body.toString());\n    if (xhr.status === 200) {\n      data.parts[current].year = y ? y.value : '0';\n      data.parts[current].period = p ? p.value : '0';\n      document.getElementById('old-year-selection').textContent = data.parts[current].year;\n      document.getElementById('old-period-selection').textContent = data.parts[current].period;\n    }\n  };\n  const afterClick = () => {\n    if (T.dialog_after_click) showDialog('dialog-messagebox');\n    if (T.autosave) save();\n  };\n  document.querySelectorAll('#choices-tree a.a-val').forEach((a) => {\n    a.addEventListener('click', (ev) => {\n      ev.preventDefault();\n      if (document.getElementById('choice-on-first-click').checked) {\n        showDialog('dialog-choice-on-notify');\n      }\n      if (T.panel_never_loads) return;\n      openPanel(a.getAttribute('href').split('/').pop());\n    });\n  });\n  years().forEach((r) => r.addEventListener('change', () => {\n    syncPeriods();\n    if (r.id === 'no-selection-year') checkValue(periods(), data.empty_period);\n    if (T.autosave_year_only) save();\n    afterClick();\n  }));\n  periods().forEach((r) => r.addEventListener('change', () => {\n    if (T.reset_period) document.getElementById('no-selection-period').checked = true;\n    afterClick();\n  }));\n  document.getElementById('btn-save-choices').addEventListener('click', save);\n})();\n"

@dataclass(frozen=True, slots=True)
class RegistryView:
    slow_search: bool = False
    no_marker: bool = False
    stale_marker: bool = False
    empty_without_marker: bool = False
    wrong_business_id: str | None = None
    row_business_id: str | None = None
    label_business_id: str | None = None
    add_link_missing: str | None = None
    add_link_twice: str | None = None
    instructor_add_link_type: str | None = None
    add_link_href: str | None = None
    empty_id: bool = False
    invalid_id: str | None = None
    duplicate_list: bool = False
    select_navigates: bool = False
    host_formid: str | None = None
    host_sid: str | None = None
    host_cid: str | None = None
    duplicate_employer_label: bool = False
    dialog_open: bool = False
    add_link_type: str | None = None
    add_formid: str | None = None
    add_extra_heading: str | None = None
    add_replace_path: str | None = None
    duplicate_municipality: bool = False
    mangle_field: str | None = None
    instructor_filter_broken: bool = False
    employer_changes: bool = False
    instructor_empty_id: bool = False
    instructor_select_navigates: bool = False
    instructor_row_without_company: bool = False
    instructor_row_first_name_only: bool = False
    instructor_email_with_name: bool = False
    employer_changes_on_search: bool = False
    link_row_business_id: str | None = None
    link_row_name: str | None = None
    link_dialog: bool = False
    employer_dialog: bool = False
    foreign_workplace_ids: bool = False
    workplace_link_missing: bool = False
    workplace_link_duplicate: bool = False
    reverse_employer_rows: bool = False
    employer_row_text: str | None = None

def _ac_input(field: str, search: str, label: str, *, filter_no: str='0', fieldnum: bool=True, disabled: bool=False, open_href: str) -> str:
    dis = ' disabled' if disabled else ''
    cls = f'autocomplete {search} filter-{filter_no} form-control' + (' disabled' if disabled else '')
    data = ' data-fieldnum="" data-type=""' if fieldnum else ' data-type=""'
    return f'''<div><input type="text" class="{cls}"{data} id="f-{field}" name="{field}" role="combobox" maxlength="{TEXT_MAX_LENGTH}" autocomplete="off"{dis}><input type="hidden" name="{field}__id"{dis}{(' class="disabled"' if disabled else '')}><a class="openlist {search.replace('search-', 'list-')} filter-{filter_no} input-group-addon btn btn-default" id="f-{field}__open" role="button" href="{_e(open_href)}" title="Avaa lista">…</a></div>'''

def _ohjaaja_repeater(open_href: str, *, template: bool) -> str:
    dis = ' disabled' if template else ''
    dcls = ' class="disabled"' if template else ''
    add_cls = 'btn btn-default btn-icon no-bottom-margin leaveconfirm-pass' + (' disabled' if template else '')
    return '<table class="table-repeater-single no-bottom-margin" data-scrollfloat="" data-stickyheader=""><thead><tr><th>Työpaikkaohjaaja</th></tr></thead><tbody><tr><td>' + _ac_input('prepeater5-1-pfield5', 'search-suortopit:5', '', filter_no='4', disabled=template, open_href=open_href) + f'</td></tr></tbody><tfoot><tr><td><button type="submit" class="{add_cls}" id="f-prepeater5__add" name="prepeater5__add" title="Lisää"{dis}>+</button><input type="hidden" id="f-prepeater5__count" name="prepeater5__count" value="1"{dis}{dcls}><input type="hidden" id="f-prepeater5__removed" name="prepeater5__removed"{dis}{dcls}><input type="hidden" id="f-prepeater5__excount"{dis}{dcls}><input type="hidden" id="f-prepeater5__model"{dis}{dcls}><div class="alert alert-sm" role="alert" style="display:none">Rivejä enintään 5.</div></td></tr></tfoot></table>'

def apprenticeship_form_page(student: Student, catalog_id: str, workplaces: Sequence[Workplace], *, view: RegistryView, formid: str=APPRENTICESHIP_FORM_TYPE, instructors: Sequence[Instructor]=()) -> str:
    sid = student.student_id
    open_href = f'/forms/{formid}/new?cid={catalog_id}&sid={sid}'
    hidden = f'<input type="hidden" name="formkey" value="synthetic-formkey"><input type="hidden" name="checkcode" value="synthetic-check"><input type="hidden" id="formid" name="formid" value="{_e(view.host_formid or formid)}"><input type="hidden" id="EditId" name="editid" value=""><input type="hidden" name="sid" value="{_e(view.host_sid or sid)}"><input type="hidden" name="cid" value="{_e(view.host_cid or catalog_id)}">'
    section1 = f'<div><div><h1>Sopimus</h1><div></div><div><div><div><p><a class="outbound" href="/forms/{formid}/9001">Ohje</a></p></div></div></div></div></div>'
    section2 = f'<div><div><h1>Opiskelija</h1><div><div><label class="{_FORM_LABEL}">Opiskelija</label><div id="f-pfield2">{_e(student.list_name)}</div></div><div><label class="{_LABEL}">Kutsumanimi:</label><span></span></div><div><label class="{_LABEL}">Syntymäaika:</label><span></span></div></div></div></div>'
    add_type = view.add_link_type or WORKPLACE_FORM_TYPE
    ins_type = view.instructor_add_link_type or INSTRUCTOR_FORM_TYPE

    def add_link(kind: str, form_type: str, text: str) -> str:
        if view.add_link_missing == kind:
            return '<p></p>'
        href = view.add_link_href or f'/forms/{form_type}/new'
        one = f'<a href="{_e(href)}">{_e(text)}</a>'
        return f"<p>{one}{(one if view.add_link_twice == kind else '')}</p>"
    employer = f'<div><div><label class="{_FORM_LABEL}" for="f-pfield4">Oppisopimuksen työnantaja</label>' + _ac_input('pfield4', 'search-suortopit:4', '', open_href=open_href) + f'</div></div><div><div><label class="{_LABEL}">Y-tunnus:</label><span data-v2="business-id">-</span></div></div><div><div><label class="{_LABEL}">Toimipaikka ja osoite:</label><span data-v2="address">- -</span></div></div><div><div><div>' + add_link('workplace', add_type, ADD_WORKPLACE_TEXT) + f'</div></div></div><div><div class="form-group margin-bottom-inline col-lg-3 col-md-3 has-helptext" data-helptext=""><label class="{_FORM_LABEL}" for="f-pfield64">Maa</label><a class="vismaicon vismaicon-sm vismaicon-filled vismaicon-help helptext-opener" data-original-title=""></a>' + _ac_input('pfield64', 'search-suortopit:64', '', open_href=open_href) + f'</div></div><div><div><div>{_ohjaaja_repeater(open_href, template=False)}</div></div></div><div><div><label class="{_FORM_LABEL}" for="f-pfield62">Työpaikkaohjaaja (toisesta yrityksestä)</label>' + _ac_input('pfield62', 'search-suortopit:62', '', open_href=open_href) + f'</div></div><div><div><label class="{_FORM_LABEL}" for="f-pfield65">Työpaikan yhteyshenkilö</label>' + _ac_input('pfield65', 'search-suortopit:65', '', open_href=open_href) + '</div></div><div><div><div>' + add_link('instructor', ins_type, ADD_INSTRUCTOR_TEXT) + f'</div></div></div><div><div><div><p><a class="outbound" href="/forms/{formid}/">Ohjeet</a></p></div></div></div>'
    duplicate = f'<div><div><label class="{_FORM_LABEL}" for="f-pfield66">Oppisopimuksen työnantaja</label>' + _ac_input('pfield66', 'search-suortopit:66', '', open_href=open_href) + '</div></div>' if view.duplicate_employer_label else ''
    section3 = f'<div><div><h1>Työpaikka</h1>{employer}{duplicate}</div></div>'
    section4 = f'<div><div><h1>Koulutuksen järjestäjä</h1><div><div><label class="{_LABEL}">Nimi:</label><span>Synteettinen opisto</span></div><div><label class="{_LABEL}">Y-tunnus:</label><span>{SPARE_BUSINESS_IDS[2]}</span></div></div></div></div>'
    section5 = '<div><div><input type="submit" class="btn btn-primary" name="savebtn" value="Tallenna tiedot"><input type="submit" class="btn btn-default" name="cancelbtn" value="Peruuta"></div></div>'
    template = f'<div>{_ohjaaja_repeater(open_href, template=True)}</div>'
    modal_cls = 'modal fade in' if view.dialog_open else 'modal fade'
    rows = ''.join((f'<a class="list-group-item" role="option" href="{_e(open_href)}">{_e(w.name)}</a>' for w in workplaces))
    modal = f'<div id="selectionBox" class="{modal_cls}" role="dialog" data-target="suortopit:5"><div><div><div><button type="button" class="close" data-dismiss="modal" aria-label="Sulje">×</button><h4 id="modal-title" class="modal-title">Valitse</h4></div></div><div id="result" class="form-selectionlist form-group"><ul class="list-group list-group-selectable" role="listbox">{rows}</ul></div><div><button type="button" id="choose" class="btn btn-primary">Valitse</button><button type="button" id="modal-hide" class="btn btn-default" data-dismiss="modal">Peruuta</button></div></div></div>'
    data = {'lists': {'pfield4': [{'id': w.record_id, 'label': view.employer_row_text if view.employer_row_text is not None else _employer_row(w, view.row_business_id), 'value': _employer_row(w, None), 'business_id': w.business_id, 'keys': [w.name.casefold(), w.business_id.casefold()]} for w in (list(reversed(workplaces)) if view.reverse_employer_rows else workplaces)], INSTRUCTOR_FIELD: [_instructor_row(i, workplaces, view) for i in instructors]}, 'tamper': _registry_tamper(view), 'empty_marker': not view.empty_without_marker}
    return page('Oppisopimus', f'<form class="form-common dock" action="/forms/{_e(formid)}/new" method="post">' + hidden + section1 + section2 + section3 + section4 + section5 + '</form>', after_main=template + modal + _ac_script(data), head=_CHOICES_CSS)
ADD_WORKPLACE_TEXT = 'Lisää uusi työpaikka (avaa uuteen välilehteen)'
ADD_INSTRUCTOR_TEXT = 'Lisää uusi työpaikkaohjaaja tai työpaikan yhteyshenkilö (avaa uuteen välilehteen)'

def _employer_row(workplace: Workplace, business_id: str | None) -> str:
    if business_id == 'none':
        bid = ''
    elif business_id == 'two':
        bid = f'{workplace.business_id} {SPARE_BUSINESS_IDS[0]}'
    else:
        bid = business_id or workplace.business_id
    return ' '.join((p for p in (workplace.name, bid, f'({workplace.street_address})') if p))

def _registry_tamper(view: RegistryView) -> dict[str, object]:
    return {'slow_search': view.slow_search, 'no_marker': view.no_marker, 'stale_marker': view.stale_marker, 'wrong_business_id': view.wrong_business_id, 'label_business_id': view.label_business_id, 'empty_id': view.empty_id, 'select_navigates': view.select_navigates, 'invalid_id': view.invalid_id, 'duplicate_list': view.duplicate_list, 'mangle_field': view.mangle_field, 'instructor_filter_broken': view.instructor_filter_broken, 'employer_changes': view.employer_changes, 'instructor_empty_id': view.instructor_empty_id, 'instructor_select_navigates': view.instructor_select_navigates, 'employer_changes_on_search': view.employer_changes_on_search, 'link_dialog': view.link_dialog, 'employer_dialog': view.employer_dialog}
INSTRUCTOR_FIELD = 'prepeater5-1-pfield5'

def _instructor_row(instructor: Instructor, workplaces: Sequence[Workplace], view: RegistryView) -> dict[str, object]:
    company = next((w.name for w in workplaces if w.record_id == instructor.workplace_id), '')
    name = f'{instructor.last_name} {instructor.first_names}'
    shown = f'{instructor.last_name} {instructor.first_names.split()[0]}' if view.instructor_row_first_name_only else name
    email = f'{instructor.first_names}.{instructor.last_name}@example.test'.replace(' ', '.').lower() if view.instructor_email_with_name else instructor.email
    parts = [shown] if view.instructor_row_without_company or not company else [shown, company]
    label = ', '.join((p for p in (*parts, email, instructor.phone) if p))
    return {'id': instructor.record_id, 'label': label, 'value': name, 'employer': instructor.workplace_id, 'keys': [name.casefold(), instructor.last_name.casefold()]}

def _ac_script(data: Mapping[str, object]) -> str:
    payload = json.dumps(data, ensure_ascii=False).replace('</', '<\\/')
    return f'<script type="application/json" id="v2-autocomplete-data">{payload}</script><script>{_AUTOCOMPLETE_JS}</script>'

def _text_input(label: str, field: str, *, max_length: int=TEXT_MAX_LENGTH, check: bool=False, group: str | None=None, helper: bool=False, value: str='') -> str:
    cls = 'form-control text-field' + (' field-check' if check else '')
    data = ' data-type=""' if check else ''
    attrs = f' class="{group}" data-helptext=""' if group else ''
    help_html = '<a class="vismaicon vismaicon-sm vismaicon-filled vismaicon-help helptext-opener" data-original-title=""></a>' if helper else ''
    return f'<div{attrs}><label class="{_FORM_LABEL}" for="f-{field}">{_e(label)}</label>{help_html}<input type="text" class="{cls}"{data} id="f-{field}" name="{field}" maxlength="{max_length}" value="{_e(value)}"></div>'

def workplace_form_page(*, view: RegistryView, formid: str=WORKPLACE_FORM_TYPE, values: Mapping[str, str] | None=None, errors: Sequence[str]=()) -> str:
    v = dict(values or {})
    open_href = f'/forms/{formid}/new'
    hidden = f'<input type="hidden" name="formkey" value="synthetic-formkey"><input type="hidden" name="checkcode" value="synthetic-check"><input type="hidden" id="formid" name="formid" value="{_e(view.add_formid or formid)}"><input type="hidden" id="EditId" name="editid" value="">'
    ytj = '<div><div><div><p><a class="outbound" href="https://www.ytj.fi">Yritys- ja yhteisötietojärjestelmä</a></p></div></div></div>'
    req = 'form-group margin-bottom-inline col-lg-2 col-md-2 required has-helptext'
    row2 = '<div>' + _text_input('Nimi', 'pfield2', value=v.get('pfield2', '')) + _text_input('Y-tunnus', 'pfield5', group=req, helper=True, value=v.get('pfield5', '')) + '</div>'
    postal = f'''<div><label class="{_FORM_LABEL}" for="f-pfield9">Postiosoite</label><div><input type="text" class="autocomplete-text search-TyossaOpp:9 filter-0 form-control" data-type="" id="f-pfield9" name="pfield9" maxlength="{TEXT_MAX_LENGTH}" value="{_e(v.get('pfield9', ''))}"><input type="hidden" name="pfield9__id"><a class="openlist list-TyossaOpp:9 filter-0 input-group-addon btn btn-default" id="f-pfield9__open" role="button" href="{open_href}" title="Avaa lista">…</a></div></div>'''
    row3 = '<div>' + _text_input('Lähiosoite', 'pfield8', value=v.get('pfield8', '')) + postal + '</div>'
    muni = f'<div class="form-group margin-bottom-inline col-lg-4 col-md-4 required has-helptext" data-helptext=""><label class="{_FORM_LABEL}" for="f-pfield61">Toimipisteen paikkakunta</label><a class="vismaicon vismaicon-sm vismaicon-filled vismaicon-help helptext-opener" data-original-title=""></a>' + _ac_input('pfield61', 'search-TyossaOpp:61', '', open_href=open_href) + '</div>'
    country = f'<div><label class="{_FORM_LABEL}" for="f-pfield63">Maa (jos muu kuin [poistettu])</label>' + _ac_input('pfield63', 'search-TyossaOpp:63', '', open_href=open_href) + '</div>'
    row4 = f'<div>{muni}{country}</div>'
    row5 = '<div>' + _text_input('Puhelin', 'pfield11', value=v.get('pfield11', '')) + _text_input('Sähköpostiosoite', 'pfield13', max_length=255, check=True, value=v.get('pfield13', '')) + '</div>'
    boxes = ''.join((f'<div><div><label class="secondary-text semi-bold"><input type="checkbox" id="f-pfield{n}" name="pfield{n}"><input type="hidden" name="pfield{n}__default">{_e(text)}</label></div></div>' for n, text in ((190, 'Työpaikka on aktiivinen'), (850, 'Julkinen'), (180, 'Oppisopimuspaikka'))))
    row6 = f'<div>{boxes}</div>'
    row8 = f'<div><div><label class="{_FORM_LABEL}" for="f-pfield701">IBAN-tilinumero</label><input type="text" class="form-control text-field field-check" data-type="" id="f-pfield701" name="pfield701"></div></div>'
    row9 = f'<div><div class="form-group margin-bottom-inline col-lg-3 col-md-3 has-helptext" data-helptext=""><label class="{_FORM_LABEL}" for="f-pfield49">Tiedot tarkistettu</label><a class="vismaicon vismaicon-sm vismaicon-filled vismaicon-help helptext-opener" data-original-title=""></a><div><input type="text" class="form-control date is-datepick" data-type="" id="f-pfield49" name="pfield49" maxlength="10"><input type="button" class="datepick-trigger" value="…"></div></div></div>'
    extra = f'<div><label class="{_FORM_LABEL}">{_e(view.add_extra_heading)}</label><input type="text" name="pfield99"></div>' if view.add_extra_heading else ''
    body = f'<div><div><h1>Uusi työpaikka</h1>{ytj}{row2}{row3}{row4}{row5}{row6}<div></div>{row8}{row9}{extra}</div></div>'
    buttons = '<div><div><input type="submit" class="btn btn-primary" name="savebtn" value="Tallenna tiedot"><input type="submit" class="btn btn-default" name="cancelbtn" value="Peruuta"></div></div>'
    error_html = ''.join((f'<p class="alert" data-testid="form-error">{_e(e)}</p>' for e in errors))
    municipalities = list(MUNICIPALITIES)
    if view.duplicate_municipality:
        municipalities.append(('8099', MUNICIPALITIES[0][1]))
    data = {'lists': {'pfield61': [{'id': mid, 'label': name, 'value': name, 'keys': [name.casefold()]} for mid, name in municipalities]}, 'tamper': _registry_tamper(view), 'empty_marker': True}
    replace = f"<script>history.replaceState(null, '', {json.dumps(view.add_replace_path)});</script>" if view.add_replace_path else ''
    return page('Uusi työpaikka', error_html + f'<form class="form-common dock" action="/forms/{_e(formid)}/new" method="post">' + hidden + body + buttons + '</form>', after_main=_ac_script(data) + replace, head=_CHOICES_CSS)

def _checkbox(number: int) -> str:
    return f'<div><label class="secondary-text semi-bold"><input type="checkbox" id="f-pfield{number}" name="pfield{number}"><input type="hidden" name="pfield{number}__exists">Valinta {number}</label></div>'

def instructor_form_page(*, view: RegistryView, workplaces: Sequence[Workplace], formid: str=INSTRUCTOR_FORM_TYPE, values: Mapping[str, str] | None=None, errors: Sequence[str]=()) -> str:
    v = dict(values or {})
    open_href = f'/forms/{formid}/new'
    hidden = f'<input type="hidden" name="formkey" value="synthetic-formkey"><input type="hidden" name="checkcode" value="synthetic-check"><input type="hidden" id="formid" name="formid" value="{_e(view.add_formid or formid)}"><input type="hidden" id="EditId" name="editid" value="">'
    row1 = '<div>' + _text_input('Sukunimi', 'pfield2', value=v.get('pfield2', '')) + _text_input('Etunimet', 'pfield3', value=v.get('pfield3', '')) + '</div>'
    row2 = '<div>' + _text_input('Puhelin', 'pfield11', value=v.get('pfield11', '')) + _text_input('Sähköpostiosoite', 'pfield13', max_length=255, check=True, value=v.get('pfield13', '')) + f'<div><label class="{_LABEL}"></label>{_checkbox(19)}</div></div>'
    workplace = f'<div><label class="{_FORM_LABEL}" for="f-pfield60">Työpaikka</label>' + _ac_input('pfield60', 'search-TyossaOhj:60', '', open_href=open_href) + '</div>'
    row3 = f'<div>{workplace}<div><label class="{_LABEL}"></label>{_checkbox(85)}</div></div>'
    row4 = f'<div><div><div><p><a href="/forms/{WORKPLACE_FORM_TYPE}/new">Lisää uusi työpaikka</a></p></div></div><div>{_checkbox(18)}</div></div>'
    extra = f'<div><label class="{_FORM_LABEL}">{_e(view.add_extra_heading)}</label><input type="text" name="pfield99"></div>' if view.add_extra_heading else ''
    body = f'<div><div><h1>Uusi työpaikkaohjaaja</h1>{row1}{row2}{row3}{row4}{extra}</div></div>'
    buttons = '<div><div><input type="submit" class="btn btn-primary" name="savebtn" value="Tallenna tiedot"><input type="submit" class="btn btn-default" name="cancelbtn" value="Peruuta"></div></div>'
    error_html = ''.join((f'<p class="alert" data-testid="form-error">{_e(e)}</p>' for e in errors))
    offset = 500000 if view.foreign_workplace_ids else 0
    shown = [with_values(w, name=view.link_row_name) if view.link_row_name else w for w in workplaces]
    rows = [] if view.workplace_link_missing else [{'id': str(int(w.record_id) + offset), 'label': _employer_row(w, view.link_row_business_id), 'value': _employer_row(w, None), 'keys': [w.name.casefold(), w.business_id.casefold()]} for w in shown]
    if view.workplace_link_duplicate:
        rows += [{**row, 'id': str(int(str(row['id'])) + 900000)} for row in list(rows)]
    data = {'lists': {'pfield60': rows}, 'tamper': _registry_tamper(view), 'empty_marker': True}
    replace = f"<script>history.replaceState(null, '', {json.dumps(view.add_replace_path)});</script>" if view.add_replace_path else ''
    return page('Uusi työpaikkaohjaaja', error_html + f'<form class="form-common dock" action="/forms/{_e(formid)}/new" method="post">' + hidden + body + buttons + '</form>', after_main=_ac_script(data) + replace, head=_CHOICES_CSS)

def instructor_view_page(instructor: Instructor) -> str:
    rows = ''.join((f"""<dt>{_e(key)}</dt><dd data-testid="instructor-{key.replace('_', '-')}">{_e(value)}</dd>""" for key, value in instructor.as_fields().items()))
    return page('Työpaikkaohjaaja', f'<div data-testid="instructor-view"><dl><dt>Tietue</dt><dd data-testid="instructor-record-id">{_e(instructor.record_id)}</dd><dt>Työpaikka</dt><dd data-testid="instructor-workplace-id">{_e(instructor.workplace_id)}</dd>{rows}</dl></div>')

def workplace_view_page(workplace: Workplace) -> str:
    rows = ''.join((f"""<dt>{_e(key)}</dt><dd data-testid="workplace-{key.replace('_', '-')}">{_e(value)}</dd>""" for key, value in workplace.as_fields().items()))
    return page('Työpaikka', f'<div data-testid="workplace-view"><dl><dt>Tietue</dt><dd data-testid="workplace-record-id">{_e(workplace.record_id)}</dd>{rows}</dl></div>')
_AUTOCOMPLETE_JS = '\n(() => {\n  const data = JSON.parse(document.getElementById(\'v2-autocomplete-data\').textContent);\n  const T = data.tamper;\n  const close = () => { const old = document.getElementById(\'resultDiv\'); if (old) old.remove(); };\n  const EMPLOYER_ID = \'#main-content > form input[name="pfield4__id"]\';\n  const choose = (input, item) => {\n    const instructor = input.name === \'prepeater5-1-pfield5\';\n    if (T.select_navigates || (instructor && T.instructor_select_navigates)) {\n      window.location.assign(\'/profiles/students\');\n      return;\n    }\n    input.value = (T.wrong_business_id !== null && item.business_id)\n      ? item.value.replace(item.business_id, T.wrong_business_id).replace(/\\s+/g, \' \')\n      : item.value;\n    const hidden = input.parentElement.querySelector(`input[name="${input.name}__id"]`);\n    if (!T.empty_id && !(instructor && T.instructor_empty_id)) hidden.value = item.id;\n    if (T.invalid_id) hidden.value = T.invalid_id;\n    if ((input.name === \'pfield60\' && T.link_dialog)\n        || (input.name === \'pfield4\' && T.employer_dialog)) {\n      const box = document.createElement(\'div\');\n      box.id = \'selectionBox\';\n      box.className = \'modal fade in\';\n      box.setAttribute(\'role\', \'dialog\');\n      box.textContent = \'Valitse\';\n      document.body.appendChild(box);\n    }\n    if (instructor && T.employer_changes) {\n      const employer = document.querySelector(EMPLOYER_ID);\n      if (employer) employer.value = \'70199\';\n    }\n    // Oikeassa Wilmassa ”Y-tunnus:” ja ”Toimipaikka ja osoite:” jäävät arvoihin ”-” ja ”- -”\n    // (Matin kuva 1.11.2026). Häiriö: väärä arvo labelissa ei saa vaikuttaa (D1r-K2).\n    const bid = document.querySelector(\'span[data-v2=business-id]\');\n    if (bid && item.business_id && T.label_business_id) bid.textContent = T.label_business_id;\n    close();\n  };\n  const search = (input) => {\n    if (input.name === \'prepeater5-1-pfield5\' && T.employer_changes_on_search) {\n      const employer = document.querySelector(EMPLOYER_ID);\n      if (employer) employer.value = \'70199\';\n    }\n    if (!T.stale_marker) {\n      input.removeAttribute(\'data-searchresult\');\n      close();\n    }\n    const list = data.lists[input.name];\n    const q = input.value.trim().toLocaleLowerCase(\'fi\');\n    if (!list || !q) return;\n    setTimeout(() => {\n      if (T.slow_search || input.value.trim().toLocaleLowerCase(\'fi\') !== q) return;\n      close();\n      let hits = list.filter((item) => item.keys.some((k) => k.includes(q)));\n      if (!T.instructor_filter_broken) {  // ohjaajat: vain valitun työnantajan (filter-4, O1)\n        const employer = document.querySelector(EMPLOYER_ID);\n        hits = hits.filter((item) => !(\'employer\' in item)\n          || (employer !== null && employer.value !== \'\' && item.employer === employer.value));\n      }\n      const div = document.createElement(\'div\');\n      div.id = \'resultDiv\';\n      div.className = \'autocomplete-result open\';\n      const ul = document.createElement(\'ul\');\n      ul.id = `${input.id}_option-list`;\n      ul.className = \'dropdown-menu display-block\';\n      ul.setAttribute(\'role\', \'listbox\');\n      hits.slice(0, 20).forEach((item, i) => {\n        const li = document.createElement(\'li\');\n        li.id = `${ul.id}_option-${i}`;\n        li.className = \'autocomplete-option\';\n        li.setAttribute(\'role\', \'option\');\n        const a = document.createElement(\'a\');\n        a.textContent = item.label;\n        a.addEventListener(\'click\', (ev) => { ev.preventDefault(); choose(input, item); });\n        li.appendChild(a);\n        ul.appendChild(li);\n      });\n      if (hits.length) {\n        const more = document.createElement(\'li\');\n        const a = document.createElement(\'a\');\n        a.textContent = \'Tarkenna hakua\';\n        more.appendChild(a);\n        ul.appendChild(more);\n      } else if (data.empty_marker) {\n        const none = document.createElement(\'li\');\n        none.className = \'autocomplete-empty\';\n        none.textContent = \'Ei tuloksia\';\n        ul.appendChild(none);\n      }\n      div.appendChild(ul);\n      document.body.appendChild(div);\n      if (T.duplicate_list) {  // sama lista toisen kerran (N9)\n        const copy = document.createElement(\'div\');\n        copy.appendChild(ul.cloneNode(true));\n        document.body.appendChild(copy);\n      }\n      if (!T.no_marker) input.setAttribute(\'data-searchresult\', String(hits.length));\n    }, T.stale_marker ? 600 : 30);\n  };\n  document.querySelectorAll(\'input.autocomplete[role=combobox]\').forEach((input) => {\n    if (!data.lists[input.name]) return;\n    input.addEventListener(\'input\', () => search(input));\n    if (T.stale_marker) {  // edellisen haun tyhjä tulos ja merkki jäävät sivulle\n      const div = document.createElement(\'div\');\n      div.id = \'resultDiv\';\n      div.innerHTML = `<ul id="${input.id}_option-list" role="listbox">`\n        + \'<li class="autocomplete-empty">Ei tuloksia</li></ul>\';\n      document.body.appendChild(div);\n      input.setAttribute(\'data-searchresult\', \'0\');\n    }\n  });\n  if (T.mangle_field) {\n    const field = document.querySelector(`input[name="${T.mangle_field}"]`);\n    if (field) field.addEventListener(\'input\', () => {\n      if (!field.value.endsWith(\' (muutettu)\')) field.value = `${field.value} (muutettu)`;\n    });\n  }\n})();\n'

@dataclass(frozen=True)
class DemonstrationView:
    rows: tuple[str, ...] | None = None
    key_column_editable: bool = False
    plan_readonly: bool = False
    header: str | None = None
    copy_before_form: bool = False
    headers_swapped: bool = False
    second_table: bool = False
    malformed_row: str | None = None
    js_changes_edit_id: bool = False
    dialog_open: bool = False
    dialog_after_select: bool = False
    prefill_workplace: tuple[str, str] | None = None
    date_blur_convert: bool = False
    js_changes_grade: bool = False
    part_text: str | None = None
    form_sid: str | None = None
    form_cid: str | None = None
    formid: str | None = None
    replace_url: str | None = None
    workplace_row_business_id: str | None = None
    workplace_id_offset: int = 0
    workplace_hits: int | None = None
    selection_changes_assessor: bool = False
    workplace_id_changes_on_input: bool = False
    abort_on_open: bool = False
    reverse_workplace_rows: bool = False
    registry: RegistryView = field(default_factory=RegistryView)

def _demo_label(text: str, for_id: str | None=None, *, cls: str=_FORM_LABEL) -> str:
    attr = f' for="{for_id}"' if for_id else ''
    return f'<label class="{cls}"{attr}>{_e(text)}</label>'

def _memo(field: str, value: str='', *, disabled: bool=False, readonly: bool=False, named: bool=True) -> str:
    flags = (' disabled' if disabled else '') + (' readonly' if readonly else '')
    name = f' id="f-{field}" name="{field}"' if named else ''
    return f'<textarea class="fullwidthmemo ie-resize"{name} maxlength="{TEXT_MAX_LENGTH}"{flags}>{_e(value)}</textarea><span class="memocharcount" title="merkkejä">{len(value)} / {TEXT_MAX_LENGTH}</span>'

def _date_input(field: str) -> str:
    return f'<div><input type="text" class="form-control date is-datepick" data-type="" id="f-{field}" name="{field}" maxlength="10" autocomplete="off"><input type="button" class="datepick-trigger" value="…"></div>'

def _requirement_table(rows: Sequence[str], view: DemonstrationView, *, in_form: bool) -> str:
    headers = list(DEMONSTRATION_HEADERS)
    if view.header is not None:
        headers[1] = view.header
    if view.headers_swapped and in_form:
        headers[1], headers[2] = (headers[2], headers[1])
    body = ''
    for i, text in enumerate(rows):
        base = 300 + 3 * i
        plan = _memo(f'pfield{base + 2}', readonly=view.plan_readonly, named=in_form)
        if view.malformed_row == 'two_controls' and i == 0:
            plan += _memo(f'pfield{base + 2}x', named=False)
        extra = '<td></td>' if view.malformed_row == 'extra_cell' and i == 0 else ''
        body += f"<tr><td>{_memo(f'pfield{base + 1}', text, disabled=not view.key_column_editable, named=in_form)}</td><td>{plan}</td><td>{_memo(f'pfield{base + 3}', named=in_form)}</td>{extra}</tr>"
    return '<table class="table table-condensed no-bottom-margin" data-scrollfloat="" data-stickyheader=""><thead><tr>' + ''.join((f'<th>{_e(h)}</th>' for h in headers)) + f'</tr></thead><tbody>{body}</tbody></table>'

def _assessor(field: str, label: str, filter_no: str, open_href: str) -> str:
    return f"<div>{_demo_label(label, f'f-{field}')}" + _ac_input(field, f"search-suornaytot:{field.removeprefix('pfield')}", '', filter_no=filter_no, open_href=open_href) + '</div>'

def demonstration_rows(view: DemonstrationView, requirements: Sequence[str]) -> tuple[str, ...]:
    return tuple(view.rows) if view.rows is not None else tuple(requirements)

def _workplace_rows(view: DemonstrationView, workplaces: Sequence[Workplace]) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    ordered = list(reversed(workplaces)) if view.reverse_workplace_rows else list(workplaces)
    for index, w in enumerate(ordered):
        row: dict[str, object] = {'id': str(int(w.record_id) + view.workplace_id_offset), 'label': _employer_row(w, view.workplace_row_business_id), 'value': _employer_row(w, None), 'business_id': w.business_id, 'keys': [w.name.casefold(), w.business_id.casefold()]}
        if index == 0 and view.workplace_hits is not None:
            rows += [{**row, 'id': str(int(str(row['id'])) + 900000 * n) if n else row['id']} for n in range(view.workplace_hits)]
        else:
            rows.append(row)
    return rows

def demonstration_form_page(student: Student, part: Part, requirements: Sequence[str], *, view: DemonstrationView, sid: str, cid: str, formid: str, workplaces: Sequence[Workplace]=()) -> str:
    rows = demonstration_rows(view, requirements)
    open_href = f'/forms/{formid}/new?cid={cid}&sid={sid}'
    hidden = f'<input type="hidden" name="formkey" value="synthetic-formkey"><input type="hidden" name="checkcode" value="synthetic-check"><input type="hidden" id="formid" name="formid" value="{_e(view.formid or formid)}"><input type="hidden" id="EditId" name="editid" value=""><input type="hidden" name="sid" value="{_e(view.form_sid or sid)}"><input type="hidden" name="cid" value="{_e(view.form_cid or cid)}">'
    part_text = view.part_text if view.part_text is not None else f'{part.name} {part.code}'
    intro = '<div><div><h1>Ohje</h1><div></div><div><div><div><p><a class="outbound" href="https://wilma.example.test">Ohjeet</a></p></div></div></div></div></div>'
    basics = f"""<div><div><h1>Perustiedot</h1><div><div>{_demo_label('Opiskelija')}<div id="f-pfield2">{_e(student.list_name)}</div></div></div><div><div>{_demo_label('Tutkinnon osa')}<div id="f-pfield3">{_e(part_text)}</div></div></div><div></div><div><div>{_demo_label('Suorituspaikka (työpaikka)', 'f-pfield6')}""" + _ac_input('pfield6', 'search-suornaytot:6', '', open_href=open_href) + f"</div></div><div><div>{_demo_label('Suorituspaikka (oppilaitos)', 'f-pfield5')}" + _ac_input('pfield5', 'search-suornaytot:5', '', open_href=open_href) + f'</div></div><div><div><div><p><a href="/forms/{_e(formid)}/new">Lisää uusi</a></p></div></div></div></div></div>'
    plan = f"<div><div><h1>Suunnitelma</h1><div></div><div><div>{_demo_label('Opiskelijan opiskeluaika:', cls=_LABEL)}<span>1.8.2025–31.7.2028</span></div></div><div><div>{_demo_label('Näytön aloituspvm', 'f-pfield71')}{_date_input('pfield71')}</div><div>{_demo_label('Näytön päättymispäivä', 'f-pfield29')}{_date_input('pfield29')}</div></div><div><div><div>{_requirement_table(rows, view, in_form=True)}</div></div></div>" + (f'<div>{_requirement_table(rows, view, in_form=False)}</div>' if view.second_table else '') + f"""<div><div>{_demo_label('Näyttöympäristö', 'f-pfield180')}{_memo('pfield180')}</div></div><div><div class="form-group margin-bottom-inline col-lg-12 col-md-12 has-helptext" data-helptext="">{_demo_label('Vastuuopettajan palaute näyttösuunnitelmasta', 'f-pfield181')}<a class="vismaicon vismaicon-sm vismaicon-filled vismaicon-help helptext-opener" data-original-title=""></a>{_memo('pfield181')}</div></div></div></div>"""
    scope = f'''<div>{_demo_label('Suoritettava laajuus', 'f-pfield4')}<div><input type="text" class="autocomplete search-suornaytot:4 filter-0 form-control" data-fieldnum="" data-type="" id="f-pfield4" name="pfield4" role="combobox" maxlength="{TEXT_MAX_LENGTH}" autocomplete="off"><input type="hidden" name="pfield4__id"><input type="hidden" id="f-pfield4__default" value="15"><a class="openlist list-suornaytot:4 filter-0 input-group-addon btn btn-default" id="f-pfield4__open" role="button" href="{_e(open_href)}" title="Avaa lista">…</a></div></div>'''
    assessment = f"<div><div><h1>Arviointi</h1><div><div>{_demo_label('Näyttöpvm', 'f-pfield10')}{_date_input('pfield10')}</div><div>{_demo_label('Arvosana', 'f-pfield40')}" + _ac_input('pfield40', 'search-suornaytot:40', '', open_href=open_href) + f'</div></div><div>{scope}</div><div>' + _assessor('pfield101', 'Näytön arvioija (opettaja)', '0', open_href) + _assessor('pfield102', 'Näytön arvioija 2 (opettaja)', '0', open_href) + '</div><div></div><div>' + _assessor('pfield103', 'Näytön arvioija (työpaikkaohjaaja)', '6', open_href) + _assessor('pfield104', 'Näytön arvioija 2 (työpaikkaohjaaja)', '0', open_href) + f'</div><div><div><div><p><a href="/forms/{_e(formid)}/new">Lisää uusi</a></p></div></div></div><div>' + _assessor('pfield105', 'Tutkinnon osan arvosanasta päätti', '0', open_href) + _assessor('pfield106', 'Arviointikeskusteluun osallistujat', '0', open_href) + '</div></div></div>'
    help_a = '<a class="vismaicon vismaicon-sm vismaicon-filled vismaicon-help helptext-opener" data-original-title=""></a>'
    group = '<div class="form-group margin-bottom-inline col-lg-12 col-md-12 has-helptext" data-helptext="">'
    texts = '<div><div><h1>Arviointiteksti</h1><div><div>' + _demo_label('Kuvaus suoritetusta näytöstä (tiivis kuvaus (esim. lista) työtilanteista ja työprosesseista, joiden avulla ammattitaitovaatimusten mukainen osaaminen on osoitettu)', 'f-pfield190') + _memo('pfield190') + f"</div></div><div>{group}{_demo_label('Perustelut, jos näyttö on hylätty', 'f-pfield191')}{help_a}{_memo('pfield191')}</div></div><div>{group}{_demo_label('Näytön täydentäminen/uusiminen', 'f-pfield192')}{help_a}{_memo('pfield192')}</div></div></div></div>"
    buttons = '<div><div><input type="submit" class="btn btn-primary" name="savebtn" value="Tallenna tiedot"><input type="submit" class="btn btn-default" name="cancelbtn" value="Peruuta"></div></div>'
    form = f'<form class="form-common dock" action="/forms/{_e(formid)}/new" method="post">' + hidden + intro + basics + plan + assessment + texts + buttons + '</form>'
    copy = f'<div style="display:none">{_requirement_table(rows, view, in_form=False)}</div>'
    opener = f'<a id="verbalentries-opener" class="icon-link show-text" href="{_e(open_href)}" title="Sanalliset">Sanalliset arviot</a>'
    verbal = '<div id="verbalentries" class="sidepanel no-modal col-lg-5 col-md-6 col-sm-9 col-xs-11" style="display:none"><h1>Sanalliset</h1><div id="verbal-items-list" class="panel-group grading-verbal-items-list">' + ''.join((f'<div id="heading-verbal-{n}" class="panel-heading"><h4 class="panel-title icon"><a href="#collapse-verbal-{n}">Kohde</a></h4></div><div id="collapse-verbal-{n}" class="panel-collapse collapse in"></div>' for n in range(16, 26))) + '</div></div>'
    dialogs = '<div id="dialog-confirm-removal" class="modal fade" role="dialog" style="display:none"><p id="removal-message"></p></div><div id="dialog-attachment" class="modal fade" role="dialog" style="display:none"></div>'
    data = {'date_blur_convert': view.date_blur_convert, 'js_changes_grade': view.js_changes_grade, 'selection_changes_assessor': view.selection_changes_assessor, 'workplace_id_changes_on_input': view.workplace_id_changes_on_input, 'js_changes_edit_id': view.js_changes_edit_id, 'dialog_open': view.dialog_open, 'dialog_after_select': view.dialog_after_select, 'prefill_workplace': view.prefill_workplace}
    script = f'<script type="application/json" id="v2-demo-data">{json.dumps(data)}</script><script>{_DEMONSTRATION_JS}</script>' + _ac_script({'lists': {'pfield6': _workplace_rows(view, workplaces)}, 'tamper': _registry_tamper(view.registry), 'empty_marker': True})
    replace = f"<script>history.replaceState(null, '', {json.dumps(view.replace_url)});</script>" if view.replace_url else ''
    before = copy if view.copy_before_form else ''
    after = '' if view.copy_before_form else copy
    return page('Näyttösuunnitelma', before + form, header=opener, after_main=after + verbal + dialogs + script + replace)
_DEMONSTRATION_JS = '\n(() => {\n  const T = JSON.parse(document.getElementById(\'v2-demo-data\').textContent);\n  window.__v2TriggerClicks = 0;\n  document.querySelectorAll(\'input.datepick-trigger\').forEach((b) => {\n    b.addEventListener(\'click\', () => {\n      window.__v2TriggerClicks += 1;\n      b.parentElement.querySelector(\'input.is-datepick\').value = \'01.01.2031\';\n    });\n  });\n  if (T.date_blur_convert) {\n    document.querySelectorAll(\'input.is-datepick\').forEach((i) => {\n      i.addEventListener(\'blur\', () => {\n        const m = i.value.match(/^(\\d{2})\\.(\\d{2})\\.(\\d{4})$/);\n        if (m) i.value = `${m[2]}.${m[1]}.${m[3]}`;\n      });\n    });\n  }\n  if (T.selection_changes_assessor) {\n    document.addEventListener(\'click\', (ev) => {\n      if (ev.target.closest(\'#f-pfield6_option-list\')) {\n        document.getElementById(\'f-pfield103\').value = \'Keksitty Ohjaaja\';\n      }\n    }, true);\n  }\n  if (T.workplace_id_changes_on_input) {\n    document.querySelector(\'#main-content > form\').addEventListener(\'input\', (ev) => {\n      if (ev.target.id !== \'f-pfield6\') {\n        document.querySelector(\'input[name="pfield6__id"]\').value = \'79999\';\n      }\n    });\n  }\n  const showDialog = () => {\n    const box = document.createElement(\'div\');\n    box.id = \'selectionBox\';\n    box.className = \'modal fade in\';\n    box.setAttribute(\'role\', \'dialog\');\n    box.style.display = \'block\';\n    box.textContent = \'Valitse\';\n    document.body.appendChild(box);\n  };\n  if (T.dialog_open) showDialog();\n  if (T.dialog_after_select) {\n    document.addEventListener(\'click\', (ev) => {\n      if (ev.target.closest(\'#f-pfield6_option-list\')) showDialog();\n    }, true);\n  }\n  if (T.prefill_workplace) {\n    document.getElementById(\'f-pfield6\').value = T.prefill_workplace[0];\n    document.querySelector(\'input[name="pfield6__id"]\').value = T.prefill_workplace[1];\n  }\n  if (T.js_changes_edit_id) {\n    document.querySelector(\'#main-content > form\').addEventListener(\'input\', () => {\n      document.getElementById(\'EditId\').value = \'4242\';\n    });\n  }\n  if (T.js_changes_grade) {\n    const form = document.querySelector(\'#main-content > form\');\n    form.addEventListener(\'input\', () => {\n      document.getElementById(\'f-pfield40\').value = \'Hyväksytty\';\n    });\n  }\n})();\n'

def demonstration_view_page(record: DemonstrationRecord) -> str:
    rows = ''.join((f'<tr data-testid="demonstration-row"><td data-testid="row-text">{_e(t)}</td><td data-testid="row-plan">{_e(p)}</td><td data-testid="row-documents">{_e(d)}</td></tr>' for t, p, d in record.rows))
    return page('Näyttösuunnitelma', f'<div data-testid="demonstration-view"><dl><dt>Tietue</dt><dd data-testid="demonstration-record-id">{_e(record.record_id)}</dd><dt>Alku</dt><dd data-testid="demonstration-start-date">{_e(record.start_date)}</dd><dt>Loppu</dt><dd data-testid="demonstration-end-date">{_e(record.end_date)}</dd><dt>Ympäristö</dt><dd data-testid="demonstration-environment">{_e(record.environment)}</dd><dt>Suorituspaikka</dt><dd data-testid="demonstration-workplace-id">{_e(record.workplace_id)}</dd></dl><table><tbody>{rows}</tbody></table></div>')
