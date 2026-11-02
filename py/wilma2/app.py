# Synteettinen Wilma v2 – testiympäristö. Kaikki henkilöt, yritykset ja tunnisteet
# ovat keksittyjä. Koottu julkaisuun ilman kommentteja.
from __future__ import annotations
import copy
import re
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from urllib.parse import quote, unquote
from playwright.sync_api import BrowserContext, Page
from . import pages
from .data import APPRENTICESHIP_FORM_TYPE, CAREER_PLAN_FIELDS, CAREER_PLAN_FORM_TYPE, DEMONSTRATION_FORM_TYPE, DEMONSTRATION_REQUIREMENTS, EMPTY_PERIOD, EMPTY_YEAR, INSTRUCTOR_FORM_TYPE, LETTERS, MAX_LENGTH, OTHER_PERIOD, PERIODS, SCHOOL_YEARS, SEED_CAREER_PLANS, SEED_INSTRUCTORS, SEED_PARTS, SEED_STUDENTS, SEED_WORKPLACES, TEXT_MAX_LENGTH, WORKPLACE_FORM_TYPE, DemonstrationRecord, Instructor, Part, Student, Workplace
from .pages import ChoicesView, DemonstrationView, RegistryView
from .route import ABORTED_STATUS, DEFAULT_ORIGIN, install_route
FormData = Mapping[str, str | Sequence[str]]
_DATE_RE = re.compile('^\\d{2}\\.\\d{2}\\.\\d{4}$')
_LETTER_RE = re.compile('^/profiles/students/(?P<seg>[A-Za-z]|%[0-9A-Fa-f]{2})$')
_STUDENT_RE = re.compile('^/profiles/students/(?P<sid>[0-9]+)(?P<rest>|/specedu|/choices)$')
_YEAR_VALUES = {EMPTY_YEAR[0], *(v for v, _l in SCHOOL_YEARS)}
_PERIOD_VALUES = {EMPTY_PERIOD[0], OTHER_PERIOD[0], *(v for v, _l in PERIODS)}
_FORM_RE = re.compile('^/forms/(?P<t>[0-9]+)/new$')
_VIEW_RE = re.compile('^/specedu/view/(?P<rid>[0-9]+)/21/(?P<sid>[0-9]+)$')
_WORKPLACE_VIEW_RE = re.compile('^/synthetic/tyopaikat/(?P<rid>[0-9]+)$')
_INSTRUCTOR_VIEW_RE = re.compile('^/synthetic/ohjaajat/(?P<rid>[0-9]+)$')
_DEMONSTRATION_VIEW_RE = re.compile('^/synthetic/naytot/(?P<rid>[0-9]+)$')
INSTRUCTOR_FIELDS: tuple[tuple[str, str], ...] = (('last_name', 'pfield2'), ('first_names', 'pfield3'), ('phone', 'pfield11'), ('email', 'pfield13'))
WORKPLACE_FIELDS: tuple[tuple[str, str], ...] = (('name', 'pfield2'), ('business_id', 'pfield5'), ('street_address', 'pfield8'), ('postal_address', 'pfield9'), ('municipality', 'pfield61'), ('phone', 'pfield11'), ('email', 'pfield13'))
_LETTER_KEYS = {letter for letter, _seg in LETTERS}

@dataclass(frozen=True, slots=True)
class Response:
    status: int
    headers: dict[str, str]
    body: str

    @property
    def location(self) -> str | None:
        return self.headers.get('Location')

@dataclass(slots=True)
class _Failure:
    path_prefix: str
    status: int
    remaining: int
    after_commit: bool

@dataclass(slots=True)
class SpeceduRecord:
    record_id: str
    form_type: str
    student_id: str
    version: int
    saved_at: str
    fields: dict[str, str] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return {'record_id': self.record_id, 'form_type': self.form_type, 'student_id': self.student_id, 'version': self.version, 'saved_at': self.saved_at, 'fields': dict(self.fields)}

@dataclass(slots=True)
class Tamper:
    url_sid: str | None = None
    form_sid: str | None = None
    formid: str | None = None
    extra_heading: str | None = None
    create_link_sid: str | None = None
    record_link_sid: str | None = None
    choices: ChoicesView = field(default_factory=ChoicesView)
    on_choices_get: Callable[[int], None] | None = None
    registry: RegistryView = field(default_factory=RegistryView)
    on_host_get: Callable[[int], None] | None = None
    demonstration: DemonstrationView = field(default_factory=DemonstrationView)
    on_demo_get: Callable[[int], None] | None = None

def _first(data: FormData, key: str) -> str:
    value = data.get(key, '')
    if isinstance(value, str):
        return value
    return value[0] if value else ''

def _html(status: int, body: str) -> Response:
    return Response(status, {'Content-Type': 'text/html; charset=utf-8'}, body)

def _redirect(location: str) -> Response:
    return Response(303, {'Location': location, 'Content-Type': 'text/plain'}, '')

def _now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec='seconds')

def letter_of(student: Student) -> str:
    return student.surname[:1].upper()

class SyntheticWilma2:

    def __init__(self, clock: Callable[[], str]=_now_iso) -> None:
        self._clock = clock
        self.logged_in = False
        self.students: dict[str, Student] = {}
        self.records: list[SpeceduRecord] = []
        self.tamper = Tamper()
        self._failures: list[_Failure] = []
        self._next_record = 60001
        self.request_log: list[tuple[str, str]] = []
        self.parts: dict[str, list[Part]] = {}
        self.selections: dict[tuple[str, str], tuple[str, str]] = {}
        self.choice_saves: list[tuple[str, str, str, str]] = []
        self.choices_gets = 0
        self.workplaces: list[Workplace] = []
        self.host_gets = 0
        self.host_posts: list[str] = []
        self.add_form_gets = 0
        self.workplace_saves: list[str] = []
        self._next_workplace = 70201
        self.instructors: list[Instructor] = []
        self.instructor_form_gets = 0
        self.instructor_saves: list[str] = []
        self._next_instructor = 71201
        self.demonstrations: list[DemonstrationRecord] = []
        self.demo_form_gets = 0
        self.demo_posts: list[str] = []
        self.demo_saves: list[str] = []
        self._next_demo = 9101
        self.seed()

    def seed(self) -> None:
        self.students = {s.student_id: s for s in SEED_STUDENTS}
        self.parts = {sid: list(parts) for sid, parts in SEED_PARTS.items()}
        self.selections = {}
        self.choice_saves = []
        self.choices_gets = 0
        self.workplaces = list(SEED_WORKPLACES)
        self.host_gets = 0
        self.host_posts = []
        self.add_form_gets = 0
        self.workplace_saves = []
        self._next_workplace = 70201
        self.instructors = list(SEED_INSTRUCTORS)
        self.instructor_form_gets = 0
        self.instructor_saves = []
        self._next_instructor = 71201
        self.demonstrations = []
        self.demo_form_gets = 0
        self.demo_posts = []
        self.demo_saves = []
        self._next_demo = 9101
        self.records = []
        self._next_record = 60001
        for sid, values in SEED_CAREER_PLANS.items():
            self.records.append(SpeceduRecord(self._new_record_id(), CAREER_PLAN_FORM_TYPE, sid, 1, self._clock(), dict(values)))

    def reset(self) -> None:
        self.logged_in = False
        self.tamper = Tamper()
        self._failures.clear()
        self.request_log.clear()
        self.seed()

    def add_student(self, student: Student) -> None:
        self.students[student.student_id] = student

    def fail_next(self, path_prefix: str, status: int=500, times: int=1, after_commit: bool=False) -> None:
        if times < 1:
            raise ValueError('times >= 1')
        self._failures.append(_Failure(path_prefix, status, times, after_commit))

    def records_of(self, student_id: str, form_type: str=CAREER_PLAN_FORM_TYPE) -> list[SpeceduRecord]:
        return [r for r in self.records if r.student_id == student_id and r.form_type == form_type]

    def persisted_snapshot(self) -> list[dict[str, Any]]:
        return copy.deepcopy([r.as_dict() for r in self.records])

    def install_route(self, target: BrowserContext | Page, origin: str=DEFAULT_ORIGIN) -> None:
        install_route(target, self, origin)

    def _new_record_id(self) -> str:
        rid = str(self._next_record)
        self._next_record += 1
        return rid

    def handle(self, method: str, path: str, query: FormData | None=None, form: FormData | None=None) -> Response:
        method = method.upper()
        query = query or {}
        form = form or {}
        self.request_log.append((method, path))
        failure = self._take_failure(path)
        if failure is not None and (not failure.after_commit):
            return _html(failure.status, pages.status_page(failure.status, 'Pyyntö epäonnistui.'))
        response = self._dispatch(method, path, query, form)
        if failure is not None:
            return _html(failure.status, pages.status_page(failure.status, 'Pyyntö epäonnistui.'))
        return response

    def _take_failure(self, path: str) -> _Failure | None:
        for failure in self._failures:
            if path.startswith(failure.path_prefix):
                failure.remaining -= 1
                if failure.remaining <= 0:
                    self._failures.remove(failure)
                return failure
        return None

    def _dispatch(self, method: str, path: str, query: FormData, form: FormData) -> Response:
        if path == '/login':
            if method == 'GET':
                return _html(200, pages.login_page())
            if method == 'POST':
                self.logged_in = True
                return _redirect('/')
            return self._not_allowed()
        if not self.logged_in:
            return _redirect('/login')
        if path == '/' and method == 'GET':
            return _html(200, pages.home_page())
        if path == '/profiles/students' and method == 'GET':
            return _html(200, pages.search_page())
        m = _LETTER_RE.match(path)
        if m and method == 'GET':
            letter = unquote(m['seg'], encoding='latin-1').upper()
            if letter not in _LETTER_KEYS:
                return self._not_found()
            listed = [s for s in self.students.values() if letter_of(s) == letter]
            return _html(200, pages.letter_page(letter, listed))
        m = _STUDENT_RE.match(path)
        if m and method == 'GET':
            student = self.students.get(m['sid'])
            if student is None:
                return self._not_found()
            if m['rest'] == '':
                return _html(200, pages.student_page(student))
            if m['rest'] == '/choices':
                return self._choices(student)
            return _html(200, pages.specedu_page(student, self._listing(student.student_id), create_sid=self.tamper.create_link_sid, record_sid=self.tamper.record_link_sid))
        m = _STUDENT_RE.match(path)
        if m and m['rest'] == '/choices' and (method == 'POST'):
            return self._save_choice(m['sid'], form)
        m = _FORM_RE.match(path)
        if m and m['t'] == APPRENTICESHIP_FORM_TYPE:
            if method == 'GET':
                return self._open_host(query)
            if method == 'POST':
                self.host_posts.append(_first(form, 'sid'))
                return _html(400, pages.status_page(400, 'Oppisopimusta ei tallennettu.'))
            return self._not_allowed()
        if m and m['t'] == WORKPLACE_FORM_TYPE:
            if method == 'GET':
                self.add_form_gets += 1
                return _html(200, pages.workplace_form_page(view=self.tamper.registry))
            if method == 'POST':
                return self._save_workplace(form)
            return self._not_allowed()
        if m and m['t'] == DEMONSTRATION_FORM_TYPE:
            if method == 'GET':
                return self._open_demonstration(query)
            if method == 'POST':
                return self._save_demonstration(form)
            return self._not_allowed()
        m4 = _DEMONSTRATION_VIEW_RE.match(path)
        if m4 and method == 'GET':
            record = next((d for d in self.demonstrations if d.record_id == m4['rid']), None)
            if record is None:
                return self._not_found()
            return _html(200, pages.demonstration_view_page(record))
        if m and m['t'] == INSTRUCTOR_FORM_TYPE:
            if method == 'GET':
                self.instructor_form_gets += 1
                return _html(200, pages.instructor_form_page(view=self.tamper.registry, workplaces=self.workplaces))
            if method == 'POST':
                return self._save_instructor(form)
            return self._not_allowed()
        m3 = _INSTRUCTOR_VIEW_RE.match(path)
        if m3 and method == 'GET':
            person = next((i for i in self.instructors if i.record_id == m3['rid']), None)
            if person is None:
                return self._not_found()
            return _html(200, pages.instructor_view_page(person))
        m2 = _WORKPLACE_VIEW_RE.match(path)
        if m2 and method == 'GET':
            found = next((w for w in self.workplaces if w.record_id == m2['rid']), None)
            if found is None:
                return self._not_found()
            return _html(200, pages.workplace_view_page(found))
        if m:
            if m['t'] != CAREER_PLAN_FORM_TYPE:
                return self._not_found()
            if method == 'GET':
                return self._open_form(query)
            if method == 'POST':
                return self._submit_form(form)
            return self._not_allowed()
        m = _VIEW_RE.match(path)
        if m and method == 'GET':
            student = self.students.get(m['sid'])
            record = next((r for r in self.records if r.record_id == m['rid']), None)
            if student is None or record is None or record.student_id != student.student_id:
                return self._not_found()
            return _html(200, pages.record_view_page(student, record.as_dict()))
        return self._not_found()

    def _listing(self, student_id: str) -> dict[str, list[tuple[str, str]]]:
        listing: dict[str, list[tuple[str, str]]] = {}
        for record in self.records:
            if record.student_id == student_id:
                title = f'Suunnitelma {record.saved_at[:10]}'
                listing.setdefault(record.form_type, []).append((record.record_id, title))
        return listing

    def _open_form(self, query: FormData) -> Response:
        sid = _first(query, 'sid')
        student = self.students.get(sid)
        if student is None:
            return self._not_found()
        replaced = self.tamper.url_sid
        return _html(200, pages.career_plan_form_page(student, {}, sid=self.tamper.form_sid or sid, formid=self.tamper.formid or CAREER_PLAN_FORM_TYPE, extra_heading=self.tamper.extra_heading, replace_url=f"/forms/{CAREER_PLAN_FORM_TYPE}/new?sid={quote(replaced)}&tid={quote(_first(query, 'tid'))}" if replaced else None))

    def _submit_form(self, form: FormData) -> Response:
        sid = _first(form, 'sid')
        student = self.students.get(sid)
        if student is None or _first(form, 'formid') != CAREER_PLAN_FORM_TYPE:
            return self._not_found()
        back = f'/profiles/students/{quote(sid)}/specedu'
        if _first(form, 'cancelbtn'):
            return _redirect(back)
        if not _first(form, 'savebtn'):
            return _html(400, pages.status_page(400, 'Tuntematon toiminto.'))
        values = {key: _first(form, name) for key, _label, name in CAREER_PLAN_FIELDS}
        errors = [f'{key}: liian pitkä' for key, value in values.items() if len(value) > MAX_LENGTH.get(key, TEXT_MAX_LENGTH)]
        if values['document_date'] and (not _DATE_RE.match(values['document_date'])):
            errors.append('Päivämäärän muoto on pp.kk.vvvv.')
        if errors:
            return _html(400, pages.career_plan_form_page(student, values, sid=sid, errors=errors))
        self.records.append(SpeceduRecord(self._new_record_id(), CAREER_PLAN_FORM_TYPE, sid, 1, self._clock(), values))
        return _redirect(back)

    def _open_host(self, query: FormData) -> Response:
        sid, cid = (_first(query, 'sid'), _first(query, 'cid'))
        student = self.students.get(sid)
        if student is None or not any((p.catalog_id == cid for p in self.parts.get(sid, []))):
            return self._not_found()
        self.host_gets += 1
        if self.tamper.on_host_get is not None:
            self.tamper.on_host_get(self.host_gets)
        return _html(200, pages.apprenticeship_form_page(student, cid, self.workplaces, view=self.tamper.registry, instructors=self.instructors))

    def add_workplace(self, workplace: Workplace) -> None:
        self.workplaces.append(workplace)

    def workplaces_with(self, business_id: str) -> list[Workplace]:
        return [w for w in self.workplaces if w.business_id == business_id]

    def _save_workplace(self, form: FormData) -> Response:
        if _first(form, 'formid') != WORKPLACE_FORM_TYPE:
            return self._not_found()
        if _first(form, 'cancelbtn'):
            return _redirect('/')
        if not _first(form, 'savebtn'):
            return _html(400, pages.status_page(400, 'Tuntematon toiminto.'))
        values = {key: _first(form, name).strip() for key, name in WORKPLACE_FIELDS}
        errors = [f'{key}: pakollinen' for key in ('name', 'business_id') if not values[key]]
        if len(values['email']) > 255:
            errors.append('email: liian pitkä')
        if errors:
            return _html(400, pages.workplace_form_page(view=self.tamper.registry, errors=errors, values={name: _first(form, name) for _k, name in WORKPLACE_FIELDS}))
        rid = str(self._next_workplace)
        self._next_workplace += 1
        self.workplaces.append(Workplace(rid, **values))
        self.workplace_saves.append(rid)
        return _redirect(f'/synthetic/tyopaikat/{rid}')

    def add_instructor(self, instructor: Instructor) -> None:
        self.instructors.append(instructor)

    def instructors_named(self, last_name: str, first_names: str) -> list[Instructor]:
        return [i for i in self.instructors if i.last_name == last_name and i.first_names == first_names]

    def _save_instructor(self, form: FormData) -> Response:
        if _first(form, 'formid') != INSTRUCTOR_FORM_TYPE:
            return self._not_found()
        if _first(form, 'cancelbtn'):
            return _redirect('/')
        if not _first(form, 'savebtn'):
            return _html(400, pages.status_page(400, 'Tuntematon toiminto.'))
        values = {key: _first(form, name).strip() for key, name in INSTRUCTOR_FIELDS}
        workplace_id = _first(form, 'pfield60__id').strip()
        errors = [f'{key}: pakollinen' for key in ('last_name', 'first_names') if not values[key]]
        if not workplace_id:
            errors.append('workplace: pakollinen')
        if len(values['email']) > 255:
            errors.append('email: liian pitkä')
        if errors:
            return _html(400, pages.instructor_form_page(view=self.tamper.registry, workplaces=self.workplaces, errors=errors, values={name: _first(form, name) for _k, name in INSTRUCTOR_FIELDS}))
        rid = str(self._next_instructor)
        self._next_instructor += 1
        self.instructors.append(Instructor(rid, workplace_id=workplace_id, **values))
        self.instructor_saves.append(rid)
        return _redirect(f'/synthetic/ohjaajat/{rid}')

    def selection_of(self, student_id: str, catalog_id: str) -> tuple[str, str]:
        return self.selections.get((student_id, catalog_id), (EMPTY_YEAR[0], EMPTY_PERIOD[0]))

    def choices_html(self, student_id: str, open_catalog: str | None=None) -> str:
        student = self.students[student_id]
        parts = self.parts.get(student_id, [])
        selections = {p.catalog_id: self.selection_of(student_id, p.catalog_id) for p in parts}
        saved: dict[str, list[str]] = {}
        for d in self.demonstrations:
            if d.student_id == student_id:
                saved.setdefault(d.catalog_id, []).append(f'/forms/{DEMONSTRATION_FORM_TYPE}/{d.record_id}/1001')
        return pages.choices_page(student, parts, selections, view=self.tamper.choices, save_url=f'/profiles/students/{quote(student_id)}/choices', open_catalog=open_catalog, demonstrations=saved)

    def demonstration_requirements(self, catalog_id: str) -> tuple[str, ...]:
        return pages.demonstration_rows(self.tamper.demonstration, DEMONSTRATION_REQUIREMENTS.get(catalog_id, ()))

    def demonstration_html(self, sid: str, cid: str) -> str:
        student = self.students[sid]
        part = next((p for p in self.parts.get(sid, []) if p.catalog_id == cid))
        return pages.demonstration_form_page(student, part, DEMONSTRATION_REQUIREMENTS.get(cid, ()), view=self.tamper.demonstration, sid=sid, cid=cid, formid=DEMONSTRATION_FORM_TYPE, workplaces=self.workplaces)

    def _open_demonstration(self, query: FormData) -> Response:
        sid, cid = (_first(query, 'sid'), _first(query, 'cid'))
        if sid not in self.students or not any((p.catalog_id == cid for p in self.parts.get(sid, []))):
            return self._not_found()
        self.demo_form_gets += 1
        if self.tamper.on_demo_get is not None:
            self.tamper.on_demo_get(self.demo_form_gets)
        if self.tamper.demonstration.abort_on_open:
            return Response(ABORTED_STATUS, {}, '')
        return _html(200, self.demonstration_html(sid, cid))

    def _save_demonstration(self, form: FormData) -> Response:
        sid, cid = (_first(form, 'sid'), _first(form, 'cid'))
        self.demo_posts.append(sid)
        if sid not in self.students or _first(form, 'formid') != DEMONSTRATION_FORM_TYPE:
            return self._not_found()
        if _first(form, 'cancelbtn') or not _first(form, 'savebtn'):
            return _redirect(f'/profiles/students/{quote(sid)}/choices')
        rows = [(text, _first(form, f'pfield{300 + 3 * i + 2}'), _first(form, f'pfield{300 + 3 * i + 3}')) for i, text in enumerate(self.demonstration_requirements(cid))]
        rid = str(self._next_demo)
        self._next_demo += 1
        self.demonstrations.append(DemonstrationRecord(rid, sid, cid, _first(form, 'pfield71'), _first(form, 'pfield29'), _first(form, 'pfield180').replace('\r\n', '\n'), [(t, p.replace('\r\n', '\n'), d.replace('\r\n', '\n')) for t, p, d in rows], _first(form, 'pfield6__id')))
        self.demo_saves.append(rid)
        return _redirect(f'/synthetic/naytot/{rid}')

    def _choices(self, student: Student) -> Response:
        self.choices_gets += 1
        if self.tamper.on_choices_get is not None:
            self.tamper.on_choices_get(self.choices_gets)
            student = self.students.get(student.student_id, student)
        return _html(200, self.choices_html(student.student_id))

    def _save_choice(self, student_id: str, form: FormData) -> Response:
        catalog, year, period = (_first(form, 'catalog'), _first(form, 'year'), _first(form, 'period'))
        if not any((p.catalog_id == catalog for p in self.parts.get(student_id, []))):
            return self._not_found()
        if year not in _YEAR_VALUES or period not in _PERIOD_VALUES or (year == EMPTY_YEAR[0] and period != EMPTY_PERIOD[0]):
            return _html(400, pages.status_page(400, 'Virheellinen valinta.'))
        self.selections[student_id, catalog] = (year, period)
        self.choice_saves.append((student_id, catalog, year, period))
        return Response(200, {'Content-Type': 'text/plain; charset=utf-8'}, 'ok')

    @staticmethod
    def _not_found() -> Response:
        return _html(404, pages.status_page(404, 'Sivua ei löydy.'))

    @staticmethod
    def _not_allowed() -> Response:
        return _html(405, pages.status_page(405, 'Menetelmä ei ole sallittu.'))
