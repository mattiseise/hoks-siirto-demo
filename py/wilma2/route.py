# Synteettinen Wilma v2 – testiympäristö. Kaikki henkilöt, yritykset ja tunnisteet
# ovat keksittyjä. Koottu julkaisuun ilman kommentteja.
from __future__ import annotations
from collections.abc import Mapping, Sequence
from html import escape
from typing import Protocol
from urllib.parse import parse_qs, urlsplit
from playwright.sync_api import BrowserContext, Page, Route
DEFAULT_ORIGIN = 'https://wilma2.test'

class _Response(Protocol):

    @property
    def status(self) -> int:
        ...

    @property
    def headers(self) -> dict[str, str]:
        ...

    @property
    def body(self) -> str:
        ...

    @property
    def location(self) -> str | None:
        ...

class _Handler(Protocol):

    def handle(self, method: str, path: str, query: Mapping[str, str | Sequence[str]] | None=None, form: Mapping[str, str | Sequence[str]] | None=None) -> _Response:
        ...
ABORTED_STATUS = 499

def _refresh_page(url: str) -> str:
    target = escape(url, quote=True)
    return f'<!doctype html>\n<!-- Synteettinen Wilma v2 – testiympäristö -->\n<html lang="fi"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url={target}"><title>Synteettinen Wilma v2 · Siirrytään</title></head><body><p data-testid="redirect">Siirrytään: <a href="{target}">jatka</a></p></body></html>'

def install_route(target: BrowserContext | Page, wilma: _Handler, origin: str=DEFAULT_ORIGIN) -> None:
    origin = origin.rstrip('/')

    def handler(route: Route) -> None:
        request = route.request
        parts = urlsplit(request.url)
        query = parse_qs(parts.query, keep_blank_values=True)
        form = parse_qs(request.post_data or '', keep_blank_values=True) if request.method.upper() == 'POST' else {}
        response = wilma.handle(request.method, parts.path or '/', query, form)
        if response.status == ABORTED_STATUS:
            route.abort('aborted')
            return
        location = response.location
        if 300 <= response.status < 400 and location is not None:
            target_url = origin + location if location.startswith('/') else location
            route.fulfill(status=200, content_type='text/html; charset=utf-8', body=_refresh_page(target_url))
            return
        route.fulfill(status=response.status, headers=dict(response.headers), body=response.body)
    target.route(f'{origin}/**', handler)
