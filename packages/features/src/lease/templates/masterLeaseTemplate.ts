/**
 * Master Lease Template - South African Residential Lease Agreement
 * 
 * IMPORTANT: This template contains legally-reviewed clauses.
 * DO NOT allow direct editing of this text.
 * 
 * Variables: {{VARIABLE_NAME}} - replaced with wizard data
 * Conditionals: [[IF CONDITION]] ... [[ENDIF]] - included/excluded based on wizard data
 */

export const MASTER_LEASE_TEMPLATE = `
AGREEMENT OF LEASE (RESIDENTIAL)

("Agreement")

These are the terms and conditions applicable to the lease entered into by the parties contained in the schedule hereto, which schedule forms part of terms and conditions as if specifically incorporated herein.

================================================================================
SCHEDULE
================================================================================

LANDLORD DETAILS
Name: {{LANDLORD_FULL_NAME}}
ID/Registration Number: {{LANDLORD_ID_NUMBER}}
Address: {{LANDLORD_ADDRESS}}
Email: {{LANDLORD_EMAIL}}
Phone: {{LANDLORD_PHONE}}

TENANT DETAILS
Name: {{TENANT_FULL_NAME}}
ID/Registration Number: {{TENANT_ID_NUMBER}}
Address: {{TENANT_ADDRESS}}
Email: {{TENANT_EMAIL}}
Phone: {{TENANT_PHONE}}

PROPERTY DETAILS
Address: {{PROPERTY_ADDRESS}}

LEASE TERMS
Lease Type: {{LEASE_TYPE}}
Commencement Date: {{LEASE_START_DATE}}
Termination Date: {{LEASE_END_DATE}}
Monthly Rental: {{RENT_AMOUNT}}
Rental Due Day: {{RENT_DUE_DAY}} of each month
Annual Escalation: {{ESCALATION_PERCENT}}

FINANCIAL DETAILS
Deposit Amount: {{DEPOSIT_AMOUNT}}
Late Payment Fee: {{LATE_FEE_AMOUNT}}

BANK DETAILS FOR RENT PAYMENTS
Bank: {{LANDLORD_BANK_NAME}}
Branch Code: {{LANDLORD_BRANCH_CODE}}
Account Number: {{LANDLORD_ACCOUNT_NUMBER}}
Reference: {{LANDLORD_REFERENCE}}

OCCUPANTS
{{OCCUPANTS_LIST}}

================================================================================
TERMS AND CONDITIONS
================================================================================

1. INTERPRETATION

1.1 The headings of clauses are for reference purposes only.

1.2 References to notices, statements, and other communications by or from the landlord include notices by or from the landlord's appointed agency.

1.3 Expressions in the singular also indicate the plural, and the other way round.

[[IF TENANT_IS_JURISTIC]]
1.4 Words and phrases indicating natural persons also refer to juristic persons, and the other way round, and pronouns of any gender include the pronouns of the other gender.
[[ENDIF]]

1.5 Any provision of this agreement placing a restraint, prohibition, or restriction on the tenant must be interpreted to include the implied term that the tenant must ensure that everybody occupying or entering the property also complies with them, including the family, guests and domestic worker or other employees of the tenant.

1.6 The provisions of this agreement shall be deemed severable, and the unenforceability of any one of the provisions shall not affect the enforceability of other provisions. In the event that a provision is found to be unenforceable, the parties shall substitute that provision with an enforceable provision that preserves the original intent and position of the parties.

2. RECITAL

2.1 The landlord hereby lets, and the tenant takes in hire the property on the terms and conditions contained herein, and that the schedule, with the personal details of the parties and the property shall form an integral part of this agreement as if incorporated into the body thereof.

[[IF CPA_APPLIES]]
3. CONSUMER PROTECTION ACT 68 OF 2008 ("CPA")

3.1 The Tenant's attention is drawn to the following provisions of the CPA:

[[IF TENANT_IS_JURISTIC]]
3.1.1 The CPA will not apply to lease agreements entered into between juristic persons, regardless of their turnover or asset value.
[[ENDIF]]

3.1.2 Section 14 of the CPA provides that the tenant may cancel this agreement on 20 business days' notice, subject to the landlord being entitled to a reasonable cancellation penalty. Section 14 only applies to fixed term agreements.

3.1.3 Certain terms and conditions have been printed in bold font to ensure that the Tenant specifically takes note of these provisions which may:
- Limit the liability of the landlord or other party.
- Constitute an assumption of risk by the tenant.
- Impose an obligation on the tenant to indemnify the landlord or other person.
- Be an acknowledgement of a fact by the tenant.

3.1.4 In terms of section 16 of the CPA, if this agreement was signed by the tenant as a result of Direct Marketing, the tenant will be entitled to cancel this agreement on written notice to the landlord without reason or penalty within 5 business days of signing the agreement.

3.1.5 The tenant warrants that this agreement was not entered into as a result of any Direct Marketing and that the landlord enters into this agreement relying upon such warranty.
[[ENDIF]]

4. RENTAL AND PAYMENTS

4.1 The monthly rental ("rent") payable is {{RENT_AMOUNT}} per month as set out in the Schedule.

4.2 All rental payments shall be made monthly in advance before the {{RENT_DUE_DAY}} day of each and every month, free from any deductions or set off for any reason whatsoever, directly into the landlord's bank account reflected in the schedule.

4.3 Should the agreement be renewed or extended, the tenant agrees to a rental escalation as agreed between the parties in the schedule, or any other amount as may be agreed on between the parties.

4.4 The tenant agrees to pay a deposit, as specifically set out in the schedule to this agreement, to the landlord, which may be appropriated by the landlord against any amount(s) which may be outstanding at any time in terms of this agreement and/or any other liability of whatsoever nature for which the tenant is responsible to the landlord, including damages, and which amount may be retained by the landlord throughout the duration of this agreement and until final determination of any such amounts due by the tenant. The tenant shall not be entitled to set off against the deposit any rent or any other amount payable. The deposit will be kept in an interest-bearing trust account and the deposit amount plus accrued interest will be refunded to the tenant upon termination of this agreement, less bank charges and other administrative costs, and further less any amounts deductible in terms of this agreement.

4.5 Should the rent increase, the tenant agrees to increase the deposit proportionately. Further, the tenant agrees to restore and top up the deposit within 3 business days of being requested to do so whenever required in terms of this agreement.

4.6 Should the tenant attempt to set off the deposit against any payments due, including the final month's rental, this shall be deemed as an attempt to vacate the property and avoid the payment of rent, in which event the tenant agrees to the landlord taking steps to have the tenant's goods attached and removed from the property as security for such payments.

4.7 The tenant agrees to pay interest on all overdue amounts at the rate of two percent (2%) above the prime overdraft rate (percent, per annum) charged by leading financial institutions, calculated from the due dates of such amounts until payment. The tenant will further be liable to pay the landlord a penalty admin fee of {{LATE_FEE_AMOUNT}} (excl VAT) for any payments made after the due date.

4.8 Should any amounts payable by the landlord increase, the landlord will be entitled to increase the rental pro rata.

4.9 Should the tenant fail to effect timeous and proper payment of any of the amounts above, it will be construed a material breach of this agreement. Should any supplier or service provider terminate a service due to the tenant's non-payment, the tenant will be liable for any reconnection or reinstatement fees applicable.

4.10 It is specifically recorded that the tenant shall be responsible for the monthly municipal account, except for rates and taxes levied on the property, which amount the tenants shall be required to pay monthly in arrears, as it appears on the outstanding invoice made available to the tenant.

5. DURATION OF LEASE

5.1 The agreement shall commence and terminate on the date as set out in the schedule.

5.2 The tenant shall be entitled to, subject to reasonable negotiations and written consent by the landlord, renew this lease for a further period that is still to be determined (hereinafter referred to as "the renewal period") on the same terms and conditions as in this lease contained (save in respect of the rental as hereinafter set out), provided they shall have complied faithfully and regularly with each and every condition and obligation imposed on it in terms of this lease and provided further that they shall have given to the landlord at least 3 (three) calendar notice in writing prior to the expiry of the main period of the lease of their intention to renew.

5.3 Either party shall be entitled to, upon material breach of this lease, terminate this lease prior to the expiry of the main period or any subsequent renewal period by providing the other party with at least 2 (two) calendar months' notice, in writing.

6. TERMINATION

6.1 The landlord will provide the tenant with written notice reminding him of the termination of the agreement no earlier than 80 and no less than 40 business days before the end date. The notice will also advise the tenant whether the Landlord intends to renew the agreement, and the notice will advise of any changes should the Agreement be renewed.

6.2 After receipt of a notice as per the above, the tenant will have 10 business days to:

6.2.1 Accept the terms proposed in the notice. Such new terms and conditions proposed pertaining to the renewal will only be effective once reduced to writing in a renewal addendum and signed by both the landlord and the tenant.

[[IF CPA_APPLIES]]
6.2.2 Elect that the agreement terminates at the end of the initial period as agreed. However, should the tenant not advise of such election timeously, the agreement will continue on a month-to-month basis on the same terms and conditions as contained herein, subject thereto that any renewal period proposed in any notice will not apply and either party will have the right to terminate the agreement by giving one calendar month written notice to the other. In such event it is specifically recorded that the CPA will no longer apply.
[[ENDIF]]

6.3 Should the landlord and tenant not renew or extend the agreement and should the landlord not provide the tenant with any notice as envisaged directly above, the Agreement will continue on a month-to-month basis on the same terms and conditions.

6.4 The tenant agrees to vacate the property timeously upon termination of this agreement.

7. TERMINATION BY DEATH OR INSOLVENCY

7.1 This agreement will not terminate with the death of either the landlord or the tenant. The executor of the deceased tenant's estate will have the option, depending upon the circumstances of the estate, either to:

7.1.1 Abide by the contract for the remainder period of the agreement (the successor or successors of the tenant assuming his rights and obligations) or

7.1.2 To cancel this agreement by giving the landlord one month's written notice of termination, such notice to be given not more than one month after the death of the tenant.

7.2 The insolvency of either the landlord or the tenant will not terminate this agreement. However, the trustee of the tenant's insolvent estate will have the option to terminate this agreement by giving the landlord written notice. If the trustee does not within three months of his appointment as trustee notify the landlord that he wants to continue with the agreement on behalf of the estate, he will be deemed to have terminated the agreement at the end of the three months.

8. USE AND NUISANCE

8.1 The property shall be used for residential purposes only by the tenant and his bona fide guests.

8.2 The tenant shall not permit anything to be done or stored in or about the property which may be or become an annoyance or nuisance to neighbours or which may damage the property or prejudice or vitiate the insurance policies in respect of the property or increase the rate of premium(s) payable in respect of such policies and any increase in the premium by reason of the act or neglect of the tenant shall be borne by the tenant in addition to the Rental.

[[IF HAS_GARDEN]]
[[IF HAS_POOL]]
8.3 The tenant specifically undertakes to return the property in the same order and condition as when they received it. This specifically includes, but is not limited to, the garden, swimming pool, exterior walls, doors, and garage.
[[ENDIF]]
[[ENDIF]]

8.4 The landlord shall keep the property insured against risk of damage by fire. The tenant agrees to take out insurance for his household items at his own election and at his own cost.

8.5 THE LANDLORD SHALL NOT UNDER ANY CIRCUMSTANCES BE LIABLE TO THE TENANT, HIS FAMILY OR ANY OTHER PERSON ENTERING IN OR UPON THE PROPERTY FOR ANY DEATH, INJURY, LOSS OR DAMAGE SUFFERED IN OR ABOUT THE PROPERTY, IRRESPECTIVE OF WHETHER IT WAS CAUSED BY FIRE, STORM, RIOT, CIVIL COMMOTION, THEFT, ROBBERY, ACCIDENT, OR ANY OTHER CAUSE WHATSOEVER, AND THE TENANT HEREBY INDEMNIFIES THE LANDLORD AND HOLDS HARMLESS THE LANDLORD IN RESPECT OF ANY SUCH CLAIM.

9. BREACH BY THE TENANT

9.1 The landlord will be entitled to, at his sole discretion and without prejudice to any other rights in law, either demand specific performance and/or to cancel this agreement with immediate effect and/or in addition to either option claim damages, should the Tenant:

9.1.1 Fail to make any payment on or before the due date.

9.1.2 Breach the agreement and remain in breach of the agreement for 7 calendar days after dispatch of a notice to remedy breach.

[[IF CPA_APPLIES]]
9.2 Should section 14 of the CPA not apply and should the tenant be in breach of any provision of this agreement on two or more occasions during any 12-month period, the landlord may elect to cancel this agreement with immediate effect and claim possession of the property. This is an additional remedy without prejudice or exclusion to any other remedy available to the landlord in terms of this agreement.
[[ENDIF]]

10. BREACH BY THE LANDLORD

10.1 Should the landlord commit a material breach of this Agreement, the tenant may:

10.1.1 Apply to court to recover damages suffered.

10.1.2 Demand specific performance.

10.2 The tenant may cancel this Agreement without penalty if the landlord does not remedy the material breach within 20 business days of receiving a notice to remedy breach.

11. CANCELLATION BY THE TENANT BEFORE TERMINATION OF THE AGREEMENT

[[IF CPA_APPLIES]]
11.1 The tenant is entitled to cancel this Agreement on 20 business days' written notice if the CPA applies to this Agreement. In such event the landlord will be entitled to a reasonable cancellation penalty.
[[ENDIF]]

11.2 The tenant agrees that such reasonable cancellation shall include at least:

11.2.1 An amount equal to three months rental, notwithstanding how far in advance or when the cancellation notice is provided.

11.2.2 R1 500.00 plus VAT for advertisement costs, which the tenant agrees is reasonable and necessary.

[[IF CPA_APPLIES]]
11.3 In the event that the CPA does not apply, the tenant is entitled to cancel this Agreement on 2 months' notice and will be liable to the landlord for the associated cost of replacing the tenant which includes but is not limited to advertising costs, administrative expenses, Agent's fees etc.
[[ENDIF]]

12. CANCELLATION BY THE LANDLORD

[[IF IS_SECTIONAL_TITLE]]
12.1 Should the landlord or body corporate become aware that the tenant is conducting any illegal or criminal activity from the Property or is in contravention of any law or regulation, the landlord may cancel this Agreement with immediate effect and the tenant will have to vacate the property immediately.
[[ENDIF]]

12.2 The landlord may cancel this Agreement if he becomes aware that the tenant has provided incorrect information at any stage, including the application process. The tenant warrants that all information provided is true and correct.

13. CONSEQUENCES OF ELECTION TO CANCEL

13.1 If the landlord cancels the Agreement, the tenant agrees to vacate the Property immediately and the landlord will be entitled to retake possession thereof and may take any legal action to evict the tenant and other occupiers.

13.2 Should the tenant be in default and dispute the landlord's right to cancel, the tenant agrees to continue paying rent and all amounts in terms of this Agreement as if the Agreement is still in full force and effect. Acceptance of any payments by the landlord under these circumstances will not be construed as waiver of any right and will not prejudice any other rights that the landlord may have. Should the matter be resolved in the landlord's favour, the Landlord will be entitled to retain the amounts paid, alternatively, will be entitled to the outstanding amounts, as damages for holding over.

14. INSPECTION AND ACCESS

14.1 The parties or their representatives will hold a joint ingoing inspection, in terms of section 5(3) of the Rental Housing Act of 1999, prior to the tenant taking occupation of the property. An ingoing inspection list will be annexed hereto and initialled by all parties. Should the tenant fail to attend the inspection the property will be deemed to be in good condition.

14.2 The tenant shall advise the Landlord in writing within 7 (SEVEN) calendar days of commencement of the Agreement of the details of any defects in or about the property and if such notice is not given by the tenant, then the tenant shall be deemed to have accepted the property as being complete and free from defects. Any recordal of a defect in writing shall not constitute an acknowledgement or undertaking by the landlord to have the defect repaired.

14.3 An outgoing inspection will be attended to by the parties upon termination of this agreement. The tenant agrees to have the property and the carpets professionally cleaned at his own costs prior to such inspection.

14.4 The landlord, either personally or through nominated representatives, shall have the right to inspect and to enter the property at all reasonable times and after reasonable notice to the tenant for the purpose of ensuring that the tenant is complying with his obligations in terms of the agreement.

14.5 During the duration of the Agreement, the landlord shall be entitled to bring any prospective purchasers of the property to inspect the property and the tenant undertakes and agrees to assist the landlord in this regard and not to do anything which will interfere with the sale of the property during such period. The tenant further agrees to "for sale", "sold" and "to let" signs being put up for display at the Property.

14.6 The tenant agrees to allow the landlord access to the property on reasonable notice to attend to any repairs or alterations necessary for the safety or improvement of the property.

15. MAINTENANCE

[[IF IS_SECTIONAL_TITLE]]
15.1 The tenant shall notify the landlord in writing in the event of any defect occurring in the main walls and/or roof, guttering or drainpipes and the landlord shall be given a reasonable opportunity to remedy such defect (or have the Body Corporate remedy such defect if it is responsible therefor) and only if the landlord fails to do so within a reasonable time, will the tenant be entitled to have such defect remedied and to recover the reasonable cost thereof from the landlord.
[[ENDIF]]

[[IF HAS_GARDEN]]
[[IF HAS_POOL]]
15.2 Maintenance of the swimming pool and garden (if applicable) will be the responsibility of the {{POOL_MAINTENANCE_BY}}.

15.3 The landlord shall be responsible for the maintenance of the exterior of the property, but specifically excluding the swimming pool and garden.
[[ENDIF]]
[[ENDIF]]

[[IF PETS_ALLOWED]]
15.4 The tenant shall be responsible for the maintenance of the interior of the Property, which shall include but not be limited to all appliances, furniture, floors, fitted carpets (if any), locks and keys, electric light fittings and light bulbs, doors, door frames, windows, window frames and window panes, and shall make good and repair any damage which may occur thereto, howsoever arising, and shall at the conclusion of the agreement return the property in the same good order and condition (fair wear and tear excepted).
[[ENDIF]]

[[IF HAS_POOL]]
15.5 The tenant shall be responsible for the maintenance and upkeeping, at their own costs, of the swimming pool and shall make good and repair any damage which may occur thereto, howsoever arising.
[[ENDIF]]

[[IF HAS_GARDEN]]
15.6 The tenant undertakes to take good and proper care of the garden on the property, including, but not limited to, all lawns, plants, shrubs, trees and hedges, replacing all such as may die or be damaged (taking seasonal factors into account), and carrying out such watering, cutting, trimming, mowing, pruning, fertilising and other gardening activities as may reasonably be required, and supplying all the fertiliser and other substances necessary for these purposes.
[[ENDIF]]

16. DESTRUCTION OF PROPERTY

16.1 In the event of the destruction of the property, or part of it, so as to render it substantially untenantable as a residence and whether such destruction is due to an act of God, war, riot, insurrection, civil strife or civil disturbance or any other cause including fire, flood, lightning or storm, the agreement shall terminate on the happening of such event and no Rental shall be payable to the landlord for the unexpired period of the agreement from the happening of such event, and neither party shall have any claim against the other apart from any claims which may have existed immediately preceding the occurrence of such event.

16.2 In the event however of partial destruction from the same or similar causes, the agreement shall remain in full force and effect at the election of the landlord, and the landlord shall take steps as soon as may be reasonably possible for the repair of the property and the tenant shall be entitled to an abatement of the rental commensurate with the extent to which he has been deprived of the use of the property.

17. ALTERATIONS

17.1 The tenant shall not make any alterations or additions, whether structural or otherwise, to the property or any portion thereof without the Landlord's prior written consent and in any event shall not be entitled to any compensation therefor and such improvements and/or additions shall belong to the landlord upon termination of the agreement. The tenant further agrees not to interfere with any electrical installations or to connect any lamps, motors, or heaters other than those designed for use for the electric current.

17.2 The tenant shall not drive any screws or nails into the walls or ceilings without the Landlord's prior approval.

17.3 On termination of this agreement, the tenant agrees to restore the property to the condition that the tenant received it in at his own expense. Should the tenant fail to do so within a reasonable time, the landlord may have the property repaired or restored and deduct such amounts payable from the deposit.

18. CARPETS AND WINDOWS

18.1 Should the carpets or any portion of them be damaged, whether by stain, tearing or otherwise, the tenant shall at the tenant's cost repair the damage, but if the damage cannot be repaired in such a manner that the repair is not noticeable, then the tenant will be obliged at the tenant's cost to replace the damaged carpet and any adjoining carpets of the same colour with a new carpet or carpets of a similar type and quality, and the landlord will not be obliged to contribute any amount on account of "betterment".

18.2 Any dispute as to whether the carpet can be satisfactorily repaired and as to the quality of the proposed replacement carpet shall be summarily determined by a reputable carpeting concern agreed upon by the landlord and tenant. The landlord shall be entitled to recover the costs of the nominated concern from the tenant.

18.3 The tenant undertakes to have any carpets professionally steam cleaned or dry cleaned on vacating the property and prior to the outgoing inspection. Should the tenant fail to comply with this provision, the landlord may have the carpets cleaned and the tenant will be liable for the costs, which costs may be deducted from the deposit.

18.4 The tenant further undertakes to have all windows professionally cleaned upon vacating the property and prior to the outgoing inspection. Should the tenant fail to comply with this provision, the landlord may have the windows cleaned and the tenant will be liable for the costs, which costs may be deducted from the deposit.

19. FIXTURES, FITTINGS, APPLIANCES AND FURNITURE

19.1 The property is leased with all the permanent fixtures and fittings which may include but is not limited to: garden pots, gardening equipment, stove, oven, fridge, freezer, dishwasher and washing machine as well as certain furniture which may include but is not limited to: dining table and chairs, television unit, beds, bedside tables, lamps, blinds and curtains, outdoor table and umbrella stand. These household items are to be returned by the tenant in the same order and condition they were received in. The tenant must repair or replace the items to the condition that they were received in should they fail to comply with this provision.

19.2 All repairs and maintenance of the appliances and furniture shall be for the tenant's account. Should any appliance be damaged or become defective beyond repair the landlord will not be obliged to replace such appliance or furniture but shall be entitled to deduct the reasonable costs of doing so from the deposit.

19.3 The tenant further undertakes to return all keys and remotes in good order and working condition to the landlord upon termination of the agreement.

20. WARRANTIES

20.1 The landlord warrants that he is legally entitled to let the property to the tenant.

[[IF TENANT_IS_JURISTIC]]
[[IF CPA_APPLIES]]
20.2 If the tenant is a juristic person, the tenant warrants that its asset value or turnover at the time of conclusion of this Agreement does not exceed the amount determined by the Minister in terms of section 6 of the CPA, currently at R2 000 000.00.
[[ENDIF]]
[[ENDIF]]

20.3 The tenant agrees that no representations or warranties were made by the landlord other than those contained in this agreement. The landlord specifically concludes this agreement based on the tenant's reliance and acceptance of this provision.

20.4 Both parties warrant that they understand the contents of this agreement and negotiated the terms and condition hereof in good faith. Both parties were given the opportunity to consult their legal representatives and all the provisions of the agreement have been sufficiently explained to them.

21. SUB-LETTING AND CESSION

21.1 The tenant shall not be entitled to sub-let the property or any part thereof or to cede or assign any rights or obligations without the prior written consent of the landlord, in which event the tenant agrees that he still remains liable to the landlord for the full rental and all obligations contained herein.

21.2 The landlord shall be entitled to cede and/or assign all its rights and obligations under the agreement to a third party without the consent and/or permission of the tenant.

22. LEGAL COSTS AND JURISDICTION

22.1 The tenant agrees to be liable for the landlord's legal fees on an attorney and client scale, including collection commission and tracing agent fees, in the event of the landlord taking legal action against the tenant as a result of a breach of any terms of the agreement.

22.2 The landlord and tenant consent to the jurisdiction of the Magistrates Court in the event of any dispute or legal action arising in connection with the agreement or the validity thereof, notwithstanding the fact that claim exceeds such courts usual jurisdiction.

23. SURETY

[[IF TENANT_IS_JURISTIC]]
23.1 In the event that the tenant is a juristic person, the signatory on behalf of the tenant binds himself as surety and co-principal debtor to the landlord for the due and actual performance of its obligations in terms of this agreement, and hereby renounces the benefits of the legal exceptions non causa debiti (no cause for the debt) and non numeratae pecuniae (no valuable consideration received) and holds that he is fully acquainted with the meaning thereof.
[[ENDIF]]

23.2 The schedule incorporated herein, shall specifically alert the signatory to the suretyship to which the signatory consents to.

24. LANDLORD'S RIGHT IF THE PROPERTY IS BONDED

24.1 If the property is mortgaged by the landlord and the landlord has ceded any rights in terms of this agreement to the bondholder, the tenant agrees that this will not affect any of the landlord's rights to institute legal proceedings. The tenant accordingly waives and abandons any right to rely on such cession as defence to any claim or to enforce any right, including the right to obtain an eviction order.

25. OCCUPANTS

The tenant warrants and confirms that only the persons listed in the schedule will be residing and occupying the Property.

26. NOTICES

26.1 The parties choose as their address for service of all notices, pleadings or other legal process (i.e. domicilium citandi et executandi) the addresses hereinabove.

26.2 Any notice or communication required or permitted to be given in terms of this agreement shall be valid and effective only if in writing and hand delivered, sent by e-mail, or sent by registered mail.

26.3 Any notice to a party:

26.3.1 sent by prepaid registered post shall be deemed to have been received on the 4th (fourth) business day after posting.

26.3.2 delivered by hand shall be deemed to have been received on the day of delivery.

26.3.3 served via e-mail shall be deemed to be received within 24 hours of when the e-mail was sent.

26.4 Notwithstanding anything to the contrary herein contained a written notice or communication actually received by a party shall be an adequate written notice or communication to it notwithstanding that it was not sent to or delivered at its chosen domicilium citandi et executandi.

26.5 Where any party alleges non receipt of a notice that party shall bare the onus of proving such.

26.6 Any party hereto may by notice to any other party, change the physical address chosen as its domicilium citandi et executandi to another physical address in the Republic of South Africa, provided that the change shall become effective only on the fifth business day from the deemed receipt of the notice by the other party or on some future dated provided for in the notice.

27. GENERAL

[[IF IS_SECTIONAL_TITLE]]
[[IF PETS_ALLOWED]]
27.1 No animals or pets will be allowed on the property without the prior written consent of the landlord and the Body Corporate. Should the landlord agree to pets being kept at the property, the tenant agrees to have the property professionally fumigated at his own cost immediately prior to the outgoing inspection date. Should the tenant fail to comply with this provision, the landlord may have the property fumigated and the tenant will be liable for the costs, which costs may be deducted from the deposit.
[[ENDIF]]
[[ENDIF]]

[[IF PETS_ALLOWED]]
27.2 The landlord agrees and consents to pets being kept at the property as specified in the schedule.
[[ENDIF]]

27.3 No smoking will be allowed inside the property without the prior written consent of the landlord.

[[IF IS_SECTIONAL_TITLE]]
27.4 If applicable, the tenant shall further ensure that he and any guests or other occupiers adhere strictly to the rules and regulations of the body corporate and/or Homeowners Association. The tenant shall be held liable for any associated charges raised to or against the tenant or the landlord should they be in contravention of the rules and agrees that the landlord may pay any penalty or fine due and deduct such amount from the damages deposit. A breach of this provision shall be a material breach of the agreement.
[[ENDIF]]

27.5 The signatories to this agreement warrant that they are duly authorised to sign.

27.6 No relaxation, extension, or indulgence which the landlord may give in regard to the performance of any of the obligations in terms of the agreement shall prejudice any of the landlord's rights under the or be regarded as a waiver of any of the landlord's rights in terms hereof or an estoppel against the enforcement of such rights.

27.7 If there is more than one landlord or more than one tenant entering into this agreement, their liability together with their co-landlords or co-tenants will be jointly and several.

27.8 The parties acknowledge that this agreement represents the whole agreement between them and no representations, warranties or amendments will be of any force and effect unless reduced to writing and signed by both parties.

================================================================================
SIGNATURES
================================================================================

LANDLORD

Signed at _________________ on this _____ day of _________________ 20____

Signature: _________________________

Name: {{LANDLORD_FULL_NAME}}


TENANT

Signed at _________________ on this _____ day of _________________ 20____

Signature: _________________________

Name: {{TENANT_FULL_NAME}}


================================================================================
ANNEXURE A - IMMOVABLE PROPERTY CONDITION REPORT
================================================================================

(See attached Condition Report)

`;
