# Synteettinen Wilma v2 – testiympäristö. Kaikki henkilöt, yritykset ja tunnisteet
# ovat keksittyjä. Koottu julkaisuun ilman kommentteja.
from .app import Response, SpeceduRecord, SyntheticWilma2, Tamper, letter_of
from .data import APPRENTICESHIP_FORM_TYPE, CAREER_PLAN_FORM_TYPE, DUPLICATE_NUMBER_STUDENT, INSTRUCTOR_FORM_TYPE, NEW_BUSINESS_ID, NEW_INSTRUCTOR, SEED_CAREER_PLANS, SEED_INSTRUCTORS, SEED_PARTS, SEED_STUDENTS, SEED_WORKPLACES, WORKPLACE_FORM_TYPE, Instructor, Part, Student, Workplace
from .pages import ROLE_TEXT, ChoicesView, RegistryView
from .route import DEFAULT_ORIGIN, install_route
TEST_ROLE_LOCATOR = '#synthetic-role'
__all__ = ['APPRENTICESHIP_FORM_TYPE', 'CAREER_PLAN_FORM_TYPE', 'DEFAULT_ORIGIN', 'DUPLICATE_NUMBER_STUDENT', 'INSTRUCTOR_FORM_TYPE', 'NEW_BUSINESS_ID', 'NEW_INSTRUCTOR', 'ROLE_TEXT', 'SEED_CAREER_PLANS', 'SEED_INSTRUCTORS', 'SEED_PARTS', 'SEED_STUDENTS', 'SEED_WORKPLACES', 'TEST_ROLE_LOCATOR', 'WORKPLACE_FORM_TYPE', 'ChoicesView', 'Instructor', 'Part', 'RegistryView', 'Response', 'SpeceduRecord', 'Student', 'SyntheticWilma2', 'Tamper', 'Workplace', 'install_route', 'letter_of']
