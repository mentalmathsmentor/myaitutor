
import pypdf
import sys
import os
import glob

def extract_text(pdf_path, txt_path):
    try:
        reader = pypdf.PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Successfully extracted text to {txt_path}")
    except Exception as e:
        print(f"Error extracting text from {pdf_path}: {e}")
        # Don't exit, just continue to next file

if __name__ == "__main__":
    data_dir = "backend/data"
    
    if not os.path.exists(data_dir):
        print(f"Directory not found: {data_dir}")
        sys.exit(1)
    
    # Get all PDF files
    pdf_files = glob.glob(os.path.join(data_dir, "*.pdf"))
    
    if not pdf_files:
        print(f"No PDF files found in {data_dir}")
        sys.exit(0)
        
    print(f"Found {len(pdf_files)} PDF files. Starting extraction...")
    
    for pdf_path in pdf_files:
        # Create txt path by replacing extension
        txt_path = os.path.splitext(pdf_path)[0] + ".txt"
        
        print(f"Processing: {os.path.basename(pdf_path)}")
        extract_text(pdf_path, txt_path)
        
    print("Batch extraction complete.")
