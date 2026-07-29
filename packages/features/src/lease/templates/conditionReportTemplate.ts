/**
 * Condition Report Template (Annexure A)
 * South African Property Condition Disclosure
 * 
 * In compliance with the Property Practitioners Act 22 of 2019
 */

export const CONDITION_REPORT_TEMPLATE = `
================================================================================
ANNEXURE A
IMMOVABLE PROPERTY CONDITION REPORT
================================================================================

IN RELATION TO THE LEASE OF ANY IMMOVABLE PROPERTY
In compliance with the Property Practitioners Act 22 of 2019

OWNER (LANDLORD): {{LANDLORD_FULL_NAME}}
PROPERTY ADDRESS: {{PROPERTY_ADDRESS}}

--------------------------------------------------------------------------------
1. REPORT
--------------------------------------------------------------------------------

This report does not constitute a guarantee or warranty of any kind by the owner 
of the Property or by the property practitioners representing that owner in any 
transaction. This report should, therefore, not be regarded as a substitute for 
any inspections or warranties that prospective tenants may wish to obtain prior 
to concluding an agreement of lease in respect of the Property.

--------------------------------------------------------------------------------
2. DEFINITIONS
--------------------------------------------------------------------------------

In this form:

2.1 "to be aware" means to have actual notice or knowledge of a certain fact or 
    state of affairs; and

2.2 "defect" means any condition, whether latent or patent, that would or could 
    have a significant deleterious or adverse impact on, or affect, the value of 
    the property, that would or could significantly impair or impact upon the 
    health or safety of any future occupants of the property or that, if not 
    repaired, removed or replaced, would or could significantly shorten or 
    adversely affect the expected normal lifespan of the Property.

--------------------------------------------------------------------------------
3. DISCLOSURE OF INFORMATION
--------------------------------------------------------------------------------

The owner of the Property discloses the information hereunder in the full 
knowledge that, even though this is not to be construed as a warranty, 
prospective purchasers of the Property may rely on such information when 
deciding whether, and on what terms, to purchase the Property. The owner hereby 
authorises the appointed property practitioner marketing the Property for lease 
to provide a copy of this statement, and to disclose any information contained 
in this statement, to any person in connection with any actual or anticipated 
lease of the Property.

--------------------------------------------------------------------------------
4. PROVISION OF ADDITIONAL INFORMATION
--------------------------------------------------------------------------------

The owner represents that to the best of his or her knowledge the responses to 
the statements in respect of the Property contained herein have been accurately 
noted as "yes", "no" or "not applicable". Should the owner have responded to any 
of the statements with a "yes", the owner shall be obliged to provide, in the 
additional information area of this form, a full explanation as to the response 
to the statement concerned.

--------------------------------------------------------------------------------
5. OWNER'S CERTIFICATION
--------------------------------------------------------------------------------

The owner hereby certifies that the information provided in this report is, to 
the best of the owner's knowledge and belief, true and correct as at the date 
when the owner signs this report.

--------------------------------------------------------------------------------
6. CERTIFICATION BY PERSON SUPPLYING INFORMATION
--------------------------------------------------------------------------------

If a person other than the owner of the property provides the required 
information that person must certify that he/she is duly authorised by the owner 
to supply the information and that he/she has supplied the correct information 
on which the owner relied for the purposes of this report and, in addition, that 
the information contained herein is, to the best of that person's knowledge and 
belief, true and correct as at the date on which that person signs this report.

--------------------------------------------------------------------------------
7. NOTICE REGARDING ADVICE OR INSPECTIONS
--------------------------------------------------------------------------------

Both the owner as well as potential tenants of the property may wish to obtain 
professional advice and/or to undertake a professional inspection of the 
property. Under such circumstances adequate provisions must be contained in any 
agreement of lease to be concluded between the parties pertaining to the 
obtaining of any such professional advice and/or the conducting of required 
inspections and/or the disclosure of defects and/or the making of required 
warranties.

--------------------------------------------------------------------------------
8. TENANT'S ACKNOWLEDGEMENT
--------------------------------------------------------------------------------

The prospective tenant acknowledges that he/she has been informed that 
professional expertise and/or technical skill and knowledge may be required to 
detect defects in, and non-compliant aspects concerning, the property. The 
prospective tenant acknowledges receipt of a copy of this statement.

--------------------------------------------------------------------------------
9. STATEMENTS IN CONNECTION WITH THE PROPERTY
--------------------------------------------------------------------------------

This declaration is made in the utmost good faith and the answers provided 
reflect a true and honest appraisal of the property as I know it. I/We confirm 
that we are not aware of any material defects to the PROPERTY or the building 
or its accessories other than those listed below.

Please answer YES or NO or N/A – where necessary, please provide details under 
Clause 32.

================================================================================
CONDITION STATEMENTS
================================================================================

| # | Statement | Answer |
|---|-----------|--------|
| 1 | I am aware of electrical faults/problems relating to the electrical installation or fitted accessories. | {{S1_ANSWER}} |
| 2 | I am aware of illegal electrical extensions, disconnections or damages or inoperative fittings or permanent appliances/equipment (e.g. Stove, extractor, oven, air conditioner, heaters, ceiling fans or illegal extensions such as light fittings, water feature, pumps etc.) | {{S2_ANSWER}} |
| 3 | I am aware of faults relating to the geyser (e.g. leaks, faulty seal kits, low geyser pressure) | {{S3_ANSWER}} |
| 4 | I am aware of faults relating to the drainage installation (e.g. blocked drains, sewers, storm water pipes or gutters) | {{S4_ANSWER}} |
| 5 | I am aware of problems relating to leaking taps or ruptured pipes | {{S5_ANSWER}} |
| 6 | I am aware of any missing keys to all outside doors | {{S6_ANSWER}} |
| 7 | I am aware of remote controls not in working order for gate, garage door etc. | {{S7_ANSWER}} |
| 8 | I am aware of faults relating to the alarm, beams, burglar bars and/or security gates | {{S8_ANSWER}} |
| 9 | I am aware of faults relating to the pool, equipment, piping and pump (incl. cracks, leaks and general operation of equipment) | {{S9_ANSWER}} |
| 10 | Have there been any recent repairs to any of the items specified in item 9? | {{S10_ANSWER}} |
| 11 | I am aware of faults relating to the braai, fireplace or chimney | {{S11_ANSWER}} |
| 12 | I am aware of faults relating to the blinds or curtain rails | {{S12_ANSWER}} |
| 13 | I am aware of damp problems in any of the buildings (e.g. rising or lateral damp) | {{S13_ANSWER}} |
| 14 | I am aware of roof leaks of any kind | {{S14_ANSWER}} |
| 15 | I am aware of any cracked or broken windows | {{S15_ANSWER}} |
| 16 | I am aware of any cracks, leaks or problems with baths, basins, toilets, cisterns or showers | {{S16_ANSWER}} |
| 17 | I am aware of any cracked or broken floor tiles or damage to wood/laminated floorings | {{S17_ANSWER}} |
| 18 | I am aware of any structural defects (e.g. Cracks in walls, floor slab or any settlement of any kind) | {{S18_ANSWER}} |
| 19 | I am aware of any burns, stains, tears or badly worn areas relating to the fitted carpets | {{S19_ANSWER}} |
| 20 | I am aware of any faults to built-in cupboards | {{S20_ANSWER}} |
| 21 | I am aware of any faults to any door handles and window catches | {{S21_ANSWER}} |
| 22 | I am aware of any discrepancy between the physical position of the present boundary fence/walls and the true boundary of the Property | {{S22_ANSWER}} |
| 23 | I am aware of any building restrictions or registered servitudes on the property | {{S23_ANSWER}} |
| 24 | I am aware of any discrepancy between any building improvements and solid roofed areas (e.g. carports) and the approved building plans | {{S24_ANSWER}} |
| 25 | Do you possess copies of the approved building plans? | {{S25_ANSWER}} |
| 26 | I am aware of any other defects | {{S26_ANSWER}} |
| 27 | I have resided in the property for approximately {{S27_YEARS}} years | - |
| 28 | The Property is subject to a lease / has been rented | {{S28_ANSWER}} |
| 29 | I have rented out the property and have limited or no knowledge of the condition of the property | {{S29_ANSWER}} |

================================================================================
30. EXCLUSIONS
================================================================================

The following items are specifically excluded from the lease of the property:

{{EXCLUDED_ITEMS_LIST}}

================================================================================
32. COMMENTS AND QUALIFICATIONS
================================================================================

If answered "YES" on any of the above items, please provide details:

{{CLAUSE_32_COMMENTS}}

================================================================================
SIGNATURES
================================================================================

LANDLORD

Signed at _________________ on this _____ day of _________________ 20____

Signature: _________________________

Name: {{LANDLORD_FULL_NAME}}


TENANT

I acknowledge receipt of this Condition Report.

Signed at _________________ on this _____ day of _________________ 20____

Signature: _________________________

Name: {{TENANT_FULL_NAME}}

`;

/**
 * Condition report question definitions
 * Used to render the wizard step and validate answers
 */
export interface ConditionQuestion {
  id: number;
  key: string;
  question: string;
  requiresFeature?: 'hasPool' | 'hasAlarmSecurity';
  isYearsQuestion?: boolean;
  // "neutral" statements are plain questions ("Do you possess the plans?"), not
  // "I am aware of a fault" statements — so a "Yes" must NOT be coloured as a
  // warning. Only the fault statements turn amber on "Yes".
  neutral?: boolean;
}

export const CONDITION_QUESTIONS: ConditionQuestion[] = [
  { id: 1, key: 's1_electrical', question: 'I am aware of electrical faults/problems relating to the electrical installation or fitted accessories.' },
  { id: 2, key: 's2_illegalElectrical', question: 'I am aware of illegal electrical extensions, disconnections or damages or inoperative fittings or permanent appliances/equipment (e.g. Stove, extractor, oven, air conditioner, heaters, ceiling fans or illegal extensions such as light fittings, water feature, pumps etc.)' },
  { id: 3, key: 's3_geyser', question: 'I am aware of faults relating to the geyser (e.g. leaks, faulty seal kits, low geyser pressure)' },
  { id: 4, key: 's4_drainage', question: 'I am aware of faults relating to the drainage installation (e.g. blocked drains, sewers, storm water pipes or gutters)' },
  { id: 5, key: 's5_leakingTaps', question: 'I am aware of problems relating to leaking taps or ruptured pipes' },
  { id: 6, key: 's6_missingKeys', question: 'I am aware of any missing keys to all outside doors' },
  { id: 7, key: 's7_remoteControls', question: 'I am aware of remote controls not in working order for gate, garage door etc.' },
  { id: 8, key: 's8_alarmSecurity', question: 'I am aware of faults relating to the alarm, beams, burglar bars and/or security gates', requiresFeature: 'hasAlarmSecurity' },
  { id: 9, key: 's9_pool', question: 'I am aware of faults relating to the pool, equipment, piping and pump (incl. cracks, leaks and general operation of equipment)', requiresFeature: 'hasPool' },
  { id: 10, key: 's10_poolRepairs', question: 'Have there been any recent repairs to any of the items specified in item 9?', requiresFeature: 'hasPool', neutral: true },
  { id: 11, key: 's11_braaiFireplace', question: 'I am aware of faults relating to the braai, fireplace or chimney' },
  { id: 12, key: 's12_blindsCurtains', question: 'I am aware of faults relating to the blinds or curtain rails' },
  { id: 13, key: 's13_dampProblems', question: 'I am aware of damp problems in any of the buildings (e.g. rising or lateral damp)' },
  { id: 14, key: 's14_roofLeaks', question: 'I am aware of roof leaks of any kind' },
  { id: 15, key: 's15_crackedWindows', question: 'I am aware of any cracked or broken windows' },
  { id: 16, key: 's16_bathsBasins', question: 'I am aware of any cracks, leaks or problems with baths, basins, toilets, cisterns or showers' },
  { id: 17, key: 's17_floorTiles', question: 'I am aware of any cracked or broken floor tiles or damage to wood/laminated floorings' },
  { id: 18, key: 's18_structuralDefects', question: 'I am aware of any structural defects (e.g. Cracks in walls, floor slab or any settlement of any kind)' },
  { id: 19, key: 's19_carpets', question: 'I am aware of any burns, stains, tears or badly worn areas relating to the fitted carpets' },
  { id: 20, key: 's20_builtInCupboards', question: 'I am aware of any faults to built-in cupboards' },
  { id: 21, key: 's21_doorHandles', question: 'I am aware of any faults to any door handles and window catches' },
  { id: 22, key: 's22_boundaryFence', question: 'I am aware of any discrepancy between the physical position of the present boundary fence/walls and the true boundary of the Property' },
  { id: 23, key: 's23_buildingRestrictions', question: 'I am aware of any building restrictions or registered servitudes on the property' },
  { id: 24, key: 's24_buildingPlans', question: 'I am aware of any discrepancy between any building improvements and solid roofed areas (e.g. carports) and the approved building plans' },
  { id: 25, key: 's25_approvedPlans', question: 'Do you possess copies of the approved building plans?', neutral: true },
  { id: 26, key: 's26_otherDefects', question: 'I am aware of any other defects' },
  { id: 27, key: 's27_yearsResided', question: 'I have resided in the property for approximately how many years?', isYearsQuestion: true },
  { id: 28, key: 's28_existingLease', question: 'The Property is subject to a lease / has been rented', neutral: true },
  { id: 29, key: 's29_limitedKnowledge', question: 'I have rented out the property and have limited or no knowledge of the condition of the property' },
];
