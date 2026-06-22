import { AddButton, DeleteButton, EditButton } from '../../shared/components/ActionButtons';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeader } from '../../shared/components/PageHeader';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { cn } from '../../shared/utils/classNames';
import { formatDate } from '../../shared/utils/dateUtils';
import { createId } from '../../shared/utils/idGenerator';
import { NutritionEntryForm } from './NutritionEntryForm';
import { NutritionMealForm } from './NutritionMealForm';
import { useMemo, useState } from 'react';
import type { WorkoutData } from '../workouts/types';
import type { MealRecord, NutritionEntry } from './types';

interface NutritionPageProps {
  data: WorkoutData;
  onChange: (data: WorkoutData) => void;
}

type OpenForm =
  | { kind: 'nutrition-entry'; entry: NutritionEntry }
  | { kind: 'nutrition-meal'; meal?: MealRecord | null }
  | null;

const sectionPanelClass =
  'grid gap-4 rounded-panel border border-app-border bg-[var(--panel-bg)] p-4 text-app-text shadow-panel [backdrop-filter:var(--glass-blur)]';
const sectionHeadingClass = 'flex items-start justify-between gap-4 border-b border-[var(--line-soft)] pb-3 max-[760px]:flex-col';
const mutedTextClass = 'text-sm text-app-muted';
const cardClass = 'grid gap-3 rounded-panel border border-app-border bg-app-surface p-4 shadow-panel [backdrop-filter:var(--glass-blur)]';
const kickerClass = 'text-[11px] font-extrabold uppercase tracking-[0.12em] text-app-accent-strong';
const pillClass =
  'inline-flex w-fit shrink-0 items-center rounded-full border border-app-border bg-app-chip px-2.5 py-1 text-xs font-extrabold text-app-chip-text';
const headingRowClass = 'flex items-start justify-between gap-3 max-[640px]:flex-col';
const actionRowClass = 'flex flex-wrap items-center justify-end gap-2';
const metricGridClass = 'grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2.5';
const metricTileClass = 'grid gap-1 rounded-control border border-app-border bg-app-surface-soft p-3';
const chipRowClass = 'flex flex-wrap gap-2 text-sm text-app-muted';
const noteLineClass = 'whitespace-pre-wrap text-sm leading-6 text-app-muted';
const stackClass = 'grid gap-3';
const mealAccentByType: Record<MealRecord['mealType'], string> = {
  breakfast: 'bg-[var(--meal-breakfast)]',
  lunch: 'bg-[var(--meal-lunch)]',
  dinner: 'bg-[var(--meal-dinner)]',
  snack: 'bg-[var(--meal-snack)]',
};

export function NutritionPage({ data, onChange }: NutritionPageProps) {
  const [openForm, setOpenForm] = useState<OpenForm>(null);
  const { t } = useI18n();
  const nutritionEntries = data.nutritionEntries ?? [];
  const summary = useMemo(() => buildNutritionSummary(nutritionEntries), [nutritionEntries]);

  function saveNutritionEntry(meals: MealRecord[]) {
    const date = new Date().toISOString().slice(0, 10);
    const existingEntry = nutritionEntries.find((entry) => entry.date === date);

    if (existingEntry) {
      const existingMeals = Array.isArray(existingEntry.meals) ? existingEntry.meals : [];
      const updatedEntry = {
        ...existingEntry,
        meals: [...existingMeals, ...meals],
        updatedAt: new Date().toISOString(),
      };
      onChange({
        ...data,
        nutritionEntries: nutritionEntries.map((entry) => (entry.id === existingEntry.id ? updatedEntry : entry)),
      });
    } else {
      const timestamp = new Date().toISOString();
      const entry: NutritionEntry = {
        id: createId('nutrition'),
        date,
        meals,
        water: 0,
        notes: '',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      onChange({ ...data, nutritionEntries: [entry, ...nutritionEntries] });
    }
    setOpenForm(null);
  }

  function saveNutritionDay(entry: NutritionEntry) {
    onChange({
      ...data,
      nutritionEntries: nutritionEntries.map((item) => (item.id === entry.id ? entry : item)),
    });
    setOpenForm(null);
  }

  function deleteNutritionEntry(id: string) {
    onChange({ ...data, nutritionEntries: nutritionEntries.filter((item) => item.id !== id) });
  }

  return (
    <section className="grid gap-5">
      <PageHeader title="Nutrition" subtitle="Track meals, daily totals, water, and nutrition history." />

      <section className={sectionPanelClass}>
        <div className={sectionHeadingClass}>
          <div>
            <h2>{t('Daily Nutrition')}</h2>
            <p className={mutedTextClass}>{t('Track your meals and daily nutritional intake.')}</p>
          </div>
          <AddButton label="Add today's meal" onClick={() => setOpenForm({ kind: 'nutrition-meal' })} />
        </div>

        <div className={metricGridClass}>
          <SummaryTile label="Nutrition Entries" value={summary.days} />
          <SummaryTile label="Meals" value={summary.meals} />
          <SummaryTile label="Average calories" value={summary.averageCalories ? Math.round(summary.averageCalories) : 0} />
          <SummaryTile label="Average water" value={`${summary.averageWater.toFixed(1)}L`} />
        </div>

        <div className={stackClass}>
          {nutritionEntries.filter(Boolean).map((entry) => (
            <NutritionEntryCard
              key={entry.id}
              entry={entry}
              onEdit={() => setOpenForm({ kind: 'nutrition-entry', entry })}
              onDelete={() => deleteNutritionEntry(entry.id)}
            />
          ))}
          {nutritionEntries.length === 0 ? (
            <EmptyState title="No nutrition entries" message="Start logging your daily meals and nutrition." />
          ) : null}
        </div>
      </section>

      {openForm?.kind === 'nutrition-entry' ? (
        <NutritionEntryForm entry={openForm.entry} onCancel={() => setOpenForm(null)} onSave={saveNutritionDay} />
      ) : null}
      {openForm?.kind === 'nutrition-meal' ? (
        <NutritionMealForm meal={openForm.meal} onCancel={() => setOpenForm(null)} onSave={(meal) => saveNutritionEntry([meal])} />
      ) : null}
    </section>
  );
}

function SummaryTile({ label, value }: { label: string; value: string | number }) {
  const { t } = useI18n();
  return (
    <div className={metricTileClass}>
      <span>{t(label)}</span>
      <strong>{value}</strong>
    </div>
  );
}

function NutritionEntryCard({ entry, onEdit, onDelete }: { entry: NutritionEntry; onEdit: () => void; onDelete: () => void }) {
  const { t } = useI18n();
  const meals = (Array.isArray(entry.meals) ? entry.meals : []).filter(Boolean);
  const totals = buildEntryTotals(entry);
  const totalMetrics = [
    { label: t('protein'), value: `${totals.protein.toFixed(1)}g` },
    { label: t('carbs'), value: `${totals.carbs.toFixed(1)}g` },
    { label: t('fats'), value: `${totals.fats.toFixed(1)}g` },
    { label: t('kcal'), value: String(Math.round(totals.calories)) },
  ];

  return (
    <article className={cardClass}>
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
                <div className={cn(mealAccentByType[meal.mealType] ?? mealAccentByType.snack)} aria-hidden="true" />
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
            {meals.length === 0 ? (
              <div className="rounded-control border border-dashed border-app-border p-3 text-sm text-app-muted">{t('No meals recorded.')}</div>
            ) : null}
          </div>
          {entry.notes ? <p className={noteLineClass}>{entry.notes}</p> : null}
        </div>
        <div className={cn(actionRowClass, 'self-start')}>
          <EditButton onClick={onEdit} />
          <DeleteButton onConfirm={onDelete} confirmTitle="Delete this day's record?" />
        </div>
      </div>
    </article>
  );
}

function buildEntryTotals(entry: NutritionEntry) {
  const meals = Array.isArray(entry.meals) ? entry.meals : [];
  return meals.reduce(
    (totals, meal) => ({
      protein: totals.protein + (Number(meal.protein) || 0),
      carbs: totals.carbs + (Number(meal.carbs) || 0),
      fats: totals.fats + (Number(meal.fats) || 0),
      calories: totals.calories + (Number(meal.calories) || 0),
    }),
    { protein: 0, carbs: 0, fats: 0, calories: 0 },
  );
}

function buildNutritionSummary(entries: NutritionEntry[]) {
  const totals = entries.reduce(
    (summary, entry) => {
      const entryTotals = buildEntryTotals(entry);
      return {
        days: summary.days + 1,
        meals: summary.meals + (Array.isArray(entry.meals) ? entry.meals.length : 0),
        calories: summary.calories + entryTotals.calories,
        water: summary.water + (Number(entry.water) || 0),
      };
    },
    { days: 0, meals: 0, calories: 0, water: 0 },
  );

  return {
    ...totals,
    averageCalories: totals.days ? totals.calories / totals.days : 0,
    averageWater: totals.days ? totals.water / totals.days : 0,
  };
}
