/**
 * Frontend formula validation utility for report templates
 * Validates header fields, table columns, and aggregate field formulas
 */


export interface ValidationResult {
  valid: boolean
  error?: string
  warnings?: string[]
}

// Regex patterns for formula parsing
const VARIABLE_PATTERN = /\{([^}]+)\}/g
const FUNCTION_PATTERN = /^(SUM|AVG|COUNT|MIN|MAX|SUMIF|AVGIF|COUNTIF|MINIF|MAXIF)\s*\(/i
const BALANCED_PARENS_PATTERN = /\([^()]*\)/g

/**
 * Validate header field value - only allow metadata variables
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
 */
export function validateTableColumn(
  formula: string,
  availableColumns: string[],
  sectionColumns: string[] = []
): ValidationResult {
  if (!formula.trim()) {
    return { valid: false, error: 'Formula cannot be empty' }
  }

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
