import apiClient from './apiClient'
import type {
  ExpenseAnalyticsRequest,
  ExpenseAnalyticsResponse,
  ExpenseDrilldownRequest,
  ExpenseDrilldownResponse,
} from './types/expenseAnalytics'

/**
 * Fetch expense analytics data (portfolio, breakdowns, timeline)
 * POST /api/analytics/expenses
 */
export async function getExpenseAnalytics(
  request: ExpenseAnalyticsRequest
): Promise<ExpenseAnalyticsResponse> {
  return apiClient<ExpenseAnalyticsResponse, ExpenseAnalyticsRequest>(
    '/analytics/expenses',
    {
      method: 'POST',
      body: request,
    }
  )
}

/**
 * Fetch expense drilldown data (paginated expense list with line items)
 * POST /api/analytics/expenses/drilldown
 */
export async function getExpenseDrilldown(
  request: ExpenseDrilldownRequest
): Promise<ExpenseDrilldownResponse> {
  return apiClient<ExpenseDrilldownResponse, ExpenseDrilldownRequest>(
    '/analytics/expenses/drilldown',
    {
      method: 'POST',
      body: request,
    }
  )
}
