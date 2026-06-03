import type { StudyState } from "../types/study";

const API_URL = "/api/study-state";

export async function loadStudyStateFromJson(): Promise<StudyState> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error("Failed to load study state");
  }

  return response.json();
}

export async function saveStudyStateToJson(state: StudyState): Promise<StudyState> {
  const response = await fetch(API_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(state),
  });

  if (!response.ok) {
    throw new Error("Failed to save study state");
  }

  const result = await response.json();

  return result.state;
}
