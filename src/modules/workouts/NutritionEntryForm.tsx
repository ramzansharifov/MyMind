import { useState, type FormEvent } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { EntityForm } from '../../shared/components/EntityForm';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { createId } from '../../shared/utils/idGenerator';
import type { MealRecord, NutritionEntry } from './types';

interface NutritionEntryFormProps {
  entry: NutritionEntry;
  onCancel: () => void;
  onSave: (entry: NutritionEntry) => void;
}

const mealTypes: MealRecord['mealType'][] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function NutritionEntryForm({ entry, onCancel, onSave }: NutritionEntryFormProps) {
  const [date, setDate] = useState(entry.date);
  const [water, setWater] = useState(String(entry.water ?? 0));
  const [notes, setNotes] = useState(entry.notes ?? '');
  const [meals, setMeals] = useState<MealRecord[]>(entry.meals ?? []);
  const { t } = useI18n();

  function updateMeal(id: string, patch: Partial<MealRecord>) {
    setMeals((current) => current.map((meal) => (meal.id === id ? { ...meal, ...patch } : meal)));
  }

  function addMeal() {
    setMeals((current) => [
      ...current,
      {
        id: createId('meal'),
        mealType: 'snack',
        time: '',
        customDescription: '',
        protein: 0,
        carbs: 0,
        fats: 0,
        calories: 0,
      },
    ]);
  }

  function removeMeal(id: string) {
    setMeals((current) => current.filter((meal) => meal.id !== id));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const timestamp = new Date().toISOString();
    onSave({
      ...entry,
      date,
      water: Number.parseFloat(water) || 0,
      notes: notes.trim(),
      meals: meals.map((meal) => ({
        ...meal,
        customDescription: meal.customDescription.trim(),
        protein: Number(meal.protein) || 0,
        carbs: Number(meal.carbs) || 0,
        fats: Number(meal.fats) || 0,
        calories: Number(meal.calories) || 0,
      })),
      updatedAt: timestamp,
    });
  }

  return (
    <EntityForm title="Edit nutrition day" saveLabel="Save food day" onCancel={onCancel} onSubmit={submit} wide>
      <div className="form-grid">
        <label>
          {t('Date')}
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label>
          {t('Water liters')}
          <input type="number" min="0" step="0.1" value={water} onChange={(event) => setWater(event.target.value)} />
        </label>
      </div>

      <div className="form-section">
        <div className="card-title-row">
          <strong>{t('Meals')}</strong>
          <AddButton label="Add meal" onClick={addMeal} />
        </div>
        <div className="nutrition-entry-meal-editor">
          {meals.map((meal) => (
            <article className="nutrition-entry-meal-row" key={meal.id}>
              <div className="form-grid">
                <label>
                  {t('Meal Type')}
                  <select value={meal.mealType} onChange={(event) => updateMeal(meal.id, { mealType: event.target.value as MealRecord['mealType'] })}>
                    {mealTypes.map((mealType) => (
                      <option value={mealType} key={mealType}>
                        {t(mealType)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('Time')}
                  <input type="time" value={meal.time} onChange={(event) => updateMeal(meal.id, { time: event.target.value })} />
                </label>
              </div>
              <label>
                {t('Description')}
                <textarea
                  rows={2}
                  value={meal.customDescription}
                  onChange={(event) => updateMeal(meal.id, { customDescription: event.target.value })}
                />
              </label>
              <div className="nutrition-entry-macro-editor">
                <label>
                  {t('Protein (g)')}
                  <input type="number" min="0" step="0.1" value={meal.protein} onChange={(event) => updateMeal(meal.id, { protein: Number(event.target.value) })} />
                </label>
                <label>
                  {t('Carbs (g)')}
                  <input type="number" min="0" step="0.1" value={meal.carbs} onChange={(event) => updateMeal(meal.id, { carbs: Number(event.target.value) })} />
                </label>
                <label>
                  {t('Fats (g)')}
                  <input type="number" min="0" step="0.1" value={meal.fats} onChange={(event) => updateMeal(meal.id, { fats: Number(event.target.value) })} />
                </label>
                <label>
                  {t('Calories (kcal)')}
                  <input type="number" min="0" step="1" value={meal.calories} onChange={(event) => updateMeal(meal.id, { calories: Number(event.target.value) })} />
                </label>
              </div>
              <div className="card-actions">
                <button className="button danger" type="button" onClick={() => removeMeal(meal.id)}>
                  {t('Remove')}
                </button>
              </div>
            </article>
          ))}
          {meals.length === 0 ? <p className="muted-text">{t('No meals recorded.')}</p> : null}
        </div>
      </div>

      <label>
        {t('Notes')}
        <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
    </EntityForm>
  );
}
