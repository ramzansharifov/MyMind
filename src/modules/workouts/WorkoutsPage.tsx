import { useState } from 'react';
import { AddButton, CancelButton, DeleteButton, EditButton, SaveButton } from '../../shared/components/ActionButtons';
import { EntityForm } from '../../shared/components/EntityForm';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatCard } from '../../shared/components/StatCard';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { formatDate } from '../../shared/utils/dateUtils';
import { createId } from '../../shared/utils/idGenerator';
import { ChartsSection } from './ChartsSection';
import { ExerciseForm } from './ExerciseForm';
import { NutritionEntryForm } from './NutritionEntryForm';
import { NutritionMealForm } from './NutritionMealForm';
import { ProgressRecordForm } from './ProgressRecordForm';
import { StartingPositionForm } from './StartingPositionForm';
import { WorkoutCard } from './WorkoutCard';
import { WorkoutPlanForm } from './WorkoutPlanForm';
import { WorkoutSessionForm } from './WorkoutSessionForm';
import { recentSessions, resultSummary, weekdayLabels } from './workoutUtils';
import type {
  ExerciseDefinition,
  ExerciseGroup,
  MealRecord,
  NutritionEntry,
  ProgressRecord,
  StartingPosition,
  WorkoutData,
  WorkoutPlan,
  WorkoutSession,
} from './types';

interface WorkoutsPageProps {
  data: WorkoutData;
  onChange: (data: WorkoutData) => void;
}

type Section = 'exercises' | 'plans' | 'sessions' | 'starting-position' | 'progress' | 'latest-progress' | 'nutrition-meals' | 'charts';

type OpenForm =
  | { kind: 'exercise'; exercise?: ExerciseDefinition | null }
  | { kind: 'plan'; plan?: WorkoutPlan | null }
  | { kind: 'session'; plan?: WorkoutPlan | null }
  | { kind: 'starting-position'; position?: StartingPosition | null }
  | { kind: 'progress-record'; record?: ProgressRecord | null }
  | { kind: 'nutrition-entry'; entry: NutritionEntry }
  | { kind: 'nutrition-meal'; meal?: MealRecord | null }
  | null;

const SECTION_TABS: Array<{ id: Section; label: string }> = [
  { id: 'exercises', label: 'Exercises' },
  { id: 'plans', label: 'Plans' },
  { id: 'sessions', label: 'Workout Log' },
  { id: 'starting-position', label: 'Starting Position' },
  { id: 'progress', label: 'All Progress' },
  { id: 'latest-progress', label: 'Latest Progress' },
  { id: 'nutrition-meals', label: 'Nutrition' },
  { id: 'charts', label: 'Charts' },
];

export function WorkoutsPage({ data, onChange }: WorkoutsPageProps) {
  const [activeSection, setActiveSection] = useState<Section>('exercises');
  const [openForm, setOpenForm] = useState<OpenForm>(null);
  const [activeExerciseGroupId, setActiveExerciseGroupId] = useState<string>('all');
  const [newExerciseGroupTitle, setNewExerciseGroupTitle] = useState('');
  const [editingExerciseGroupId, setEditingExerciseGroupId] = useState<string | null>(null);
  const [editingExerciseGroupTitle, setEditingExerciseGroupTitle] = useState('');
  const { t } = useI18n();
  const exercises = data.exercises ?? [];
  const exerciseGroups = data.exerciseGroups ?? [];
  const plans = data.plans ?? [];
  const sessions = data.sessions ?? [];
  const progressRecords = data.progressRecords ?? [];
  const nutritionEntries = data.nutritionEntries ?? [];
  const startingPosition = data.startingPosition ?? null;

  function saveExercise(exercise: ExerciseDefinition) {
    const exists = exercises.some((item) => item.id === exercise.id);
    onChange({ ...data, exercises: exists ? exercises.map((item) => (item.id === exercise.id ? exercise : item)) : [exercise, ...exercises] });
    setOpenForm(null);
  }

  function deleteExercise(exercise: ExerciseDefinition) {
    onChange({
      ...data,
      exercises: exercises.filter((item) => item.id !== exercise.id),
      plans: plans.map((plan) => ({
        ...plan,
        days: (plan.days ?? []).map((day) => ({ ...day, exerciseIds: (day.exerciseIds ?? []).filter((id) => id !== exercise.id) })),
        updatedAt: new Date().toISOString(),
      })),
    });
  }

  function saveExerciseGroup() {
    const title = newExerciseGroupTitle.trim();
    if (!title) {
      return;
    }
    const timestamp = new Date().toISOString();
    const group: ExerciseGroup = {
      id: createId('exercise-group'),
      title,
      description: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    onChange({ ...data, exerciseGroups: [...exerciseGroups, group] });
    setActiveExerciseGroupId(group.id);
    setNewExerciseGroupTitle('');
  }

  function startEditExerciseGroup(group: ExerciseGroup) {
    setEditingExerciseGroupId(group.id);
    setEditingExerciseGroupTitle(group.title);
  }

  function saveEditedExerciseGroup() {
    const title = editingExerciseGroupTitle.trim();
    if (!editingExerciseGroupId || !title) {
      return;
    }
    const timestamp = new Date().toISOString();
    onChange({
      ...data,
      exerciseGroups: exerciseGroups.map((group) =>
        group.id === editingExerciseGroupId ? { ...group, title, updatedAt: timestamp } : group,
      ),
    });
    setEditingExerciseGroupId(null);
    setEditingExerciseGroupTitle('');
  }

  function cancelEditExerciseGroup() {
    setEditingExerciseGroupId(null);
    setEditingExerciseGroupTitle('');
  }

  function deleteExerciseGroup(groupId: string) {
    const timestamp = new Date().toISOString();
    onChange({
      ...data,
      exerciseGroups: exerciseGroups.filter((group) => group.id !== groupId),
      exercises: exercises.map((exercise) =>
        exercise.groupId === groupId ? { ...exercise, groupId: null, updatedAt: timestamp } : exercise,
      ),
    });
    if (activeExerciseGroupId === groupId) {
      setActiveExerciseGroupId('all');
    }
    if (editingExerciseGroupId === groupId) {
      cancelEditExerciseGroup();
    }
  }

  const visibleExercises =
    activeExerciseGroupId === 'all'
      ? exercises
      : activeExerciseGroupId === 'ungrouped'
        ? exercises.filter((exercise) => !exercise.groupId)
        : exercises.filter((exercise) => exercise.groupId === activeExerciseGroupId);

  function savePlan(plan: WorkoutPlan) {
    const exists = plans.some((item) => item.id === plan.id);
    onChange({ ...data, plans: exists ? plans.map((item) => (item.id === plan.id ? plan : item)) : [plan, ...plans] });
    setOpenForm(null);
  }

  function saveSession(session: WorkoutSession) {
    onChange({ ...data, sessions: [session, ...sessions] });
    setOpenForm(null);
  }

  function saveStartingPosition(position: StartingPosition) {
    onChange({ ...data, startingPosition: position });
    setOpenForm(null);
  }

  function saveProgressRecord(record: ProgressRecord) {
    onChange({ ...data, progressRecords: [record, ...progressRecords] });
    setOpenForm(null);
  }

  function deleteProgressRecord(id: string) {
    onChange({ ...data, progressRecords: progressRecords.filter((item) => item.id !== id) });
  }

  function saveNutritionEntry(meals: MealRecord[]) {
    const date = new Date().toISOString().slice(0, 10);
    const existingEntry = nutritionEntries.find(e => e.date === date);

    if (existingEntry) {
        const existingMeals = Array.isArray(existingEntry.meals) ? existingEntry.meals : [];
        const updatedEntry = {
            ...existingEntry,
            meals: [...existingMeals, ...meals],
            updatedAt: new Date().toISOString()
        };
        onChange({
            ...data,
            nutritionEntries: nutritionEntries.map(e => e.id === existingEntry.id ? updatedEntry : e)
        });
    } else {
        const entry: NutritionEntry = {
            id: createId('nutrition'),
            date,
            meals,
            water: 0,
            notes: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        onChange({ ...data, nutritionEntries: [entry, ...nutritionEntries] });
    }
    setOpenForm(null);
  }

  function deleteNutritionEntry(id: string) {
    onChange({ ...data, nutritionEntries: nutritionEntries.filter((item) => item.id !== id) });
  }

  function saveNutritionDay(entry: NutritionEntry) {
    onChange({
      ...data,
      nutritionEntries: nutritionEntries.map((item) => (item.id === entry.id ? entry : item)),
    });
    setOpenForm(null);
  }

  const latestProgress = [...progressRecords].sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <section>
      <PageHeader title="Training & Nutrition" subtitle="Manage exercises, workouts, nutrition, and track your progress." />

      <div className="stats-grid workout-stats">
        <StatCard label="Exercises" value={exercises.length} />
        <StatCard label="Plans" value={plans.length} />
        <StatCard label="Workouts" value={sessions.length} />
        <StatCard label="Progress Records" value={progressRecords.length} />
        <StatCard label="Nutrition Entries" value={nutritionEntries.length} />
      </div>

      <div className="workout-tabs" role="tablist" aria-label="Training and nutrition sections">
        {SECTION_TABS.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={activeSection === section.id}
            className={`workout-tab${activeSection === section.id ? ' active' : ''}`}
            onClick={() => setActiveSection(section.id)}
          >
            {t(section.label)}
          </button>
        ))}
      </div>

      {/* Exercises Section */}
      {activeSection === 'exercises' && (
        <section className="panel section-block workout-section-panel">
          <div className="section-heading">
            <div>
              <h2>{t('Exercise Library')}</h2>
              <p className="muted-text">{t('Create base exercises. These are the foundation for workout plans.')}</p>
            </div>
            <AddButton label="Add exercise" onClick={() => setOpenForm({ kind: 'exercise' })} />
          </div>
          <div className="exercise-library-layout">
            <aside className="exercise-groups-panel">
              <div className="exercise-group-tabs" role="tablist" aria-label={t('Exercise groups')}>
                {[
                  { id: 'all', title: t('All'), count: exercises.length, group: null },
                  { id: 'ungrouped', title: t('No group'), count: exercises.filter((exercise) => !exercise.groupId).length, group: null },
                  ...exerciseGroups.map((group) => ({
                    id: group.id,
                    title: group.title,
                    count: exercises.filter((exercise) => exercise.groupId === group.id).length,
                    group,
                  })),
                ].map((group) =>
                  editingExerciseGroupId === group.id ? (
                    <div className="exercise-group-edit-row" key={group.id}>
                      <input
                        value={editingExerciseGroupTitle}
                        onChange={(event) => setEditingExerciseGroupTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            saveEditedExerciseGroup();
                          }
                          if (event.key === 'Escape') {
                            cancelEditExerciseGroup();
                          }
                        }}
                        autoFocus
                      />
                      <div className="exercise-group-actions">
                        <SaveButton label="Save group" iconOnly type="button" onClick={saveEditedExerciseGroup} />
                        <CancelButton label="Cancel" iconOnly type="button" onClick={cancelEditExerciseGroup} />
                      </div>
                    </div>
                  ) : (
                    <div className="exercise-group-row" key={group.id}>
                      <button
                        className={`exercise-group-tab ${activeExerciseGroupId === group.id ? 'active' : ''}`}
                        type="button"
                        onClick={() => setActiveExerciseGroupId(group.id)}
                      >
                        <span>{group.title}</span>
                        <small>{group.count}</small>
                      </button>
                      {group.group ? (
                        <div className="exercise-group-actions">
                          <EditButton label="Edit group" onClick={() => startEditExerciseGroup(group.group as ExerciseGroup)} />
                          <DeleteButton
                            label="Delete group"
                            confirmTitle="Delete exercise group?"
                            confirmMessage="Exercises from this group will move to No group."
                            onConfirm={() => deleteExerciseGroup(group.id)}
                          />
                        </div>
                      ) : null}
                    </div>
                  ),
                )}
              </div>
              <div className="inline-form exercise-group-create">
                <input
                  value={newExerciseGroupTitle}
                  placeholder={t('New exercise group')}
                  onChange={(event) => setNewExerciseGroupTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      saveExerciseGroup();
                    }
                  }}
                />
                <AddButton label="Add exercise group" onClick={saveExerciseGroup}>
                  {t('Add')}
                </AddButton>
              </div>
            </aside>
            <div className="workout-exercise-grid">
              {visibleExercises.map((exercise) => (
                <article className="card workout-exercise-card" key={exercise.id}>
                  <div>
                    <h3>{exercise.name}</h3>
                    <p>{exercise.description || t('No description.')}</p>
                    <span className="chip">{exerciseGroups.find((group) => group.id === exercise.groupId)?.title ?? t('No group')}</span>
                  </div>
                  <div className="card-actions">
                    <EditButton onClick={() => setOpenForm({ kind: 'exercise', exercise })} />
                    <DeleteButton
                      onConfirm={() => deleteExercise(exercise)}
                      confirmTitle="Delete exercise?"
                      confirmMessage="This removes the exercise from plans, but existing workout logs keep their recorded result."
                    />
                  </div>
                </article>
              ))}
              {visibleExercises.length === 0 ? (
                <EmptyState
                  title={exercises.length === 0 ? 'No exercises yet' : 'No exercises in this group'}
                  message={exercises.length === 0 ? 'Create base exercises before building plans.' : 'Add an exercise or select another group.'}
                />
              ) : null}
            </div>
          </div>
        </section>
      )}

      {/* Workout Plans Section */}
      {activeSection === 'plans' && (
        <section className="panel section-block workout-section-panel">
          <div className="section-heading">
            <div>
              <h2>{t('Training Plans')}</h2>
              <p className="muted-text">{t('Create structured workout plans from your exercises.')}</p>
            </div>
            <AddButton label="Add plan" onClick={() => setOpenForm({ kind: 'plan' })} />
          </div>
          {plans.length === 0 ? (
            <EmptyState title="No workout plans" message="Create exercises first, then build a plan from them." />
          ) : (
            <div className="card-grid">
              {plans.map((plan) => (
                <WorkoutCard
                  exercises={exercises}
                  plan={plan}
                  key={plan.id}
                  onLog={() => setOpenForm({ kind: 'session', plan })}
                  onEdit={() => setOpenForm({ kind: 'plan', plan })}
                  onDelete={() => onChange({ ...data, plans: plans.filter((item) => item.id !== plan.id) })}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Workout Sessions Section */}
      {activeSection === 'sessions' && (
        <section className="panel section-block workout-section-panel">
          <div className="section-heading">
            <div>
              <h2>{t('Workout History')}</h2>
              <p className="muted-text">{t('Log your completed workouts.')}</p>
            </div>
            <AddButton label="Log workout" onClick={() => setOpenForm({ kind: 'session' })} />
          </div>
          <div className="stack">
            {recentSessions(sessions).map((session) => {
              const plan = plans.find((item) => item.id === session.planId);
              const summary = resultSummary(session.exercises ?? session.completedExercises ?? []);
              return (
                <article className="card workout-history-card" key={session.id}>
                  <div className="workout-history-heading">
                    <h3>{formatDate(session.date)}</h3>
                    <p>{session.planTitle || plan?.title || t('Free workout')}</p>
                    <small>
                      {t(weekdayLabels[session.dayOfWeek])} {session.time} / {t('Energy')} {session.energyLevel}/10 / {t('Mood')} {session.mood}/10
                    </small>
                  </div>
                  <p>
                    {t('Completed')}: {summary.completed} / {t('Skipped')}: {summary.skipped}
                  </p>
                  <div className="chip-row">
                    {(session.exercises ?? session.completedExercises ?? []).slice(0, 8).map((exercise) => (
                      <span className={exercise.status === 'skipped' ? 'chip skipped-chip' : 'chip'} key={exercise.id}>
                        {exercise.name} {exercise.status === 'completed' ? `${exercise.sets}x${exercise.reps} ${exercise.weight ? `${exercise.weight}kg` : ''}` : t('Skipped')}
                      </span>
                    ))}
                  </div>
                  {session.notes ? <p>{session.notes}</p> : null}
                </article>
              );
            })}
            {sessions.length === 0 ? <p className="muted-text">{t('No workout sessions yet.')}</p> : null}
          </div>
        </section>
      )}

      {/* Starting Position Section */}
      {activeSection === 'starting-position' && (
        <section className="panel section-block workout-section-panel">
          <div className="section-heading">
            <div>
              <h2>{t('Starting Position')}</h2>
              <p className="muted-text">{t('Set your baseline metrics to track progress.')}</p>
            </div>
            <AddButton label={startingPosition ? 'Update position' : 'Set position'} onClick={() => setOpenForm({ kind: 'starting-position', position: startingPosition })} />
          </div>
          {startingPosition ? (
            <div className="workout-detail-card workout-baseline-block">
              <h3>{formatDate(startingPosition.date)}</h3>
              <div className="workout-detail-body">
                <section className="workout-detail-section">
                  <h4>{t('Metrics')}</h4>
                  {(startingPosition.metrics ?? []).length > 0 ? (
                    <div className="workout-metric-grid">
                      {(startingPosition.metrics ?? []).map((metric) => (
                        <div className="workout-metric-tile" key={metric.key}>
                          <strong>{metric.label}:</strong> <br /> {metric.value} {metric.unit}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted-text">{t('No metrics recorded.')}</p>
                  )}
                </section>
                {startingPosition.images && startingPosition.images.length > 0 ? (
                  <section className="workout-detail-section">
                    <h4>{t('Photos')}</h4>
                    <div className="photo-grid-small">
                      {startingPosition.images.map((img, i) => (
                        <img key={i} src={img} alt="Starting position" className="progress-photo-thumb" />
                      ))}
                    </div>
                  </section>
                ) : null}
                {startingPosition.notes ? (
                  <section className="workout-detail-section">
                    <h4>{t('Description')}</h4>
                    <p>{startingPosition.notes}</p>
                  </section>
                ) : null}
              </div>
            </div>
          ) : (
            <EmptyState title="No starting position set" message="Set your baseline metrics to track progress over time." />
          )}
        </section>
      )}

      {/* Progress Records Section */}
      {activeSection === 'progress' && (
        <section className="panel section-block workout-section-panel">
          <div className="section-heading">
            <div>
              <h2>{t('Progress History')}</h2>
              <p className="muted-text">{t('Track your progress metrics over time.')}</p>
            </div>
            <AddButton label="Add progress record" onClick={() => setOpenForm({ kind: 'progress-record' })} />
          </div>
          <div className="stack">
            {progressRecords.map((record) => (
              <article className="card workout-record-card" key={record.id}>
                <div className="workout-record-layout">
                  <div className="workout-record-main">
                    <h3>{formatDate(record.date)}</h3>
                    {(record.metrics ?? []).length > 0 && (
                      <div className="workout-record-metrics">
                        {(record.metrics ?? []).map((metric) => (
                          <small key={metric.key}>
                            <strong>{metric.label}:</strong> {metric.value} {metric.unit}
                          </small>
                        ))}
                      </div>
                    )}
                    {record.images && record.images.length > 0 && (
                        <div className="photo-grid-small">
                            {record.images.map((img, i) => (
                                <img key={i} src={img} alt="Progress" className="progress-photo-thumb" />
                            ))}
                        </div>
                    )}
                    {record.notes && <p>{record.notes}</p>}
                  </div>
                  <div className="card-actions compact">
                    <EditButton onClick={() => setOpenForm({ kind: 'progress-record', record })} />
                    <DeleteButton onConfirm={() => deleteProgressRecord(record.id)} confirmTitle="Delete this record?" />
                  </div>
                </div>
              </article>
            ))}
            {progressRecords.length === 0 ? <p className="muted-text">{t('No progress records yet.')}</p> : null}
          </div>
        </section>
      )}

      {/* Latest Progress Section */}
      {activeSection === 'latest-progress' && (
          <section className="panel section-block workout-section-panel">
              <div className="section-heading">
                <div>
                  <h2>{t('Latest Progress')}</h2>
                  <p className="muted-text">{t('View your most recent measurements.')}</p>
                </div>
                {latestProgress && <EditButton onClick={() => setOpenForm({ kind: 'progress-record', record: latestProgress })} />}
              </div>
              {latestProgress ? (
                  <article className="card workout-detail-card">
                      <h3>{formatDate(latestProgress.date)}</h3>
                      <div className="workout-detail-body">
                          <div className="workout-metric-grid">
                              {latestProgress.metrics.map((metric) => (
                                  <div className="workout-metric-tile" key={metric.key}>
                                      <strong>{metric.label}:</strong> <br /> {metric.value} {metric.unit}
                                  </div>
                              ))}
                          </div>
                          {latestProgress.images && latestProgress.images.length > 0 && (
                              <div className="photo-grid-large">
                                  {latestProgress.images.map((img, i) => (
                                      <img key={i} src={img} alt="Latest progress" className="progress-photo-large" />
                                  ))}
                              </div>
                          )}
                      </div>
                      {latestProgress.notes && <p>{latestProgress.notes}</p>}
                  </article>
              ) : (
                  <EmptyState title="No progress recorded" message="Add your first progress record to see it here." />
              )}
          </section>
      )}

      {/* Nutrition - Meals Section */}
      {activeSection === 'nutrition-meals' && (
        <section className="panel section-block workout-section-panel">
          <div className="section-heading">
            <div>
              <h2>{t('Daily Nutrition')}</h2>
              <p className="muted-text">{t('Track your meals and daily nutritional intake.')}</p>
            </div>
            <AddButton label="Add today's meal" onClick={() => setOpenForm({ kind: 'nutrition-meal' })} />
          </div>
          <div className="stack">
            {(nutritionEntries || []).filter(Boolean).map((entry) => {
              const meals = (Array.isArray(entry.meals) ? entry.meals : []).filter(Boolean);
              const totals = {
                protein: meals.reduce((sum, meal) => sum + (Number(meal.protein) || 0), 0),
                carbs: meals.reduce((sum, meal) => sum + (Number(meal.carbs) || 0), 0),
                fats: meals.reduce((sum, meal) => sum + (Number(meal.fats) || 0), 0),
                calories: meals.reduce((sum, meal) => sum + (Number(meal.calories) || 0), 0),
              };
              const totalMetrics = [
                { label: t('protein'), value: `${totals.protein.toFixed(1)}g` },
                { label: t('carbs'), value: `${totals.carbs.toFixed(1)}g` },
                { label: t('fats'), value: `${totals.fats.toFixed(1)}g` },
                { label: t('kcal'), value: String(Math.round(totals.calories)) },
              ];
              return (
                <article className="card nutrition-row-card" key={entry.id}>
                  <div className="nutrition-day-layout">
                    <div className="nutrition-day-main">
                      <div className="nutrition-day-heading">
                        <div>
                          <span className="panel-kicker">{t('Daily totals')}</span>
                          <h3>{formatDate(entry.date)}</h3>
                        </div>
                        {entry.water > 0 ? <span className="nutrition-water-pill">{t('Water')} {entry.water}L</span> : null}
                      </div>
                      <div className="nutrition-total-grid">
                        {totalMetrics.map((metric) => (
                          <div className="nutrition-total-tile" key={metric.label}>
                            <span>{metric.label}</span>
                            <strong>{metric.value}</strong>
                          </div>
                        ))}
                      </div>
                      <div className="nutrition-meal-list">
                        {meals.map((meal) => (
                          <section className={`nutrition-meal-card ${meal.mealType || 'snack'}`} key={meal.id}>
                            <div className="nutrition-meal-accent" aria-hidden="true" />
                            <div className="nutrition-meal-content">
                              <div className="nutrition-meal-heading">
                                <div>
                                  <strong>{t(meal.mealType || 'snack')}</strong>
                                  <span>{meal.time || t('Any time')}</span>
                                </div>
                                <span className="nutrition-calorie-pill">{Math.round(meal.calories ?? 0)} {t('kcal')}</span>
                              </div>
                              <p>{meal.customDescription || t('Detailed meal')}</p>
                              <div className="nutrition-macro-row">
                                <span><strong>{meal.protein ?? 0}g</strong> {t('protein')}</span>
                                <span><strong>{meal.carbs ?? 0}g</strong> {t('carbs')}</span>
                                <span><strong>{meal.fats ?? 0}g</strong> {t('fats')}</span>
                              </div>
                            </div>
                          </section>
                        ))}
                        {meals.length === 0 ? <div className="nutrition-empty-meals">{t('No meals recorded.')}</div> : null}
                      </div>
                      {entry.notes ? <p className="nutrition-day-notes">{entry.notes}</p> : null}
                    </div>
                    <div className="card-actions compact">
                      <EditButton onClick={() => setOpenForm({ kind: 'nutrition-entry', entry })} />
                      <DeleteButton onConfirm={() => deleteNutritionEntry(entry.id)} confirmTitle="Delete this day's record?" />
                    </div>
                  </div>
                </article>
              );
            })}
            {(nutritionEntries || []).length === 0 ? <EmptyState title="No nutrition entries" message="Start logging your daily meals and nutrition." /> : null}
          </div>
        </section>
      )}

      {/* Charts Section */}
      {activeSection === 'charts' && <ChartsSection />}

      {/* Forms */}
      {openForm?.kind === 'exercise' ? (
        <ExerciseForm
          exercise={openForm.exercise}
          groups={exerciseGroups}
          defaultGroupId={activeExerciseGroupId === 'all' || activeExerciseGroupId === 'ungrouped' ? null : activeExerciseGroupId}
          onCancel={() => setOpenForm(null)}
          onSave={saveExercise}
        />
      ) : null}
      {openForm?.kind === 'plan' ? (
        <WorkoutPlanForm plan={openForm.plan} exercises={exercises} onCancel={() => setOpenForm(null)} onSave={savePlan} />
      ) : null}
      {openForm?.kind === 'session' ? (
        <WorkoutSessionForm plan={openForm.plan} exercises={exercises} onCancel={() => setOpenForm(null)} onSave={saveSession} />
      ) : null}
      {openForm?.kind === 'starting-position' ? (
        <StartingPositionForm position={openForm.position} onCancel={() => setOpenForm(null)} onSave={saveStartingPosition} />
      ) : null}
      {openForm?.kind === 'progress-record' ? (
        <ProgressRecordForm record={openForm.record} onCancel={() => setOpenForm(null)} onSave={saveProgressRecord} />
      ) : null}
      {openForm?.kind === 'nutrition-entry' ? (
        <NutritionEntryForm entry={openForm.entry} onCancel={() => setOpenForm(null)} onSave={saveNutritionDay} />
      ) : null}
      {openForm?.kind === 'nutrition-meal' ? (
        <NutritionMealForm meal={openForm.meal} onCancel={() => setOpenForm(null)} onSave={(meal) => saveNutritionEntry([meal])} />
      ) : null}
    </section>
  );
}
