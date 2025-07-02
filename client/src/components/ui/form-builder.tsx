
import React, { useState, useCallback } from 'react';
import { useForm, Controller, FieldValues, Path } from 'react-hook-form';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Checkbox } from './checkbox';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { Label } from './label';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { AlertCircle, Plus, Trash2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file' | 'date' | 'time' | 'datetime-local';
  required?: boolean;
  placeholder?: string;
  validation?: {
    pattern?: RegExp;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    custom?: (value: any) => string | true;
  };
  options?: Array<{ value: string; label: string }>;
  disabled?: boolean;
  hidden?: boolean;
  conditional?: {
    field: string;
    value: any;
  };
  className?: string;
  helpText?: string;
}

export interface FormSection {
  title: string;
  description?: string;
  fields: FormField[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export interface FormBuilderProps {
  sections: FormSection[];
  onSubmit: (data: FieldValues) => void;
  loading?: boolean;
  submitText?: string;
  resetText?: string;
  showReset?: boolean;
  defaultValues?: FieldValues;
  className?: string;
  validateOnChange?: boolean;
  autoSave?: boolean;
  onAutoSave?: (data: FieldValues) => void;
}

export const FormBuilder: React.FC<FormBuilderProps> = ({
  sections,
  onSubmit,
  loading = false,
  submitText = 'Submit',
  resetText = 'Reset',
  showReset = true,
  defaultValues = {},
  className,
  validateOnChange = false,
  autoSave = false,
  onAutoSave
}) => {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
    getValues
  } = useForm({
    defaultValues,
    mode: validateOnChange ? 'onChange' : 'onSubmit'
  });

  const watchedValues = watch();

  // Auto-save functionality
  const handleAutoSave = useCallback(async () => {
    if (autoSave && onAutoSave && isDirty) {
      try {
        setAutoSaveStatus('saving');
        await onAutoSave(getValues());
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus(null), 2000);
      } catch (error) {
        setAutoSaveStatus('error');
        setTimeout(() => setAutoSaveStatus(null), 3000);
      }
    }
  }, [autoSave, onAutoSave, isDirty, getValues]);

  // Trigger auto-save on form changes
  React.useEffect(() => {
    const timeoutId = setTimeout(handleAutoSave, 1000);
    return () => clearTimeout(timeoutId);
  }, [watchedValues, handleAutoSave]);

  const toggleSection = (sectionTitle: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

  const isFieldVisible = (field: FormField): boolean => {
    if (field.hidden) return false;
    if (!field.conditional) return true;
    
    const dependentValue = watchedValues[field.conditional.field];
    return dependentValue === field.conditional.value;
  };

  const renderField = (field: FormField) => {
    if (!isFieldVisible(field)) return null;

    const error = errors[field.name];
    const fieldId = `field-${field.name}`;

    return (
      <div key={field.name} className={cn('space-y-2', field.className)}>
        <div className="flex items-center space-x-2">
          <Label htmlFor={fieldId} className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        </div>
        
        <Controller
          name={field.name as Path<FieldValues>}
          control={control}
          rules={{
            required: field.required ? `${field.label} is required` : false,
            pattern: field.validation?.pattern ? {
              value: field.validation.pattern,
              message: `Invalid ${field.label.toLowerCase()} format`
            } : undefined,
            min: field.validation?.min ? {
              value: field.validation.min,
              message: `Minimum value is ${field.validation.min}`
            } : undefined,
            max: field.validation?.max ? {
              value: field.validation.max,
              message: `Maximum value is ${field.validation.max}`
            } : undefined,
            minLength: field.validation?.minLength ? {
              value: field.validation.minLength,
              message: `Minimum length is ${field.validation.minLength}`
            } : undefined,
            maxLength: field.validation?.maxLength ? {
              value: field.validation.maxLength,
              message: `Maximum length is ${field.validation.maxLength}`
            } : undefined,
            validate: field.validation?.custom
          }}
          render={({ field: formField }) => {
            switch (field.type) {
              case 'textarea':
                return (
                  <Textarea
                    {...formField}
                    id={fieldId}
                    placeholder={field.placeholder}
                    disabled={field.disabled || loading}
                    className={error ? 'border-red-500' : ''}
                  />
                );

              case 'select':
                return (
                  <Select
                    value={formField.value}
                    onValueChange={formField.onChange}
                    disabled={field.disabled || loading}
                  >
                    <SelectTrigger className={error ? 'border-red-500' : ''}>
                      <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );

              case 'checkbox':
                return (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={fieldId}
                      checked={formField.value}
                      onCheckedChange={formField.onChange}
                      disabled={field.disabled || loading}
                    />
                    <Label htmlFor={fieldId} className="text-sm">
                      {field.label}
                    </Label>
                  </div>
                );

              case 'radio':
                return (
                  <RadioGroup
                    value={formField.value}
                    onValueChange={formField.onChange}
                    disabled={field.disabled || loading}
                  >
                    {field.options?.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={`${fieldId}-${option.value}`} />
                        <Label htmlFor={`${fieldId}-${option.value}`} className="text-sm">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                );

              default:
                return (
                  <Input
                    {...formField}
                    id={fieldId}
                    type={field.type}
                    placeholder={field.placeholder}
                    disabled={field.disabled || loading}
                    className={error ? 'border-red-500' : ''}
                  />
                );
            }
          }}
        />

        {error && (
          <div className="flex items-center space-x-1 text-red-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{error.message}</span>
          </div>
        )}

        {field.helpText && !error && (
          <p className="text-sm text-gray-500">{field.helpText}</p>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn('space-y-6', className)}>
      {sections.map((section, sectionIndex) => {
        const isCollapsed = section.collapsible && (
          collapsedSections[section.title] ?? section.defaultCollapsed ?? false
        );

        return (
          <Card key={sectionIndex}>
            <CardHeader 
              className={section.collapsible ? 'cursor-pointer' : ''}
              onClick={() => section.collapsible && toggleSection(section.title)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  {section.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {section.description}
                    </p>
                  )}
                </div>
                {section.collapsible && (
                  <Button type="button" variant="ghost" size="sm">
                    {isCollapsed ? <Plus className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </CardHeader>

            {!isCollapsed && (
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.fields.map(renderField)}
              </CardContent>
            )}
          </Card>
        );
      })}

      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center space-x-4">
          {autoSave && (
            <div className="flex items-center space-x-2">
              {autoSaveStatus === 'saving' && (
                <Badge variant="secondary">Saving...</Badge>
              )}
              {autoSaveStatus === 'saved' && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Save className="h-3 w-3 mr-1" />
                  Saved
                </Badge>
              )}
              {autoSaveStatus === 'error' && (
                <Badge variant="destructive">Save failed</Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          {showReset && (
            <Button
              type="button"
              variant="outline"
              onClick={() => reset()}
              disabled={loading || isSubmitting}
            >
              {resetText}
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading || isSubmitting}
            className="min-w-[100px]"
          >
            {(loading || isSubmitting) ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </div>
            ) : (
              submitText
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};
