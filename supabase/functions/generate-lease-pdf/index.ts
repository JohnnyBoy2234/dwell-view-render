import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { contractId } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? '';
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    // Fetch contract data
    const { data: contract, error } = await supabase.from('lease_contracts').select('*').eq('id', contractId).single();
    if (error) throw error;
    console.log(`Generating PDF for contract ${contractId}`);
    // Generate PDF document (pass origin for logo fallback)
    const requestOrigin = req.headers.get('origin') || undefined;
    const pdfBuffer = await generatePDFDocument(contract, requestOrigin);
    // Upload PDF to storage
    const fileName = `${contractId}/lease_${contract.version}_${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage.from('lease-documents').upload(fileName, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    });
    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }
    // Get public URL
    const { data: urlData } = supabase.storage.from('lease-documents').getPublicUrl(fileName);
    const pdfUrl = urlData.publicUrl;
    // Generate PDF hash for integrity verification
    const pdfHash = await generatePDFHash(pdfBuffer);
    // Update contract with PDF URL and hash
    const { error: updateError } = await supabase.from('lease_contracts').update({
      pdf_url: pdfUrl,
      pdf_hash: pdfHash,
      updated_at: new Date().toISOString()
    }).eq('id', contractId);
    if (updateError) throw updateError;
    // Add audit entry
    await supabase.rpc('add_lease_audit_entry', {
      contract_id: contractId,
      action: 'pdf_generated',
      actor_id: contract.landlord_id,
      details: {
        pdf_url: pdfUrl,
        pdf_hash: pdfHash,
        version: contract.version
      }
    });
    console.log(`PDF generated successfully for contract ${contractId}`);
    return new Response(JSON.stringify({
      success: true,
      pdfUrl: pdfUrl,
      pdfHash: pdfHash,
      contractId: contractId
    }), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate PDF";
    return new Response(JSON.stringify({
      error: errorMessage
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});

// ============================================================================
// Lease templates + template engine
//
// These are copies of packages/features/src/lease/templates/*.ts and
// utils/leaseTemplateEngine.ts (edge functions cannot import from the npm
// workspace). The PDF must render the SAME processed template the parties see
// in LeasePreviewModal — if you change the template or engine there, mirror
// the change here.
// ============================================================================

const MASTER_LEASE_TEMPLATE = `
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
Account Holder: {{LANDLORD_ACCOUNT_HOLDER}}
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

1.7 "Fair wear and tear" means the natural deterioration of the property through ordinary and reasonable use over time, and does not include damage caused by negligence, misuse or wilful acts. The tenant is not liable for fair wear and tear.

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

4.4 The tenant agrees to pay a deposit, as specifically set out in the schedule to this agreement, to the landlord, which may be appropriated by the landlord against any amount(s) which may be outstanding at any time in terms of this agreement and/or any other liability of whatsoever nature for which the tenant is responsible to the landlord, including damages, and which amount may be retained by the landlord throughout the duration of this agreement and until final determination of any such amounts due by the tenant. The tenant shall not be entitled to set off against the deposit any rent or any other amount payable. The deposit shall be held by the landlord in an interest-bearing account with a registered financial institution for the duration of this agreement. All interest on the deposit accrues to the tenant, who may at any time request written proof of the interest accrued. The deposit amount plus accrued interest will be refunded to the tenant upon termination of this agreement, less any amounts deductible in terms of this agreement.

4.5 Should the rent increase, the tenant agrees to increase the deposit proportionately. Further, the tenant agrees to restore and top up the deposit within 3 business days of being requested to do so whenever required in terms of this agreement.

4.6 Should the tenant attempt to set off the deposit against any payments due, including the final month's rental, this shall be deemed as an attempt to vacate the property and avoid the payment of rent, in which event the tenant agrees to the landlord taking steps to have the tenant's goods attached and removed from the property as security for such payments.

4.7 The tenant agrees to pay interest on all overdue amounts at the rate of two percent (2%) above the prime overdraft rate (percent, per annum) charged by leading financial institutions, calculated from the due dates of such amounts until payment. The tenant will further be liable to pay the landlord a penalty admin fee of {{LATE_FEE_AMOUNT}} (excl VAT) for any payments made after the due date.

4.8 Should any amounts payable by the landlord increase, the landlord will be entitled to increase the rental pro rata.

4.9 Should the tenant fail to effect timeous and proper payment of any of the amounts above, it will be construed a material breach of this agreement. Should any supplier or service provider terminate a service due to the tenant's non-payment, the tenant will be liable for any reconnection or reinstatement fees applicable.

4.10 It is specifically recorded that the tenant shall be responsible for the monthly municipal account, except for rates and taxes levied on the property, which amount the tenants shall be required to pay monthly in arrears, as it appears on the outstanding invoice made available to the tenant.

4.11 On termination of this agreement the deposit, together with accrued interest, shall be refunded to the tenant within 7 days of expiry of the lease where no amounts are owed and no damage must be repaired. Where repairs are required, the balance of the deposit shall be refunded within 14 days of restoration of the property. Where the tenant fails to attend the outgoing inspection, the balance shall be refunded within 21 days of expiry of the lease, all in accordance with the Rental Housing Act.

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

15.4 The tenant shall be responsible for the maintenance of the interior of the Property, which shall include but not be limited to all appliances, furniture, floors, fitted carpets (if any), locks and keys, electric light fittings and light bulbs, doors, door frames, windows, window frames and window panes, and shall make good and repair any damage which may occur thereto, other than fair wear and tear, and shall at the conclusion of the agreement return the property in the same good order and condition (fair wear and tear excepted).

[[IF HAS_POOL]]
15.5 The tenant shall be responsible for the maintenance and upkeeping, at their own costs, of the swimming pool and shall make good and repair any damage which may occur thereto, fair wear and tear excepted.
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

21.1 The tenant shall not be entitled to sub-let the property or any part thereof or to cede or assign any rights or obligations without the prior written consent of the landlord, in which event the tenant agrees that he still remains liable to the landlord for the full rental and all obligations contained herein. For the avoidance of doubt, letting the property or any part of it on any short-term letting platform (including Airbnb or similar) is expressly prohibited without the landlord's prior written consent.

21.2 The landlord shall be entitled to cede and/or assign all its rights and obligations under the agreement to a third party without the consent and/or permission of the tenant.

22. LEGAL COSTS AND JURISDICTION

22.1 The tenant agrees to be liable for the landlord's legal fees on an attorney and client scale, including collection commission and tracing agent fees, in the event of the landlord taking legal action against the tenant as a result of a breach of any terms of the agreement.

22.2 The landlord and tenant consent to the jurisdiction of the Magistrates Court in the event of any dispute or legal action arising in connection with the agreement or the validity thereof, notwithstanding the fact that claim exceeds such courts usual jurisdiction.

22.3 Without prejudice to any other right or remedy, either party may refer any dispute arising from this agreement or the tenancy to the Provincial Rental Housing Tribunal, whose services are free of charge.

23. SURETY

[[IF TENANT_IS_JURISTIC]]
23.1 In the event that the tenant is a juristic person, the signatory on behalf of the tenant binds himself as surety and co-principal debtor to the landlord for the due and actual performance of its obligations in terms of this agreement, and hereby renounces the benefits of the legal exceptions non causa debiti (no cause for the debt) and non numeratae pecuniae (no valuable consideration received) and holds that he is fully acquainted with the meaning thereof.
[[ENDIF]]

23.2 The schedule incorporated herein, shall specifically alert the signatory to the suretyship to which the signatory consents to.

24. LANDLORD'S RIGHT IF THE PROPERTY IS BONDED

24.1 If the property is mortgaged by the landlord and the landlord has ceded any rights in terms of this agreement to the bondholder, the tenant agrees that this will not affect any of the landlord's rights to institute legal proceedings. The tenant accordingly waives and abandons any right to rely on such cession as defence to any claim or to enforce any right, including the right to obtain an eviction order.

25. OCCUPANTS

The tenant warrants and confirms that only the persons listed in the schedule will be residing and occupying the Property. No additional person may take up residence at the property without the landlord's prior written consent.

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

[[IF PETS_NOT_ALLOWED]]
27.2 No animals, birds or reptiles of any kind may be kept at the property without the prior written consent of the landlord.
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
`;

const CONDITION_REPORT_TEMPLATE = `
================================================================================
ANNEXURE A - IMMOVABLE PROPERTY CONDITION REPORT
================================================================================

IN RELATION TO THE LEASE OF ANY IMMOVABLE PROPERTY
In compliance with the Property Practitioners Act 22 of 2019

OWNER (LANDLORD): {{LANDLORD_FULL_NAME}}
PROPERTY ADDRESS: {{PROPERTY_ADDRESS}}

--------------------------------------------------------------------------------
1. REPORT
--------------------------------------------------------------------------------

This report does not constitute a guarantee or warranty of any kind by the owner of the Property or by the property practitioners representing that owner in any transaction. This report should, therefore, not be regarded as a substitute for any inspections or warranties that prospective tenants may wish to obtain prior to concluding an agreement of lease in respect of the Property.

--------------------------------------------------------------------------------
2. DEFINITIONS
--------------------------------------------------------------------------------

In this form:

2.1 "to be aware" means to have actual notice or knowledge of a certain fact or state of affairs; and

2.2 "defect" means any condition, whether latent or patent, that would or could have a significant deleterious or adverse impact on, or affect, the value of the property, that would or could significantly impair or impact upon the health or safety of any future occupants of the property or that, if not repaired, removed or replaced, would or could significantly shorten or adversely affect the expected normal lifespan of the Property.

--------------------------------------------------------------------------------
3. DISCLOSURE OF INFORMATION
--------------------------------------------------------------------------------

The owner of the Property discloses the information hereunder in the full knowledge that, even though this is not to be construed as a warranty, prospective purchasers of the Property may rely on such information when deciding whether, and on what terms, to purchase the Property. The owner hereby authorises the appointed property practitioner marketing the Property for lease to provide a copy of this statement, and to disclose any information contained in this statement, to any person in connection with any actual or anticipated lease of the Property.

--------------------------------------------------------------------------------
4. PROVISION OF ADDITIONAL INFORMATION
--------------------------------------------------------------------------------

The owner represents that to the best of his or her knowledge the responses to the statements in respect of the Property contained herein have been accurately noted as "yes", "no" or "not applicable". Should the owner have responded to any of the statements with a "yes", the owner shall be obliged to provide, in the additional information area of this form, a full explanation as to the response to the statement concerned.

--------------------------------------------------------------------------------
5. OWNER'S CERTIFICATION
--------------------------------------------------------------------------------

The owner hereby certifies that the information provided in this report is, to the best of the owner's knowledge and belief, true and correct as at the date when the owner signs this report.

--------------------------------------------------------------------------------
6. CERTIFICATION BY PERSON SUPPLYING INFORMATION
--------------------------------------------------------------------------------

If a person other than the owner of the property provides the required information that person must certify that he/she is duly authorised by the owner to supply the information and that he/she has supplied the correct information on which the owner relied for the purposes of this report and, in addition, that the information contained herein is, to the best of that person's knowledge and belief, true and correct as at the date on which that person signs this report.

--------------------------------------------------------------------------------
7. NOTICE REGARDING ADVICE OR INSPECTIONS
--------------------------------------------------------------------------------

Both the owner as well as potential tenants of the property may wish to obtain professional advice and/or to undertake a professional inspection of the property. Under such circumstances adequate provisions must be contained in any agreement of lease to be concluded between the parties pertaining to the obtaining of any such professional advice and/or the conducting of required inspections and/or the disclosure of defects and/or the making of required warranties.

--------------------------------------------------------------------------------
8. TENANT'S ACKNOWLEDGEMENT
--------------------------------------------------------------------------------

The prospective tenant acknowledges that he/she has been informed that professional expertise and/or technical skill and knowledge may be required to detect defects in, and non-compliant aspects concerning, the property. The prospective tenant acknowledges receipt of a copy of this statement.

--------------------------------------------------------------------------------
9. STATEMENTS IN CONNECTION WITH THE PROPERTY
--------------------------------------------------------------------------------

This declaration is made in the utmost good faith and the answers provided reflect a true and honest appraisal of the property as I know it. I/We confirm that we are not aware of any material defects to the PROPERTY or the building or its accessories other than those listed below.

Please answer YES or NO or N/A - where necessary, please provide details under Clause 32.

================================================================================
CONDITION STATEMENTS
================================================================================

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
`;

function getOrdinalSuffix(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatZAR(amount: unknown): string {
  const n = Number(amount);
  if (amount === undefined || amount === null || amount === '' || Number.isNaN(n)) return '';
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatLeaseDate(value: unknown): string {
  if (!value) return '';
  const dt = new Date(String(value));
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: '2-digit' });
}

function buildConditionReportVariables(conditionReport: Record<string, unknown> | null | undefined): Record<string, string> {
  const answerText = (v: unknown) => (v === 'yes' ? 'Yes' : v === 'no' ? 'No' : v === 'na' ? 'N/A' : '—');
  const vars: Record<string, string> = {};
  for (let n = 1; n <= 29; n++) {
    if (n !== 27) vars[`S${n}_ANSWER`] = '—';
  }
  vars.S27_YEARS = '____';
  for (const [key, value] of Object.entries(conditionReport || {})) {
    if (key === 's27_yearsResided') {
      if (value) vars.S27_YEARS = String(value);
      continue;
    }
    const match = /^s(\d+)_/.exec(key);
    if (match) vars[`S${match[1]}_ANSWER`] = answerText(value);
  }
  return vars;
}

// Clause 32: one line per statement answered "Yes", referenced by item number,
// with the landlord's explanation from conditionDetails. Falls back to the
// legacy single comments box for older drafts. Mirrors buildClause32Comments in
// packages/features/src/lease/utils/leaseTemplateEngine.ts — keep them in sync.
function buildClause32Comments(d: any): string {
  const cr = (d?.conditionReport || {}) as Record<string, unknown>;
  const details = (d?.conditionDetails || {}) as Record<string, { comment?: string }>;
  const lines: Array<{ id: number; text: string }> = [];
  for (const [key, val] of Object.entries(cr)) {
    if (val !== 'yes') continue;
    const m = /^s(\d+)_/.exec(key);
    if (!m) continue;
    const id = Number(m[1]);
    const comment = (details[key]?.comment || '').trim();
    if (!comment) continue; // only elaborate items the landlord actually commented on
    lines.push({ id, text: `Item ${id}: ${comment}` });
  }
  lines.sort((a, b) => a.id - b.id);
  if (lines.length) return lines.map((l) => l.text).join('\n');
  const legacy = (cr.comments as string | undefined)?.trim();
  return legacy || 'None';
}

// The `|| legacy` fallbacks cover contracts saved before the wizard existed,
// whose contract_data used landlordName/bankName/deposit-style keys.
function buildTemplateVariables(d: any): Record<string, string> {
  return {
    ...buildConditionReportVariables(d.conditionReport),

    LEASE_TYPE: d.leaseType === 'month_to_month' ? 'Month-to-Month' : 'Fixed-Term',
    LEASE_START_DATE: formatLeaseDate(d.leaseStartDate),
    LEASE_END_DATE: d.leaseEndDate ? formatLeaseDate(d.leaseEndDate) : 'Month-to-Month',
    RENT_AMOUNT: formatZAR(d.rentAmount),
    RENT_DUE_DAY: getOrdinalSuffix(Number(d.rentDueDay) || 1),
    ESCALATION_PERCENT: d.escalationPercent ? `${d.escalationPercent}%` : 'N/A',

    LANDLORD_FULL_NAME: d.landlordFullName || d.landlordName || '',
    LANDLORD_ID_NUMBER: d.landlordIdNumber || d.landlordId || '',
    LANDLORD_ADDRESS: d.landlordAddress || '',
    LANDLORD_EMAIL: d.landlordEmail || '',
    LANDLORD_PHONE: d.landlordPhone || '',

    TENANT_FULL_NAME: d.tenantFullName || d.tenantName || '',
    TENANT_ID_NUMBER: d.tenantIdNumber || d.tenantId || '',
    TENANT_ADDRESS: d.tenantAddress || '',
    TENANT_EMAIL: d.tenantEmail || '',
    TENANT_PHONE: d.tenantPhone || '',

    PROPERTY_ADDRESS: d.propertyAddress || '',

    DEPOSIT_AMOUNT: formatZAR(d.depositAmount ?? d.deposit ?? d.securityDeposit),
    LATE_FEE_AMOUNT: formatZAR(d.lateFeeAmount ?? 250),

    EXCLUDED_ITEMS_LIST: d.excludedItemsList || 'None',
    CLAUSE_32_COMMENTS: buildClause32Comments(d),

    LANDLORD_BANK_NAME: d.landlordBankName || d.bankName || '',
    LANDLORD_ACCOUNT_HOLDER: d.landlordAccountHolder || d.landlordFullName || d.landlordName || '',
    LANDLORD_BRANCH_CODE: d.landlordBranchCode || d.branchCode || '',
    LANDLORD_ACCOUNT_NUMBER: d.landlordAccountNumber || d.accountNumber || '',
    LANDLORD_REFERENCE: d.landlordReference || d.paymentReference || '',

    OCCUPANTS_LIST: d.occupantsList || 'As per application',

    POOL_MAINTENANCE_BY: d.poolMaintenanceBy === 'landlord' ? 'Landlord' : 'Tenant',
    GARDEN_MAINTENANCE_BY: d.gardenMaintenanceBy === 'landlord' ? 'Landlord' : 'Tenant',
    ALARM_MAINTENANCE_BY: d.alarmMaintenanceBy === 'landlord' ? 'Landlord' : 'Tenant',
  };
}

function evaluateCondition(condition: string, d: any): boolean {
  switch (condition.trim().toUpperCase()) {
    case 'CPA_APPLIES':
      // Wizard default is true; old contract_data lacks the flag entirely
      return d.cpaApplies !== false;
    case 'TENANT_IS_JURISTIC':
      return !!d.tenantIsJuristic;
    case 'IS_SECTIONAL_TITLE':
      return !!d.isSectionalTitle;
    case 'HAS_POOL':
      return !!d.hasPool;
    case 'HAS_GARDEN':
      return !!d.hasGarden;
    case 'PETS_ALLOWED':
      return !!d.petsAllowed;
    case 'PETS_NOT_ALLOWED':
      return !d.petsAllowed;
    case 'SMOKING_ALLOWED':
      return !!d.smokingAllowed;
    case 'HAS_ALARM_SECURITY':
      return !!d.hasAlarmSecurity;
    case 'LEASE_TYPE_FIXED':
      return (d.leaseType || 'fixed') === 'fixed';
    case 'LEASE_TYPE_MONTH_TO_MONTH':
      return d.leaseType === 'month_to_month';
    default:
      console.warn(`Unknown condition: ${condition}`);
      return false;
  }
}

function processConditionals(template: string, d: any): string {
  const conditionalRegex = /\[\[IF\s+([A-Z_]+)\s*\]\]([\s\S]*?)\[\[ENDIF\]\]/gi;
  let result = template;
  let previousResult = '';
  while (result !== previousResult) {
    previousResult = result;
    result = result.replace(conditionalRegex, (_match, condition, content) =>
      evaluateCondition(condition, d) ? content : ''
    );
  }
  return result;
}

function replaceVariables(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, variableName) => {
    const value = variables[variableName];
    if (value === undefined) {
      // Never leave a raw {{PLACEHOLDER}} in a signed legal document
      console.warn(`Unknown template variable: ${variableName}`);
      return '';
    }
    return value;
  });
}

function cleanupTemplate(template: string): string {
  return template
    .split('\n')
    .filter((line) => line.trim() !== '' || line === '')
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function processLeaseTemplate(template: string, d: any): string {
  let processed = processConditionals(template, d);
  processed = replaceVariables(processed, buildTemplateVariables(d));
  return cleanupTemplate(processed);
}

// ============================================================================
// PDF rendering
// ============================================================================

async function generatePDFDocument(contract: any, requestOrigin: string | undefined) {
  const data = contract.contract_data || {};
  const today = new Date();
  const margin = 48;
  const lineGap = 8;
  const pageWidth = 612;
  const pageHeight = 792;
  const headerHeight = 60;
  const colors = {
    text: rgb(0, 0, 0),
    muted: rgb(0.4, 0.4, 0.4),
    // App primary blue: hsl(214 100% 59%)
    brand: rgb(0.18, 0.54, 1),
    rule: rgb(0.85, 0.85, 0.85),
    invisible: rgb(1, 1, 1)
  };
  const sizes = {
    h1: 18,
    h2: 13,
    h3: 11,
    body: 10,
    small: 9
  };
  // --- Document Setup ---
  const doc = await PDFDocument.create();
  doc.setTitle(`Lease Agreement • ${contract.title || contract.id}`);
  doc.setAuthor("MzanziHomes");
  doc.setCreator("MzanziHomes Lease Generator");
  doc.setProducer("pdf-lib");
  doc.setCreationDate(today);
  doc.setModificationDate(today);
  const fontBody = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  // --- Logo Embedding ---
  let brandLogo: any = null;
  async function tryEmbedLogo() {
    try {
      const logoUrl = (requestOrigin ? `${requestOrigin}/favicon2.png` : undefined)
        || Deno.env.get("BRAND_LOGO_URL")
        || (requestOrigin ? `${requestOrigin}/favicon_io/favicon-32x32.png` : undefined);
      if (!logoUrl) return;
      const res = await fetch(logoUrl, { cache: "no-store" });
      const bytes = new Uint8Array(await res.arrayBuffer());
      brandLogo = await embedImageBytes(bytes);
    } catch {
      // fail silently, logo stays null
    }
  }
  await tryEmbedLogo();
  // --- State ---
  const pages: any[] = [];
  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin - headerHeight - 8;
  pages.push(page);
  // --- Drawing Helpers ---
  const ensureSpace = (needed: number) => {
    if (y - needed < margin + 40) newPage();
  };
  const newPage = () => {
    drawFooter(page, pages.length);
    page = doc.addPage([pageWidth, pageHeight]);
    pages.push(page);
    drawBrandHeader(page);
    y = pageHeight - margin - headerHeight - 8;
  };
  function drawBrandHeader(p: any) {
    const bandY = pageHeight - headerHeight;
    // Solid app-blue band — no gradient
    p.drawRectangle({
      x: 0,
      y: bandY,
      width: pageWidth,
      height: headerHeight,
      color: colors.brand
    });
    p.drawText("MzanziHomes", {
      x: margin,
      y: bandY + headerHeight / 2 - 6,
      size: 15,
      font: fontBold,
      color: rgb(1, 1, 1)
    });
    if (brandLogo) {
      const logoHeight = 24;
      const logoWidth = brandLogo.width / brandLogo.height * logoHeight;
      p.drawImage(brandLogo, {
        x: pageWidth - margin - logoWidth,
        y: bandY + (headerHeight - logoHeight) / 2,
        width: logoWidth,
        height: logoHeight
      });
    }
  }
  function drawFooter(p: any, pageNumber: number) {
    const text = `Page ${pageNumber}`;
    p.drawText(text, {
      x: pageWidth - margin - fontBody.widthOfTextAtSize(text, sizes.small),
      y: margin - 12,
      size: sizes.small,
      font: fontBody,
      color: colors.muted
    });
    p.drawText(`Agreement of Lease (Residential) — MzanziHomes`, {
      x: margin,
      y: margin - 12,
      size: sizes.small,
      font: fontBody,
      color: colors.muted
    });
    // Invisible initials anchors (used by DocuSign tab placement)
    p.drawText("MzanziHomes_INIT_LANDLORD", {
      x: margin + 60,
      y: margin - 2,
      size: 8,
      font: fontBody,
      color: colors.invisible
    });
    p.drawText("MzanziHomes_INIT_TENANT_1", {
      x: margin + 220,
      y: margin - 2,
      size: 8,
      font: fontBody,
      color: colors.invisible
    });
  }
  // pdf-lib's JPEG parser hangs (infinite marker scan) on non-JPEG bytes, so
  // pick the embedder from the magic bytes instead of try/catch fallback.
  async function embedImageBytes(bytes: Uint8Array) {
    if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return await doc.embedPng(bytes);
    }
    if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8) {
      return await doc.embedJpg(bytes);
    }
    return null;
  }
  async function embedSignatureFromDataUrl(dataUrl: string | null) {
    try {
      if (!dataUrl) return null;
      if (dataUrl.startsWith('data:')) {
        const base64Part = dataUrl.split(',')[1] || '';
        const bytes = Uint8Array.from(atob(base64Part), c => c.charCodeAt(0));
        return await embedImageBytes(bytes);
      }
      const res = await fetch(dataUrl, { cache: 'no-store' });
      const bytes = new Uint8Array(await res.arrayBuffer());
      return await embedImageBytes(bytes);
    } catch {
      return null;
    }
  }
  // Word-wrap so long clauses/values don't run off the right edge.
  // A single unbroken word (long email, reference number) wider than the
  // column is split at character level so nothing runs off the page.
  function breakLongWord(word: string, font: any, size: number, maxWidth: number): string[] {
    if (font.widthOfTextAtSize(word, size) <= maxWidth) return [word];
    const parts: string[] = [];
    let chunk = "";
    for (const ch of word) {
      if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth && chunk) {
        parts.push(chunk);
        chunk = ch;
      } else {
        chunk += ch;
      }
    }
    if (chunk) parts.push(chunk);
    return parts;
  }
  function wrapLines(text: string, font: any, size: number, maxWidth: number): string[] {
    const words = String(text ?? "").split(/\s+/).filter(Boolean)
      .flatMap((w) => breakLongWord(w, font, size, maxWidth));
    if (words.length === 0) return [""];
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
  function drawWrapped(text: string, opts: { font?: any; size?: number; indent?: number; color?: any } = {}) {
    const font = opts.font || fontBody;
    const size = opts.size ?? sizes.body;
    const indent = opts.indent || 0;
    const maxWidth = pageWidth - 2 * margin - indent;
    for (const ln of wrapLines(text, font, size, maxWidth)) {
      ensureSpace(size + lineGap);
      if (ln) {
        page.drawText(ln, { x: margin + indent, y, size, font, color: opts.color || colors.text });
      }
      y -= size + lineGap;
    }
  }
  function drawFormRow(label: string, value: string) {
    const labelWidth = fontBold.widthOfTextAtSize(label, sizes.body);
    const valueX = margin + labelWidth + 10;
    const maxValueWidth = pageWidth - margin - valueX;
    const valueText = value || "________________________";
    // Long values (addresses, emails, references) wrap under the value column
    // instead of running off the right edge.
    const valueLines = wrapLines(valueText, fontBody, sizes.body, maxValueWidth);
    ensureSpace((sizes.body + lineGap) * valueLines.length);
    page.drawText(label, {
      x: margin,
      y,
      size: sizes.body,
      font: fontBold,
      color: colors.text
    });
    page.drawText(":", {
      x: margin + labelWidth + 2,
      y,
      size: sizes.body,
      font: fontBody,
      color: colors.text
    });
    for (const ln of valueLines) {
      page.drawText(ln, {
        x: valueX,
        y,
        size: sizes.body,
        font: fontBody,
        color: colors.text
      });
      y -= sizes.body + lineGap;
    }
  }
  function drawRuleLine() {
    ensureSpace(16);
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: colors.rule
    });
    y -= lineGap;
  }

  // Signatures drawn in place at each party's "Signature:" line, with the
  // invisible anchor DocuSign uses to place its signing tab at the same spot.
  // `lineY` is the baseline of the "Signature: ____" row so the ink sits ON
  // the line rather than floating below it.
  let signatureContext: 'landlord' | 'tenant' | null = null;
  async function drawSignatureBlock(lineY: number) {
    const isLandlord = signatureContext !== 'tenant';
    const anchor = isLandlord ? 'MzanziHomes_SIGN_LANDLORD' : 'MzanziHomes_SIGN_TENANT_1';
    const sigData = isLandlord ? contract?.landlord_signature_data : contract?.tenant_signature_data;
    page.drawText(anchor, {
      x: margin + 120,
      y: lineY,
      size: 8,
      font: fontBody,
      color: colors.invisible
    });
    const img = await embedSignatureFromDataUrl(sigData?.signature_image_url || sigData?.signatureImageUrl || null);
    if (img) {
      const targetHeight = 24;
      const targetWidth = img.width / img.height * targetHeight;
      page.drawImage(img, {
        x: margin + 75,
        y: lineY - 3,
        width: targetWidth,
        height: targetHeight
      });
    }
  }

  // --- Render the processed template, line by line ---
  let firstContentLine = true;
  async function renderText(text: string) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        y -= lineGap;
        continue;
      }
      // "==== / TITLE / ====" banner → section heading
      if (/^=+$/.test(line)) {
        const title = (lines[i + 1] || '').trim();
        if (title && !/^=+$/.test(title) && /^=+$/.test((lines[i + 2] || '').trim())) {
          ensureSpace(sizes.h2 + 3 * lineGap);
          y -= lineGap;
          page.drawText(title, { x: margin, y, size: sizes.h2, font: fontBold, color: colors.brand });
          y -= sizes.h2 + 4;
          drawRuleLine();
          i += 2;
        } else {
          drawRuleLine();
        }
        continue;
      }
      if (/^-+$/.test(line)) {
        drawRuleLine();
        continue;
      }
      // Condition statement table rows: | n | statement | answer |
      if (line.startsWith('|')) {
        const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
        if (cells.length >= 2 && cells[0] !== '#' && !/^-+$/.test(cells[0])) {
          drawWrapped(`${cells[0]}. ${cells[1]}`);
          if (cells[2] && cells[2] !== '-') {
            ensureSpace(sizes.body + lineGap);
            page.drawText(`Answer: ${cells[2]}`, {
              x: margin + 14,
              y,
              size: sizes.body,
              font: fontBold,
              color: colors.muted
            });
            y -= sizes.body + lineGap;
          }
          y -= 2;
        }
        continue;
      }
      // Document title (first content line)
      if (firstContentLine) {
        drawWrapped(line, { font: fontBold, size: sizes.h1 });
        firstContentLine = false;
        continue;
      }
      // Bulleted list items
      if (line.startsWith('- ')) {
        drawWrapped(`•  ${line.slice(2)}`, { indent: 10 });
        continue;
      }
      const hasLower = /[a-z]/.test(line);
      // Numbered clause heading, e.g. "4. RENTAL AND PAYMENTS"
      if (!hasLower && /^\d+\.\s+\S/.test(line)) {
        ensureSpace(sizes.h2 + 2 * lineGap);
        y -= lineGap;
        page.drawText(line, { x: margin, y, size: sizes.h2, font: fontBold, color: colors.text });
        y -= sizes.h2 + lineGap;
        continue;
      }
      // Other ALL-CAPS lines: short → subheading, long → bold paragraph
      if (!hasLower && /[A-Z]/.test(line) && !line.includes(':')) {
        if (line.length <= 50) {
          if (line === 'LANDLORD') signatureContext = 'landlord';
          else if (line === 'TENANT') signatureContext = 'tenant';
          ensureSpace(sizes.h3 + 2 * lineGap);
          y -= 4;
          page.drawText(line, { x: margin, y, size: sizes.h3, font: fontBold, color: colors.text });
          y -= sizes.h3 + lineGap;
        } else {
          drawWrapped(line, { font: fontBold });
        }
        continue;
      }
      // "Label: value" rows (schedule, signature blocks, annexure header).
      // Sentence-style lines ending in a colon ("In this form:") stay prose:
      // an empty value only gets the fill-in underline for Title Case labels.
      // "Signed at ___ on this ___ day of ___" — filled in with the actual
      // signing date once the party in context has signed.
      if (/^Signed at .*day of/.test(line)) {
        const isLandlordCtx = signatureContext !== 'tenant';
        const signedAt = isLandlordCtx ? contract?.landlord_signed_at : contract?.tenant_signed_at;
        if (signedAt) {
          const dt = new Date(signedAt);
          const day = getOrdinalSuffix(dt.getDate());
          const month = dt.toLocaleDateString('en-ZA', { month: 'long' });
          drawWrapped(`Signed electronically via MzanziHomes on this ${day} day of ${month} ${dt.getFullYear()}`);
        } else {
          drawWrapped(line);
        }
        continue;
      }
      const kv = /^([A-Za-z][A-Za-z0-9 ()/&'-]{0,32}):\s*(.*)$/.exec(line);
      if (kv && (kv[2] || kv[1].split(/[\s/]+/).every((w) => /^[A-Z0-9(]/.test(w)))) {
        if (kv[1] === 'Signature') {
          // Reserve room up front so the row and its signature never split
          // across a page break, then remember the row's baseline so the ink
          // lands on the signature line itself.
          ensureSpace(90);
          const rowY = y;
          drawFormRow(kv[1], kv[2]);
          await drawSignatureBlock(rowY);
          continue;
        }
        drawFormRow(kv[1], kv[2]);
        continue;
      }
      drawWrapped(line);
    }
  }

  drawBrandHeader(page);
  await renderText(processLeaseTemplate(MASTER_LEASE_TEMPLATE, data));
  newPage(); // Annexure A starts on its own page
  await renderText(processLeaseTemplate(CONDITION_REPORT_TEMPLATE, data));

  // --- Finalize ---
  drawFooter(page, pages.length);
  return await doc.save();
}

async function generatePDFHash(pdfBuffer: Uint8Array) {
  // Ensure we pass a plain ArrayBuffer to SubtleCrypto
  const start = pdfBuffer.byteOffset;
  const end = start + pdfBuffer.byteLength;
  const ab = pdfBuffer.buffer.slice(start, end);
  const hashBuffer = await crypto.subtle.digest('SHA-256', ab as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
