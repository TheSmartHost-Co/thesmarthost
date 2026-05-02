/**
 * Frontend formula validation utility for report templates
 * Validates header fields, table columns, and aggregate field formulas
 */

import type {
  ColumnType,
  TotalsFunction,
  FullReportTemplate,
  DataSourceColumn,
  ReportFieldFormat,
} from '@/services/types/reportTemplate'

export interface ValidationResult {
  valid: boolean
  error?: string
  warnings?: string[]
}

// Regex patterns for formula parsing
const VARIABLE_PATTERN = /\{([^}]+)\}/g
const FUNCTION_PATTERN = /^(SUM|AVG|COUNT|MIN|MAX|SUMIF|AVGIF|COUNTIF|MINIF|MAXIF)\s*\(/i

// Bare identifier pattern: valid column/field name (no braces, no operators)
const BARE_IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/

// Calculated column formula: only {refs}, numbers, operators, parens, whitespace
const CALCULATED_FORMULA_PATTERN = /^[\s\d+\-*/().{}a-zA-Z0-9_]+$/

/**
 * Validate header field value - only allow metadata variables (substitution only, no math)
 * Variables can be standalone like {propertyName} or embedded in text
 * {logo} is only valid alone (not mixed with text)
 */
export function validateHeaderField(value: string, validVariableKeys: string[] = []): ValidationResult {
  if (!value.trim()) {
    return { valid: false, error: 'Header field cannot be empty' }
  }

  // Find all variables in the value
  const variables: string[] = []
  let match
  while ((match = VARIABLE_PATTERN.exec(value)) !== null) {
    variables.push(match[1])
  }

  // If no variables, check if it's plain text (allowed)
  if (variables.length === 0) {
    return { valid: true }
  }

  // Reject arithmetic operators when variables are present (header = substitution only)
  if (/[+\-*/]/.test(value.replace(/\{[^}]*\}/g, ''))) {
    return {
      valid: false,
      error: 'Header fields support variable substitution only — arithmetic operators (+, -, *, /) are not allowed',
    }
  }

  // Validate each variable
  const invalidVariables: string[] = []
  let hasLogo = false

  for (const variable of variables) {
    if (validVariableKeys.length > 0 && !validVariableKeys.includes(variable)) {
      invalidVariables.push(variable)
    }
    if (variable === 'logo') {
      hasLogo = true
    }
  }

  if (invalidVariables.length > 0) {
    return {
      valid: false,
      error: `Invalid variable(s): ${invalidVariables.join(', ')}. Valid options: ${validVariableKeys.join(', ')}`,
    }
  }

  // Check if {logo} is used alone
  if (hasLogo) {
    const trimmedValue = value.trim()
    if (trimmedValue !== '{logo}') {
      return {
        valid: false,
        error: '{logo} must be used alone, not mixed with text or other variables',
      }
    }
  }

  return { valid: true }
}

/**
 * Validate table column formula - check that formula references valid columns for the data source
 * For non-calculated types (text, date, numeric, currency): must be a bare identifier matching an available column
 * For calculated type: must contain at least one {ref} and only use {refs}, numbers, operators, parens
 */
export function validateTableColumn(
  formula: string,
  availableColumns: string[],
  sectionColumns: string[] = [],
  columnType?: ColumnType
): ValidationResult {
  if (!formula.trim()) {
    return { valid: false, error: 'Formula cannot be empty' }
  }

  // For non-calculated types, enforce bare identifier only
  if (columnType && columnType !== 'calculated') {
    const trimmed = formula.trim()
    if (!BARE_IDENTIFIER_PATTERN.test(trimmed)) {
      return { valid: false, error: 'Source column must be a simple column name (no operators or braces)' }
    }
    if (!availableColumns.includes(trimmed)) {
      return { valid: false, error: `Unknown column: ${trimmed}` }
    }
    return { valid: true }
  }

  // For calculated columns: require at least one {ref}
  if (columnType === 'calculated') {
    const bracedRefs: string[] = []
    let bracedMatch
    const bracedPattern = new RegExp(VARIABLE_PATTERN.source, 'g')
    while ((bracedMatch = bracedPattern.exec(formula)) !== null) {
      bracedRefs.push(bracedMatch[1])
    }

    // IF() formulas may not have {refs} outside the true/false expressions — allow if IF() is present
    if (bracedRefs.length === 0 && !/\bIF\s*\(/i.test(formula)) {
      return { valid: false, error: 'Calculated columns must reference other columns using {braces}, e.g. {mgmt_fee} + {cleaning_fee}' }
    }

    // Validate braced references against same-section column logicalNames (snake_case)
    // Calculated column {refs} resolve against rowContext keyed by col.logicalName, NOT raw data source fields
    const validRefs = new Set(sectionColumns)
    const unknownColumns = bracedRefs.filter(col => !validRefs.has(col))
    if (unknownColumns.length > 0) {
      return { valid: false, error: `Unknown column(s): ${unknownColumns.join(', ')}. Use the logical name (snake_case) of other columns in this table section.` }
    }

    // Check that formula only contains valid characters ({refs}, numbers, operators, parens, whitespace)
    if (!CALCULATED_FORMULA_PATTERN.test(formula)) {
      return { valid: false, error: 'Calculated formula can only contain {column references}, numbers, and operators (+, -, *, /)' }
    }

    // Check balanced parens/braces
    const syntaxResult = validateFormulaSyntax(formula)
    if (!syntaxResult.valid) {
      return syntaxResult
    }

    return { valid: true }
  }

  // Default path (no columnType specified — legacy/field-mode usage)
  const warnings: string[] = []

  // First check syntax
  const syntaxResult = validateFormulaSyntax(formula)
  if (!syntaxResult.valid) {
    return syntaxResult
  }

  // Check for {braced} variable references first (backend syntax)
  const bracedRefs: string[] = []
  let bracedMatch
  const bracedPattern = new RegExp(VARIABLE_PATTERN.source, 'g')
  while ((bracedMatch = bracedPattern.exec(formula)) !== null) {
    bracedRefs.push(bracedMatch[1])
  }

  if (bracedRefs.length > 0) {
    // Validate braced references against available columns and same-section columns
    const allValidRefs = new Set([...availableColumns, ...sectionColumns])
    const unknownColumns = bracedRefs.filter(col => !allValidRefs.has(col))
    if (unknownColumns.length > 0) {
      return {
        valid: false,
        error: `Unknown column(s): ${unknownColumns.join(', ')}`,
      }
    }
  } else {
    // Fall back to bare-identifier extraction for formulas without braces
    const columnRefs = extractColumnReferences(formula, availableColumns)

    const unknownColumns = columnRefs.filter(col => !availableColumns.includes(col))
    if (unknownColumns.length > 0) {
      return {
        valid: false,
        error: `Unknown column(s): ${unknownColumns.join(', ')}`,
      }
    }
  }

  return { valid: true, warnings: warnings.length > 0 ? warnings : undefined }
}

/**
 * Validate aggregate field formula - check references to section fields (table or field-mode)
 * Format: {sectionLogicalName.fieldLogicalName}
 */
export function validateAggregateField(
  formula: string,
  tableSections: { name: string; logicalName: string; columns: string[] }[]
): ValidationResult {
  if (!formula.trim()) {
    return { valid: false, error: 'Formula cannot be empty' }
  }

  // First check syntax
  const syntaxResult = validateFormulaSyntax(formula)
  if (!syntaxResult.valid) {
    return syntaxResult
  }

  // Find all {section.column} references
  const references: string[] = []
  let match
  while ((match = VARIABLE_PATTERN.exec(formula)) !== null) {
    references.push(match[1])
  }

  const invalidReferences: string[] = []

  for (const ref of references) {
    if (ref.includes('.')) {
      // Cross-section reference: {sectionName.columnName}
      const [sectionRef, columnRef] = ref.split('.')
      const section = tableSections.find(s => s.logicalName === sectionRef)

      if (!section) {
        invalidReferences.push(`{${ref}} - section "${sectionRef}" not found`)
      } else if (!section.columns.includes(columnRef)) {
        invalidReferences.push(`{${ref}} - field "${columnRef}" not in section "${section.name}"`)
      }
    } else {
      // Same-section reference: {fieldName} - check all sections
      const foundInSection = tableSections.some(s => s.columns.includes(ref))
      if (!foundInSection) {
        invalidReferences.push(`{${ref}} - field not found in any section`)
      }
    }
  }

  if (invalidReferences.length > 0) {
    return {
      valid: false,
      error: `Invalid reference(s): ${invalidReferences.join('; ')}`,
    }
  }

  return { valid: true }
}

/**
 * Check basic formula syntax (balanced parens, valid functions)
 */
export function validateFormulaSyntax(formula: string): ValidationResult {
  const trimmed = formula.trim()

  if (!trimmed) {
    return { valid: false, error: 'Formula cannot be empty' }
  }

  // Check balanced parentheses
  let depth = 0
  for (const char of trimmed) {
    if (char === '(') depth++
    if (char === ')') depth--
    if (depth < 0) {
      return { valid: false, error: 'Unbalanced parentheses: extra closing parenthesis' }
    }
  }
  if (depth !== 0) {
    return { valid: false, error: 'Unbalanced parentheses: missing closing parenthesis' }
  }

  // Check balanced braces
  let braceDepth = 0
  for (const char of trimmed) {
    if (char === '{') braceDepth++
    if (char === '}') braceDepth--
    if (braceDepth < 0) {
      return { valid: false, error: 'Unbalanced braces: extra closing brace' }
    }
  }
  if (braceDepth !== 0) {
    return { valid: false, error: 'Unbalanced braces: missing closing brace' }
  }

  // Check for empty function calls like SUM() (except COUNT which is valid)
  const emptyFunctionPattern = /(SUM|AVG|MIN|MAX|SUMIF|AVGIF|COUNTIF|MINIF|MAXIF)\s*\(\s*\)/i
  if (emptyFunctionPattern.test(trimmed)) {
    return { valid: false, error: 'Function requires a column argument' }
  }

  return { valid: true }
}

/**
 * Extract column references from a formula
 * Identifies bare identifiers that match available columns
 */
function extractColumnReferences(formula: string, availableColumns: string[]): string[] {
  const refs: string[] = []

  // Remove strings (quoted content)
  let cleaned = formula.replace(/"[^"]*"/g, '""')
  cleaned = cleaned.replace(/'[^']*'/g, "''")

  // Remove function names
  cleaned = cleaned.replace(/(SUM|AVG|COUNT|MIN|MAX|SUMIF|AVGIF|COUNTIF|MINIF|MAXIF)\s*\(/gi, '(')

  // Split by operators and whitespace
  const tokens = cleaned.split(/[\s+\-*\/(),]+/).filter(t => t.length > 0)

  for (const token of tokens) {
    // Check if token matches an available column
    if (availableColumns.includes(token)) {
      if (!refs.includes(token)) {
        refs.push(token)
      }
    }
  }

  return refs
}

/**
 * Get suggestions for fixing an invalid formula
 */
export function getFormulaSuggestions(
  formula: string,
  availableColumns: string[]
): string[] {
  const suggestions: string[] = []
  const lower = formula.toLowerCase()

  // Suggest wrapping in SUM if it looks like a column reference
  if (availableColumns.some(col => lower === col.toLowerCase())) {
    const matchedCol = availableColumns.find(col => col.toLowerCase() === lower)
    if (matchedCol) {
      suggestions.push(`SUM(${matchedCol})`)
    }
  }

  return suggestions
}

// ============================================
// Conditional Aggregate Validation (SUMIF, AVGIF, etc.)
// ============================================

const CONDITIONAL_FUNCTION_PATTERN = /\b(SUMIF|AVGIF|COUNTIF|MINIF|MAXIF)\s*\(/gi
const VALID_OPERATORS = new Set(['=', '!=', '<', '>', '<=', '>='])

/**
 * Parse a function call's arguments from a formula string, respecting nested parens and quotes.
 * Returns null if the function is not found or args can't be parsed.
 */
function parseFunctionArgs(formula: string, funcName: string): string[] | null {
  const pattern = new RegExp(`\\b${funcName}\\s*\\(`, 'i')
  const match = pattern.exec(formula)
  if (!match) return null

  const start = match.index + match[0].length
  let depth = 1
  let inSingleQuote = false
  let inDoubleQuote = false
  const args: string[] = []
  let current = ''

  for (let i = start; i < formula.length; i++) {
    const ch = formula[i]

    if (ch === "'" && !inDoubleQuote) { inSingleQuote = !inSingleQuote; current += ch; continue }
    if (ch === '"' && !inSingleQuote) { inDoubleQuote = !inDoubleQuote; current += ch; continue }
    if (inSingleQuote || inDoubleQuote) { current += ch; continue }

    if (ch === '(') { depth++; current += ch; continue }
    if (ch === ')') {
      depth--
      if (depth === 0) {
        args.push(current.trim())
        return args
      }
      current += ch
      continue
    }
    if (ch === ',' && depth === 1) {
      args.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }

  // Unclosed paren — return what we have (partial input)
  if (current.trim()) args.push(current.trim())
  return args
}

/**
 * Extract a quoted string value, stripping surrounding quotes.
 * Accepts both single and double quotes.
 */
function unquote(s: string): string | null {
  const trimmed = s.trim()
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed.slice(1, -1)
  }
  return null
}

/**
 * Validate SUMIF/AVGIF/COUNTIF/MINIF/MAXIF formula structure.
 * Expects: FUNC(column, filterField, 'operator', 'value')
 */
export function validateSumIfFormula(formula: string): ValidationResult {
  const funcNames = ['SUMIF', 'AVGIF', 'COUNTIF', 'MINIF', 'MAXIF']
  const errors: string[] = []

  for (const funcName of funcNames) {
    const pattern = new RegExp(`\\b${funcName}\\s*\\(`, 'i')
    if (!pattern.test(formula)) continue

    const args = parseFunctionArgs(formula, funcName)
    if (!args) continue

    if (args.length < 4) {
      errors.push(`${funcName} requires 4 arguments: ${funcName}(column, filterField, 'operator', 'value')`)
      continue
    }
    if (args.length > 4) {
      errors.push(`${funcName} has too many arguments (expected 4, got ${args.length})`)
      continue
    }

    // Validate arg 0: column name (should be a bare identifier)
    if (!args[0] || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(args[0])) {
      errors.push(`${funcName} first argument must be a column name (e.g., totalPayout)`)
    }

    // Validate arg 1: filter field (should be a bare identifier)
    if (!args[1] || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(args[1])) {
      errors.push(`${funcName} second argument must be a field name to filter on (e.g., platform)`)
    }

    // Validate arg 2: operator (must be a quoted valid operator)
    const operator = unquote(args[2])
    if (operator === null) {
      errors.push(`${funcName} operator (3rd argument) must be quoted, e.g. '=' or "="`)
    } else if (!VALID_OPERATORS.has(operator)) {
      errors.push(`${funcName} operator must be one of: =, !=, <, >, <=, >= (got '${operator}')`)
    }

    // Validate arg 3: value (must be quoted)
    if (args[3] && unquote(args[3]) === null) {
      errors.push(`${funcName} value (4th argument) must be quoted, e.g. 'Airbnb' or "Airbnb"`)
    }
  }

  if (errors.length > 0) {
    return { valid: false, error: errors[0], warnings: errors.length > 1 ? errors.slice(1) : undefined }
  }
  return { valid: true }
}

// ============================================
// IF() Validation for calculated columns
// ============================================

/**
 * Validate IF() formula structure in calculated table columns.
 * Expects: IF(conditionField, 'operator', 'value', trueExpr, falseExpr)
 * No nested IF() support.
 */
export function validateIfFormula(formula: string, availableColumns: string[] = []): ValidationResult {
  if (!/\bIF\s*\(/i.test(formula)) {
    return { valid: true }
  }

  // Check for nested IF
  const ifCount = (formula.match(/\bIF\s*\(/gi) || []).length
  if (ifCount > 1) {
    return { valid: false, error: 'Nested IF() is not supported. Use a single IF() expression.' }
  }

  const args = parseFunctionArgs(formula, 'IF')
  if (!args) {
    return { valid: false, error: 'Could not parse IF() arguments' }
  }

  if (args.length < 5) {
    return {
      valid: false,
      error: `IF() requires 5 arguments: IF(conditionField, 'operator', 'value', trueExpr, falseExpr) — got ${args.length}`,
    }
  }
  if (args.length > 5) {
    return { valid: false, error: `IF() has too many arguments (expected 5, got ${args.length})` }
  }

  // Arg 0: conditionField — bare identifier (not a {ref})
  const condField = args[0]
  if (!condField || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(condField)) {
    return { valid: false, error: 'IF() first argument must be a bare field name (e.g., platform), not a {reference}' }
  }
  if (availableColumns.length > 0 && !availableColumns.includes(condField)) {
    return { valid: false, error: `IF() condition field '${condField}' is not a valid column` }
  }

  // Arg 1: operator — quoted
  const operator = unquote(args[1])
  if (operator === null) {
    return { valid: false, error: "IF() operator (2nd argument) must be quoted, e.g. '='" }
  }
  if (!VALID_OPERATORS.has(operator)) {
    return { valid: false, error: `IF() operator must be one of: =, !=, <, >, <=, >= (got '${operator}')` }
  }

  // Arg 2: value — quoted
  if (unquote(args[2]) === null) {
    return { valid: false, error: "IF() value (3rd argument) must be quoted, e.g. 'Airbnb'" }
  }

  // Args 3 & 4: trueExpr and falseExpr — must contain valid {refs} or numbers/operators
  // Light validation: just check they're non-empty and have valid characters
  for (const [idx, label] of [[3, 'true expression'], [4, 'false expression']] as const) {
    const expr = args[idx]
    if (!expr) {
      return { valid: false, error: `IF() ${label} (argument ${idx + 1}) cannot be empty` }
    }
  }

  return { valid: true }
}

// ============================================
// Cross-Section Reference Type Validation
// ============================================

/**
 * Type info for a field, used for cross-section ref type checking
 */
export interface FieldTypeInfo {
  format: ReportFieldFormat
  columnType?: ColumnType
}

/**
 * Validate that SUM/AVG/MIN/MAX wrapping cross-section references only reference
 * numeric/currency fields, not text or date fields.
 *
 * @param formula - The formula string
 * @param sectionFieldTypes - Map of 'sectionLogicalName.fieldLogicalName' → field type info
 */
export function validateCrossSectionRefTypes(
  formula: string,
  sectionFieldTypes: Map<string, FieldTypeInfo>
): ValidationResult {
  // Find patterns like SUM({section.field}), AVG({section.field}), etc.
  const wrapperPattern = /\b(SUM|AVG|MIN|MAX)\s*\(\s*\{([^}]+)\}\s*\)/gi
  const errors: string[] = []
  let match

  while ((match = wrapperPattern.exec(formula)) !== null) {
    const funcName = match[1]
    const ref = match[2]

    if (!ref.includes('.')) continue // Same-section ref — skip type check here

    const typeInfo = sectionFieldTypes.get(ref)
    if (!typeInfo) continue // Unknown ref — will be caught by ref validation

    const isNumeric = typeInfo.format === 'currency' || typeInfo.format === 'numeric' ||
                      typeInfo.columnType === 'currency' || typeInfo.columnType === 'numeric' ||
                      typeInfo.columnType === 'calculated'

    if (!isNumeric) {
      errors.push(`Cannot use ${funcName}() on text/date field {${ref}} — only numeric or currency fields can be aggregated`)
    }
  }

  if (errors.length > 0) {
    return { valid: false, error: errors.join('; ') }
  }
  return { valid: true }
}

// ============================================
// Name Uniqueness Validation
// ============================================

/**
 * Helper to convert display name to logical name (snake_case)
 */
function toLogicalName(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

/**
 * Validate that names are unique within a scope (case-insensitive).
 * Also checks for logical name collisions.
 *
 * @param names - Array of display names to check
 * @param label - Context label for error messages (e.g., 'Section name', 'Field name in "Financials"')
 */
export function validateNameUniqueness(names: string[], label: string): ValidationResult {
  // Check display name duplicates (case-insensitive)
  const seenDisplay = new Map<string, string>() // lowercase → original
  for (const name of names) {
    const lower = name.toLowerCase().trim()
    if (!lower) continue
    if (seenDisplay.has(lower)) {
      return { valid: false, error: `Duplicate ${label}: "${name}"` }
    }
    seenDisplay.set(lower, name)
  }

  // Check logical name collisions
  const seenLogical = new Map<string, string>() // logicalName → displayName
  for (const name of names) {
    if (!name.trim()) continue
    const logical = toLogicalName(name)
    if (!logical) continue
    if (seenLogical.has(logical)) {
      const other = seenLogical.get(logical)!
      if (other.toLowerCase() !== name.toLowerCase()) {
        return {
          valid: false,
          error: `${label}s "${name}" and "${other}" produce the same formula reference "${logical}" — rename one to avoid conflicts`,
        }
      }
    }
    seenLogical.set(logical, name)
  }

  return { valid: true }
}

// ============================================
// Totals Function Restriction
// ============================================

/**
 * Validate that a totals function is appropriate for the column type.
 * SUM/AVG only valid on currency/numeric/calculated columns.
 */
export function validateTotalsFunction(
  totalsFunction: TotalsFunction | undefined | null,
  columnType: ColumnType | undefined
): ValidationResult {
  if (!totalsFunction || totalsFunction === 'NONE') {
    return { valid: true }
  }

  // COUNT is valid on any type
  if (totalsFunction === 'COUNT') {
    return { valid: true }
  }

  // SUM/AVG require numeric-like columns
  if (totalsFunction === 'SUM' || totalsFunction === 'AVG') {
    if (columnType === 'text' || columnType === 'date') {
      return {
        valid: false,
        error: `${totalsFunction} totals are only available for numeric, currency, or calculated columns (current type: ${columnType})`,
      }
    }
  }

  return { valid: true }
}

// ============================================
// Batch Template Validation
// ============================================

export interface FieldValidationError {
  sectionId: string
  sectionName: string
  fieldId: string
  fieldName: string
  errors: string[]
  warnings: string[]
}

export interface BatchValidationResult {
  valid: boolean
  errors: FieldValidationError[]
  warnings: FieldValidationError[]
}

/**
 * Validate an entire template before saving — runs all validation rules across
 * all sections and fields. Returns blocking errors and advisory warnings.
 *
 * @param template - The full template with sections and fields
 * @param availableColumnsCache - Cached columns per data source from the API
 * @param headerVariableKeys - Valid header variable keys from the API
 */
export function validateTemplateBatch(
  template: FullReportTemplate,
  availableColumnsCache: { booking: DataSourceColumn[]; expense: DataSourceColumn[] },
  headerVariableKeys: string[]
): BatchValidationResult {
  const allErrors: FieldValidationError[] = []
  const allWarnings: FieldValidationError[] = []

  const sections = template.sections || []

  // 1. Section name uniqueness
  const sectionNames = sections.map(s => s.name).filter(Boolean)
  const sectionUniqueness = validateNameUniqueness(sectionNames, 'Section name')
  if (!sectionUniqueness.valid && sectionUniqueness.error) {
    allErrors.push({
      sectionId: '',
      sectionName: 'Template',
      fieldId: '',
      fieldName: 'Sections',
      errors: [sectionUniqueness.error],
      warnings: [],
    })
  }

  // Build cross-section field type map for type-aware ref validation
  const sectionFieldTypes = new Map<string, FieldTypeInfo>()
  for (const section of sections) {
    for (const field of (section.fields || [])) {
      const key = `${section.logicalName}.${field.logicalName}`
      sectionFieldTypes.set(key, {
        format: field.format,
        columnType: field.columnType,
      })
    }
  }

  // Build table sections info for aggregate field validation
  const tableSectionsInfo = sections
    .filter(s => s.sectionMode === 'table' || s.sectionMode === 'field')
    .map(s => ({
      name: s.name,
      logicalName: s.logicalName,
      columns: (s.fields || []).map(f => f.logicalName),
    }))

  // 2. Validate each section's fields
  for (const section of sections) {
    const fields = section.fields || []

    // Field name uniqueness within section
    const fieldNames = fields.map(f => f.name).filter(Boolean)
    const fieldUniqueness = validateNameUniqueness(fieldNames, `Field name in "${section.name}"`)
    if (!fieldUniqueness.valid && fieldUniqueness.error) {
      allErrors.push({
        sectionId: section.id,
        sectionName: section.name,
        fieldId: '',
        fieldName: 'Fields',
        errors: [fieldUniqueness.error],
        warnings: [],
      })
    }

    // Get available columns for this section's data source
    const dataSource = section.dataSource || 'booking'
    const dsColumns = availableColumnsCache[dataSource] || []
    const dsColumnFormulas = dsColumns.map(c => c.formula)

    for (const field of fields) {
      const formula = field.formula?.trim()
      if (!formula) continue // Skip empty formulas (mid-creation)

      const fieldErrors: string[] = []
      const fieldWarnings: string[] = []

      // --- Header section validation ---
      if (section.sectionMode === 'header') {
        const result = validateHeaderField(formula, headerVariableKeys)
        if (!result.valid && result.error) fieldErrors.push(result.error)
      }

      // --- Field section validation ---
      else if (section.sectionMode === 'field') {
        // Syntax check
        const syntax = validateFormulaSyntax(formula)
        if (!syntax.valid && syntax.error) {
          fieldErrors.push(syntax.error)
        } else {
          // Aggregate field references
          const aggResult = validateAggregateField(formula, tableSectionsInfo)
          if (!aggResult.valid && aggResult.error) fieldErrors.push(aggResult.error)

          // SUMIF/AVGIF validation
          if (/\b(SUMIF|AVGIF|COUNTIF|MINIF|MAXIF)\s*\(/i.test(formula)) {
            const sumifResult = validateSumIfFormula(formula)
            if (!sumifResult.valid && sumifResult.error) fieldErrors.push(sumifResult.error)
          }

          // Cross-section ref type validation
          const typeResult = validateCrossSectionRefTypes(formula, sectionFieldTypes)
          if (!typeResult.valid && typeResult.error) fieldErrors.push(typeResult.error)

          // Legacy SUM(expenses) warning
          if (/\bSUM\s*\(\s*expenses\s*\)/i.test(formula)) {
            fieldWarnings.push(
              'SUM(expenses) is a legacy shorthand. Consider using SUM({expense_section.amount}) with a cross-section reference instead.'
            )
          }
        }
      }

      // --- Table section validation ---
      else if (section.sectionMode === 'table') {
        const isCalculated = field.columnType === 'calculated'

        if (!isCalculated) {
          // Direct column: validate it's a known field from the data source
          const colResult = validateTableColumn(formula, dsColumnFormulas, [], field.columnType)
          if (!colResult.valid && colResult.error) fieldErrors.push(colResult.error)
        } else {
          // Calculated column
          const sectionColumnNames = fields
            .filter(f => f.id !== field.id)
            .map(f => f.logicalName)

          const calcResult = validateTableColumn(formula, dsColumnFormulas, sectionColumnNames, 'calculated')
          if (!calcResult.valid && calcResult.error) fieldErrors.push(calcResult.error)

          // IF() validation
          if (/\bIF\s*\(/i.test(formula)) {
            const ifResult = validateIfFormula(formula, dsColumnFormulas)
            if (!ifResult.valid && ifResult.error) fieldErrors.push(ifResult.error)
          }

          // SUMIF in calculated columns
          if (/\b(SUMIF|AVGIF|COUNTIF|MINIF|MAXIF)\s*\(/i.test(formula)) {
            const sumifResult = validateSumIfFormula(formula)
            if (!sumifResult.valid && sumifResult.error) fieldErrors.push(sumifResult.error)
          }
        }

        // Totals function restriction
        const totalsResult = validateTotalsFunction(field.totalsFunction, field.columnType)
        if (!totalsResult.valid && totalsResult.error) fieldErrors.push(totalsResult.error)
      }

      // Collect results
      if (fieldErrors.length > 0) {
        allErrors.push({
          sectionId: section.id,
          sectionName: section.name,
          fieldId: field.id,
          fieldName: field.name,
          errors: fieldErrors,
          warnings: fieldWarnings,
        })
      }
      if (fieldWarnings.length > 0) {
        allWarnings.push({
          sectionId: section.id,
          sectionName: section.name,
          fieldId: field.id,
          fieldName: field.name,
          errors: [],
          warnings: fieldWarnings,
        })
      }
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  }
}
