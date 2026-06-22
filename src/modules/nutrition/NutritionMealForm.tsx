import { useState, type FormEvent } from 'react';
import { EntityForm } from '../../shared/components/EntityForm';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { createId } from '../../shared/utils/idGenerator';
import type { MealRecord } from './types';

const formGridClass = 'grid grid-cols-2 gap-3 max-[640px]:grid-cols-1';

interface NutritionMealFormProps {
  meal?: MealRecord | null;
  onCancel: () => void;
  onSave: (meal: MealRecord) => void;
}

export function NutritionMealForm({ meal, onCancel, onSave }: NutritionMealFormProps) {
  const [mealType, setMealType] = useState<MealRecord['mealType']>(meal?.mealType ?? 'breakfast');
  const [time, setTime] = useState(meal?.time ?? new Date().toTimeString().slice(0, 5));
  const [customDescription, setCustomDescription] = useState(meal?.customDescription ?? '');
  const [protein, setProtein] = useState(String(meal?.protein ?? '0'));
  const [carbs, setCarbs] = useState(String(meal?.carbs ?? '0'));
  const [fats, setFats] = useState(String(meal?.fats ?? '0'));
  const [calories, setCalories] = useState(String(meal?.calories ?? '0'));
  const { t } = useI18n();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({
      id: meal?.id ?? createId('meal'),
      mealType,
      time,
      customDescription: customDescription.trim(),
      protein: Number.parseFloat(protein) || 0,
      carbs: Number.parseFloat(carbs) || 0,
      fats: Number.parseFloat(fats) || 0,
      calories: Number.parseFloat(calories) || 0,
    });
  }

  return (
    <EntityForm title={meal ? 'Edit meal' : 'Add meal'} saveLabel="Save meal" onCancel={onCancel} onSubmit={submit}>
      <div className={formGridClass}>
        <label>
          {t('Meal Type')}
          <select value={mealType} onChange={(event) => setMealType(event.target.value as MealRecord['mealType'])}>
            <option value="breakfast">{t('Breakfast')}</option>
            <option value="lunch">{t('Lunch')}</option>
            <option value="dinner">{t('Dinner')}</option>
            <option value="snack">{t('Snack')}</option>
          </select>
        </label>
        <label>
          {t('Time')}
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>
      </div>

      <label>
        {t('Description')}
        <textarea
          rows={3}
          value={customDescription}
          placeholder={t('What did you eat?')}
          onChange={(event) => setCustomDescription(event.target.value)}
        />
      </label>

      <div className={formGridClass}>
        <label>
          {t('Protein (g)')}
          <input type="number" step="0.1" value={protein} onChange={(event) => setProtein(event.target.value)} />
        </label>
        <label>
          {t('Carbs (g)')}
          <input type="number" step="0.1" value={carbs} onChange={(event) => setCarbs(event.target.value)} />
        </label>
        <label>
          {t('Fats (g)')}
          <input type="number" step="0.1" value={fats} onChange={(event) => setFats(event.target.value)} />
        </label>
        <label>
          {t('Calories (kcal)')}
          <input type="number" step="1" value={calories} onChange={(event) => setCalories(event.target.value)} />
        </label>
      </div>
    </EntityForm>
  );
}
