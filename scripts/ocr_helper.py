import bidi.algorithm
import bidi
bidi.get_display = bidi.algorithm.get_display
import fitz, easyocr, sys, os

def ocr_pages(pdf_path, page_nums, dpi=200):
    reader = easyocr.Reader(['ko', 'en'], gpu=False, verbose=False)
    doc = fitz.open(pdf_path)
    results = []
    for pn in page_nums:
        if pn >= len(doc): continue
        page = doc[pn]
        pix = page.get_pixmap(dpi=dpi)
        img_path = f'_tmp_ocr_p{pn}.png'
        pix.save(img_path)
        texts = reader.readtext(img_path, detail=0)
        results.append((pn, texts))
        os.remove(img_path)
    doc.close()
    return results

if __name__ == '__main__':
    pdf = sys.argv[1]
    pages = [int(x) for x in sys.argv[2].split(',')]
    out = sys.argv[3] if len(sys.argv) > 3 else 'ocr_output.txt'
    results = ocr_pages(pdf, pages)
    with open(out, 'w', encoding='utf-8') as f:
        for pn, texts in results:
            f.write(f'\n=== Page {pn} ({len(texts)} lines) ===\n')
            for t in texts:
                f.write(t + '\n')
    print(f'Wrote {out}')
