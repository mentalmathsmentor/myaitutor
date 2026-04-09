import re

with open("frontend/src/sections/WorksheetStudio.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Replace the start of the FAQ card
start_target = '<div className="glass-card-strong rounded-3xl p-6">\n            <div className="mb-6">\n              <h3 className="text-xl font-semibold text-white">FAQ and Tips &amp; Tricks</h3>'
start_replacement = '<div className="flex flex-col gap-8">\n          <div className="glass-card-strong rounded-3xl p-6">\n            <div className="mb-6">\n              <h3 className="text-xl font-semibold text-white">FAQ and Tips &amp; Tricks</h3>'

text = text.replace(start_target, start_replacement)

# Replace the Feedbackbox wrapper
end_target = '''          </div>

          <div className="mt-8">
            <FeedbackBox />
          </div>
        </div>'''

end_replacement = '''          </div>

          <FeedbackBox />
        </div>
        </div>'''

# wait, I need to know exactly how the file trails off.
# "end_target" in my mind:
expected_old = '''              </details>
            </div>
          </div>

          <div className="mt-8">
            <FeedbackBox />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}'''

expected_new = '''              </details>
            </div>
          </div>

          <FeedbackBox />
        </div>
        </div>
      </div>
      </div>
    </div>
  );
}'''

text = text.replace(expected_old, expected_new)

with open("frontend/src/sections/WorksheetStudio.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print(f"start replaced? {start_target not in text}")
print(f"end replaced? {expected_old not in text}")
