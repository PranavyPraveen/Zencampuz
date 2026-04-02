def generate_resource_code(name: str, tenant) -> str:
    """
    Auto-generates a unique resource code from the given name.
    Logic:
      - Multi-word: take initials, e.g. "Digital Oscilloscope" → "DO"
      - Single-word: take up to 4 chars, e.g. "Projector" → "PROJ"
    Ensures uniqueness within the tenant by appending -1, -2, etc.
    """
    from .models import Resource
    import re

    clean = re.sub(r'[^a-zA-Z0-9\s]', '', name).strip()
    words = clean.split()

    if not words:
        base = 'RSC'
    elif len(words) == 1:
        base = words[0][:4].upper()
    else:
        base = ''.join(w[0] for w in words).upper()[:6]

    if not base:
        base = 'RSC'

    existing_codes = set(
        Resource.objects.filter(tenant=tenant)
        .values_list('resource_code', flat=True)
    )

    code = base
    counter = 1
    while code in existing_codes:
        code = f'{base}-{counter}'
        counter += 1

    return code
