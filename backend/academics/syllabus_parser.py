import re


SEMESTER_PATTERN = re.compile(r'SEMESTER\s+([IVXLC]+|\d+)', re.IGNORECASE)
ROW_PATTERN = re.compile(
    r'^(?P<code>\d{2}-\d{3}-\d{4}[A-Z*]{0,2})\s+'
    r'(?P<subject>.+?)\s+'
    r'(?P<l>-|\d+)\s+'
    r'(?P<t>-|\d+)\s+'
    r'(?P<p>-|\d+)\s+'
    r'(?P<credits>\d+)\s+'
    r'(?P<ca>-|\d+)\s+'
    r'(?P<see>-|\d+)\s+'
    r'(?P<total>-|\d+)$'
)
ROW_PATTERN_SHORT = re.compile(
    r'^(?P<code>\d{2}-\d{3}-\d{4}[A-Z*]{0,2})\s+'
    r'(?P<subject>.+?)\s+'
    r'(?P<l>-|\d+)\s+'
    r'(?P<t>-|\d+)\s+'
    r'(?P<credits>\d+)\s+'
    r'(?P<ca>-|\d+)\s+'
    r'(?P<see>-|\d+)\s+'
    r'(?P<total>-|\d+)$'
)
ROMAN_MAP = {
    'I': 1, 'II': 2, 'III': 3, 'IV': 4,
    'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8,
    'IX': 9, 'X': 10,
}
LAB_KEYWORDS = ('lab', 'laboratory', 'workshop', 'practical', 'project', 'training', 'seminar', 'viva', 'computer applications')


def _normalize_line(value):
    return ' '.join((value or '').replace('\t', ' ').split())


def _to_int(value):
    if value in (None, '', '-'):
        return 0
    return int(value)


def _semester_number_from_label(label):
    raw = (label or '').strip().upper()
    if raw.isdigit():
        return int(raw)
    return ROMAN_MAP.get(raw)


def _is_scheme_page(page_text):
    lowered = (page_text or '').lower()
    return 'semester' in lowered and 'marks total' in lowered and 'code' in lowered


def _parse_row(line, semester_label):
    normalized = _normalize_line(line)
    match = ROW_PATTERN.match(normalized) or ROW_PATTERN_SHORT.match(normalized)
    if not match:
        return None

    subject_name = _normalize_line(match.group('subject'))
    lecture_hours = _to_int(match.groupdict().get('l'))
    tutorial_hours = _to_int(match.groupdict().get('t'))
    practical_hours = _to_int(match.groupdict().get('p')) if 'p' in match.groupdict() else 0
    credits = _to_int(match.groupdict().get('credits'))
    semester_number = _semester_number_from_label(semester_label)

    if practical_hours == 0 and lecture_hours == 0 and tutorial_hours > 0 and any(keyword in subject_name.lower() for keyword in LAB_KEYWORDS):
        practical_hours = tutorial_hours
        tutorial_hours = 0

    return {
        'semester_name': f'Semester {semester_label}' if semester_label else '',
        'semester_number': semester_number,
        'subject_code': match.group('code'),
        'subject_name': subject_name,
        'lecture_hours': lecture_hours,
        'tutorial_hours': tutorial_hours,
        'practical_hours': practical_hours,
        'credits': credits,
    }


def parse_syllabus_pages(page_texts):
    current_semester = ''
    rows = []
    seen_codes = set()

    for page_text in page_texts:
        if not _is_scheme_page(page_text):
            continue

        processed_page = re.sub(r'(?<!\n)(\d{2}-\d{3}-\d{4}[A-Z*]{0,2})', r'\n\1', page_text or '')
        processed_page = processed_page.replace(' TOTAL ', '\nTOTAL ')
        lines = [_normalize_line(line) for line in processed_page.splitlines()]
        lines = [line for line in lines if line]
        buffer = None

        for line in lines:
            semester_match = SEMESTER_PATTERN.search(line)
            if semester_match:
                current_semester = semester_match.group(1).upper()
                if buffer:
                    parsed = _parse_row(buffer, current_semester)
                    if parsed and parsed['subject_code'] not in seen_codes:
                        seen_codes.add(parsed['subject_code'])
                        rows.append(parsed)
                    buffer = None
                continue

            if line.lower().startswith(('code no', 'marks total', 'total ', 'ca ', 'see ', 'stream ', 'scheme of examinations', 'code name of subject')):
                if buffer:
                    parsed = _parse_row(buffer, current_semester)
                    if parsed and parsed['subject_code'] not in seen_codes:
                        seen_codes.add(parsed['subject_code'])
                        rows.append(parsed)
                    buffer = None
                continue

            if 'professional elective' in line.lower() or 'open elective' in line.lower():
                if buffer:
                    parsed = _parse_row(buffer, current_semester)
                    if parsed and parsed['subject_code'] not in seen_codes:
                        seen_codes.add(parsed['subject_code'])
                        rows.append(parsed)
                    buffer = None
                continue

            if re.match(r'^\d{2}-\d{3}-\d{4}[A-Z*]{0,2}\s+', line):
                if buffer:
                    parsed = _parse_row(buffer, current_semester)
                    if parsed and parsed['subject_code'] not in seen_codes:
                        seen_codes.add(parsed['subject_code'])
                        rows.append(parsed)
                buffer = line
                continue

            if buffer:
                if re.search(r'\d{2}-\d{3}-\d{4}[A-Z*]{0,2}', line):
                    parsed = _parse_row(buffer, current_semester)
                    if parsed and parsed['subject_code'] not in seen_codes:
                        seen_codes.add(parsed['subject_code'])
                        rows.append(parsed)
                    buffer = line
                    continue

                candidate = f'{buffer} {line}'
                if ROW_PATTERN.match(_normalize_line(candidate)) or ROW_PATTERN_SHORT.match(_normalize_line(candidate)):
                    buffer = candidate
                    continue
                parsed = _parse_row(buffer, current_semester)
                if parsed and parsed['subject_code'] not in seen_codes:
                    seen_codes.add(parsed['subject_code'])
                    rows.append(parsed)
                buffer = None

        if buffer:
            parsed = _parse_row(buffer, current_semester)
            if parsed and parsed['subject_code'] not in seen_codes:
                seen_codes.add(parsed['subject_code'])
                rows.append(parsed)

    return rows
