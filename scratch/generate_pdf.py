import os
from playwright.sync_api import sync_playwright
import fitz  # PyMuPDF

html_path = os.path.abspath('/Users/sebamaza/Desktop/PROYECTOS DEV/Consultorio Alvarez/DOSSIER_PRESENTACION_DENTAL_IA.html')
pdf_path = os.path.abspath('/Users/sebamaza/Desktop/PROYECTOS DEV/Consultorio Alvarez/DOSSIER_PRESENTACION_DENTAL_IA.pdf')
output_dir = os.path.abspath('/Users/sebamaza/Desktop/PROYECTOS DEV/Consultorio Alvarez/scratch/pdf_pages')
os.makedirs(output_dir, exist_ok=True)

print("Launching browser...")
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto(f"file://{html_path}", wait_until="networkidle")
    
    # Emulate print media so @media print styles are active
    page.emulate_media(media="print")
    
    # Generate PDF
    print(f"Generating PDF at {pdf_path}...")
    page.pdf(
        path=pdf_path,
        format="A4",
        print_background=True,
        margin={"top": "0mm", "bottom": "0mm", "left": "0mm", "right": "0mm"},
        prefer_css_page_size=True
    )
    browser.close()

print("PDF generated successfully. Inspecting pages with PyMuPDF...")
doc = fitz.open(pdf_path)
print(f"Total pages: {len(doc)}")

for i, page in enumerate(doc):
    pix = page.get_pixmap(dpi=150)
    img_path = os.path.join(output_dir, f"page_{i+1}.png")
    pix.save(img_path)
    print(f"Saved page {i+1} as {img_path}")

print("Done!")
