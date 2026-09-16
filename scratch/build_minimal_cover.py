import re

html_path = '/Users/sebamaza/Desktop/PROYECTOS DEV/Consultorio Alvarez/DOSSIER_PRESENTACION_DENTAL_IA.html'

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract logo
img_match = re.search(r'(<img [^>]*class="brand-logo-img"[^>]*>)', content)
if not img_match:
    print("Error: brand-logo-img not found")
    exit(1)

logo_tag = img_match.group(1)
front_logo_tag = logo_tag.replace('class="brand-logo-img"', 'class="front-cover-logo-img"')

# Define Front Cover HTML (Página 0 / Portada Minimalista)
front_cover_html = f'''    <!-- ============================================================
         PORTADA / CARÁTULA MINIMALISTA CORPORATIVA (PÁGINA 0)
    ============================================================ -->
    <section class="front-cover">
      <!-- Top Meta -->
      <div class="front-cover-top">
        <span class="front-cover-top-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          DOCUMENTO INSTITUCIONAL OFICIAL • CONFIDENCIAL
        </span>
      </div>

      <!-- Center Branding & Title -->
      <div class="front-cover-center">
        <div class="front-cover-logo-wrap">
          {front_logo_tag}
        </div>

        <div class="front-cover-brand">Dental-IA</div>
        <div class="front-cover-brand-sub">SISTEMA OPERATIVO CLÍNICO & INTELIGENCIA ARTIFICIAL</div>

        <div class="front-cover-divider"></div>

        <h1 class="front-cover-title">Dossier Institucional</h1>
        <p class="front-cover-subtitle">Transformación Digital, Automatización de Pacientes & Gestión Odontológica Integral</p>

        <div class="front-cover-edition-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          EDICIÓN CORPORATIVA 2026
        </div>
      </div>

      <!-- Bottom Corporate Footer -->
      <div class="front-cover-footer">
        <div class="front-cover-footer-line"></div>
        <div class="front-cover-footer-content">
          <span>Dental-IA Solutions • HealthTech Platform</span>
          <span class="dot-sep">•</span>
          <span>www.dentalia.com.ar</span>
          <span class="dot-sep">•</span>
          <span>Validez Comercial 2026</span>
        </div>
      </div>
    </section>

'''

# Define Screen CSS for .front-cover
front_cover_css = '''
    /* ============================================================
       PORTADA MINIMALISTA (PÁGINA 0)
    ============================================================ */
    .front-cover {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      min-height: 860px;
      background: radial-gradient(circle at 50% 45%, rgba(37, 99, 235, 0.04) 0%, #ffffff 70%);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 56px 48px 48px 48px;
      margin-bottom: 50px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 12px 36px -12px rgba(15, 23, 42, 0.08);
    }

    .front-cover::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(90deg, var(--primary) 0%, #38bdf8 50%, var(--accent) 100%);
    }

    .front-cover-top {
      width: 100%;
      display: flex;
      justify-content: center;
    }

    .front-cover-top-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: #0f172a;
      color: #ffffff;
      padding: 7px 18px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);
    }

    .front-cover-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      max-width: 680px;
      padding: 40px 0;
    }

    .front-cover-logo-wrap {
      width: 110px;
      height: 110px;
      border-radius: 28px;
      background: #ffffff;
      border: 1px solid var(--primary-border);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 16px 36px -10px rgba(37, 99, 235, 0.2);
      margin-bottom: 12px;
    }

    .front-cover-logo-img {
      height: 72px;
      width: auto;
      max-width: 72px;
      object-fit: contain;
      filter: drop-shadow(0 4px 10px rgba(37, 99, 235, 0.3));
    }

    .front-cover-brand {
      font-size: 46px;
      font-weight: 800;
      letter-spacing: -1.2px;
      color: var(--text-dark);
      line-height: 1;
    }

    .front-cover-brand-sub {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2.2px;
      text-transform: uppercase;
      color: var(--primary);
    }

    .front-cover-divider {
      width: 70px;
      height: 3.5px;
      background: linear-gradient(90deg, var(--primary), #38bdf8);
      border-radius: 9999px;
      margin: 14px 0 10px 0;
    }

    .front-cover-title {
      font-size: 36px;
      font-weight: 800;
      color: var(--text-dark);
      letter-spacing: -0.6px;
      line-height: 1.2;
    }

    .front-cover-subtitle {
      font-size: 15px;
      font-weight: 500;
      color: var(--text-muted);
      line-height: 1.5;
      max-width: 540px;
    }

    .front-cover-edition-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: var(--primary-light);
      border: 1px solid var(--primary-border);
      color: var(--primary);
      padding: 7px 18px;
      border-radius: 9999px;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.6px;
      margin-top: 10px;
    }

    .front-cover-footer {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }

    .front-cover-footer-line {
      width: 100%;
      height: 1px;
      background: var(--border-color);
    }

    .front-cover-footer-content {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 11.5px;
      color: var(--text-subtle);
      font-weight: 500;
    }

    .front-cover-footer-content .dot-sep {
      color: var(--border-color);
    }
'''

# Define Print CSS for .front-cover
front_cover_print_css = '''
      /* === PÁGINA 1: PORTADA MINIMALISTA (PÁGINA 0) === */
      .front-cover {
        page-break-before: auto !important;
        page-break-after: always !important;
        break-after: page !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        height: 254mm !important;
        min-height: 254mm !important;
        max-height: 254mm !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        align-items: center !important;
        text-align: center !important;
        padding: 44px 36px 36px 36px !important;
        margin-bottom: 0 !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 18px !important;
        background: #ffffff !important;
        box-shadow: none !important;
        box-sizing: border-box !important;
      }
      .front-cover-top-badge {
        padding: 6px 16px !important;
        font-size: 9.5px !important;
        letter-spacing: 0.8px !important;
        background: #0f172a !important;
        color: #ffffff !important;
      }
      .front-cover-center {
        padding: 20px 0 !important;
        gap: 10px !important;
      }
      .front-cover-logo-wrap {
        width: 95px !important;
        height: 95px !important;
        border-radius: 24px !important;
        margin-bottom: 8px !important;
        border: 1px solid #bfdbfe !important;
        box-shadow: none !important;
      }
      .front-cover-logo-img {
        height: 60px !important;
        max-width: 60px !important;
      }
      .front-cover-brand {
        font-size: 38px !important;
        letter-spacing: -1px !important;
      }
      .front-cover-brand-sub {
        font-size: 10px !important;
        letter-spacing: 2px !important;
      }
      .front-cover-divider {
        width: 60px !important;
        height: 3px !important;
        margin: 10px 0 8px 0 !important;
      }
      .front-cover-title {
        font-size: 30px !important;
        letter-spacing: -0.5px !important;
        margin-bottom: 0 !important;
      }
      .front-cover-subtitle {
        font-size: 13px !important;
        line-height: 1.4 !important;
        max-width: 480px !important;
      }
      .front-cover-edition-badge {
        font-size: 10.5px !important;
        padding: 5px 15px !important;
        margin-top: 8px !important;
      }
      .front-cover-footer {
        gap: 12px !important;
      }
      .front-cover-footer-content {
        font-size: 10px !important;
      }

      /* === PÁGINA 2: DOSSIER CORPORATIVO & PILARES === */
'''

# 1. Insert Screen CSS before "/* ============================================================\n       PORTADA / CARÁTULA CORPORATIVA"
target_screen_marker = '/* ============================================================\n       PORTADA / CARÁTULA CORPORATIVA'
if target_screen_marker in content:
    content = content.replace(target_screen_marker, front_cover_css + '\n    ' + target_screen_marker)
    print("Added front cover screen CSS.")
else:
    print("Could not find cover CSS marker, looking for alternative...")
    if '/* Print Optimization & Page Setup */' in content:
        content = content.replace('/* Print Optimization & Page Setup */', front_cover_css + '\n    /* Print Optimization & Page Setup */')
        print("Added front cover screen CSS before print optimization.")

# 2. Update Print CSS
old_print_marker = '      /* === PÁGINA 1: PORTADA / CARÁTULA CORPORATIVA === */'
if old_print_marker in content:
    content = content.replace(old_print_marker, front_cover_print_css + '      .cover-page {')
    # Notice .cover-page is already in the print css right after old_print_marker, so replacing the marker with front_cover_print_css + '      .cover-page {' replaces the comment and starts .cover-page definition
    # Wait, let's verify if .cover-page was part of it.
    print("Found old print marker.")
else:
    print("Warning: old_print_marker not found.")

# Let's cleanly handle print CSS replacement
if '/* === PÁGINA 1: PORTADA / CARÁTULA CORPORATIVA === */' in content:
    content = content.replace(
        '/* === PÁGINA 1: PORTADA / CARÁTULA CORPORATIVA === */',
        front_cover_print_css.strip() + '\n\n      /* === PÁGINA 2: RESUMEN EJECUTIVO & PILARES (Ex-Pág 1) === */'
    )
    print("Print CSS successfully updated!")

# 3. Insert Front Cover HTML right before <section class="cover-page">
if '<section class="cover-page">' in content:
    content = content.replace('<section class="cover-page">', front_cover_html + '    <section class="cover-page">')
    print("Inserted Front Cover HTML before <section class=\"cover-page\">.")
else:
    print("Error: <section class=\"cover-page\"> not found.")

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("HTML updated successfully with Minimalist Front Cover!")
