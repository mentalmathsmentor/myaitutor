import docx
import re
import json
import os
from pathlib import Path

# Paths
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
SYLLABI_DIR = PROJECT_ROOT / "Syllabi"
CORPUS_DIR = PROJECT_ROOT / "corpus"

# Make sure corpus directory exists
os.makedirs(CORPUS_DIR, exist_ok=True)

files_config = [
    {
        "filepath": SYLLABI_DIR / "MADV - Y11-12 2024 Syllabus" / "NESA - Y11-12 MADV 2024 Syllabus.docx",
        "subject": "Mathematics Advanced",
        "code_prefix": "ADV"
    },
    {
        "filepath": SYLLABI_DIR / "MSTD2 - Y11-12 2024 Syllabus" / "NESA - mathematics_standard_11_12_2024 (S6).docx",
        "subject": "Mathematics Standard 1",
        "code_prefix": "STD1"
    },
    {
        "filepath": SYLLABI_DIR / "MSTD2 - Y11-12 2024 Syllabus" / "NESA - mathematics_standard_11_12_2024 (S6).docx",
        "subject": "Mathematics Standard 2",
        "code_prefix": "STD2"
    },
    {
        "filepath": SYLLABI_DIR / "NESA - mathematics_k_10_2022 (S5)" / "NESA - mathematics_k_10_2022 (S5).docx",
        "subject": "Stage 5",
        "code_prefix": "S5"
    },
    {
        "filepath": SYLLABI_DIR / "MATHS Year 7 and 8 syllabus" / "NESA - mathematics (Stage4) Year 7 syllabus.docx",
        "subject": "Stage 4",
        "code_prefix": "S4"
    }
]

def parse_docx(filepath, subject_name, prefix):
    print(f"Parsing {subject_name} from {filepath.name}...")
    doc = docx.Document(filepath)
    
    hierarchy = {
        "Subject": subject_name,
        "Modules": []
    }
    
    current_module = None
    current_topic = None
    current_section = None
    current_subtopic = None
    
    outcome_code_pattern = re.compile(r'([A-Z]+-[0-9]{2}-[0-9]{2}|[A-Z]+-WM-[0-9]{2})')
    
    subtopic_idx = 0
    point_idx = 0
    
    for p in doc.paragraphs:
        style = p.style.name
        text = p.text.strip()
        if not text:
            continue
            
        # Module detection
        if style == "Heading 2" and ("Outcomes and content for" in text or "Year 11" in text or "Year 12" in text or "Stage 5" in text or "Stage 4" in text):
            module_name = text.replace("Outcomes and content for", "").strip()
            
            # Prevent cross-contamination between Standard 1 and Standard 2
            if subject_name == "Mathematics Standard 1":
                # Standard 1 only parses Year 12 Standard 1
                if "Standard 1" not in text:
                    current_module = None
                    continue
            elif subject_name == "Mathematics Standard 2":
                # Standard 2 parses Year 11 and Year 12 Standard 2
                if "Standard 1" in text:
                    current_module = None
                    continue
            
            current_module = {
                "Module": module_name,
                "Topics": []
            }
            hierarchy["Modules"].append(current_module)
            current_topic = None
            current_subtopic = None
            
        elif current_module:
            # Topic detection
            if style == "Heading 3":
                # Stop parsing if we hit administrative/assessment sections
                if text.lower() in ["assessment", "course standards", "school-based assessment", "hsc examinations", "school-based assessment and reporting"]:
                    current_module = None
                    continue
                # Do not include working mathematically / outcome codes as distinct topics
                if "working mathematically" in text.lower() or "mao-wm-01" in text.lower() or "wm" in text.lower():
                    continue
                current_topic = {
                    "Topic": text,
                    "Outcomes": [],
                    "Subtopics": []
                }
                current_module["Topics"].append(current_topic)
                current_section = None
                current_subtopic = None
                subtopic_idx = 0
                
            elif current_topic:
                # Section detection (Outcomes or Content)
                if style == "Heading 4":
                    if "outcomes" in text.lower():
                        current_section = "Outcomes"
                    elif "content" in text.lower():
                        current_section = "Content"
                    else:
                        current_section = None
                    current_subtopic = None
                    
                # Parse Outcomes
                elif current_section == "Outcomes":
                    codes = outcome_code_pattern.findall(text)
                    if codes:
                        desc = text
                        for code in codes:
                            desc = desc.replace(code, "").strip()
                        current_topic["Outcomes"].append({
                            "codes": codes,
                            "description": desc
                        })
                        
                # Parse Content
                elif current_section == "Content":
                    if style == "Heading 5":
                        if "working mathematically" in text.lower() or "mao-wm-01" in text.lower():
                            continue
                        subtopic_idx += 1
                        point_idx = 0
                        current_subtopic = {
                            "SubtopicName": text,
                            "SubtopicIndex": subtopic_idx,
                            "ContentPoints": []
                        }
                        current_topic["Subtopics"].append(current_subtopic)
                        
                    elif style == "List Paragraph" or text.startswith("-") or p.paragraph_format.left_indent is not None:
                        clean_text = text.lstrip("-•* ").strip()
                        if not clean_text:
                            continue
                            
                        # If a list item is found but no subtopic is created yet, create an implicit subtopic
                        if not current_subtopic:
                            subtopic_idx += 1
                            point_idx = 0
                            current_subtopic = {
                                "SubtopicName": current_topic["Topic"],
                                "SubtopicIndex": subtopic_idx,
                                "ContentPoints": []
                            }
                            current_topic["Subtopics"].append(current_subtopic)
                            
                        point_idx += 1
                        
                        # Generate content code
                        topic_words = current_topic["Topic"].split()
                        topic_acronym = "".join([w[0].upper() for w in topic_words if w[0].isalpha()])[:3]
                        content_code = f"{prefix}-{topic_acronym}.{subtopic_idx}.{point_idx}"
                        
                        current_subtopic["ContentPoints"].append({
                            "content_code": content_code,
                            "text": clean_text
                        })
                        
    return hierarchy

def main():
    syllabus_data = {}
    for cfg in files_config:
        if not cfg["filepath"].exists():
            print(f"Error: file not found: {cfg['filepath']}")
            continue
            
        parsed = parse_docx(cfg["filepath"], cfg["subject"], cfg["code_prefix"])
        syllabus_data[cfg["subject"]] = parsed
        
    out_path = CORPUS_DIR / "syllabus.json"
    with open(out_path, "w") as f:
        json.dump(syllabus_data, f, indent=2)
        
    print(f"Saved syllabus hierarchy to {out_path}")
    
if __name__ == "__main__":
    main()
