import re

html_path = '/Users/sebamaza/Desktop/PROYECTOS DEV/Consultorio Alvarez/DOSSIER_PRESENTACION_DENTAL_IA.html'

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract logo img tag
img_match = re.search(r'(<img [^>]*class="brand-logo-img"[^>]*>)', content)
if not img_match:
    print("Error: brand-logo-img not found")
    exit(1)

logo_tag = img_match.group(1)
# Create a cover logo tag that has class "cover-logo-img"
cover_logo_tag = logo_tag.replace('class="brand-logo-img"', 'class="cover-logo-img"')

# Define cover page HTML
cover_html = f'''    <!-- ============================================================
         PORTADA / CARÁTULA CORPORATIVA (PÁGINA 1)
    ============================================================ -->
    <section class="cover-page">
      <!-- Cover Header -->
      <div class="cover-header">
        <div class="cover-brand">
          {cover_logo_tag}
          <div>
            <div class="cover-brand-title">Dental-IA</div>
            <div class="cover-brand-sub">SISTEMA OPERATIVO ODONTOLÓGICO & IA</div>
          </div>
        </div>
        <div class="cover-badge-group">
          <span class="cover-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            EDICIÓN EJECUTIVA 2026
          </span>
        </div>
      </div>

      <!-- Cover Body -->
      <div class="cover-body">
        <div class="cover-eyebrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          PROPUESTA TÉCNICA Y ECONÓMICA DE MODERNIZACIÓN
        </div>

        <h1 class="cover-main-title">
          DOSSIER CORPORATIVO<br>
          <span>Transformación Digital, Automatización de Turnos y Gestión Odontológica Inteligente</span>
        </h1>

        <p class="cover-description">
          Plataforma integral en la nube con agentes de Inteligencia Artificial entrenados específicamente para clínicas dentales. Automatización 24/7 de atención y reservas por WhatsApp, erradicación del ausentismo mediante cobro de señas online, odontograma interactivo FDI multicapa y liquidaciones médicas sin fricción administrativa.
        </p>

        <!-- 4 Core Pillars -->
        <div class="cover-pillars-grid">
          <div class="cover-pillar-card">
            <div class="cover-pillar-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="M8 9h8"></path><path d="M8 13h5"></path></svg>
            </div>
            <div class="cover-pillar-title">Atención 24/7 con IA</div>
            <div class="cover-pillar-desc">Asistente en WhatsApp Business que responde consultas y agenda pacientes de inmediato.</div>
          </div>

          <div class="cover-pillar-card">
            <div class="cover-pillar-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><polyline points="9 16 12 19 19 12"></polyline></svg>
            </div>
            <div class="cover-pillar-title">Cero Ausentismo</div>
            <div class="cover-pillar-desc">Recordatorios proactivos y cobro de seña previo que eliminan los turnos caídos.</div>
          </div>

          <div class="cover-pillar-card">
            <div class="cover-pillar-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C7.5 2 4 5.5 4 10c0 3.2 1.8 6 4.5 7.4L8 22l4-2 4 2-.5-4.6C18.2 16 20 13.2 20 10c0-4.5-3.5-8-8-8z"></path><circle cx="9" cy="9" r="1.5"></circle><circle cx="15" cy="9" r="1.5"></circle></svg>
            </div>
            <div class="cover-pillar-title">Odontograma FDI</div>
            <div class="cover-pillar-desc">32 piezas y 5 caras por pieza. Presupuestos y evoluciones visuales en la nube.</div>
          </div>

          <div class="cover-pillar-card">
            <div class="cover-pillar-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <div class="cover-pillar-title">Liquidación en 1 Clic</div>
            <div class="cover-pillar-desc">Cálculo transparente de honorarios médicos, reportes de rentabilidad y cobros.</div>
          </div>
        </div>
      </div>

      <!-- Cover Footer / Ficha Técnica -->
      <div class="cover-footer">
        <div class="cover-meta-grid">
          <div class="cover-meta-item">
            <span class="cover-meta-label">Destinatario</span>
            <span class="cover-meta-value">Dirección Médica & Socios Odontológicos</span>
          </div>
          <div class="cover-meta-item">
            <span class="cover-meta-label">Elaborado por</span>
            <span class="cover-meta-value">Dental-IA Solutions • HealthTech</span>
          </div>
          <div class="cover-meta-item">
            <span class="cover-meta-label">Vigencia & Versión</span>
            <span class="cover-meta-value">Año 2026 • Versión 2.4 Oficial</span>
          </div>
          <div class="cover-meta-item">
            <span class="cover-meta-label">Puesta en Marcha</span>
            <span class="cover-meta-value">Despliegue Asistido en 48 Horas</span>
          </div>
        </div>

        <div class="cover-legal-bar">
          <span>Dental-IA Solutions • Software Médico Certificado • www.dentalia.com.ar</span>
          <span style="font-weight: 700; color: var(--primary);">Documento Institucional de Presentación</span>
        </div>
      </div>
    </section>

'''

# Define Screen CSS for .cover-page
cover_css = '''
    /* ============================================================
       PORTADA / CARÁTULA CORPORATIVA
    ============================================================ */
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 840px;
      background: linear-gradient(155deg, #ffffff 0%, #f8fafc 55%, #eff6ff 100%);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 52px 48px;
      margin-bottom: 50px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 12px 36px -12px rgba(15, 23, 42, 0.08);
    }

    .cover-page::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(90deg, var(--primary) 0%, #38bdf8 50%, var(--accent) 100%);
    }

    .cover-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 1px solid rgba(226, 232, 240, 0.85);
    }

    .cover-brand {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .cover-logo-img {
      height: 52px;
      width: auto;
      max-width: 52px;
      object-fit: contain;
      filter: drop-shadow(0 4px 12px rgba(37, 99, 235, 0.28));
    }

    .cover-brand-title {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: var(--text-dark);
      line-height: 1.1;
    }

    .cover-brand-sub {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: var(--primary);
      margin-top: 3px;
    }

    .cover-badge-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .cover-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #ffffff;
      border: 1px solid var(--primary-border);
      color: var(--primary);
      padding: 7px 15px;
      border-radius: 9999px;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.3px;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.06);
    }

    .cover-badge.dark {
      background: #0f172a;
      color: #ffffff;
      border-color: #0f172a;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);
    }

    .cover-body {
      padding: 36px 0;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }

    .cover-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: var(--primary);
      background: var(--primary-light);
      padding: 6px 14px;
      border-radius: 6px;
      width: fit-content;
      border-left: 3px solid var(--primary);
    }

    .cover-main-title {
      font-size: 38px;
      font-weight: 800;
      line-height: 1.18;
      letter-spacing: -0.8px;
      color: var(--text-dark);
    }

    .cover-main-title span {
      display: block;
      font-size: 24px;
      font-weight: 700;
      color: var(--primary);
      margin-top: 6px;
      line-height: 1.25;
      letter-spacing: -0.3px;
    }

    .cover-description {
      font-size: 15px;
      line-height: 1.6;
      color: var(--text-muted);
      max-width: 820px;
    }

    .cover-pillars-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-top: 8px;
    }

    .cover-pillar-card {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 18px 15px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-shadow: 0 4px 14px -3px rgba(15, 23, 42, 0.04);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .cover-pillar-card:hover {
      transform: translateY(-2px);
      border-color: var(--primary-border);
    }

    .cover-pillar-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--primary-light);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary);
    }

    .cover-pillar-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text-dark);
      line-height: 1.25;
    }

    .cover-pillar-desc {
      font-size: 11.5px;
      color: var(--text-subtle);
      line-height: 1.38;
    }

    .cover-footer {
      border-top: 1px solid var(--border-color);
      padding-top: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .cover-meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 2px 10px -2px rgba(15, 23, 42, 0.03);
    }

    .cover-meta-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .cover-meta-label {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-subtle);
    }

    .cover-meta-value {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-dark);
      line-height: 1.3;
    }

    .cover-legal-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: var(--text-subtle);
    }
'''

# Define Print CSS for .cover-page
cover_print_css = '''
      /* === PÁGINA 1: PORTADA / CARÁTULA CORPORATIVA === */
      .cover-page {
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
        padding: 36px 30px 26px 30px !important;
        margin-bottom: 0 !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 18px !important;
        background: #ffffff !important;
        box-shadow: none !important;
        box-sizing: border-box !important;
      }
      .cover-header {
        padding-bottom: 18px !important;
        border-bottom: 1px solid #e2e8f0 !important;
      }
      .cover-logo-img {
        height: 48px !important;
        max-width: 48px !important;
      }
      .cover-brand-title {
        font-size: 26px !important;
      }
      .cover-brand-sub {
        font-size: 10px !important;
        letter-spacing: 1.3px !important;
      }
      .cover-badge {
        padding: 5px 12px !important;
        font-size: 10.5px !important;
        border: 1px solid #cbd5e1 !important;
      }
      .cover-badge.dark {
        background: #0f172a !important;
        color: #ffffff !important;
        border-color: #0f172a !important;
      }
      .cover-body {
        padding: 24px 0 !important;
        gap: 18px !important;
      }
      .cover-eyebrow {
        font-size: 10px !important;
        padding: 4px 10px !important;
        letter-spacing: 1.2px !important;
      }
      .cover-main-title {
        font-size: 32px !important;
        line-height: 1.15 !important;
        margin-bottom: 0 !important;
      }
      .cover-main-title span {
        font-size: 20px !important;
        margin-top: 4px !important;
        line-height: 1.25 !important;
        color: var(--primary) !important;
        -webkit-text-fill-color: var(--primary) !important;
      }
      .cover-description {
        font-size: 12.5px !important;
        line-height: 1.48 !important;
        max-width: 100% !important;
      }
      .cover-pillars-grid {
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 10px !important;
        margin-top: 4px !important;
      }
      .cover-pillar-card {
        padding: 13px 11px !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 12px !important;
        box-shadow: none !important;
        background: #f8fafc !important;
      }
      .cover-pillar-icon {
        width: 30px !important;
        height: 30px !important;
        border-radius: 8px !important;
        background: #eff6ff !important;
      }
      .cover-pillar-title {
        font-size: 11.5px !important;
        font-weight: 700 !important;
      }
      .cover-pillar-desc {
        font-size: 9.5px !important;
        line-height: 1.3 !important;
        color: #475569 !important;
      }
      .cover-footer {
        padding-top: 16px !important;
        gap: 12px !important;
        border-top: 1px solid #e2e8f0 !important;
      }
      .cover-meta-grid {
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 10px !important;
        padding: 12px 14px !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 10px !important;
        background: #ffffff !important;
      }
      .cover-meta-label {
        font-size: 8.5px !important;
      }
      .cover-meta-value {
        font-size: 11px !important;
      }
      .cover-legal-bar {
        font-size: 10px !important;
      }

      /* === PÁGINA 2: Header + Hero + Punto 1 (Dolores Críticos) === */
'''

# 1. Insert Cover Screen CSS before "/* Print Optimization & Page Setup */"
if '/* Print Optimization & Page Setup */' in content:
    content = content.replace('/* Print Optimization & Page Setup */', cover_css + '\n    /* Print Optimization & Page Setup */')
    print("Added cover screen CSS successfully.")
else:
    print("Could not find print optimization comment in CSS.")

# 2. Update Print CSS to include cover print CSS
old_page_1_print = '      /* === PÁGINA 1: Header + Hero + Punto 1 (Dolores Críticos) === */'
if old_page_1_print in content:
    content = content.replace(old_page_1_print, cover_print_css)
    print("Updated print CSS with cover page.")
else:
    print("Could not find old page 1 print comment.")

# 3. Insert Cover HTML right inside .dossier-container, before <!-- Header -->
old_header_start = '  <div class="dossier-container">\n    \n    <!-- Header -->'
new_header_start = '  <div class="dossier-container">\n' + cover_html + '    <!-- Header -->'
if old_header_start in content:
    content = content.replace(old_header_start, new_header_start)
    print("Inserted Cover HTML before <header>.")
else:
    # Try alternative matching
    alt_start = '<div class="dossier-container">'
    idx = content.find(alt_start)
    if idx != -1:
        hdr_idx = content.find('<header>', idx)
        if hdr_idx != -1:
            content = content[:hdr_idx] + cover_html + '    ' + content[hdr_idx:]
            print("Inserted Cover HTML via fallback index.")
        else:
            print("Could not find <header> tag.")
    else:
        print("Could not find .dossier-container.")

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated HTML file successfully written!")
