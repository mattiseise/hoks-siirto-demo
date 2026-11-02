"""Selaimen silta synteettiseen Wilma v2:een (ajetaan Pyodidessa, testataan CPythonilla).

Synteettinen Wilma v2 on puhdasta Pythonia: `SyntheticWilma2.handle(method, path, query, form)`
palauttaa vastauksen ilman verkkoa. Tämä moduuli
- asentaa `playwright.sync_api`-tyngän, jos Playwrightia ei ole (Pyodide),
- käsittelee sivun pyynnöt, seuraa 3xx-uudelleenohjaukset ja lisää Wilma-teeman,
- kertoo, mitä käyttäjän tallennus synnytti (`events`), jotta sivu huomaa tallennuksen,
- tarjoaa rekisterihaut ja siemendatan sivun käyttöön.

Kaikki palautetaan JSON-merkkijonona. Tila on vain muistissa; sivun uudelleenlataus aloittaa
alusta. Kaikki henkilöt, yritykset ja tunnisteet ovat keksittyjä.
"""

from __future__ import annotations

import json
import sys
import types
from typing import Any
from urllib.parse import parse_qs, urlsplit


def _install_playwright_stub() -> None:
    """wilma2 tuo `playwright.sync_api`:n moduulitasolla vain tyyppejä varten."""
    try:
        import playwright.sync_api  # noqa: F401
        return
    except ImportError:
        pass
    package = types.ModuleType("playwright")
    api = types.ModuleType("playwright.sync_api")
    api.BrowserContext = object  # type: ignore[attr-defined]
    api.Page = object  # type: ignore[attr-defined]
    api.Route = object  # type: ignore[attr-defined]
    package.sync_api = api  # type: ignore[attr-defined]
    package.__path__ = []  # type: ignore[attr-defined]
    sys.modules["playwright"] = package
    sys.modules["playwright.sync_api"] = api


_install_playwright_stub()

import demo_skin  # noqa: E402
from wilma2 import SyntheticWilma2  # noqa: E402
from wilma2 import data as wdata  # noqa: E402

HOST = "wilma.synteettinen.test"
_MAX_REDIRECTS = 5

#: Teeman skripti lukee `location.pathname`ia; iframessa (srcdoc) se ei ole Wilman polku, joten
#: julkaistu sivu antaa polun muuttujassa `window.__wilmaPath`. wilma2 ja teema pysyvät ennallaan.
_SKIN_JS = demo_skin._V2_STUDENT_TABS_JS
_SKIN_JS_FRAME = _SKIN_JS.replace("location.pathname", "(window.__wilmaPath || '/')")

_wilma = SyntheticWilma2()
_wilma.logged_in = True


def _split(url: str) -> tuple[str, dict[str, list[str]]]:
    parts = urlsplit(url)
    return parts.path or "/", parse_qs(parts.query, keep_blank_values=True)


def _counts() -> dict[str, int]:
    w = _wilma
    return {"workplace": len(w.workplace_saves), "instructor": len(w.instructor_saves),
            "choice": len(w.choice_saves), "demo": len(w.demo_saves),
            "record": len(w.records), "host": len(w.host_posts)}


def _events(before: dict[str, int]) -> list[dict[str, Any]]:
    w = _wilma
    out: list[dict[str, Any]] = []
    out += [{"kind": "workplace", "id": rid} for rid in w.workplace_saves[before["workplace"]:]]
    out += [{"kind": "instructor", "id": rid}
            for rid in w.instructor_saves[before["instructor"]:]]
    out += [{"kind": "choice", "sid": sid, "catalog": cid, "year": year, "period": period}
            for sid, cid, year, period in w.choice_saves[before["choice"]:]]
    out += [{"kind": "demo", "id": rid} for rid in w.demo_saves[before["demo"]:]]
    out += [{"kind": "record", "id": r.record_id, "sid": r.student_id, "form_type": r.form_type}
            for r in w.records[before["record"]:]]
    out += [{"kind": "host_post", "sid": sid} for sid in w.host_posts[before["host"]:]]
    return out


def _skin(body: str) -> str:
    return demo_skin.apply(body, "v2").replace(_SKIN_JS, _SKIN_JS_FRAME)


def request(method: str, url: str, body: str = "", skin: bool = True) -> str:
    """Yksi selaimen pyyntö. `url` = polku ja kysely (esim. `/forms/744/new`), `body` =
    urlencoded-lomake (POST). Uudelleenohjaukset seurataan GET-pyyntöinä kuten selain."""
    before = _counts()
    method = method.upper()
    path, query = _split(url)
    form = parse_qs(body or "", keep_blank_values=True) if method == "POST" else {}
    redirects: list[str] = []
    response = _wilma.handle(method, path, query, form)
    while (300 <= response.status < 400 and response.location
           and len(redirects) < _MAX_REDIRECTS):
        redirects.append(url)
        url = response.location
        path, query = _split(url)
        response = _wilma.handle("GET", path, query, {})
    content_type = response.headers.get("Content-Type", "")
    text = response.body
    if skin and content_type.startswith("text/html"):
        text = _skin(text)
    return json.dumps({"status": response.status, "url": url, "path": path,
                       "content_type": content_type, "body": text, "redirects": redirects,
                       "events": _events(before)}, ensure_ascii=False)


def reset() -> str:
    """Palauta Wilma alkutilaan (kirjautuneena)."""
    _wilma.reset()
    _wilma.logged_in = True
    return json.dumps({"ok": True})


def seed() -> str:
    """Siemendata sivun demohenkilöitä, tutkinnon osia ja valintoja varten."""
    return json.dumps({
        "host": HOST,
        "students": [{"sid": s.student_id, "surname": s.surname, "first_names": s.first_names,
                      "student_number": s.student_number, "qualification": s.qualification}
                     for s in wdata.SEED_STUDENTS],
        "parts": {sid: [{"catalog_id": p.catalog_id, "code": p.code, "name": p.name,
                         "kind": p.kind, "osp": p.osp} for p in parts]
                  for sid, parts in wdata.SEED_PARTS.items()},
        "school_years": [list(y) for y in wdata.SCHOOL_YEARS],
        "periods": [list(p) for p in wdata.PERIODS],
        "municipalities": [name for _id, name in wdata.MUNICIPALITIES],
        "requirements": {cid: list(rows)
                         for cid, rows in wdata.DEMONSTRATION_REQUIREMENTS.items()},
        "new_business_id": wdata.NEW_BUSINESS_ID,
        "spare_business_ids": list(wdata.SPARE_BUSINESS_IDS),
    }, ensure_ascii=False)


def workplaces_with(business_id: str) -> str:
    """Työpaikkarekisterin haku Y-tunnuksella."""
    return json.dumps([{"record_id": w.record_id, **w.as_fields()}
                       for w in _wilma.workplaces_with(business_id.strip())], ensure_ascii=False)


def instructors_named(last_name: str, first_names: str) -> str:
    """Ohjaajarekisterin haku nimellä (täsmällinen sukunimi ja etunimet)."""
    return json.dumps([{"record_id": i.record_id, "workplace_id": i.workplace_id,
                        **i.as_fields()}
                       for i in _wilma.instructors_named(last_name.strip(),
                                                         first_names.strip())],
                      ensure_ascii=False)


def selection_of(student_id: str, catalog_id: str) -> str:
    year, period = _wilma.selection_of(student_id, catalog_id)
    return json.dumps({"year": year, "period": period})


def career_plans(student_id: str) -> str:
    return json.dumps([r.as_dict() for r in _wilma.records_of(student_id)], ensure_ascii=False)
