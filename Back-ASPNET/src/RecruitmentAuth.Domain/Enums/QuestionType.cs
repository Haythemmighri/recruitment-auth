namespace RecruitmentAuth.Domain.Enums;

public enum QuestionType
{
    MCQ_SINGLE,      // Multiple Choice — Single Answer (radio)
    MCQ_MULTI,       // Multiple Choice — Multiple Answers (checkboxes)
    TRUE_FALSE,      // True / False
    FILL_BLANK,      // Fill in the Blank
    SHORT_TEXT,      // Short Text Answer
    LONG_ESSAY,      // Long Essay
    CODE_EDITOR,     // Code Editor (compile & run)
    FILE_UPLOAD,     // File Upload (PDF, ZIP, Word, Images)
    DRAG_DROP,       // Drag and Drop
    MATCHING,        // Matching Questions
    ORDERING,        // Ordering / Sequence Questions
    NUMERICAL,       // Numerical Answer
    AUDIO_RESPONSE,  // Audio Response
    VIDEO_RESPONSE   // Video Response
}
