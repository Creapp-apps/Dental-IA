html_path = '/Users/sebamaza/Desktop/PROYECTOS DEV/Consultorio Alvarez/DOSSIER_PRESENTACION_DENTAL_IA.html'

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix duplicate .cover-page {
content = content.replace('.cover-page {\n      .cover-page {', '.cover-page {')
content = content.replace('.cover-page {\n        .cover-page {', '.cover-page {')

# Fix header page break
old_header_rule = '''      header {
        margin-bottom: 14px !important;
        padding-bottom: 10px !important;
      }'''

new_header_rule = '''      header {
        page-break-before: always !important;
        break-before: page !important;
        margin-bottom: 14px !important;
        padding-bottom: 10px !important;
      }'''

if old_header_rule in content:
    content = content.replace(old_header_rule, new_header_rule)
    print("Updated header with page-break-before: always.")
else:
    print("Could not find exact old_header_rule, trying regex...")
    import re
    content = re.sub(
        r'header\s*\{\s*margin-bottom:\s*14px\s*!important;',
        'header {\n        page-break-before: always !important;\n        break-before: page !important;\n        margin-bottom: 14px !important;',
        content
    )

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("CSS cleaned and saved successfully.")
