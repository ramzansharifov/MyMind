import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type FieldValues, type UseFormProps, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

export { z };

export type SchemaForm<TValues extends FieldValues> = UseFormReturn<TValues>;

type TypedZodResolver<TValues extends FieldValues> = (schema: z.ZodType<TValues>) => UseFormProps<TValues>['resolver'];

export function useSchemaForm<TValues extends FieldValues>(
  schema: z.ZodType<TValues>,
  options: UseFormProps<TValues> = {},
): SchemaForm<TValues> {
  const resolveWithZod = zodResolver as unknown as TypedZodResolver<TValues>;
  return useForm<TValues>({
    ...options,
    resolver: resolveWithZod(schema),
  });
}