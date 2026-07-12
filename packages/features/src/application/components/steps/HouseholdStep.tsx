import { Button } from '@mzanzihomes/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Checkbox } from '@mzanzihomes/ui/components/checkbox';
import { Label } from '@mzanzihomes/ui/components/label';
import { RadioGroup, RadioGroupItem } from '@mzanzihomes/ui/components/radio-group';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { DOCUMENT_TYPES } from '@mzanzihomes/common/constants/applicationConstants';
import type { Occupant, Pet } from '../../types';
import { DocumentRow, DocumentUpload, Field, FieldError, textInput, useRemoveDocument, type StepProps } from './shared';

const emptyPet = (): Pet => ({
  type: '', breed: '', size: '', age: '', count: 1, vaccinated: false, description: '', photo: null
});

const emptyOccupant = (): Occupant => ({ name: '', relationship: '', is_co_tenant: false });

export function HouseholdStep({ data, update, errors, userId, onUploadComplete }: StepProps) {
  const h = data.household;
  const removeDocument = useRemoveDocument();

  const setPet = (idx: number, patch: Partial<Pet>) =>
    update('household', { pets: h.pets.map((p, i) => (i === idx ? { ...p, ...patch } : p)) });

  const setOccupant = (idx: number, patch: Partial<Occupant>) =>
    update('household', { occupants: h.occupants.map((o, i) => (i === idx ? { ...o, ...patch } : o)) });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Household Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            How many people will live at the property, including you?
          </p>
          <div className="grid grid-cols-3 gap-4">
            <Field id="total_occupants" label="Total" required error={errors.total_occupants}>
              {textInput('total_occupants', h.total_occupants, (v) => update('household', { total_occupants: v }), { inputMode: 'numeric' })}
            </Field>
            <Field id="adults" label="Adults" required error={errors.adults}>
              {textInput('adults', h.adults, (v) => update('household', { adults: v }), { inputMode: 'numeric' })}
            </Field>
            <Field id="children" label="Children" required error={errors.children}>
              {textInput('children', h.children, (v) => update('household', { children: v }), { inputMode: 'numeric' })}
            </Field>
          </div>

          {Number(h.children) > 0 && (
            <Field id="child_age_ranges" label="Children's age ranges">
              {textInput('child_age_ranges', h.child_age_ranges.join(', '), (v) =>
                update('household', { child_age_ranges: v.split(',').map((s) => s.trim()).filter(Boolean) }),
                { placeholder: 'e.g. 0-5, 6-12' }
              )}
            </Field>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Adult occupants (other than you)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => update('household', { occupants: [...h.occupants, emptyOccupant()] })}
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {h.occupants.map((o, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end border rounded-lg p-3">
                <Field id={`occupant_${idx}_name`} label="Full name">
                  {textInput(`occupant_${idx}_name`, o.name, (v) => setOccupant(idx, { name: v }))}
                </Field>
                <Field id={`occupant_${idx}_relationship`} label="Relationship to you">
                  {textInput(`occupant_${idx}_relationship`, o.relationship, (v) => setOccupant(idx, { relationship: v }))}
                </Field>
                <div className="flex items-center gap-2 pb-2">
                  <Checkbox
                    id={`occupant_${idx}_cotenant`}
                    checked={o.is_co_tenant}
                    onCheckedChange={(c) => setOccupant(idx, { is_co_tenant: !!c })}
                  />
                  <Label htmlFor={`occupant_${idx}_cotenant`} className="text-xs">
                    Co-tenant
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Remove occupant"
                  onClick={() => update('household', { occupants: h.occupants.filter((_, i) => i !== idx) })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Will any pets live at the property? *</Label>
            <RadioGroup
              className="flex gap-6 mt-2"
              value={h.has_pets ? 'yes' : 'no'}
              onValueChange={(v) => update('household', { has_pets: v === 'yes', pets: v === 'yes' && h.pets.length === 0 ? [emptyPet()] : h.pets })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="pets_yes" />
                <Label htmlFor="pets_yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="pets_no" />
                <Label htmlFor="pets_no">No</Label>
              </div>
            </RadioGroup>
          </div>

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
                    <Field id={`pet_${idx}_age`} label="Age">
                      {textInput(`pet_${idx}_age`, pet.age, (v) => setPet(idx, { age: v }))}
                    </Field>
                  </div>
                  <Field id={`pet_${idx}_description`} label="Short description">
                    <Textarea
                      id={`pet_${idx}_description`}
                      value={pet.description}
                      onChange={(e) => setPet(idx, { description: e.target.value })}
                    />
                  </Field>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`pet_${idx}_vaccinated`}
                      checked={pet.vaccinated}
                      onCheckedChange={(c) => setPet(idx, { vaccinated: !!c })}
                    />
                    <Label htmlFor={`pet_${idx}_vaccinated`} className="text-sm">
                      Vaccinated
                    </Label>
                  </div>
                  <DocumentUpload
                    documentType={DOCUMENT_TYPES.PET_PHOTO}
                    userId={userId}
                    accept=".jpg,.jpeg,.png,.webp"
                    label={pet.photo ? 'Replace photo (optional)' : 'Add photo (optional)'}
                    camera
                    onUploaded={(doc) => setPet(idx, { photo: doc })}
                    onUploadComplete={onUploadComplete}
                  />
                  {pet.photo && (
                    <DocumentRow doc={pet.photo} onRemove={() => removeDocument(pet.photo!, () => setPet(idx, { photo: null }))} />
                  )}
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
        </CardContent>
      </Card>
    </div>
  );
}
