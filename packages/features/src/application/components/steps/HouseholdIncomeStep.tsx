import { Button } from '@mzanzihomes/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mzanzihomes/ui/components/select';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Plus, Trash2 } from 'lucide-react';
import {
  EMPLOYED_STATUSES,
  EMPLOYMENT_STATUS_OPTIONS,
  INCOME_FREQUENCY_OPTIONS,
  RISK_QUESTIONS
} from '@mzanzihomes/common/constants/applicationConstants';
import type { Pet } from '../../types';
import { Field, FieldError, textInput, YesNoQuestion, type StepProps } from './shared';

const emptyPet = (): Pet => ({
  type: '', breed: '', size: '', age: '', count: 1, vaccinated: false, description: '', photo: null
});

/** Step 3: household, employment and income, pets, smoking and the risk
 * questions — grouped cards with conditional sections, one screen. */
export function HouseholdIncomeStep({ data, update, errors }: StepProps) {
  const h = data.household;
  const e = data.employment;
  const s = data.support;
  const setE = (field: keyof typeof e) => (v: string) => update('employment', { [field]: v });

  const isEmployed = (EMPLOYED_STATUSES as readonly string[]).includes(e.status);
  const isSelfEmployed = e.status === 'self-employed';
  const isInformal = e.status === 'informal';
  const isStudent = e.status === 'student';
  const isOther = e.status === 'other';

  const setPet = (idx: number, patch: Partial<Pet>) =>
    update('household', { pets: h.pets.map((p, i) => (i === idx ? { ...p, ...patch } : p)) });

  const setAnswer = (id: string, patch: Partial<{ answer: 'yes' | 'no' | ''; explanation: string }>) =>
    update('risk', {
      answers: {
        ...data.risk.answers,
        [id]: { ...({ answer: '', explanation: '' } as const), ...data.risk.answers[id], ...patch }
      }
    });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Household and income</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Who will live at the property and how the rent will be paid.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your household</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            How many people (including you) will be living here?
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-xs">
            <Field id="adults" label="Adults" required error={errors.adults}>
              {textInput('adults', h.adults, (v) => update('household', { adults: v }), { inputMode: 'numeric' })}
            </Field>
            <Field id="children" label="Children / dependants" required error={errors.children}>
              {textInput('children', h.children, (v) => update('household', { children: v }), { inputMode: 'numeric' })}
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Employment and income</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field id="employment_status" label="How do you earn your income?" required error={errors.status}>
            <Select value={e.status} onValueChange={setE('status')}>
              <SelectTrigger id="employment_status">
                <SelectValue placeholder="Select your employment or income type" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {isEmployed && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="employer_name" label="Employer name" required error={errors.employer_name}>
                {textInput('employer_name', e.employer_name, setE('employer_name'))}
              </Field>
              <Field id="job_title" label="Job title" required error={errors.job_title}>
                {textInput('job_title', e.job_title, setE('job_title'))}
              </Field>
              <Field id="start_date" label="Employment start date">
                <Input id="start_date" type="date" value={e.start_date} onChange={(ev) => setE('start_date')(ev.target.value)} />
              </Field>
              <Field id="employer_contact" label="Employer contact (optional)">
                {textInput('employer_contact', e.employer_contact, setE('employer_contact'), { placeholder: 'Phone or email' })}
              </Field>
              <Field id="gross_monthly_income" label="Gross monthly income (R)" error={errors.gross_monthly_income}>
                {textInput('gross_monthly_income', e.gross_monthly_income, (v) => setE('gross_monthly_income')(v.replace(/,/g, '')), { inputMode: 'decimal' })}
              </Field>
              <Field id="net_monthly_income" label="Net monthly income (R)" required error={errors.net_monthly_income}>
                {textInput('net_monthly_income', e.net_monthly_income, (v) => setE('net_monthly_income')(v.replace(/,/g, '')), { inputMode: 'decimal' })}
              </Field>
              <div className="sm:col-span-2">
                <YesNoQuestion
                  id="has_commission"
                  label="Does your income include commission or variable earnings?"
                  value={e.has_commission}
                  onChange={(v) => update('employment', { has_commission: v })}
                />
              </div>
            </div>
          )}

          {(isSelfEmployed || isInformal) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="work_type" label="Type of work or business" required error={errors.work_type}>
                {textInput('work_type', e.work_type, setE('work_type'), {
                  placeholder: isInformal ? 'e.g. street trading, transport, domestic work' : 'e.g. plumbing services'
                })}
              </Field>
              {isSelfEmployed && (
                <Field id="business_name" label="Business name (if any)">
                  {textInput('business_name', e.business_name, setE('business_name'))}
                </Field>
              )}
              <Field id="net_monthly_income" label="Average monthly income (R)" required error={errors.net_monthly_income}>
                {textInput('net_monthly_income', e.net_monthly_income, (v) => setE('net_monthly_income')(v.replace(/,/g, '')), { inputMode: 'decimal' })}
              </Field>
              <Field id="income_frequency" label="How often do you receive income?" required error={errors.income_frequency}>
                <Select value={e.income_frequency} onValueChange={setE('income_frequency')}>
                  <SelectTrigger id="income_frequency">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOME_FREQUENCY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="years_self_employed" label="How long have you been doing this work?">
                {textInput('years_self_employed', e.years_self_employed, setE('years_self_employed'), { placeholder: 'e.g. 3 years' })}
              </Field>
              <div className="sm:col-span-2">
                <YesNoQuestion
                  id="income_varies"
                  label="Does your income vary from month to month?"
                  value={e.income_varies}
                  onChange={(v) => update('employment', { income_varies: v })}
                />
              </div>
              {e.income_varies === 'yes' && (
                <div className="sm:col-span-2">
                  <Field id="seasonal_notes" label="Tell us about seasonal or variable income (optional)">
                    <Textarea
                      id="seasonal_notes"
                      value={e.seasonal_notes}
                      onChange={(ev) => setE('seasonal_notes')(ev.target.value)}
                    />
                  </Field>
                </div>
              )}
            </div>
          )}

          {isStudent && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="institution" label="Institution name" required error={errors.institution}>
                {textInput('institution', e.institution, setE('institution'))}
              </Field>
              <Field id="course" label="Course or qualification">
                {textInput('course', e.course, setE('course'))}
              </Field>
              <Field id="payment_source" label="Who will pay the rent?" required error={errors.payment_source}>
                {textInput('payment_source', e.payment_source, setE('payment_source'), { placeholder: 'e.g. bursary, parents' })}
              </Field>
              <Field id="sponsor_details" label="Sponsor or responsible payer (optional)">
                {textInput('sponsor_details', e.sponsor_details, setE('sponsor_details'))}
              </Field>
            </div>
          )}

          {isOther && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="payment_source" label="How will the rent be paid?" required error={errors.payment_source}>
                {textInput('payment_source', e.payment_source, setE('payment_source'), { placeholder: 'e.g. pension, savings, family support' })}
              </Field>
              <Field id="net_monthly_income" label="Monthly amount available (R)" error={errors.net_monthly_income}>
                {textInput('net_monthly_income', e.net_monthly_income, (v) => setE('net_monthly_income')(v.replace(/,/g, '')), { inputMode: 'decimal' })}
              </Field>
            </div>
          )}

          <div className="pt-1">
            <YesNoQuestion
              id="has_guarantor"
              label="Will someone stand surety or help pay the rent (a guarantor)?"
              value={s.has_guarantor}
              onChange={(v) => update('support', { has_guarantor: v })}
            />
            {s.has_guarantor === 'yes' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <Field id="guarantor_name" label="Guarantor's full name" required error={errors.guarantor_name}>
                  {textInput('guarantor_name', s.guarantor_name, (v) => update('support', { guarantor_name: v }))}
                </Field>
                <Field id="guarantor_relationship" label="Relationship to you">
                  {textInput('guarantor_relationship', s.guarantor_relationship, (v) => update('support', { guarantor_relationship: v }))}
                </Field>
                <Field id="guarantor_contact" label="Guarantor's contact details" required error={errors.guarantor_contact}>
                  {textInput('guarantor_contact', s.guarantor_contact, (v) => update('support', { guarantor_contact: v }), { placeholder: 'Phone or email' })}
                </Field>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pets and smoking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <YesNoQuestion
            id="has_pets"
            label="Will any pets live at the property?"
            value={h.has_pets ? 'yes' : 'no'}
            onChange={(v) =>
              update('household', {
                has_pets: v === 'yes',
                pets: v === 'yes' && h.pets.length === 0 ? [emptyPet()] : h.pets
              })
            }
          />

          {h.has_pets && (
            <div className="space-y-3">
              {h.pets.map((pet, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Pet {idx + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Remove pet"
                      onClick={() => update('household', { pets: h.pets.filter((_, i) => i !== idx) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Field id={`pet_${idx}_type`} label="Type" required error={errors[`pet_${idx}_type`]}>
                      {textInput(`pet_${idx}_type`, pet.type, (v) => setPet(idx, { type: v }), { placeholder: 'e.g. Dog' })}
                    </Field>
                    <Field id={`pet_${idx}_breed`} label="Breed">
                      {textInput(`pet_${idx}_breed`, pet.breed, (v) => setPet(idx, { breed: v }))}
                    </Field>
                    <Field id={`pet_${idx}_size`} label="Size">
                      {textInput(`pet_${idx}_size`, pet.size, (v) => setPet(idx, { size: v }), { placeholder: 'Small / Medium / Large' })}
                    </Field>
                    <Field id={`pet_${idx}_count`} label="How many">
                      <Input
                        id={`pet_${idx}_count`}
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={pet.count}
                        onChange={(ev) => setPet(idx, { count: Math.max(1, parseInt(ev.target.value, 10) || 1) })}
                      />
                    </Field>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => update('household', { pets: [...h.pets, emptyPet()] })}
              >
                <Plus className="h-4 w-4 mr-1" /> Add another pet
              </Button>
              <FieldError error={errors.pets} />
            </div>
          )}

          <YesNoQuestion
            id="smoking"
            label="Will anyone living at the property smoke?"
            value={h.smoking}
            onChange={(v) => update('household', { smoking: v })}
            error={errors.smoking}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">A few additional questions</CardTitle>
          <p className="text-sm text-muted-foreground">
            A &lsquo;Yes&rsquo; answer does not automatically mean your application will be declined.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {RISK_QUESTIONS.map((q) => {
            const a = data.risk.answers[q.id];
            return (
              <div key={q.id} className="space-y-2">
                <YesNoQuestion
                  id={q.id}
                  label={q.question}
                  value={a?.answer || ''}
                  onChange={(v) => setAnswer(q.id, { answer: v })}
                  error={errors[q.id]}
                />
                {a?.answer === 'yes' && (
                  <div>
                    <Label htmlFor={`${q.id}_explanation`} className="text-xs text-muted-foreground">
                      You can add a short explanation (optional)
                    </Label>
                    <Textarea
                      id={`${q.id}_explanation`}
                      value={a.explanation}
                      onChange={(ev) => setAnswer(q.id, { explanation: ev.target.value })}
                    />
                  </div>
                )}
              </div>
            );
          })}
          <Field id="risk_open_note" label="Is there anything you would like to explain to the landlord? (optional)">
            <Textarea
              id="risk_open_note"
              value={data.risk.open_note}
              onChange={(ev) => update('risk', { open_note: ev.target.value })}
            />
          </Field>
        </CardContent>
      </Card>
    </div>
  );
}
