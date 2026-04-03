import os
import django
import PyPDF2

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Document

try:
    doc = Document.objects.last()
    if not doc:
        print("No documents found in DB.")
        exit()
    
    print('Title:', doc.title)
    file_path = doc.file.path
    print('File Path:', file_path)
    
    with open(file_path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        text = reader.pages[0].extract_text()
        with open('output_utf8.txt', 'w', encoding='utf-8') as out_f:
            out_f.write(text[:800])
        print('Saved to output_utf8.txt')
except Exception as e:
    print("Error:", e)
