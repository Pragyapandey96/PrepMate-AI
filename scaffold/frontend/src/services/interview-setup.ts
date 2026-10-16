export type InterviewSetupDraft = {
  jobDescriptionText: string;
  jobTitle?: string;
  resumeFormat?: 'PDF' | 'DOCX';
  interviewType?: 'HR' | 'Technical' | 'Behavioral' | 'Mixed';
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  questionsPlanned?: 5 | 10 | 15 | 20;
};

const draftKey = 'pm.interviewSetupDraft';

export function readInterviewSetupDraft(): InterviewSetupDraft {
  const stored = sessionStorage.getItem(draftKey);
  if (!stored) return { jobDescriptionText: '' };

  try {
    const draft: unknown = JSON.parse(stored);
    if (typeof draft === 'object' && draft !== null) {
      const values = draft as Record<string, unknown>;
      if (typeof values.jobDescriptionText !== 'string') return { jobDescriptionText: '' };
      return {
        jobDescriptionText: values.jobDescriptionText,
        ...(typeof values.jobTitle === 'string' ? { jobTitle: values.jobTitle } : {}),
        ...(values.resumeFormat === 'PDF' || values.resumeFormat === 'DOCX' ? { resumeFormat: values.resumeFormat } : {}),
        ...(values.interviewType === 'HR' || values.interviewType === 'Technical' || values.interviewType === 'Behavioral' || values.interviewType === 'Mixed' ? { interviewType: values.interviewType } : {}),
        ...(values.difficulty === 'Easy' || values.difficulty === 'Medium' || values.difficulty === 'Hard' ? { difficulty: values.difficulty } : {}),
        ...(values.questionsPlanned === 5 || values.questionsPlanned === 10 || values.questionsPlanned === 15 || values.questionsPlanned === 20 ? { questionsPlanned: values.questionsPlanned } : {}),
      };
    }
  } catch {
    sessionStorage.removeItem(draftKey);
  }

  return { jobDescriptionText: '' };
}

export function saveInterviewSetupDraft(update: Partial<InterviewSetupDraft>): void {
  sessionStorage.setItem(draftKey, JSON.stringify({ ...readInterviewSetupDraft(), ...update }));
}

export function clearInterviewSetupDraft(): void {
  sessionStorage.removeItem(draftKey);
}
