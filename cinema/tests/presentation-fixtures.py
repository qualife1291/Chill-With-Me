"""Owned deterministic fixtures; no downloaded documents or embedded scripts."""
from pathlib import Path
import io
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter

root = Path('/tmp/cinema-presentation')
root.mkdir(exist_ok=True)
buffer = io.BytesIO()
c = canvas.Canvas(buffer, pagesize=(960, 540))
for page, color in enumerate(['#264c40', '#24435f', '#754e27'], 1):
    c.setFillColor(color); c.rect(0, 0, 960, 540, fill=1, stroke=0)
    c.setFillColor('#fff5df'); c.setFont('Helvetica-Bold', 48)
    c.drawString(70, 280, f'Cinema Slide {page}')
    c.setFont('Helvetica', 22); c.drawString(70, 220, 'Shared presentation - original QA fixture')
    c.showPage()
c.save()
(root/'slides.pdf').write_bytes(buffer.getvalue())
writer = PdfWriter()
writer.append(PdfReader(io.BytesIO(buffer.getvalue())))
writer.encrypt('qa-only-password')
with (root/'locked.pdf').open('wb') as f: writer.write(f)
writer = PdfWriter()
for _ in range(201): writer.add_blank_page(width=960, height=540)
with (root/'too-many.pdf').open('wb') as f: writer.write(f)
(root/'broken.pdf').write_bytes(b'%PDF-1.7\nthis is not a valid PDF')

from PIL import Image
image = Image.new('RGB', (320, 180), '#356d52')
for extension, format in [('png','PNG'),('jpg','JPEG'),('webp','WEBP')]:
    image.save(root / ('slide.' + extension), format=format)
