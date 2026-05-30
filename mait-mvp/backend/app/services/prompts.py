INTENT_TEMPLATES = {
    "activity": """
    Class Context: Year {year_level} | Subject: {subject} | Target Level: {ability_tier}.
    Retrieved Syllabus Anchors: {rag_chunks}
    
    Task: Design a highly interactive, pedagogically sound classroom activity grounded directly in this topic. Prioritize physical movement, board games, table-group challenges, or students writing questions for peer solving. Do not generate generic filler; ensure the mechanics force students to apply the core mathematical concept.
    """
}
