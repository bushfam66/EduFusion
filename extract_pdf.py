import PyPDF2

def extract_text_from_pdf(pdf_path):
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ''
        for page in reader.pages:
            text += page.extract_text() + '\n'
        return text

if __name__ == "__main__":
    pdf_path = r"c:\Users\Administrator\Desktop\EduFusion\GRADE 10MATH.pdf"
    extracted_text = extract_text_from_pdf(pdf_path)
    print(extracted_text)