import type { AppData } from "../../App";
import { createId } from "../utils/idGenerator";

function now() {
  return new Date().toISOString();
}

function futureDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function demoDate(daysFromToday: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

export function isAppDataEmpty(data: AppData) {
  return (
    data.movies.length === 0 &&
    data.workouts.exercises.length === 0 &&
    data.workouts.plans.length === 0 &&
    data.workouts.sessions.length === 0 &&
    data.todos.items.length === 0 &&
    data.finance.transactions.length === 0 &&
    data.finance.savingsGoals.length === 0 &&
    data.finance.tags.length === 0 &&
    data.habits.habits.length === 0 &&
    data.habits.logs.length === 0 &&
    data.calendarEvents.length === 0 &&
    data.journalEntries.length === 0 &&
    data.notes.length === 0 &&
    data.projects.length === 0 &&
    data.contacts.length === 0 &&
    data.health.entries.length === 0 &&
    data.health.metrics.length === 0 &&
    data.goals.length === 0 &&
    data.inventory.length === 0
  );
}

export function isWorkoutDataEmpty(workouts: AppData["workouts"] | undefined) {
  return (
    !workouts ||
    ((workouts.exercises ?? []).length === 0 &&
      (workouts.exerciseGroups ?? []).length === 0 &&
      (workouts.plans ?? []).length === 0 &&
      (workouts.sessions ?? []).length === 0 &&
      !workouts.startingPosition &&
      (workouts.progressRecords ?? []).length === 0 &&
      (workouts.nutritionEntries ?? []).length === 0)
  );
}

export function createDemoWorkoutsData(): AppData["workouts"] {
  return createDemoData().workouts;
}

export function fillWorkoutDemoGaps(workouts: AppData["workouts"] | undefined): { workouts: AppData["workouts"]; didFill: boolean } {
  const demo = createDemoWorkoutsData();
  if (isWorkoutDataEmpty(workouts) || isLegacyWorkoutDemoData(workouts)) {
    return { workouts: demo, didFill: true };
  }

  const current = workouts as AppData["workouts"];
  const shouldAddTrainingCatalog =
    (current.exercises ?? []).length === 0 || (current.plans ?? []).length === 0 || (current.sessions ?? []).length === 0;
  const didFill =
    shouldAddTrainingCatalog ||
    !current.startingPosition ||
    (current.progressRecords ?? []).length === 0 ||
    (current.nutritionEntries ?? []).length === 0;

  if (!didFill) {
    return { workouts: current, didFill: false };
  }

  return {
    workouts: {
      exerciseGroups: shouldAddTrainingCatalog
        ? [...(current.exerciseGroups ?? []), ...demo.exerciseGroups]
        : (current.exerciseGroups ?? []),
      exercises: shouldAddTrainingCatalog ? [...(current.exercises ?? []), ...demo.exercises] : (current.exercises ?? []),
      plans: shouldAddTrainingCatalog ? [...(current.plans ?? []), ...demo.plans] : (current.plans ?? []),
      sessions: (current.sessions ?? []).length === 0 ? demo.sessions : (current.sessions ?? []),
      startingPosition: current.startingPosition ?? demo.startingPosition,
      progressRecords: (current.progressRecords ?? []).length === 0 ? demo.progressRecords : (current.progressRecords ?? []),
      nutritionEntries: (current.nutritionEntries ?? []).length === 0 ? demo.nutritionEntries : (current.nutritionEntries ?? []),
    },
    didFill: true,
  };
}

function isLegacyWorkoutDemoData(workouts: AppData["workouts"] | undefined) {
  if (!workouts) {
    return false;
  }
  const exerciseNames = (workouts.exercises ?? []).map((exercise) => exercise.name).sort().join("|");
  const planTitles = (workouts.plans ?? []).map((plan) => plan.title).sort().join("|");
  return (
    exerciseNames === "Rows|Squat" &&
    planTitles === "Strength Base" &&
    (workouts.sessions ?? []).length === 0 &&
    !workouts.startingPosition &&
    (workouts.progressRecords ?? []).length === 0 &&
    (workouts.nutritionEntries ?? []).length === 0
  );
}

export function createDemoData(): AppData {
  const createdAt = now();
  const workoutPlanId = createId("plan");
  const conditioningPlanId = createId("plan");
  const strengthGroupId = createId("exercise-group");
  const coreGroupId = createId("exercise-group");
  const conditioningGroupId = createId("exercise-group");
  const squatId = createId("exercise");
  const rowsId = createId("exercise");
  const deadliftId = createId("exercise");
  const pressId = createId("exercise");
  const plankId = createId("exercise");
  const runId = createId("exercise");
  const habitId = createId("habit");
  return {
    movies: [
      {
        id: createId("movie"),
        title: "Arrival",
        originalTitle: "Arrival",
        year: 2016,
        status: "watched",
        rating: 9,
        posterPath: "",
        genres: ["Sci-Fi", "Drama"],
        notes: "Language, memory, and patience.",
        watchedAt: createdAt,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: createId("movie"),
        title: "The Fall",
        originalTitle: "The Fall",
        year: 2006,
        status: "planned",
        rating: 0,
        posterPath: "",
        genres: ["Fantasy"],
        notes: "Watch on a quiet evening.",
        watchedAt: null,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    workouts: {
      exerciseGroups: [
        {
          id: strengthGroupId,
          title: "Strength",
          description: "Compound lifts and main strength work.",
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: coreGroupId,
          title: "Core",
          description: "Stability, posture, and trunk control.",
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: conditioningGroupId,
          title: "Conditioning",
          description: "Cardio and work capacity sessions.",
          createdAt,
          updatedAt: createdAt,
        },
      ],
      exercises: [
        {
          id: squatId,
          name: "Squat",
          description: "Controlled tempo, stable torso, knees follow toes.",
          groupId: strengthGroupId,
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: rowsId,
          name: "Rows",
          description: "Pull with the back, keep the movement smooth.",
          groupId: strengthGroupId,
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: deadliftId,
          name: "Deadlift",
          description: "Brace first, push the floor away, finish tall.",
          groupId: strengthGroupId,
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: pressId,
          name: "Overhead Press",
          description: "Tight glutes and ribs down before each rep.",
          groupId: strengthGroupId,
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: plankId,
          name: "Front Plank",
          description: "Long spine, steady breathing, no hip sag.",
          groupId: coreGroupId,
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: runId,
          name: "Zone 2 Run",
          description: "Easy conversational pace for aerobic base.",
          groupId: conditioningGroupId,
          createdAt,
          updatedAt: createdAt,
        },
      ],
      plans: [
        {
          id: workoutPlanId,
          title: "Strength Base",
          description: "Simple repeatable full body work.",
          exerciseIds: [squatId, rowsId, deadliftId, pressId, plankId],
          daysOfWeek: [1, 3, 5],
          days: [
            {
              id: createId("plan-day"),
              dayOfWeek: 1,
              exerciseIds: [squatId, rowsId, plankId],
            },
            {
              id: createId("plan-day"),
              dayOfWeek: 3,
              exerciseIds: [deadliftId, pressId, plankId],
            },
            {
              id: createId("plan-day"),
              dayOfWeek: 5,
              exerciseIds: [squatId, rowsId, deadliftId],
            },
          ],
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: conditioningPlanId,
          title: "Conditioning Reset",
          description: "Light cardio and core work for recovery days.",
          exerciseIds: [runId, plankId],
          daysOfWeek: [2, 6],
          days: [
            {
              id: createId("plan-day"),
              dayOfWeek: 2,
              exerciseIds: [runId, plankId],
            },
            {
              id: createId("plan-day"),
              dayOfWeek: 6,
              exerciseIds: [runId],
            },
          ],
          createdAt,
          updatedAt: createdAt,
        },
      ],
      sessions: [
        {
          id: createId("session"),
          planId: workoutPlanId,
          planTitle: "Strength Base",
          date: demoDate(-1),
          time: "18:30",
          dayOfWeek: 3,
          exercises: [
            {
              id: createId("result-exercise"),
              exerciseId: deadliftId,
              name: "Deadlift",
              status: "completed",
              sets: 4,
              reps: 5,
              weight: 110,
              notes: "Last set felt strong.",
            },
            {
              id: createId("result-exercise"),
              exerciseId: pressId,
              name: "Overhead Press",
              status: "completed",
              sets: 3,
              reps: 6,
              weight: 42.5,
              notes: "Keep ribs down.",
            },
            {
              id: createId("result-exercise"),
              exerciseId: plankId,
              name: "Front Plank",
              status: "completed",
              sets: 3,
              reps: 45,
              weight: 0,
              notes: "45 seconds per set.",
            },
          ],
          completedExercises: [
            {
              id: createId("result-exercise"),
              exerciseId: deadliftId,
              name: "Deadlift",
              status: "completed",
              sets: 4,
              reps: 5,
              weight: 110,
              notes: "Last set felt strong.",
            },
            {
              id: createId("result-exercise"),
              exerciseId: pressId,
              name: "Overhead Press",
              status: "completed",
              sets: 3,
              reps: 6,
              weight: 42.5,
              notes: "Keep ribs down.",
            },
            {
              id: createId("result-exercise"),
              exerciseId: plankId,
              name: "Front Plank",
              status: "completed",
              sets: 3,
              reps: 45,
              weight: 0,
              notes: "45 seconds per set.",
            },
          ],
          mood: 8,
          energyLevel: 7,
          notes: "Good session after work. Add 2.5 kg to presses if recovery is fine.",
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: createId("session"),
          planId: conditioningPlanId,
          planTitle: "Conditioning Reset",
          date: demoDate(-3),
          time: "07:40",
          dayOfWeek: 1,
          exercises: [
            {
              id: createId("result-exercise"),
              exerciseId: runId,
              name: "Zone 2 Run",
              status: "completed",
              sets: 1,
              reps: 30,
              weight: 0,
              notes: "30 minutes, steady breathing.",
            },
            {
              id: createId("result-exercise"),
              exerciseId: plankId,
              name: "Front Plank",
              status: "skipped",
              sets: 0,
              reps: 0,
              weight: 0,
              notes: "Skipped because of time.",
            },
          ],
          completedExercises: [
            {
              id: createId("result-exercise"),
              exerciseId: runId,
              name: "Zone 2 Run",
              status: "completed",
              sets: 1,
              reps: 30,
              weight: 0,
              notes: "30 minutes, steady breathing.",
            },
          ],
          mood: 7,
          energyLevel: 6,
          notes: "Light day. Useful to test completed and skipped chips.",
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: createId("session"),
          planId: workoutPlanId,
          planTitle: "Strength Base",
          date: demoDate(-7),
          time: "19:10",
          dayOfWeek: 4,
          exercises: [
            {
              id: createId("result-exercise"),
              exerciseId: squatId,
              name: "Squat",
              status: "completed",
              sets: 5,
              reps: 5,
              weight: 85,
              notes: "Depth consistent.",
            },
            {
              id: createId("result-exercise"),
              exerciseId: rowsId,
              name: "Rows",
              status: "completed",
              sets: 4,
              reps: 8,
              weight: 55,
              notes: "Smooth pulls.",
            },
            {
              id: createId("result-exercise"),
              exerciseId: plankId,
              name: "Front Plank",
              status: "completed",
              sets: 3,
              reps: 40,
              weight: 0,
              notes: "Steady.",
            },
          ],
          completedExercises: [
            {
              id: createId("result-exercise"),
              exerciseId: squatId,
              name: "Squat",
              status: "completed",
              sets: 5,
              reps: 5,
              weight: 85,
              notes: "Depth consistent.",
            },
            {
              id: createId("result-exercise"),
              exerciseId: rowsId,
              name: "Rows",
              status: "completed",
              sets: 4,
              reps: 8,
              weight: 55,
              notes: "Smooth pulls.",
            },
            {
              id: createId("result-exercise"),
              exerciseId: plankId,
              name: "Front Plank",
              status: "completed",
              sets: 3,
              reps: 40,
              weight: 0,
              notes: "Steady.",
            },
          ],
          mood: 8,
          energyLevel: 8,
          notes: "Baseline strength session for comparison.",
          createdAt,
          updatedAt: createdAt,
        },
      ],
      startingPosition: {
        id: createId("starting-position"),
        date: demoDate(-42),
        metrics: [
          { key: createId("metric"), label: "Weight", value: "84.8", unit: "kg" },
          { key: createId("metric"), label: "Waist", value: "91", unit: "cm" },
          { key: createId("metric"), label: "Chest", value: "101", unit: "cm" },
          { key: createId("metric"), label: "Resting HR", value: "68", unit: "bpm" },
          { key: createId("metric"), label: "Front plank", value: "60", unit: "sec" },
        ],
        images: [],
        notes: "Starting baseline before a six-week strength and nutrition block.",
        createdAt,
        updatedAt: createdAt,
      },
      progressRecords: [
        {
          id: createId("progress-record"),
          date: demoDate(-1),
          metrics: [
            { key: createId("metric"), label: "Weight", value: "82.6", unit: "kg" },
            { key: createId("metric"), label: "Waist", value: "87", unit: "cm" },
            { key: createId("metric"), label: "Resting HR", value: "62", unit: "bpm" },
            { key: createId("metric"), label: "Front plank", value: "105", unit: "sec" },
          ],
          images: [],
          notes: "Latest checkpoint. Strength is up and waist is down.",
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: createId("progress-record"),
          date: demoDate(-14),
          metrics: [
            { key: createId("metric"), label: "Weight", value: "83.4", unit: "kg" },
            { key: createId("metric"), label: "Waist", value: "89", unit: "cm" },
            { key: createId("metric"), label: "Resting HR", value: "65", unit: "bpm" },
            { key: createId("metric"), label: "Front plank", value: "85", unit: "sec" },
          ],
          images: [],
          notes: "Mid-block check. Recovery is improving.",
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: createId("progress-record"),
          date: demoDate(-28),
          metrics: [
            { key: createId("metric"), label: "Weight", value: "84.1", unit: "kg" },
            { key: createId("metric"), label: "Waist", value: "90", unit: "cm" },
            { key: createId("metric"), label: "Resting HR", value: "67", unit: "bpm" },
            { key: createId("metric"), label: "Front plank", value: "72", unit: "sec" },
          ],
          images: [],
          notes: "First follow-up after two weeks.",
          createdAt,
          updatedAt: createdAt,
        },
      ],
      nutritionEntries: [
        {
          id: createId("nutrition"),
          date: demoDate(0),
          meals: [
            {
              id: createId("meal"),
              mealType: "breakfast",
              time: "08:10",
              customDescription: "Oats with Greek yogurt, banana, and cinnamon.",
              protein: 32,
              carbs: 72,
              fats: 12,
              calories: 520,
            },
            {
              id: createId("meal"),
              mealType: "lunch",
              time: "13:20",
              customDescription: "Chicken rice bowl with vegetables and olive oil.",
              protein: 48,
              carbs: 86,
              fats: 18,
              calories: 720,
            },
            {
              id: createId("meal"),
              mealType: "snack",
              time: "16:30",
              customDescription: "Cottage cheese and berries.",
              protein: 24,
              carbs: 28,
              fats: 4,
              calories: 250,
            },
            {
              id: createId("meal"),
              mealType: "dinner",
              time: "20:00",
              customDescription: "Salmon, potatoes, and salad.",
              protein: 42,
              carbs: 58,
              fats: 24,
              calories: 650,
            },
          ],
          water: 2.4,
          notes: "Training day nutrition target: enough carbs around the session.",
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: createId("nutrition"),
          date: demoDate(-1),
          meals: [
            {
              id: createId("meal"),
              mealType: "breakfast",
              time: "07:50",
              customDescription: "Eggs, toast, tomato, and coffee.",
              protein: 28,
              carbs: 42,
              fats: 20,
              calories: 470,
            },
            {
              id: createId("meal"),
              mealType: "lunch",
              time: "12:45",
              customDescription: "Beef stew with buckwheat.",
              protein: 44,
              carbs: 68,
              fats: 22,
              calories: 680,
            },
            {
              id: createId("meal"),
              mealType: "dinner",
              time: "19:30",
              customDescription: "Turkey wrap with vegetables and yogurt sauce.",
              protein: 38,
              carbs: 54,
              fats: 16,
              calories: 560,
            },
          ],
          water: 2.1,
          notes: "Slightly lighter day after training.",
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: createId("nutrition"),
          date: demoDate(-3),
          meals: [
            {
              id: createId("meal"),
              mealType: "breakfast",
              time: "08:30",
              customDescription: "Protein smoothie with oats and peanut butter.",
              protein: 40,
              carbs: 64,
              fats: 18,
              calories: 590,
            },
            {
              id: createId("meal"),
              mealType: "lunch",
              time: "14:00",
              customDescription: "Tuna pasta salad.",
              protein: 36,
              carbs: 82,
              fats: 14,
              calories: 610,
            },
            {
              id: createId("meal"),
              mealType: "snack",
              time: "17:15",
              customDescription: "Apple and mixed nuts.",
              protein: 7,
              carbs: 26,
              fats: 15,
              calories: 260,
            },
            {
              id: createId("meal"),
              mealType: "dinner",
              time: "20:20",
              customDescription: "Chicken soup and rye bread.",
              protein: 34,
              carbs: 48,
              fats: 10,
              calories: 430,
            },
          ],
          water: 2.8,
          notes: "Recovery-focused meals with higher fluids.",
          createdAt,
          updatedAt: createdAt,
        },
      ],
    },
    todos: {
      items: [
        {
          id: createId("todo"),
          title: "Review weekly plan",
          description: "Check finances, calendar, workouts, and routines.",
          status: "pending",
          priority: "high",
          groupId: "pending",
          tags: ["planning"],
          dueDate: futureDate(1),
          reminderAt: null,
          reminderEnabled: false,
          reminderFiredAt: null,
          createdAt,
          updatedAt: createdAt,
          completedAt: null,
        },
      ],
      groups: [],
    },
    finance: {
      startingBalance: 500,
      startedAt: createdAt,
      transactions: [
        {
          id: createId("transaction"),
          type: "income",
          amount: 2500,
          title: "Monthly income",
          description: "",
          tags: ["salary"],
          sourceOrCategory: "Work",
          date: createdAt,
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: createId("transaction"),
          type: "expense",
          amount: 120,
          title: "Groceries",
          description: "",
          tags: ["home"],
          sourceOrCategory: "Food",
          date: createdAt,
          createdAt,
          updatedAt: createdAt,
        },
      ],
      savingsGoals: [
        {
          id: createId("goal"),
          title: "Emergency fund",
          targetAmount: 3000,
          currentAmount: 850,
          deadline: futureDate(180),
          description: "Quiet security buffer.",
          createdAt,
          updatedAt: createdAt,
        },
      ],
      tags: [
        {
          id: createId("tag"),
          name: "home",
          type: "expense",
          description: "Household costs",
          createdAt,
        },
      ],
    },
    habits: {
      habits: [
        {
          id: habitId,
          title: "Evening reset",
          description: "Short tidy, journal note, prepare tomorrow.",
          daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
          timeOfDay: "21:30",
          category: "Routine",
          isActive: true,
          createdAt,
          updatedAt: createdAt,
        },
      ],
      logs: [],
    },
    calendarEvents: [
      {
        id: createId("event"),
        title: "Planning block",
        description: "Review the personal operating system.",
        date: futureDate(3),
        time: "10:00",
        category: "Planning",
        tags: ["Planning"],
        isImportant: true,
        recurrence: "once",
        recurrenceStartDate: null,
        reminders: [],
        reminderAt: null,
        reminderEnabled: false,
        reminderFiredAt: null,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    journalEntries: [
      {
        id: createId("entry"),
        title: "First MyMind note",
        content: "A calmer local place for plans, records, and decisions.",
        mood: "Focused",
        tags: ["start"],
        createdAt,
        updatedAt: createdAt,
      },
    ],
    notes: [
      {
        id: createId("note"),
        title: "MyMind ideas",
        content:
          "Use notes for durable ideas, references, checklists, and project thinking that should not live in the journal.",
        category: "Reference",
        tags: ["mymind", "ideas"],
        pinned: true,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    projects: [
      {
        id: createId("project"),
        title: "Build MyMind",
        description:
          "Shape the local personal operating system into a useful daily workspace.",
        status: "active",
        area: "Personal systems",
        nextAction: "Review modules after a week of use",
        deadline: futureDate(30),
        tags: ["mymind"],
        createdAt,
        updatedAt: createdAt,
      },
    ],
    contacts: [
      {
        id: createId("contact"),
        name: "Example Contact",
        relationship: "Friend",
        phone: "",
        email: "",
        facebook: "",
        whatsapp: "",
        telegram: "@example",
        instagram: "",
        birthday: null,
        lastContactedAt: null,
        notes: "Use contacts for memory notes and follow-up context.",
        tags: ["example"],
        createdAt,
        updatedAt: createdAt,
      },
    ],
    health: {
      entries: [],
      metrics: [],
    },
    goals: [
      {
        id: createId("goal"),
        title: "Use MyMind consistently",
        description:
          "Capture enough real data to discover what modules matter.",
        status: "active",
        horizon: "quarter",
        targetDate: futureDate(90),
        progress: 15,
        metric: "weekly reviews",
        tags: ["systems"],
        createdAt,
        updatedAt: createdAt,
      },
    ],
    inventory: [
      {
        id: createId("inventory"),
        title: "Passport",
        category: "Document",
        location: "Home",
        serialNumber: "",
        purchaseDate: null,
        warrantyUntil: null,
        value: 0,
        notes:
          "Inventory can track documents, devices, warranties, and locations.",
        tags: ["document"],
        createdAt,
        updatedAt: createdAt,
      },
    ],
  };
}
