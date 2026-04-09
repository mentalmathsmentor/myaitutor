import re

with open("frontend/src/sections/WorksheetStudio.tsx", "r") as f:
    content = f.read()

# 1. Remove FeedbackBox from header
content = re.sub(
    r'<div className="flex items-center">\s*<FeedbackBox />\s*</div>',
    '',
    content
)

# 2. Add FeedbackBox below FAQ list
faq_end = r'''</details>
            </div>
          </div>'''
content = content.replace(
    faq_end,
    faq_end + '\n\n          <div className="flex justify-center mt-6">\n            <FeedbackBox />\n          </div>'
)

with open("frontend/src/sections/WorksheetStudio.tsx", "w") as f:
    f.write(content)
print("Done with FeedbackBox")
