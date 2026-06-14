import { lazy, Suspense, useState, type FormEvent } from 'react';
import { AddButton, DeleteButton, EditButton } from '../../shared/components/ActionButtons';
import { ContentGroupWorkspaceHeader, GroupFormDialog } from '../../shared/components/ContentGroupsPanel';
import { EmptyState } from '../../shared/components/EmptyState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { SegmentedTabs } from '../../shared/components/SegmentedTabs';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { cn } from '../../shared/utils/classNames';
import { formatDate } from '../../shared/utils/dateUtils';
import { createId } from '../../shared/utils/idGenerator';
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

const ChartsSection = lazy(() => import('./ChartsSection').then((module) => ({ default: module.ChartsSection })));

const sectionPanelClass =
  'grid gap-4 rounded-panel border border-app-border bg-[var(--panel-bg)] p-4 text-app-text shadow-panel [backdrop-filter:var(--glass-blur)]';
const sectionHeadingClass = 'flex items-start justify-between gap-4 border-b border-[var(--line-soft)] pb-3 max-[760px]:flex-col';
const mutedTextClass = 'text-sm text-app-muted';
const contentGridClass = 'grid grid-cols-[minmax(210px,260px)_1fr] gap-4 max-[900px]:grid-cols-1';
const groupPanelClass = 'grid content-start gap-3 rounded-panel border border-app-border bg-app-surface-soft p-3';
const groupHeaderClass = 'flex items-center justify-between gap-3 border-b border-[var(--line-soft)] pb-3';
const groupTabListClass = 'grid gap-2';
const groupTabClass =
  'flex min-h-control items-center justify-between gap-3 rounded-control border border-app-border bg-app-surface-soft px-3 py-2 text-left text-sm font-bold text-app-text transition hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] hover:bg-[var(--control-bg-hover)]';
const groupTabActiveClass = 'border-[var(--accent-border)] bg-[var(--selected-bg)] text-app-accent-strong';
const itemGridClass = 'grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] content-start gap-3';
const cardGridClass = 'grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4';
const stackClass = 'grid gap-3';
const cardClass = 'grid gap-3 rounded-panel border border-app-border bg-app-surface p-4 shadow-panel [backdrop-filter:var(--glass-blur)]';
const kickerClass = 'text-[11px] font-extrabold uppercase tracking-[0.12em] text-app-accent-strong';
const pillClass =
  'inline-flex w-fit shrink-0 items-center rounded-full border border-app-border bg-app-chip px-2.5 py-1 text-xs font-extrabold text-app-chip-text';
const headingRowClass = 'flex items-start justify-between gap-3 max-[640px]:flex-col';
const actionRowClass = 'flex flex-wrap items-center justify-end gap-2';
const metricGridClass = 'grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2.5';
const metricTileClass = 'grid gap-1 rounded-control border border-app-border bg-app-surface-soft p-3';
const chipRowClass = 'flex flex-wrap gap-2';
const chipClass = 'inline-flex w-fit items-center rounded-full border border-app-border bg-app-chip px-2.5 py-1 text-xs font-bold text-app-chip-text';
const skippedChipClass =
  'border-[color-mix(in_srgb,var(--danger)_45%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_12%,var(--surface-strong))] text-app-danger';
const detailCardClass = 'grid gap-4 rounded-panel border border-app-border bg-app-surface p-4 shadow-panel [backdrop-filter:var(--glass-blur)]';
const detailBodyClass = 'grid gap-4';
const detailSectionClass = 'grid gap-3';
const photoGridSmallClass = 'grid grid-cols-[repeat(auto-fit,minmax(92px,120px))] gap-2.5';
const photoThumbClass = 'aspect-square w-full rounded-control border border-app-border object-cover';
const photoGridLargeClass = 'grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3';
const photoLargeClass = 'h-64 w-full rounded-panel border border-app-border object-cover';
const noteLineClass = 'whitespace-pre-wrap text-sm leading-6 text-app-muted';
const mealAccentByType: Record<string, string> = {
  breakfast: 'bg-[var(--meal-breakfast)]',
  lunch: 'bg-[var(--meal-lunch)]',
  dinner: 'bg-[var(--meal-dinner)]',
  snack: 'bg-[var(--meal-snack)]',
};

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
  const [isCreatingExerciseGroup, setIsCreatingExerciseGroup] = useState(false);
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

  function saveExerciseGroup(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
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
    setIsCreatingExerciseGroup(false);
  }

  function renameExerciseGroup(groupId: string, title: string) {
    const timestamp = new Date().toISOString();
    onChange({
      ...data,
      exerciseGroups: exerciseGroups.map((group) =>
        group.id === groupId ? { ...group, title, updatedAt: timestamp } : group,
      ),
    });
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
    <section className="grid gap-5">
      <PageHeader title="Training & Nutrition" subtitle="Manage exercises, workouts, nutrition, and track your progress." />

      <SegmentedTabs tabs={SECTION_TABS} activeTab={activeSection} ariaLabel="Training and nutrition sections" onChange={setActiveSection} />

      {/* Exercises Section */}
      {activeSection === 'exercises' && (
        <section className={sectionPanelClass}>
          <div className={sectionHeadingClass}>
            <div>
              <h2>{t('Exercise Library')}</h2>
              <p className={mutedTextClass}>{t('Create base exercises. These are the foundation for workout plans.')}</p>
            </div>
            <AddButton label="Add exercise" onClick={() => setOpenForm({ kind: 'exercise' })} />
          </div>
          <ContentGroupWorkspaceHeader
            groups={[
              { id: 'all', title: 'All', createdAt: 'system', updatedAt: 'system' },
              { id: 'ungrouped', title: 'No group', createdAt: 'system', updatedAt: 'system' },
              ...exerciseGroups,
            ]}
            activeGroupId={activeExerciseGroupId}
            itemCount={visibleExercises.length}
            onRenameGroup={renameExerciseGroup}
            onDeleteGroup={deleteExerciseGroup}
            canManageGroup={(group) => Boolean(exerciseGroups.some((item) => item.id === group.id))}
          />
          <div className={contentGridClass}>
            <aside className={groupPanelClass}>
              <div className={groupHeaderClass}>
                <div className="flex items-center gap-2">
                  <h2>{t('Groups')}</h2>
                  <span className={pillClass}>{exercises.length}</span>
                </div>
                <AddButton iconOnly label="Add exercise group" onClick={() => setIsCreatingExerciseGroup(true)} />
              </div>
              <div className={groupTabListClass} role="tablist" aria-label={t('Exercise groups')}>
                {[
                  { id: 'all', title: t('All'), count: exercises.length, group: null },
                  { id: 'ungrouped', title: t('No group'), count: exercises.filter((exercise) => !exercise.groupId).length, group: null },
                  ...exerciseGroups.map((group) => ({
                    id: group.id,
                    title: group.title,
                    count: exercises.filter((exercise) => exercise.groupId === group.id).length,
                    group,
                  })),
                ].map((group) => (
                  <button
                    className={cn(groupTabClass, activeExerciseGroupId === group.id && groupTabActiveClass)}
                    key={group.id}
                    type="button"
                    onClick={() => setActiveExerciseGroupId(group.id)}
                  >
                    <span>{group.title}</span>
                    <small className="text-xs font-extrabold text-app-muted">{group.count}</small>
                  </button>
                ))}
              </div>
              {isCreatingExerciseGroup ? (
                <GroupFormDialog
                  title="Create group"
                  saveLabel="Add group"
                  value={newExerciseGroupTitle}
                  onChange={setNewExerciseGroupTitle}
                  onCancel={() => {
                    setIsCreatingExerciseGroup(false);
                    setNewExerciseGroupTitle('');
                  }}
                  onSubmit={saveExerciseGroup}
                />
              ) : null}
            </aside>
            <div className={itemGridClass}>
            {visibleExercises.map((exercise) => (
                <article className={cardClass} key={exercise.id}>
                  <div className="grid gap-2">
                    <span className={kickerClass}>{exerciseGroups.find((group) => group.id === exercise.groupId)?.title ?? t('No group')}</span>
                    <h3 className="text-base font-extrabold text-app-text">{exercise.name}</h3>
                    <p className={mutedTextClass}>{exercise.description || t('No description.')}</p>
                  </div>
                  <div className={actionRowClass}>
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
        <section className={sectionPanelClass}>
          <div className={sectionHeadingClass}>
            <div>
              <h2>{t('Training Plans')}</h2>
              <p className={mutedTextClass}>{t('Create structured workout plans from your exercises.')}</p>
            </div>
            <AddButton label="Add plan" onClick={() => setOpenForm({ kind: 'plan' })} />
          </div>
          {plans.length === 0 ? (
            <EmptyState title="No workout plans" message="Create exercises first, then build a plan from them." />
          ) : (
            <div className={cardGridClass}>
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
        <section className={sectionPanelClass}>
          <div className={sectionHeadingClass}>
            <div>
              <h2>{t('Workout History')}</h2>
              <p className={mutedTextClass}>{t('Log your completed workouts.')}</p>
            </div>
            <AddButton label="Log workout" onClick={() => setOpenForm({ kind: 'session' })} />
          </div>
          <div className={stackClass}>
            {recentSessions(sessions).map((session) => {
              const plan = plans.find((item) => item.id === session.planId);
              const summary = resultSummary(session.exercises ?? session.completedExercises ?? []);
              return (
                <article className={cardClass} key={session.id}>
                  <div className={headingRowClass}>
                    <div>
                      <span className={kickerClass}>{t(weekdayLabels[session.dayOfWeek])} {session.time}</span>
                      <h3 className="text-base font-extrabold text-app-text">{formatDate(session.date)}</h3>
                      <p className={mutedTextClass}>{session.planTitle || plan?.title || t('Free workout')}</p>
                    </div>
                    <span className={pillClass}>{summary.completed} / {summary.completed + summary.skipped}</span>
                  </div>
                  <div className={metricGridClass}>
                    <div className={metricTileClass}>
                      <span>{t('Completed')}</span>
                      <strong>{summary.completed}</strong>
                    </div>
                    <div className={metricTileClass}>
                      <span>{t('Skipped')}</span>
                      <strong>{summary.skipped}</strong>
                    </div>
                    <div className={metricTileClass}>
                      <span>{t('Energy')}</span>
                      <strong>{session.energyLevel}/10</strong>
                    </div>
                    <div className={metricTileClass}>
                      <span>{t('Mood')}</span>
                      <strong>{session.mood}/10</strong>
                    </div>
                  </div>
                  <div className={chipRowClass}>
                    {(session.exercises ?? session.completedExercises ?? []).slice(0, 8).map((exercise) => (
                      <span className={cn(chipClass, exercise.status === 'skipped' && skippedChipClass)} key={exercise.id}>
                        {exercise.name} {exercise.status === 'completed' ? `${exercise.sets}x${exercise.reps} ${exercise.weight ? `${exercise.weight}kg` : ''}` : t('Skipped')}
                      </span>
                    ))}
                  </div>
                  {session.notes ? <p className={noteLineClass}>{session.notes}</p> : null}
                </article>
              );
            })}
            {sessions.length === 0 ? <p className={mutedTextClass}>{t('No workout sessions yet.')}</p> : null}
          </div>
        </section>
      )}

      {/* Starting Position Section */}
      {activeSection === 'starting-position' && (
        <section className={sectionPanelClass}>
          <div className={sectionHeadingClass}>
            <div>
              <h2>{t('Starting Position')}</h2>
              <p className={mutedTextClass}>{t('Set your baseline metrics to track progress.')}</p>
            </div>
            <AddButton label={startingPosition ? 'Update position' : 'Set position'} onClick={() => setOpenForm({ kind: 'starting-position', position: startingPosition })} />
          </div>
          {startingPosition ? (
            <div className={detailCardClass}>
              <div className={headingRowClass}>
                <div>
                  <span className={kickerClass}>{t('Baseline')}</span>
                  <h3 className="text-base font-extrabold text-app-text">{formatDate(startingPosition.date)}</h3>
                </div>
                <span className={pillClass}>{(startingPosition.metrics ?? []).length} {t('Metrics')}</span>
              </div>
              <div className={detailBodyClass}>
                <section className={detailSectionClass}>
                  <h4 className="text-sm font-extrabold text-app-text">{t('Metrics')}</h4>
                  {(startingPosition.metrics ?? []).length > 0 ? (
                    <div className={metricGridClass}>
                      {(startingPosition.metrics ?? []).map((metric) => (
                        <div className={metricTileClass} key={metric.key}>
                          <span>{metric.label}</span>
                          <strong>{metric.value} {metric.unit}</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={mutedTextClass}>{t('No metrics recorded.')}</p>
                  )}
                </section>
                {startingPosition.images && startingPosition.images.length > 0 ? (
                  <section className={detailSectionClass}>
                    <h4 className="text-sm font-extrabold text-app-text">{t('Photos')}</h4>
                    <div className={photoGridSmallClass}>
                      {startingPosition.images.map((img, i) => (
                        <img key={i} src={img} alt="Starting position" className={photoThumbClass} />
                      ))}
                    </div>
                  </section>
                ) : null}
                {startingPosition.notes ? (
                  <section className={detailSectionClass}>
                    <h4 className="text-sm font-extrabold text-app-text">{t('Description')}</h4>
                    <p className={noteLineClass}>{startingPosition.notes}</p>
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
        <section className={sectionPanelClass}>
          <div className={sectionHeadingClass}>
            <div>
              <h2>{t('Progress History')}</h2>
              <p className={mutedTextClass}>{t('Track your progress metrics over time.')}</p>
            </div>
            <AddButton label="Add progress record" onClick={() => setOpenForm({ kind: 'progress-record' })} />
          </div>
          <div className={stackClass}>
            {progressRecords.map((record) => (
              <article className={cardClass} key={record.id}>
                <div className="grid grid-cols-[1fr_auto] gap-4 max-[760px]:grid-cols-1">
                  <div className="grid gap-3">
                    <div className={headingRowClass}>
                      <div>
                        <span className={kickerClass}>{t('Progress record')}</span>
                        <h3 className="text-base font-extrabold text-app-text">{formatDate(record.date)}</h3>
                      </div>
                      <span className={pillClass}>{(record.metrics ?? []).length} {t('Metrics')}</span>
                    </div>
                    {(record.metrics ?? []).length > 0 && (
                      <div className={metricGridClass}>
                        {(record.metrics ?? []).map((metric) => (
                          <div className={metricTileClass} key={metric.key}>
                            <span>{metric.label}</span>
                            <strong>{metric.value} {metric.unit}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                    {record.images && record.images.length > 0 && (
                        <div className={photoGridSmallClass}>
                            {record.images.map((img, i) => (
                                <img key={i} src={img} alt="Progress" className={photoThumbClass} />
                            ))}
                        </div>
                    )}
                    {record.notes && <p className={noteLineClass}>{record.notes}</p>}
                  </div>
                  <div className={cn(actionRowClass, 'self-start')}>
                    <EditButton onClick={() => setOpenForm({ kind: 'progress-record', record })} />
                    <DeleteButton onConfirm={() => deleteProgressRecord(record.id)} confirmTitle="Delete this record?" />
                  </div>
                </div>
              </article>
            ))}
            {progressRecords.length === 0 ? <p className={mutedTextClass}>{t('No progress records yet.')}</p> : null}
          </div>
        </section>
      )}

      {/* Latest Progress Section */}
      {activeSection === 'latest-progress' && (
          <section className={sectionPanelClass}>
              <div className={sectionHeadingClass}>
                <div>
                  <h2>{t('Latest Progress')}</h2>
                  <p className={mutedTextClass}>{t('View your most recent measurements.')}</p>
                </div>
                {latestProgress && <EditButton onClick={() => setOpenForm({ kind: 'progress-record', record: latestProgress })} />}
              </div>
              {latestProgress ? (
                  <article className={detailCardClass}>
                      <div className={headingRowClass}>
                        <div>
                          <span className={kickerClass}>{t('Latest Progress')}</span>
                          <h3 className="text-base font-extrabold text-app-text">{formatDate(latestProgress.date)}</h3>
                        </div>
                        <span className={pillClass}>{latestProgress.metrics.length} {t('Metrics')}</span>
                      </div>
                      <div className={detailBodyClass}>
                          <div className={metricGridClass}>
                              {latestProgress.metrics.map((metric) => (
                                  <div className={metricTileClass} key={metric.key}>
                                      <span>{metric.label}</span>
                                      <strong>{metric.value} {metric.unit}</strong>
                                  </div>
                              ))}
                          </div>
                          {latestProgress.images && latestProgress.images.length > 0 && (
                              <div className={photoGridLargeClass}>
                                  {latestProgress.images.map((img, i) => (
                                      <img key={i} src={img} alt="Latest progress" className={photoLargeClass} />
                                  ))}
                              </div>
                          )}
                      </div>
                      {latestProgress.notes && <p className={noteLineClass}>{latestProgress.notes}</p>}
                  </article>
              ) : (
                  <EmptyState title="No progress recorded" message="Add your first progress record to see it here." />
              )}
          </section>
      )}

      {/* Nutrition - Meals Section */}
      {activeSection === 'nutrition-meals' && (
        <section className={sectionPanelClass}>
          <div className={sectionHeadingClass}>
            <div>
              <h2>{t('Daily Nutrition')}</h2>
              <p className={mutedTextClass}>{t('Track your meals and daily nutritional intake.')}</p>
            </div>
            <AddButton label="Add today's meal" onClick={() => setOpenForm({ kind: 'nutrition-meal' })} />
          </div>
          <div className={stackClass}>
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
                <article className={cardClass} key={entry.id}>
                  <div className="grid grid-cols-[1fr_auto] gap-4 max-[760px]:grid-cols-1">
                    <div className="grid gap-3">
                      <div className={headingRowClass}>
                        <div>
                          <span className={kickerClass}>{t('Daily totals')}</span>
                          <h3 className="text-base font-extrabold text-app-text">{formatDate(entry.date)}</h3>
                        </div>
                        {entry.water > 0 ? <span className={pillClass}>{t('Water')} {entry.water}L</span> : null}
                      </div>
                      <div className={metricGridClass}>
                        {totalMetrics.map((metric) => (
                          <div className={metricTileClass} key={metric.label}>
                            <span>{metric.label}</span>
                            <strong>{metric.value}</strong>
                          </div>
                        ))}
                      </div>
                      <div className="grid gap-2">
                        {meals.map((meal) => (
                          <section className="grid grid-cols-[4px_1fr] overflow-hidden rounded-control border border-app-border bg-app-surface-soft" key={meal.id}>
                            <div className={cn(mealAccentByType[meal.mealType || 'snack'] ?? mealAccentByType.snack)} aria-hidden="true" />
                            <div className="grid gap-2 p-3">
                              <div className={headingRowClass}>
                                <div>
                                  <strong className="block text-sm text-app-text">{t(meal.mealType || 'snack')}</strong>
                                  <span className="text-xs text-app-muted">{meal.time || t('Any time')}</span>
                                </div>
                                <span className={pillClass}>{Math.round(meal.calories ?? 0)} {t('kcal')}</span>
                              </div>
                              <p className={mutedTextClass}>{meal.customDescription || t('Detailed meal')}</p>
                              <div className={chipRowClass}>
                                <span><strong>{meal.protein ?? 0}g</strong> {t('protein')}</span>
                                <span><strong>{meal.carbs ?? 0}g</strong> {t('carbs')}</span>
                                <span><strong>{meal.fats ?? 0}g</strong> {t('fats')}</span>
                              </div>
                            </div>
                          </section>
                        ))}
                        {meals.length === 0 ? <div className="rounded-control border border-dashed border-app-border p-3 text-sm text-app-muted">{t('No meals recorded.')}</div> : null}
                      </div>
                      {entry.notes ? <p className={noteLineClass}>{entry.notes}</p> : null}
                    </div>
                    <div className={cn(actionRowClass, 'self-start')}>
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
      {activeSection === 'charts' && (
        <Suspense fallback={<LoadingState title="Loading charts" message="Preparing workout analytics..." variant="compact" />}>
          <ChartsSection
            exercises={exercises}
            plans={plans}
            sessions={sessions}
            progressRecords={progressRecords}
            nutritionEntries={nutritionEntries}
          />
        </Suspense>
      )}

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
