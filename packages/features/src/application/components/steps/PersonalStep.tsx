import { Field, textInput, type StepProps } from './shared';

export function PersonalStep({ data, update, errors }: StepProps) {
  const p = data.personal;
  const set = (field: keyof typeof p) => (v: string) => update('personal', { [field]: v });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Personal Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field id="first_name" label="First Name" required error={errors.first_name}>
          {textInput('first_name', p.first_name, set('first_name'), { autoComplete: 'given-name' })}
        </Field>
        <Field id="middle_name" label="Middle Name">
          {textInput('middle_name', p.middle_name, set('middle_name'))}
        </Field>
        <Field id="last_name" label="Last Name" required error={errors.last_name}>
          {textInput('last_name', p.last_name, set('last_name'), { autoComplete: 'family-name' })}
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="phone" label="Phone Number" required error={errors.phone}>
          {textInput('phone', p.phone, set('phone'), { type: 'tel', autoComplete: 'tel' })}
        </Field>
        <Field id="email" label="Email Address" error={errors.email}>
          {textInput('email', p.email, set('email'), { type: 'email', autoComplete: 'email' })}
        </Field>
      </div>
    </div>
  );
}
