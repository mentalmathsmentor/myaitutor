from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
from datetime import datetime

class FatigueStatus(str, Enum):
    FRESH = "FRESH"
    WEARY = "WEARY"
    LOCKOUT = "LOCKOUT"

class BloomsLevel(str, Enum):
    REMEMBER = "Remember"
    UNDERSTAND = "Understand"
    APPLY = "Apply"
    ANALYZE = "Analyze"
    EVALUATE = "Evaluate"
    CREATE = "Create"

class DocumentKind(str, Enum):
    ARTIFACT = "artifact"
    STUDY = "study"

class DocumentSource(str, Enum):
    WORKSHEET_GENERATOR = "worksheet_generator"
    CHAT = "chat"
    MANUAL = "manual"

class FragmentKind(str, Enum):
    PREAMBLE = "preamble"
    HEADER = "header"
    QUESTION = "question"
    FOOTER = "footer"
    TEXT_BLOCK = "text_block"

class FatigueMetric(BaseModel):
    current_score: int = Field(default=0, ge=0, le=100)
    status: FatigueStatus = Field(default=FatigueStatus.FRESH)
    last_interaction_timestamp: datetime = Field(default_factory=datetime.now)

    class Config:
        # Allow datetime serialization to ISO format for JSON
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class PedagogicalState(BaseModel):
    current_topic: Optional[str] = None
    sub_topic: Optional[str] = None
    blooms_level: BloomsLevel = Field(default=BloomsLevel.APPLY)
    mastery_score: float = Field(default=0.0, ge=0.0, le=1.0)

class SessionStats(BaseModel):
    topics_covered: List[str] = Field(default_factory=list)
    interactions_count: int = Field(default=0)

class KeystrokeMetrics(BaseModel):
    """Keystroke psychometric data for a single typing session"""
    wpm: float = Field(default=0, description="Words per minute")
    avg_dwell_time_ms: float = Field(default=0, description="Average key press duration in ms")
    avg_flight_time_ms: float = Field(default=0, description="Average time between keystrokes in ms")
    avg_thinking_time_ms: float = Field(default=0, description="Average pause duration (>2s) in ms")
    total_thinking_time_ms: float = Field(default=0, description="Total thinking time in session")
    error_corrections: int = Field(default=0, description="Number of backspace/delete presses")
    error_rate: float = Field(default=0, description="Error corrections per 100 characters")
    characters_typed: int = Field(default=0, description="Total characters typed")
    session_duration_ms: int = Field(default=0, description="Duration of typing session")
    rhythm_variance: float = Field(default=0, description="Variance in typing rhythm")
    keystroke_count: int = Field(default=0, description="Total keystrokes recorded")
    timestamp: datetime = Field(default_factory=datetime.now)

class KeystrokeProfile(BaseModel):
    """Aggregated keystroke psychometric profile for a student"""
    total_sessions: int = Field(default=0)
    average_wpm: float = Field(default=0)
    average_dwell_time_ms: float = Field(default=0)
    average_flight_time_ms: float = Field(default=0)
    average_thinking_time_ms: float = Field(default=0)
    total_characters_typed: int = Field(default=0)
    total_error_corrections: int = Field(default=0)
    message_frequency_per_minute: float = Field(default=0)
    typing_rhythm_variance: float = Field(default=0)
    session_history: List[KeystrokeMetrics] = Field(default_factory=list)
    last_updated: Optional[datetime] = None

    # Behavioral analysis
    typing_speed_category: str = Field(default="unknown", description="fast/moderate/slow/very_slow")
    consistency_category: str = Field(default="unknown", description="very_consistent/consistent/moderate/variable")
    thinking_pattern: str = Field(default="unknown", description="deliberate/thoughtful/moderate/quick")
    error_tendency: str = Field(default="unknown", description="accurate/normal/error_prone/high_error")

class KeystrokeSubmission(BaseModel):
    """Request model for submitting keystroke metrics"""
    student_id: str
    metrics: KeystrokeMetrics

class StudentContext(BaseModel):
    student_id: str
    fatigue_metric: FatigueMetric = Field(default_factory=FatigueMetric)
    pedagogical_state: PedagogicalState = Field(default_factory=PedagogicalState)
    session_stats: SessionStats = Field(default_factory=SessionStats)
    keystroke_profile: KeystrokeProfile = Field(default_factory=KeystrokeProfile)

    # Track message history for intensity calculation
    message_timestamps: List[datetime] = Field(default_factory=list)

class Document(BaseModel):
    id: str
    owner_student_id: str
    title: str
    kind: DocumentKind
    source: DocumentSource
    current_revision_id: Optional[str] = None
    metadata_json: str = "{}"
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class ArtifactDocumentFragment(BaseModel):
    id: str
    document_id: str
    order_index: int
    kind: FragmentKind
    content_latex: str
    metadata_json: str = "{}"
    version_id: str
