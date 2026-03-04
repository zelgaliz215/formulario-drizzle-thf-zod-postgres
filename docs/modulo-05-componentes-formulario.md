# Módulo 5: Componentes de Formulario Reutilizables

## Objetivo del Módulo

Al finalizar este módulo tendrás:
- Componentes de formulario integrados con React Hook Form
- Wrapper sobre Shadcn/ui con manejo automático de errores
- Componentes para todos los tipos de input requeridos
- Sistema consistente y reutilizable en toda la aplicación

---

## 5.1 Filosofía de los Componentes

Vamos a crear componentes que:

1. **Se integran con React Hook Form** usando `useFormContext` (no props drilling de `register`)
2. **Muestran errores automáticamente** leyendo del estado del form
3. **Son accesibles** con labels, descripciones y ARIA attributes
4. **Manejan estados** de loading y disabled consistentemente
5. **Son tipados** con TypeScript estricto

### Patrón Base

Todos los componentes seguirán esta estructura:

```typescript
// 1. Usa useFormContext para acceder al form
const { control, formState: { errors } } = useFormContext();

// 2. Usa Controller de RHF para inputs controlados
<Controller
  name={name}
  control={control}
  render={({ field }) => (
    // 3. Renderiza el componente de Shadcn/ui
    <Input {...field} />
  )}
/>

// 4. Muestra errores del campo automáticamente
{errors[name] && <span>{errors[name].message}</span>}
```

---

## 5.2 Componente Base: FormField Wrapper

Primero creamos un wrapper que maneja la estructura común de todos los campos.

Crea el archivo `components/forms/form-field-wrapper.tsx`:

```typescript
'use client';

import { ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldWrapperProps {
  name: string;
  label?: string;
  description?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormFieldWrapper({
  name,
  label,
  description,
  required = false,
  children,
  className,
}: FormFieldWrapperProps) {
  const { formState: { errors } } = useFormContext();
  
  // Acceder a errores anidados (ej: "direccion.calle")
  const error = name.split('.').reduce((obj: any, key) => obj?.[key], errors);
  const errorMessage = error?.message as string | undefined;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label 
          htmlFor={name}
          className={cn(
            'text-sm font-medium',
            errorMessage && 'text-destructive'
          )}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      {children}
      
      {description && !errorMessage && (
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      {errorMessage && (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
```

---

## 5.3 FormInput - Input de Texto

Crea el archivo `components/forms/form-input.tsx`:

```typescript
'use client';

import { useFormContext, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { FormFieldWrapper } from './form-field-wrapper';
import { cn } from '@/lib/utils';

interface FormInputProps {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'url' | 'tel';
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  autoComplete?: string;
  maxLength?: number;
}

export function FormInput({
  name,
  label,
  description,
  placeholder,
  type = 'text',
  required = false,
  disabled = false,
  className,
  inputClassName,
  autoComplete,
  maxLength,
}: FormInputProps) {
  const { control, formState: { errors } } = useFormContext();
  
  const error = name.split('.').reduce((obj: any, key) => obj?.[key], errors);
  const hasError = !!error;

  return (
    <FormFieldWrapper
      name={name}
      label={label}
      description={description}
      required={required}
      className={className}
    >
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            id={name}
            type={type}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete={autoComplete}
            maxLength={maxLength}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${name}-error` : undefined}
            className={cn(
              hasError && 'border-destructive focus-visible:ring-destructive',
              inputClassName
            )}
          />
        )}
      />
    </FormFieldWrapper>
  );
}
```

---

## 5.4 FormTextarea - Área de Texto

Crea el archivo `components/forms/form-textarea.tsx`:

```typescript
'use client';

import { useFormContext, Controller } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import { FormFieldWrapper } from './form-field-wrapper';
import { cn } from '@/lib/utils';

interface FormTextareaProps {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  textareaClassName?: string;
  rows?: number;
  maxLength?: number;
  showCount?: boolean;
}

export function FormTextarea({
  name,
  label,
  description,
  placeholder,
  required = false,
  disabled = false,
  className,
  textareaClassName,
  rows = 4,
  maxLength,
  showCount = false,
}: FormTextareaProps) {
  const { control, formState: { errors }, watch } = useFormContext();
  
  const error = name.split('.').reduce((obj: any, key) => obj?.[key], errors);
  const hasError = !!error;
  
  const value = watch(name) || '';
  const charCount = typeof value === 'string' ? value.length : 0;

  return (
    <FormFieldWrapper
      name={name}
      label={label}
      description={description}
      required={required}
      className={className}
    >
      <div className="relative">
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              id={name}
              placeholder={placeholder}
              disabled={disabled}
              rows={rows}
              maxLength={maxLength}
              aria-invalid={hasError}
              className={cn(
                hasError && 'border-destructive focus-visible:ring-destructive',
                textareaClassName
              )}
            />
          )}
        />
        
        {showCount && maxLength && (
          <span 
            className={cn(
              'absolute bottom-2 right-2 text-xs text-muted-foreground',
              charCount > maxLength * 0.9 && 'text-amber-500',
              charCount >= maxLength && 'text-destructive'
            )}
          >
            {charCount}/{maxLength}
          </span>
        )}
      </div>
    </FormFieldWrapper>
  );
}
```

---

## 5.5 FormSelect - Select/Dropdown

Crea el archivo `components/forms/form-select.tsx`:

```typescript
'use client';

import { useFormContext, Controller } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormFieldWrapper } from './form-field-wrapper';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface FormSelectProps {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  options: SelectOption[];
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function FormSelect({
  name,
  label,
  description,
  placeholder = 'Seleccionar...',
  options,
  required = false,
  disabled = false,
  className,
}: FormSelectProps) {
  const { control, formState: { errors } } = useFormContext();
  
  const error = name.split('.').reduce((obj: any, key) => obj?.[key], errors);
  const hasError = !!error;

  return (
    <FormFieldWrapper
      name={name}
      label={label}
      description={description}
      required={required}
      className={className}
    >
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger
              id={name}
              aria-invalid={hasError}
              className={cn(
                hasError && 'border-destructive focus:ring-destructive'
              )}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </FormFieldWrapper>
  );
}
```

---

## 5.6 FormRadioGroup - Grupo de Radio Buttons

Crea el archivo `components/forms/form-radio-group.tsx`:

```typescript
'use client';

import { useFormContext, Controller } from 'react-hook-form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FormFieldWrapper } from './form-field-wrapper';
import { cn } from '@/lib/utils';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface FormRadioGroupProps {
  name: string;
  label?: string;
  description?: string;
  options: RadioOption[];
  required?: boolean;
  disabled?: boolean;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function FormRadioGroup({
  name,
  label,
  description,
  options,
  required = false,
  disabled = false,
  className,
  orientation = 'vertical',
}: FormRadioGroupProps) {
  const { control, formState: { errors } } = useFormContext();
  
  const error = name.split('.').reduce((obj: any, key) => obj?.[key], errors);
  const hasError = !!error;

  return (
    <FormFieldWrapper
      name={name}
      label={label}
      description={description}
      required={required}
      className={className}
    >
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <RadioGroup
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled}
            className={cn(
              orientation === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-2'
            )}
            aria-invalid={hasError}
          >
            {options.map((option) => (
              <div key={option.value} className="flex items-start space-x-2">
                <RadioGroupItem
                  value={option.value}
                  id={`${name}-${option.value}`}
                  disabled={option.disabled || disabled}
                  className={cn(
                    hasError && 'border-destructive'
                  )}
                />
                <div className="grid gap-0.5">
                  <Label
                    htmlFor={`${name}-${option.value}`}
                    className={cn(
                      'font-normal cursor-pointer',
                      (option.disabled || disabled) && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    {option.label}
                  </Label>
                  {option.description && (
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </RadioGroup>
        )}
      />
    </FormFieldWrapper>
  );
}
```

---

## 5.7 FormCheckbox - Checkbox Individual

Crea el archivo `components/forms/form-checkbox.tsx`:

```typescript
'use client';

import { useFormContext, Controller } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormCheckboxProps {
  name: string;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function FormCheckbox({
  name,
  label,
  description,
  disabled = false,
  className,
}: FormCheckboxProps) {
  const { control, formState: { errors } } = useFormContext();
  
  const error = name.split('.').reduce((obj: any, key) => obj?.[key], errors);
  const hasError = !!error;
  const errorMessage = error?.message as string | undefined;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-start space-x-3">
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Checkbox
              id={name}
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
              aria-invalid={hasError}
              className={cn(
                'mt-0.5',
                hasError && 'border-destructive'
              )}
            />
          )}
        />
        <div className="grid gap-0.5">
          <Label
            htmlFor={name}
            className={cn(
              'font-normal cursor-pointer',
              disabled && 'cursor-not-allowed opacity-50',
              hasError && 'text-destructive'
            )}
          >
            {label}
          </Label>
          {description && (
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      
      {errorMessage && (
        <p className="text-sm text-destructive ml-7" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
```

---

## 5.8 FormDatePicker - Selector de Fecha

Crea el archivo `components/forms/form-date-picker.tsx`:

```typescript
'use client';

import { useFormContext, Controller } from 'react-hook-form';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FormFieldWrapper } from './form-field-wrapper';
import { cn } from '@/lib/utils';

interface FormDatePickerProps {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: (date: Date) => boolean;
}

export function FormDatePicker({
  name,
  label,
  description,
  placeholder = 'Seleccionar fecha',
  required = false,
  disabled = false,
  className,
  minDate,
  maxDate,
  disabledDates,
}: FormDatePickerProps) {
  const { control, formState: { errors } } = useFormContext();
  
  const error = name.split('.').reduce((obj: any, key) => obj?.[key], errors);
  const hasError = !!error;

  // Función para deshabilitar fechas
  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    if (disabledDates) return disabledDates(date);
    return false;
  };

  return (
    <FormFieldWrapper
      name={name}
      label={label}
      description={description}
      required={required}
      className={className}
    >
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          // Convertir string 'YYYY-MM-DD' a Date para el calendario
          const dateValue = field.value 
            ? parse(field.value, 'yyyy-MM-dd', new Date())
            : undefined;

          return (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id={name}
                  variant="outline"
                  disabled={disabled}
                  aria-invalid={hasError}
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !field.value && 'text-muted-foreground',
                    hasError && 'border-destructive focus:ring-destructive'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {field.value ? (
                    format(dateValue!, 'PPP', { locale: es })
                  ) : (
                    <span>{placeholder}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateValue}
                  onSelect={(date) => {
                    // Convertir Date a string 'YYYY-MM-DD' para el formulario
                    field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                  }}
                  disabled={isDateDisabled}
                  locale={es}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          );
        }}
      />
    </FormFieldWrapper>
  );
}
```

---

## 5.9 FormNumberInput - Input Numérico

Crea el archivo `components/forms/form-number-input.tsx`:

```typescript
'use client';

import { useFormContext, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';
import { FormFieldWrapper } from './form-field-wrapper';
import { cn } from '@/lib/utils';

interface FormNumberInputProps {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  showStepper?: boolean;
}

export function FormNumberInput({
  name,
  label,
  description,
  placeholder,
  required = false,
  disabled = false,
  className,
  min,
  max,
  step = 1,
  showStepper = false,
}: FormNumberInputProps) {
  const { control, formState: { errors } } = useFormContext();
  
  const error = name.split('.').reduce((obj: any, key) => obj?.[key], errors);
  const hasError = !!error;

  return (
    <FormFieldWrapper
      name={name}
      label={label}
      description={description}
      required={required}
      className={className}
    >
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          const currentValue = typeof field.value === 'number' ? field.value : 0;

          const handleIncrement = () => {
            const newValue = currentValue + step;
            if (max === undefined || newValue <= max) {
              field.onChange(newValue);
            }
          };

          const handleDecrement = () => {
            const newValue = currentValue - step;
            if (min === undefined || newValue >= min) {
              field.onChange(newValue);
            }
          };

          if (showStepper) {
            return (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={disabled || (min !== undefined && currentValue <= min)}
                  onClick={handleDecrement}
                  className="h-9 w-9"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                
                <Input
                  {...field}
                  id={name}
                  type="number"
                  placeholder={placeholder}
                  disabled={disabled}
                  min={min}
                  max={max}
                  step={step}
                  onChange={(e) => {
                    const value = e.target.value === '' ? '' : Number(e.target.value);
                    field.onChange(value);
                  }}
                  aria-invalid={hasError}
                  className={cn(
                    'text-center w-20',
                    hasError && 'border-destructive focus-visible:ring-destructive'
                  )}
                />
                
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={disabled || (max !== undefined && currentValue >= max)}
                  onClick={handleIncrement}
                  className="h-9 w-9"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            );
          }

          return (
            <Input
              {...field}
              id={name}
              type="number"
              placeholder={placeholder}
              disabled={disabled}
              min={min}
              max={max}
              step={step}
              onChange={(e) => {
                const value = e.target.value === '' ? '' : Number(e.target.value);
                field.onChange(value);
              }}
              aria-invalid={hasError}
              className={cn(
                hasError && 'border-destructive focus-visible:ring-destructive'
              )}
            />
          );
        }}
      />
    </FormFieldWrapper>
  );
}
```

---

## 5.10 FormPasswordInput - Input de Contraseña

Crea el archivo `components/forms/form-password-input.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { FormFieldWrapper } from './form-field-wrapper';
import { cn } from '@/lib/utils';

interface FormPasswordInputProps {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  autoComplete?: 'current-password' | 'new-password' | 'off';
}

export function FormPasswordInput({
  name,
  label,
  description,
  placeholder = '••••••••',
  required = false,
  disabled = false,
  className,
  autoComplete = 'off',
}: FormPasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { control, formState: { errors } } = useFormContext();
  
  const error = name.split('.').reduce((obj: any, key) => obj?.[key], errors);
  const hasError = !!error;

  return (
    <FormFieldWrapper
      name={name}
      label={label}
      description={description}
      required={required}
      className={className}
    >
      <div className="relative">
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id={name}
              type={showPassword ? 'text' : 'password'}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete={autoComplete}
              aria-invalid={hasError}
              className={cn(
                'pr-10',
                hasError && 'border-destructive focus-visible:ring-destructive'
              )}
            />
          )}
        />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
    </FormFieldWrapper>
  );
}
```

---

## 5.11 FormFileUpload - Upload de Archivo Simple

Crea el archivo `components/forms/form-file-upload.tsx`:

```typescript
'use client';

import { useRef } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Upload, X, File } from 'lucide-react';
import { FormFieldWrapper } from './form-field-wrapper';
import { formatearTamanioArchivo } from '@/lib/validations';
import { cn } from '@/lib/utils';

interface FormFileUploadProps {
  name: string;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  accept?: string;
  maxSize?: number; // en bytes
}

export function FormFileUpload({
  name,
  label,
  description,
  required = false,
  disabled = false,
  className,
  accept,
  maxSize,
}: FormFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { control, formState: { errors }, setError, clearErrors } = useFormContext();
  
  const error = name.split('.').reduce((obj: any, key) => obj?.[key], errors);
  const hasError = !!error;

  return (
    <FormFieldWrapper
      name={name}
      label={label}
      description={description}
      required={required}
      className={className}
    >
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value } }) => {
          const file = value as File | null;

          const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const selectedFile = e.target.files?.[0] || null;
            
            if (selectedFile) {
              // Validar tamaño
              if (maxSize && selectedFile.size > maxSize) {
                setError(name, {
                  type: 'manual',
                  message: `El archivo excede el tamaño máximo de ${formatearTamanioArchivo(maxSize)}`,
                });
                return;
              }
              clearErrors(name);
            }
            
            onChange(selectedFile);
          };

          const handleRemove = () => {
            onChange(null);
            if (inputRef.current) {
              inputRef.current.value = '';
            }
          };

          return (
            <div>
              <input
                ref={inputRef}
                type="file"
                accept={accept}
                onChange={handleFileChange}
                disabled={disabled}
                className="hidden"
                id={`${name}-input`}
              />

              {!file ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  onClick={() => inputRef.current?.click()}
                  className={cn(
                    'w-full',
                    hasError && 'border-destructive'
                  )}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Seleccionar archivo
                </Button>
              ) : (
                <div className={cn(
                  'flex items-center gap-3 p-3 rounded-md border bg-muted/50',
                  hasError && 'border-destructive'
                )}>
                  <File className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatearTamanioArchivo(file.size)}
                    </p>
                  </div>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={disabled}
                    onClick={handleRemove}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          );
        }}
      />
    </FormFieldWrapper>
  );
}
```

---

## 5.12 FormFileDragDrop - Upload con Drag & Drop

Crea el archivo `components/forms/form-file-drag-drop.tsx`:

```typescript
'use client';

import { useState, useRef, useCallback } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Upload, X, File, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormFieldWrapper } from './form-field-wrapper';
import { formatearTamanioArchivo } from '@/lib/validations';
import { cn } from '@/lib/utils';

interface FormFileDragDropProps {
  name: string;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  accept?: string;
  maxSize?: number;
  acceptedTypesLabel?: string;
}

export function FormFileDragDrop({
  name,
  label,
  description,
  required = false,
  disabled = false,
  className,
  accept,
  maxSize,
  acceptedTypesLabel = 'PDF, JPG, PNG, DOC, DOCX',
}: FormFileDragDropProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { control, formState: { errors }, setError, clearErrors } = useFormContext();
  
  const error = name.split('.').reduce((obj: any, key) => obj?.[key], errors);
  const hasError = !!error;

  const validateFile = useCallback((file: File): boolean => {
    // Validar tipo si hay restricción
    if (accept) {
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const isValidType = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', '/'));
        }
        return file.type === type;
      });
      
      if (!isValidType) {
        setError(name, {
          type: 'manual',
          message: `Tipo de archivo no permitido. Use: ${acceptedTypesLabel}`,
        });
        return false;
      }
    }

    // Validar tamaño
    if (maxSize && file.size > maxSize) {
      setError(name, {
        type: 'manual',
        message: `El archivo excede el tamaño máximo de ${formatearTamanioArchivo(maxSize)}`,
      });
      return false;
    }

    clearErrors(name);
    return true;
  }, [accept, acceptedTypesLabel, maxSize, name, setError, clearErrors]);

  return (
    <FormFieldWrapper
      name={name}
      label={label}
      description={description}
      required={required}
      className={className}
    >
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value } }) => {
          const file = value as File | null;

          const handleDragOver = (e: React.DragEvent) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
          };

          const handleDragLeave = (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
          };

          const handleDrop = (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            
            if (disabled) return;
            
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile && validateFile(droppedFile)) {
              onChange(droppedFile);
            }
          };

          const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile && validateFile(selectedFile)) {
              onChange(selectedFile);
            }
          };

          const handleRemove = () => {
            onChange(null);
            if (inputRef.current) {
              inputRef.current.value = '';
            }
          };

          return (
            <div>
              <input
                ref={inputRef}
                type="file"
                accept={accept}
                onChange={handleFileChange}
                disabled={disabled}
                className="hidden"
                id={`${name}-input`}
              />

              {!file ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !disabled && inputRef.current?.click()}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                    'hover:border-primary/50 hover:bg-muted/50',
                    isDragging && 'border-primary bg-primary/5',
                    hasError && 'border-destructive',
                    disabled && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <Upload className={cn(
                    'mx-auto h-10 w-10 mb-3',
                    isDragging ? 'text-primary' : 'text-muted-foreground'
                  )} />
                  
                  <p className="text-sm font-medium mb-1">
                    {isDragging ? 'Suelta el archivo aquí' : 'Arrastra un archivo o haz clic para seleccionar'}
                  </p>
                  
                  <p className="text-xs text-muted-foreground">
                    {acceptedTypesLabel}
                    {maxSize && ` • Máximo ${formatearTamanioArchivo(maxSize)}`}
                  </p>
                </div>
              ) : (
                <div className={cn(
                  'flex items-center gap-3 p-4 rounded-lg border bg-muted/50',
                  hasError && 'border-destructive'
                )}>
                  <div className="flex-shrink-0 w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                    <File className="h-6 w-6 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatearTamanioArchivo(file.size)}
                    </p>
                  </div>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={disabled}
                    onClick={handleRemove}
                    className="flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          );
        }}
      />
    </FormFieldWrapper>
  );
}
```

---

## 5.13 FormTagInput - Input de Etiquetas/Tags

Crea el archivo `components/forms/form-tag-input.tsx`:

```typescript
'use client';

import { useState, KeyboardEvent } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { FormFieldWrapper } from './form-field-wrapper';
import { cn } from '@/lib/utils';

interface FormTagInputProps {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  maxTags?: number;
  maxTagLength?: number;
}

export function FormTagInput({
  name,
  label,
  description,
  placeholder = 'Escriba y presione Enter',
  required = false,
  disabled = false,
  className,
  maxTags = 10,
  maxTagLength = 30,
}: FormTagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const { control, formState: { errors } } = useFormContext();
  
  const error = name.split('.').reduce((obj: any, key) => obj?.[key], errors);
  const hasError = !!error;

  return (
    <FormFieldWrapper
      name={name}
      label={label}
      description={description}
      required={required}
      className={className}
    >
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value } }) => {
          const tags = (value as string[]) || [];

          const addTag = (tag: string) => {
            const trimmedTag = tag.trim().toLowerCase();
            
            // Validaciones
            if (!trimmedTag) return;
            if (trimmedTag.length > maxTagLength) return;
            if (tags.includes(trimmedTag)) return;
            if (tags.length >= maxTags) return;
            
            onChange([...tags, trimmedTag]);
            setInputValue('');
          };

          const removeTag = (tagToRemove: string) => {
            onChange(tags.filter((tag) => tag !== tagToRemove));
          };

          const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag(inputValue);
            } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
              // Eliminar última etiqueta si el input está vacío
              removeTag(tags[tags.length - 1]);
            }
          };

          const handleBlur = () => {
            // Agregar etiqueta al perder foco si hay texto
            if (inputValue.trim()) {
              addTag(inputValue);
            }
          };

          return (
            <div className={cn(
              'flex flex-wrap gap-2 p-2 rounded-md border bg-background min-h-[42px]',
              hasError && 'border-destructive',
              disabled && 'opacity-50'
            )}>
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {tag}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeTag(tag)}
                    className="ml-1 rounded-full hover:bg-muted p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              
              {tags.length < maxTags && (
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  disabled={disabled}
                  placeholder={tags.length === 0 ? placeholder : ''}
                  className="flex-1 min-w-[120px] border-0 p-0 h-6 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              )}
            </div>
          );
        }}
      />
      
      {maxTags && (
        <p className="text-xs text-muted-foreground mt-1">
          Máximo {maxTags} etiquetas
        </p>
      )}
    </FormFieldWrapper>
  );
}
```

---

## 5.14 Exportar Todos los Componentes

Crea el archivo `components/forms/index.ts`:

```typescript
// Wrapper base
export { FormFieldWrapper } from './form-field-wrapper';

// Inputs de texto
export { FormInput } from './form-input';
export { FormTextarea } from './form-textarea';
export { FormPasswordInput } from './form-password-input';

// Selección
export { FormSelect, type SelectOption } from './form-select';
export { FormRadioGroup, type RadioOption } from './form-radio-group';
export { FormCheckbox } from './form-checkbox';

// Numéricos y fechas
export { FormNumberInput } from './form-number-input';
export { FormDatePicker } from './form-date-picker';

// Archivos
export { FormFileUpload } from './form-file-upload';
export { FormFileDragDrop } from './form-file-drag-drop';

// Otros
export { FormTagInput } from './form-tag-input';
```

---

## 5.15 Ejemplo de Uso Completo

Así se verían los componentes en acción:

```typescript
'use client';

import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { documentoFormSchema, documentoFormDefaults, type DocumentoFormValues } from '@/lib/validations';
import {
  FormInput,
  FormTextarea,
  FormSelect,
  FormRadioGroup,
  FormCheckbox,
  FormDatePicker,
  FormNumberInput,
  FormPasswordInput,
  FormFileDragDrop,
  FormTagInput,
} from '@/components/forms';
import { Button } from '@/components/ui/button';
import { 
  TIPOS_DOCUMENTO, 
  TIPO_DOCUMENTO_LABELS,
  ESTADOS_DOCUMENTO,
  ESTADO_DOCUMENTO_LABELS,
  PRIORIDADES_DOCUMENTO,
  PRIORIDAD_DOCUMENTO_LABELS,
} from '@/db/schema';

export function DocumentoFormExample() {
  const form = useForm<DocumentoFormValues>({
    resolver: zodResolver(documentoFormSchema),
    defaultValues: documentoFormDefaults,
  });

  const onSubmit = async (data: DocumentoFormValues) => {
    console.log('Datos del formulario:', data);
  };

  // Opciones para selects/radios
  const tipoOptions = TIPOS_DOCUMENTO.map(tipo => ({
    value: tipo,
    label: TIPO_DOCUMENTO_LABELS[tipo],
  }));

  const estadoOptions = ESTADOS_DOCUMENTO.map(estado => ({
    value: estado,
    label: ESTADO_DOCUMENTO_LABELS[estado],
  }));

  const prioridadOptions = PRIORIDADES_DOCUMENTO.map(prioridad => ({
    value: prioridad,
    label: PRIORIDAD_DOCUMENTO_LABELS[prioridad],
  }));

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Inputs de texto */}
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            name="codigo"
            label="Código"
            placeholder="RES-2024-001"
            required
          />
          <FormInput
            name="titulo"
            label="Título"
            placeholder="Título del documento"
            required
          />
        </div>

        <FormTextarea
          name="descripcion"
          label="Descripción"
          placeholder="Descripción detallada del documento..."
          rows={3}
          maxLength={2000}
          showCount
        />

        {/* Select y Radio */}
        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            name="tipo"
            label="Tipo de Documento"
            options={tipoOptions}
            required
          />
          <FormSelect
            name="estado"
            label="Estado"
            options={estadoOptions}
          />
        </div>

        <FormRadioGroup
          name="prioridad"
          label="Prioridad"
          options={prioridadOptions}
          orientation="horizontal"
        />

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-4">
          <FormDatePicker
            name="fechaExpedicion"
            label="Fecha de Expedición"
            required
          />
          <FormDatePicker
            name="fechaVencimiento"
            label="Fecha de Vencimiento"
            description="Dejar vacío si no aplica"
          />
        </div>

        {/* Número y Checkbox */}
        <div className="grid grid-cols-2 gap-4">
          <FormNumberInput
            name="numeroFolios"
            label="Número de Folios"
            min={1}
            max={9999}
            showStepper
            required
          />
          <div className="flex items-end pb-2">
            <FormCheckbox
              name="esConfidencial"
              label="Documento confidencial"
              description="Marque si el documento tiene información sensible"
            />
          </div>
        </div>

        {/* Tags */}
        <FormTagInput
          name="etiquetas"
          label="Etiquetas"
          placeholder="Agregar etiqueta..."
          maxTags={10}
        />

        {/* Archivo */}
        <FormFileDragDrop
          name="archivo"
          label="Archivo Adjunto"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          maxSize={10 * 1024 * 1024}
        />

        {/* Observaciones y Password */}
        <FormTextarea
          name="observaciones"
          label="Observaciones"
          placeholder="Observaciones adicionales..."
          rows={2}
        />

        <FormPasswordInput
          name="password"
          label="Contraseña de Protección"
          description="Solo si desea proteger el documento con contraseña"
        />

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Limpiar
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Guardando...' : 'Guardar Documento'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
```

---

## Resumen del Módulo

En este módulo hemos creado:

| Componente | Descripción |
|------------|-------------|
| `FormFieldWrapper` | Wrapper base con label, error y description |
| `FormInput` | Input de texto (text, email, url, tel) |
| `FormTextarea` | Área de texto con contador de caracteres |
| `FormSelect` | Dropdown con opciones |
| `FormRadioGroup` | Grupo de radio buttons (vertical/horizontal) |
| `FormCheckbox` | Checkbox individual con label |
| `FormDatePicker` | Selector de fecha con calendario |
| `FormNumberInput` | Input numérico con stepper opcional |
| `FormPasswordInput` | Input de contraseña con toggle de visibilidad |
| `FormFileUpload` | Upload de archivo simple |
| `FormFileDragDrop` | Upload con drag & drop |
| `FormTagInput` | Input de etiquetas múltiples |

### Características comunes:

- ✅ Integración con `useFormContext` (sin props drilling)
- ✅ Manejo automático de errores de Zod
- ✅ Estados disabled y loading
- ✅ Accesibilidad (ARIA, labels)
- ✅ TypeScript estricto

### Archivos creados:

```
components/forms/
├── form-field-wrapper.tsx
├── form-input.tsx
├── form-textarea.tsx
├── form-select.tsx
├── form-radio-group.tsx
├── form-checkbox.tsx
├── form-date-picker.tsx
├── form-number-input.tsx
├── form-password-input.tsx
├── form-file-upload.tsx
├── form-file-drag-drop.tsx
├── form-tag-input.tsx
└── index.ts
```

---

## Próximo Módulo

En el **Módulo 6: Formulario Completo de Documento** integraremos todo:

- Página de creación con todos los componentes
- Conexión con Server Actions
- Manejo de estados y feedback
- Modo edición vs creación
- Upload de archivo antes de submit

---

¿Continúo con el Módulo 6?
