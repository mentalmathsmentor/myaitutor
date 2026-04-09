import os
import re

file_path = "frontend/src/sections/WorksheetStudio.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# First, find the block starting with `<div className="flex flex-wrap items-start justify-between gap-3">`
# and ending at `</motion.div>` for Step 1.
# It's better to isolate the whole `currentStep === 1` div and replace it.

start_marker = r'\{currentStep === 1 && \(\s*<motion[.]div key="topics".*?className="space-y-6">.*?<div className="flex flex-wrap items-start justify-between gap-3">.*?<div className="flex items-center gap-3">.*?<div className="flex h-8 w-8 items-center justify-center rounded-full bg-mait-cyan/15 text-sm font-bold text-mait-cyan">2</div>.*?<div>.*?<h2 className="text-xl font-bold text-white">Topics and dot-points</h2>.*?<p className="text-sm text-white/50">The original syllabus hierarchy and prerequisite merge are restored here.</p>.*?</div>.*?</div>'

# Let's cleanly replace the A/B toggle block.
text = re.sub(
    r'<div className="flex rounded-2xl border border-white/10 bg-white/5 p-1">\s*<button\s*type="button"\s*onClick=\{.*?setMode\(\'A\'\)\}.*?>\s*Official syllabus\s*</button>\s*<button\s*type="button"\s*onClick=\{.*?setMode\(\'B\'\)\}.*?>\s*Manual entry\s*</button>\s*</div>',
    '',
    text,
    flags=re.DOTALL
)

# And replace the `{mode === 'B' || selectedSubject === 'Other' ? ( <div className="space-y-4"> ... MathInput ... </div> ) : ( <div className="space-y-6"> <div className='overflow-hidden ...'> `
# with our combined stacked structure.
# Instead of complex regex for the huge JSX graph, let's locate the mathinput and cut it out from the "mode == B" part and append it to the end.

# Actually, the quickest way is to just do standard string replacements:
part_1 = "{mode === 'B' || selectedSubject === 'Other' ? ("
new_part_1 = ""

# Delete this block:
part_2 = """                    <div className="space-y-4">
                      {(selectedSubject === 'Other' || MANUAL_ONLY_SUBJECTS.has(selectedSubject)) && (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/65">
                          {selectedSubject === 'Other'
                            ? 'This subject uses manual entry only. Add your own topic brief or question instructions below.'
                            : `${selectedSubject} is currently manual-entry only. The selected subject will still be injected into the final worksheet instructions.`}
                        </div>
                      )}
                      <MathInput
                        value={rawQuestions}
                        onChange={setRawQuestions}
                        placeholder={`Paste the exact ${displaySubject} brief, topic list, or teacher instructions here...`}
                        rows={14}
                        className={`${isShaking ? 'animate-[shake_0.5s_cubic-bezier(.36,.07,.19,.97)_both]' : ''}`}
                        inputClassName="min-h-[360px] w-full rounded-3xl border border-white/10 bg-black/25 p-4 pr-24 text-sm text-white outline-none transition focus:border-mait-cyan/40"
                      />
                    </div>
                  ) : (
                    <div className="space-y-6">
"""
new_part_2 = """                  <div className="space-y-6">
                    {(selectedSubject === 'Other' || MANUAL_ONLY_SUBJECTS.has(selectedSubject)) ? (
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/65">
                        {selectedSubject === 'Other'
                          ? 'This subject uses manual entry only. Add your own topic brief or question instructions below.'
                          : `${selectedSubject} is currently manual-entry only. The selected subject will still be injected into the final worksheet instructions.`}
                      </div>
                    ) : (
"""

if part_2 in text:
    text = text.replace(part_2, new_part_2, 1)

# At the end of the syllabus tree, there is `</div> </div>` followed by `</motion.div> )} {currentStep === 2 && (`
part_3 = """                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {currentStep === 2 && ("""

new_part_3 = """                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <label className="text-xs uppercase tracking-[0.25em] text-white/45">Additional Brief / Custom Questions</label>
                      <MathInput
                        value={rawQuestions}
                        onChange={setRawQuestions}
                        placeholder={selectedSubject === 'Other' || MANUAL_ONLY_SUBJECTS.has(selectedSubject) ? `Paste the exact ${displaySubject} brief, topic list, or teacher instructions here...` : "Add specific textbook questions or teacher notes to include alongside the syllabus points (optional)..."}
                        rows={MANUAL_ONLY_SUBJECTS.has(selectedSubject) || selectedSubject === 'Other' ? 14 : 6}
                        className={`${isShaking ? 'animate-[shake_0.5s_cubic-bezier(.36,.07,.19,.97)_both]' : ''}`}
                        inputClassName={`w-full rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white outline-none transition focus:border-mait-cyan/40 ${MANUAL_ONLY_SUBJECTS.has(selectedSubject) || selectedSubject === 'Other' ? 'min-h-[360px] pb-10 pr-24' : 'min-h-[120px] pb-10 pr-24'}`}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && ("""

if part_3 in text:
    text = text.replace(part_3, new_part_3, 1)

text = text.replace("{mode === 'B' || selectedSubject === 'Other' ? (", "")


with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

print(f"part_2 replaced: {part_2 not in text}")
print(f"part_3 replaced: {part_3 not in text}")
