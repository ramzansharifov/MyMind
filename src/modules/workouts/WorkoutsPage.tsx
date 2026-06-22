import { lazy, Suspense, useState, type FormEvent } from 'react';
import { AddButton, DeleteButton, EditButton } from '../../shared/components/ActionButtons';
import { ContentGroupWorkspaceHeader, GroupFormDialog } from '../../shared/components/ContentGroupsPanel';
import { EmptyState } from '../../shared/components/EmptyState';
import { GroupsSidebar } from '../../shared/components/GroupsSidebar';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { PageTabs } from '../../shared/components/PageTabs';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { cn } from '../../shared/utils/classNames';
import { formatDate } from '../../shared/utils/dateUtils';
import { createId } from '../../shared/utils/idGenerator';
import { ExerciseForm } from './ExerciseForm';
import { ProgressRecordForm } from './ProgressRecordForm';
import { StartingPositionForm } from './StartingPositionForm';
import { WorkoutCard } from './WorkoutCard';
import { WorkoutPlanForm } from './WorkoutPlanForm';
import { WorkoutSessionForm } from './WorkoutSessionForm';
import { recentSessions, resultSummary, weekdayLabels } from './workoutUtils';
import type {
  ExerciseDefinition,
  ExerciseGroup,
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
interface WorkoutsPageProps {
  data: WorkoutData;
  onChange: (data: WorkoutData) => void;
}

type Section = 'exercises' | 'plans' | 'sessions' | 'starting-position' | 'progress' | 'latest-progress' | 'charts';

type OpenForm =
  | { kind: 'exercise'; exercise?: ExerciseDefinition | null }
  | { kind: 'plan'; plan?: WorkoutPlan | null }
  | { kind: 'session'; plan?: WorkoutPlan | null }
  | { kind: 'starting-position'; position?: StartingPosition | null }
  | { kind: 'progress-record'; record?: ProgressRecord | null }
  | null;

const SECTION_TABS: Array<{ id: Section; label: string }> = [
  { id: 'exercises', label: 'Exercises' },
  { id: 'plans', label: 'Plans' },
  { id: 'sessions', label: 'Workout Log' },
  { id: 'starting-position', label: 'Starting Position' },
  { id: 'progress', label: 'All Progress' },
  { id: 'latest-progress', label: 'Latest Progress' },
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

  const latestProgress = [...progressRecords].sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <section className="grid gap-5">
      <PageHeader
        title="Workouts"
        subtitle="Manage exercises, workouts, progress, and training plans."
      />

      <PageTabs tabs={SECTION_TABS} activeTab={activeSection} ariaLabel="Training sections" onChange={setActiveSection} />

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
            <GroupsSidebar
              title="Groups"
              totalCount={exercises.length}
              groups={[
                { id: 'all', title: 'All' },
                { id: 'ungrouped', title: 'No group' },
                ...exerciseGroups,
              ]}
              activeGroupId={activeExerciseGroupId}
              ariaLabel="Exercise groups"
              getGroupCount={(groupId) => {
                if (groupId === 'all') {
                  return exercises.length;
                }
                if (groupId === 'ungrouped') {
                  return exercises.filter((exercise) => !exercise.groupId).length;
                }
                return exercises.filter((exercise) => exercise.groupId === groupId).length;
              }}
              onActiveGroupChange={setActiveExerciseGroupId}
              onCreateGroup={() => setIsCreatingExerciseGroup(true)}
              createLabel="Add exercise group"
            >
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
            </GroupsSidebar>
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

      {/* Charts Section */}
      {activeSection === 'charts' && (
        <Suspense fallback={<LoadingState title="Loading charts" message="Preparing workout analytics..." variant="compact" />}>
          <ChartsSection
            exercises={exercises}
            plans={plans}
            sessions={sessions}
            progressRecords={progressRecords}
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
    </section>
  );
}
