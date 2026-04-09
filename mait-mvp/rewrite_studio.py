import re

with open("frontend/src/sections/WorksheetStudio.tsx", "r") as f:
    content = f.read()

# 1. Remove FeedbackBox from header
content = re.sub(
    r'<div className="flex items-center">\s*<FeedbackBox />\s*</div>',
    '',
    content
)

# 2. Add FeedbackBox under FAQ glass-card-strong
# Find the end of the FAQ section. It ends with a </div> followed by </div> </div> </div> representing the end of the WorksheetStudio
# Wait, it's easier to just inject it right after the FAQ card.
# The FAQ card: <div className="glass-card-strong rounded-3xl p-6"> ... FAQ content ... </div>
faq_regex = r'(<h3 className="text-xl font-semibold text-white">FAQ and Tips &amp; Tricks</h3>.*?</div>\s*</div>)'
# We know the FAQ card ends before the final closing tags. Wait, FAQ has <ul><li> etc...
# Let's just find "FAQ and Tips &amp; Tricks" and replace the closing </div> of that section?
