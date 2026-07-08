/**
 * Lease Template Engine
 * 
 * Processes the master lease template by:
 * 1. Replacing {{VARIABLE_NAME}} placeholders with actual values
 * 2. Evaluating [[IF CONDITION]]...[[ENDIF]] blocks
 * 3. Removing false conditional blocks entirely
 */

import type { LeaseWizardData } from '@mzanzihomes/common/types/lease';
import { format, parseISO } from 'date-fns';

/**
 * Format a number as South African Rand currency
 */
export function formatZAR(amount: number): string {
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format a date string for display
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    return format(parseISO(dateString), 'dd MMMM yyyy');
  } catch {
    return dateString;
  }
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
export function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Maps wizard data to template variables
 */
export function buildTemplateVariables(data: LeaseWizardData): Record<string, string> {
  return {
    // Step 1: Lease Basics
    LEASE_TYPE: data.leaseType === 'fixed' ? 'Fixed-Term' : 'Month-to-Month',
    LEASE_START_DATE: formatDate(data.leaseStartDate),
    LEASE_END_DATE: data.leaseEndDate ? formatDate(data.leaseEndDate) : 'Month-to-Month',
    RENT_AMOUNT: formatZAR(data.rentAmount),
    RENT_DUE_DAY: getOrdinalSuffix(data.rentDueDay),
    ESCALATION_PERCENT: data.escalationPercent ? `${data.escalationPercent}%` : 'N/A',

    // Step 2: Parties - Landlord
    LANDLORD_FULL_NAME: data.landlordFullName || '',
    LANDLORD_ID_NUMBER: data.landlordIdNumber || '',
    LANDLORD_ADDRESS: data.landlordAddress || '',
    LANDLORD_EMAIL: data.landlordEmail || '',
    LANDLORD_PHONE: data.landlordPhone || '',

    // Step 2: Parties - Tenant
    TENANT_FULL_NAME: data.tenantFullName || '',
    TENANT_ID_NUMBER: data.tenantIdNumber || '',
    TENANT_ADDRESS: data.tenantAddress || '',
    TENANT_EMAIL: data.tenantEmail || '',
    TENANT_PHONE: data.tenantPhone || '',

    // Step 3: Property Details
    PROPERTY_ADDRESS: data.propertyAddress || '',

    // Step 4: Deposit & Fees
    DEPOSIT_AMOUNT: formatZAR(data.depositAmount),
    LATE_FEE_AMOUNT: formatZAR(data.lateFeeAmount),

    // Step 9: Exclusions
    EXCLUDED_ITEMS_LIST: data.excludedItemsList || 'None',

    // Condition Report Comments
    CLAUSE_32_COMMENTS: data.conditionReport?.comments || 'None',

    // Bank Details
    LANDLORD_BANK_NAME: data.landlordBankName || '',
    LANDLORD_BRANCH_CODE: data.landlordBranchCode || '',
    LANDLORD_ACCOUNT_NUMBER: data.landlordAccountNumber || '',
    LANDLORD_REFERENCE: data.landlordReference || '',

    // Occupants
    OCCUPANTS_LIST: data.occupantsList || 'As per application',

    // Maintenance allocation
    POOL_MAINTENANCE_BY: data.poolMaintenanceBy === 'landlord' ? 'Landlord' : 'Tenant',
    GARDEN_MAINTENANCE_BY: data.gardenMaintenanceBy === 'landlord' ? 'Landlord' : 'Tenant',
    ALARM_MAINTENANCE_BY: data.alarmMaintenanceBy === 'landlord' ? 'Landlord' : 'Tenant',
  };
}

/**
 * Evaluates a condition based on wizard data
 * Supports: CPA_APPLIES, TENANT_IS_JURISTIC, IS_SECTIONAL_TITLE,
 * HAS_POOL, HAS_GARDEN, PETS_ALLOWED, SMOKING_ALLOWED, HAS_ALARM_SECURITY
 */
export function evaluateCondition(condition: string, data: LeaseWizardData): boolean {
  const trimmedCondition = condition.trim().toUpperCase();
  
  switch (trimmedCondition) {
    case 'CPA_APPLIES':
      return data.cpaApplies;
    case 'TENANT_IS_JURISTIC':
      return data.tenantIsJuristic;
    case 'IS_SECTIONAL_TITLE':
      return data.isSectionalTitle;
    case 'HAS_POOL':
      return data.hasPool;
    case 'HAS_GARDEN':
      return data.hasGarden;
    case 'PETS_ALLOWED':
      return data.petsAllowed;
    case 'SMOKING_ALLOWED':
      return data.smokingAllowed;
    case 'HAS_ALARM_SECURITY':
      return data.hasAlarmSecurity;
    case 'LEASE_TYPE_FIXED':
      return data.leaseType === 'fixed';
    case 'LEASE_TYPE_MONTH_TO_MONTH':
      return data.leaseType === 'month_to_month';
    default:
      console.warn(`Unknown condition: ${condition}`);
      return false;
  }
}

/**
 * Process nested conditional blocks
 * Handles [[IF CONDITION]]...[[ENDIF]] patterns, including nested ones
 */
function processConditionals(template: string, data: LeaseWizardData): string {
  // Regex to match [[IF CONDITION]] ... [[ENDIF]] blocks (non-greedy, innermost first)
  const conditionalRegex = /\[\[IF\s+([A-Z_]+)\s*\]\]([\s\S]*?)\[\[ENDIF\]\]/gi;
  
  let result = template;
  let previousResult = '';
  
  // Keep processing until no more changes (handles nested conditionals)
  while (result !== previousResult) {
    previousResult = result;
    result = result.replace(conditionalRegex, (match, condition, content) => {
      const conditionMet = evaluateCondition(condition, data);
      if (conditionMet) {
        // Keep the content, but it might have more conditionals to process
        return content;
      } else {
        // Remove the entire block
        return '';
      }
    });
  }
  
  return result;
}

/**
 * Replace all {{VARIABLE_NAME}} placeholders with actual values
 */
function replaceVariables(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (match, variableName) => {
    const value = variables[variableName];
    if (value === undefined) {
      console.warn(`Unknown variable: ${variableName}`);
      return match; // Keep the placeholder if variable not found
    }
    return value;
  });
}

/**
 * Clean up the processed template
 * - Remove empty lines created by removed conditionals
 * - Normalize whitespace
 */
function cleanupTemplate(template: string): string {
  return template
    // Remove lines that are only whitespace
    .split('\n')
    .filter(line => line.trim() !== '' || line === '')
    .join('\n')
    // Remove multiple consecutive blank lines
    .replace(/\n{3,}/g, '\n\n')
    // Trim leading/trailing whitespace
    .trim();
}

/**
 * Main function: Processes the master lease template
 * 1. Evaluates all conditional blocks
 * 2. Replaces all variable placeholders
 * 3. Cleans up the result
 */
export function processLeaseTemplate(template: string, data: LeaseWizardData): string {
  // Step 1: Build variables map
  const variables = buildTemplateVariables(data);
  
  // Step 2: Process conditional blocks (before variable replacement)
  let processed = processConditionals(template, data);
  
  // Step 3: Replace variables
  processed = replaceVariables(processed, variables);
  
  // Step 4: Clean up
  processed = cleanupTemplate(processed);
  
  return processed;
}

/**
 * Calculate CPA applicability based on tenant and landlord status
 */
export function calculateCPAApplicability(
  tenantIsIndividual: boolean,
  landlordActingInBusiness: boolean
): boolean {
  return tenantIsIndividual && landlordActingInBusiness;
}

/**
 * Get condition report questions that are applicable based on property features
 */
export function getApplicableConditionQuestions(data: LeaseWizardData): number[] {
  const applicableQuestions = [1, 2, 3, 4, 5, 6, 7, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29];
  
  // Add alarm question if property has alarm
  if (data.hasAlarmSecurity) {
    applicableQuestions.push(8);
  }
  
  // Add pool questions if property has pool
  if (data.hasPool) {
    applicableQuestions.push(9, 10);
  }
  
  return applicableQuestions.sort((a, b) => a - b);
}
