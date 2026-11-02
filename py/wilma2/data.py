# Synteettinen Wilma v2 – testiympäristö. Kaikki henkilöt, yritykset ja tunnisteet
# ovat keksittyjä. Koottu julkaisuun ilman kommentteja.
from __future__ import annotations
from dataclasses import dataclass
CAREER_PLAN_FORM_TYPE = '418'
SECTIONS: tuple[tuple[str, str, str], ...] = (('Urasuunnitelmat', CAREER_PLAN_FORM_TYPE, 'Urasuunnitelma'), ('Erityisen tuen suunnitelmat', '512', 'Erityisen tuen suunnitelma'), ('Ohjauksen ja tuen suunnitelmat', '527', 'Ohjauksen ja tuen suunnitelma'))
TEACHER_ID = '7301'
TEACHER_NAME = 'Opettaja Synteettinen'
LETTERS: tuple[tuple[str, str], ...] = (*((chr(c), chr(c)) for c in range(ord('A'), ord('Z') + 1)), ('Å', '%c5'), ('Ä', '%c4'), ('Ö', '%d6'))
CAREER_PLAN_TEXTAREAS: tuple[tuple[str, str, str], ...] = (('further_studies', 'Suunnitelma jatko-opintoihin siirtymisestä', 'pfield301'), ('working_life', 'Suunnitelma työelämään siirtymisestä', 'pfield302'), ('career_progress', 'Suunnitelma työuralla etenemiseksi', 'pfield303'), ('continuation', 'Suunnitelma opintojen jatkamiseksi (kirjataan, jos opiskelija eroaa oppilaitoksesta)', 'pfield304'))
DOCUMENT_DATE = ('document_date', 'Asiakirjan laatimispäivä', 'pfield12')
PARTICIPANTS = ('participants', 'Asiakirjan laatimiseen osallistuneet', 'pfield13')
CAREER_PLAN_FIELDS: tuple[tuple[str, str, str], ...] = (*CAREER_PLAN_TEXTAREAS, DOCUMENT_DATE, PARTICIPANTS)
MAX_LENGTH = {'document_date': 10}
TEXT_MAX_LENGTH = 20000

@dataclass(frozen=True, slots=True)
class Student:
    student_id: str
    surname: str
    first_names: str
    student_number: str
    qualification: str
    guardian_surname: str = ''

    @property
    def list_name(self) -> str:
        return f'{self.surname} {self.first_names}'
SEED_STUDENTS: tuple[Student, ...] = (Student('1101', 'Virtanen', 'Aino', '20101', 'Liiketoiminnan perustutkinto', 'Virtanen'), Student('1102', 'Virtanen', 'Aino', '20102', 'Tieto- ja viestintätekniikan perustutkinto'), Student('1103', 'Ärmänen', 'Pinja', '20103', 'Logistiikan perustutkinto'), Student('1104', 'Östman', 'Leo', '20104', 'Liiketoiminnan perustutkinto'), Student('1105', 'Lahtinen', 'Eero', '20105', 'Logistiikan perustutkinto'), Student('1106', 'Åberg', 'Saga', '20106', 'Liiketoiminnan perustutkinto'), Student('1107', 'Valkama', 'Iiro', '20107', 'Tieto- ja viestintätekniikan perustutkinto'))
SEED_CAREER_PLANS: dict[str, dict[str, str]] = {'1105': {'further_studies': 'Ei suunnitteilla.', 'working_life': 'Varastotyöhön harjoittelupaikan kautta.', 'career_progress': '', 'continuation': '', 'document_date': '01.09.2026', 'participants': 'Opiskelija ja opettaja.'}}
DUPLICATE_NUMBER_STUDENT = Student('1108', 'Virtanen', 'Aino', '20101', 'Liiketoiminnan perustutkinto')
EMPTY_YEAR = ('0', 'Ei valintaa')
SCHOOL_YEARS: tuple[tuple[str, str], ...] = tuple(((str(y), f'{y}–{y + 1}') for y in range(2026, 2032)))
EMPTY_PERIOD = ('0', 'Ei jaksoa')
PERIODS: tuple[tuple[str, str], ...] = tuple(((str(k), f'{k}. jakso') for k in range(1, 6)))
OTHER_PERIOD = ('other', 'Muu')
OTHER_PERIOD_PLACEHOLDER = '6–52'

@dataclass(frozen=True, slots=True)
class Part:
    catalog_id: str
    code: str
    name: str
    kind: str
    osp: int
    row_class: str = 'c-type60'

    @property
    def title(self) -> str:
        return f'{self.code} - {self.name} - {self.kind}, {self.osp} osp'
PART_KIND = 'Tutkinnon osa'
SEED_PARTS: dict[str, tuple[Part, ...]] = {'1101': (Part('8101', 'SYN-ASPA', 'Asiakaspalvelu', PART_KIND, 30, 'c-type60-sel'), Part('8102', 'SYN-MYTY', 'Myyntityö', PART_KIND, 25), Part('8103', 'SYN-TUOT', 'Tuotteiden esillepano', PART_KIND, 15), Part('8104', 'SYN-VERK', 'Verkkokauppa', PART_KIND, 20, 'c-type60-sel'), Part('8105', 'SYN-LOGI', 'Varastologistiikka', PART_KIND, 15, 'c-type60-sel'), Part('8106', 'SYN-YRIT', 'Yrittäjyys', PART_KIND, 15), Part('8107', 'SYN-VIES', 'Viestintä- ja vuorovaikutusosaaminen', 'Yhteinen tutkinnon osa', 11, 'c-type97-sel'))}
DEMONSTRATION_FORM_TYPE = '604'
APPRENTICESHIP_FORM_TYPE = '631'
TRAINING_FORM_TYPE = '612'
ENTREPRENEUR_FORM_TYPE = '633'
STUDY_PLANNING_FORM_TYPE = '608'
FORMS_TAB_LINKS: tuple[tuple[str, str], ...] = (('Luo uusi: Koulutussopimus', TRAINING_FORM_TYPE), ('Luo uusi: Oppisopimus', APPRENTICESHIP_FORM_TYPE), ('Luo uusi: Yrittäjän oppisopimus', ENTREPRENEUR_FORM_TYPE))
FORMS_TAB_EDIT_LINKS: tuple[tuple[str, str], ...] = (('Muokkaa lomakepohjaa: Koulutussopimus', TRAINING_FORM_TYPE), ('Muokkaa lomakepohjaa: Oppisopimus', APPRENTICESHIP_FORM_TYPE), ('Muokkaa lomakepohjaa: Yrittäjän oppisopimus', ENTREPRENEUR_FORM_TYPE))
DEMONSTRATION_LINK: tuple[str, str] = ('Luo uusi: HOKS Näyttösuunnitelma ja näytön arviointi', DEMONSTRATION_FORM_TYPE)
SAVED_FORM: tuple[str, str, str, str] = ('HOKS Tutkintokoulutuksen suunnittelu', STUDY_PLANNING_FORM_TYPE, '9001', '1001')
WORKPLACE_FORM_TYPE = '744'
INSTRUCTOR_FORM_TYPE = '745'

@dataclass(frozen=True, slots=True)
class Workplace:
    record_id: str
    name: str
    business_id: str
    street_address: str = ''
    postal_address: str = ''
    municipality: str = ''
    phone: str = ''
    email: str = ''

    def as_fields(self) -> dict[str, str]:
        return {'name': self.name, 'business_id': self.business_id, 'street_address': self.street_address, 'postal_address': self.postal_address, 'municipality': self.municipality, 'phone': self.phone, 'email': self.email}
SEED_WORKPLACES: tuple[Workplace, ...] = (Workplace('70101', 'Synteettinen Kahvila Oy', '2740151-7', 'Kahvikuja 1', '45100 Kouvola', 'Kouvola', '040 000 0101', 'kahvila@example.test'), Workplace('70102', 'Testivarasto Ab', '2740162-1', 'Varastotie 2', '48100 Kotka', 'Kotka', '040 000 0102', 'varasto@example.test'), Workplace('70103', 'Keksitty Konepaja Oy', '2740173-6', 'Pajakatu 3', '49400 Hamina', 'Hamina', '040 000 0103', 'konepaja@example.test'))
NEW_BUSINESS_ID = '2740184-0'
SPARE_BUSINESS_IDS = ('2740195-5', '2740206-9', '2740217-3')
MUNICIPALITIES: tuple[tuple[str, str], ...] = (('8001', 'Kouvola'), ('8002', 'Kotka'), ('8003', 'Hamina'), ('8004', 'Lahti'), ('8005', 'Kouvolan seutu'))

@dataclass(frozen=True, slots=True)
class Instructor:
    record_id: str
    last_name: str
    first_names: str
    workplace_id: str
    phone: str = ''
    email: str = ''

    def as_fields(self) -> dict[str, str]:
        return {'last_name': self.last_name, 'first_names': self.first_names, 'phone': self.phone, 'email': self.email}
SEED_INSTRUCTORS: tuple[Instructor, ...] = (Instructor('71101', 'Mäkinen', 'Liisa Maria', '70101', '040 000 1101', 'liisa@example.test'), Instructor('71102', 'Lehto', 'Jussi', '70101', '040 000 1102', 'jussi@example.test'), Instructor('71103', 'Mäkinen', 'Pekka', '70102', '040 000 1103', 'pekka@example.test'))
NEW_INSTRUCTOR = Instructor('', 'Koskinen', 'Sanna Elina', '70101', '040 000 1204', 'sanna@example.test')
DEMONSTRATION_REQUIREMENTS: dict[str, tuple[str, ...]] = {'8101': ('Opiskelija palvelee asiakasta asiakaslähtöisesti.', 'Opiskelija toimii yrityksen palveluperiaatteiden mukaisesti.'), '8102': ('Opiskelija suunnittelee myyntityönsä.', 'Opiskelija esittelee tuotteita asiakkaalle.')}
DEMONSTRATION_HEADERS: tuple[str, str, str] = ('Ammattitaitovaatimukset', 'Suunnitelma osaamisen osoittamisesta', 'Tekemisessä syntyvät dokumentit')

@dataclass
class DemonstrationRecord:
    record_id: str
    student_id: str
    catalog_id: str
    start_date: str
    end_date: str
    environment: str
    rows: list[tuple[str, str, str]]
    workplace_id: str = ''
