/**
 * Formula Context Analysis
 *
 * Analyzes cursor position within a formula string and returns the semantic context
 * for driving context-aware suggestion pills in the formula builder.
 *
 * Uses a single forward pass with a lightweight state machine — no tokenizer or AST needed.
 */

export type FormulaContextKind =
  | 'default'              // top-level: show functions, columns, refs, operators
  | 'function_arg'         // inside SUM(/AVG(/MIN(/MAX(/COUNT(: show columns
  | 'sumif_column'         // SUMIF arg 0: show numeric/currency columns
  | 'sumif_filter_field'   // SUMIF arg 1: show all columns
  | 'sumif_operator'       // SUMIF arg 2: show comparison operators
  | 'sumif_value'          // SUMIF arg 3: show text/value hint
  | 'if_condition_field'   // IF arg 0: show columns (bare identifier)
  | 'if_operator'          // IF arg 1: show comparison operators
  | 'if_value'             // IF arg 2: show value hint
  | 'if_true_expr'         // IF arg 3: show columns, refs, arithmetic
  | 'if_false_expr'        // IF arg 4: show columns, refs, arithmetic
  | 'brace_ref_section'    // inside { before dot: show section names
  | 'brace_ref_field'      // inside { after dot: show fields from that section

export interface FormulaContext {
  kind: FormulaContextKind
  partialText: string      // partial word being typed at cursor
  sectionHint?: string     // for brace_ref_field: section logical name before the dot
}

// Simple aggregate functions
const SIMPLE_FUNCTIONS = new Set(['SUM', 'AVG', 'MIN', 'MAX', 'COUNT'])

// Conditional aggregate functions (4-arg: column, filterField, 'op', 'value')
const CONDITIONAL_FUNCTIONS = new Set(['SUMIF', 'AVGIF', 'COUNTIF', 'MINIF', 'MAXIF'])

// IF function (5-arg: conditionField, 'op', 'value', trueExpr, falseExpr)
const IF_FUNCTION = 'IF'

// Operator characters that break "words"
const WORD_BREAK_CHARS = new Set(['+', '-', '*', '/', '(', ')', '{', '}', ',', ' ', '\t', '\n', "'", '"'])

/**
 * Extract the partial text the user is currently typing at the cursor position.
 * This is the text after the last word-breaking character.
 */
function extractPartialText(formula: string, cursorPosition: number): string {
  const before = formula.substring(0, cursorPosition)
  let lastBreak = -1
  for (let i = before.length - 1; i >= 0; i--) {
    if (WORD_BREAK_CHARS.has(before[i])) {
      lastBreak = i
      break
    }
  }
  return before.substring(lastBreak + 1)
}

/**
 * Represents an open function call on the stack during parsing.
 */
interface CallFrame {
  functionName: string   // e.g. 'SUM', 'SUMIF', 'IF'
  argIndex: number       // 0-based: which argument we're currently in
  parenStart: number     // character index of the opening paren
}

/**
 * Analyze the formula up to the cursor position and determine what kind
 * of suggestion pills to show.
 *
 * Strategy: single forward pass tracking:
 * - A stack of open function calls (push on FUNC(, pop on matching ))
 * - Comma counting at each stack depth to determine argument index
 * - Brace tracking for {section.field} references
 * - Quote tracking to skip string content
 */
export function getFormulaContext(formula: string, cursorPosition: number): FormulaContext {
  const pos = Math.min(cursorPosition, formula.length)
  const partialText = extractPartialText(formula, pos)

  // Check if we're inside a brace reference {section.field}
  const braceContext = checkBraceContext(formula, pos)
  if (braceContext) {
    return braceContext
  }

  // Parse function call stack
  const callStack: CallFrame[] = []
  let inSingleQuote = false
  let inDoubleQuote = false
  let i = 0

  while (i < pos) {
    const ch = formula[i]

    // Handle quote toggling (skip content inside quotes)
    if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      i++
      continue
    }
    if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      i++
      continue
    }
    if (inSingleQuote || inDoubleQuote) {
      i++
      continue
    }

    // Opening paren — check if preceded by a function name
    if (ch === '(') {
      const funcName = extractFunctionName(formula, i)
      callStack.push({
        functionName: funcName,
        argIndex: 0,
        parenStart: i,
      })
      i++
      continue
    }

    // Closing paren — pop the stack
    if (ch === ')') {
      if (callStack.length > 0) {
        callStack.pop()
      }
      i++
      continue
    }

    // Comma at current depth — increment arg index of innermost call
    if (ch === ',') {
      if (callStack.length > 0) {
        callStack[callStack.length - 1].argIndex++
      }
      i++
      continue
    }

    i++
  }

  // No open function call — default context
  if (callStack.length === 0) {
    return { kind: 'default', partialText }
  }

  // Resolve context from the innermost open call
  const frame = callStack[callStack.length - 1]
  const kind = resolveCallContext(frame)

  return { kind, partialText }
}

/**
 * Check if cursor is inside a brace reference like {sectionName.fieldName}
 */
function checkBraceContext(formula: string, cursorPosition: number): FormulaContext | null {
  // Scan backwards from cursor to find an unmatched {
  let braceStart = -1
  for (let i = cursorPosition - 1; i >= 0; i--) {
    if (formula[i] === '}') {
      // Found a closing brace before an opening one — not inside braces
      return null
    }
    if (formula[i] === '{') {
      braceStart = i
      break
    }
  }

  if (braceStart === -1) {
    return null
  }

  // We're inside { ... } — extract content between { and cursor
  const content = formula.substring(braceStart + 1, cursorPosition)
  const dotIndex = content.indexOf('.')

  if (dotIndex === -1) {
    // Before the dot: typing section name
    return {
      kind: 'brace_ref_section',
      partialText: content,
    }
  }

  // After the dot: typing field name within a section
  const sectionName = content.substring(0, dotIndex)
  const fieldPartial = content.substring(dotIndex + 1)

  return {
    kind: 'brace_ref_field',
    partialText: fieldPartial,
    sectionHint: sectionName,
  }
}

/**
 * Extract the function name immediately before an opening paren.
 * Returns uppercase function name or empty string if none found.
 */
function extractFunctionName(formula: string, parenIndex: number): string {
  // Walk backwards from just before the paren, skip whitespace
  let end = parenIndex - 1
  while (end >= 0 && (formula[end] === ' ' || formula[end] === '\t')) {
    end--
  }

  if (end < 0) return ''

  // Collect alphanumeric characters (function name)
  let start = end
  while (start >= 0 && /[a-zA-Z_]/.test(formula[start])) {
    start--
  }
  start++

  if (start > end) return ''

  return formula.substring(start, end + 1).toUpperCase()
}

/**
 * Map a CallFrame (function name + argument index) to a FormulaContextKind.
 */
function resolveCallContext(frame: CallFrame): FormulaContextKind {
  const fn = frame.functionName
  const arg = frame.argIndex

  // Simple aggregate functions: SUM, AVG, MIN, MAX, COUNT
  if (SIMPLE_FUNCTIONS.has(fn)) {
    return 'function_arg'
  }

  // Conditional aggregates: SUMIF, AVGIF, COUNTIF, MINIF, MAXIF
  if (CONDITIONAL_FUNCTIONS.has(fn)) {
    switch (arg) {
      case 0: return 'sumif_column'
      case 1: return 'sumif_filter_field'
      case 2: return 'sumif_operator'
      case 3: return 'sumif_value'
      default: return 'default'  // too many args — fall back
    }
  }

  // IF function: IF(conditionField, 'op', 'value', trueExpr, falseExpr)
  if (fn === IF_FUNCTION) {
    switch (arg) {
      case 0: return 'if_condition_field'
      case 1: return 'if_operator'
      case 2: return 'if_value'
      case 3: return 'if_true_expr'
      case 4: return 'if_false_expr'
      default: return 'default'  // too many args
    }
  }

  // Unknown function — treat as function_arg for first arg, default otherwise
  if (arg === 0) return 'function_arg'
  return 'default'
}
