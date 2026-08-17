import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FORECAST_HORIZONS } from '../../common/finance/forecast-balance';
import { RECURRENCE_FREQUENCIES } from '../../common/finance/next-occurrence';
import { SCENARIO_KINDS } from '../../common/finance/simulate-scenario';
import { scenarioSchema } from '../../intelligence/dto/intelligence-query.dto';
import { McpToolContext, requireScope } from '../mcp-context';
import { errorResult, textResult, zodErrorResult } from '../mcp-result';

const OUTLOOK_DESCRIPTION = `Where the user is heading financially, rather than where they have been. One tool, four metrics via the "metric" field:

- forecast: a day-by-day projection of total balance to the end of the horizon, with the projected closing balance, the lowest point, and the first date the balance goes negative (null if it never does). Recurring rules are projected on their own dates; everything else is a flat run-rate from the last 90 days.
- safe_to_spend: how much can be spent right now without breaking a commitment, with an itemised breakdown of what was subtracted (bills still due, budgeted-but-unspent, goal contributions, reserve). Never negative -- if commitments exceed what is available, the amount is 0 and "shortfall" says by how much.
- health: a 0-100 score with the six components behind it, each carrying its own score, weight and a reason in the user's own numbers. Components with nothing to judge are listed under "unavailable" and excluded from the score rather than counted as zero.
- goals: every goal with progress and a projected completion date.

All amounts are integer minor units (100 = 1.00). Every figure is arithmetic over the user's own records -- no estimates, no model.`;

const SCENARIO_DESCRIPTION = `Model a financial decision before making it, and compare the result against the current projection. Use this for "can I afford X", "what if I save Y a month", "what if my spending went up 10%".

Scenario kinds:
- one_off: a single purchase or windfall. Requires amount; optional date (defaults to today) and type (expense by default).
- recurring: an ongoing change -- a subscription, a raise, a new EMI. Requires amount and frequency (daily, weekly, monthly, yearly); optional interval and type.
- spending_change: a proportional change to non-recurring spending. Requires percentChange (10 = spend 10% more, -20 = spend 20% less).

Returns the baseline and the projected side by side, the change in closing balance and safe-to-spend, any goals whose completion date slips (with how many months), an "affordable" flag, and a one-line verdict. A purchase larger than what is spare is modelled as coming out of money already set aside for goals, which is what pushes their dates out.`;

export function registerIntelligenceTools(
  server: McpServer,
  ctx: McpToolContext,
): void {
  server.registerTool(
    'get_outlook',
    {
      title: 'Get financial outlook',
      description: OUTLOOK_DESCRIPTION,
      inputSchema: {
        metric: z
          .enum(['forecast', 'safe_to_spend', 'health', 'goals'])
          .default('safe_to_spend')
          .describe('Which forward-looking metric to return'),
        horizon: z
          .enum(FORECAST_HORIZONS)
          .default('month')
          .describe('Forecast horizon -- only used by metric "forecast"'),
      },
    },
    async ({ metric, horizon }) => {
      const scope = requireScope(ctx.scopes, 'pocketly:read');
      if (!scope.ok) return errorResult(scope.message);

      switch (metric) {
        case 'forecast':
          return textResult(
            await ctx.services.forecast.forecast(ctx.user, horizon),
          );
        case 'health':
          return textResult(await ctx.services.health.health(ctx.user));
        case 'goals':
          return textResult(
            await ctx.services.goals.findAll(ctx.user, {
              limit: 100,
              cursor: undefined,
            }),
          );
        case 'safe_to_spend':
        default:
          return textResult(
            await ctx.services.safeToSpend.safeToSpend(ctx.user),
          );
      }
    },
  );

  server.registerTool(
    'simulate_scenario',
    {
      title: 'Simulate a financial decision',
      description: SCENARIO_DESCRIPTION,
      inputSchema: {
        kind: z.enum(SCENARIO_KINDS),
        amount: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('Minor units -- required for one_off and recurring'),
        type: z.enum(['income', 'expense']).default('expense'),
        // Plain string for the same reason as the other tools: the SDK
        // validates args against this schema before the handler runs, so a
        // transforming date schema would pre-transform the value the DTO
        // then has to parse again.
        date: z
          .string()
          .optional()
          .describe('ISO 8601 date -- when it happens, defaults to today'),
        frequency: z
          .enum(RECURRENCE_FREQUENCIES)
          .optional()
          .describe('Required for kind "recurring"'),
        interval: z.number().int().positive().max(365).optional(),
        percentChange: z
          .number()
          .optional()
          .describe('Required for kind "spending_change" -- 10 means +10%'),
        label: z.string().max(100).optional(),
      },
    },
    async (rawArgs) => {
      const scope = requireScope(ctx.scopes, 'pocketly:read');
      if (!scope.ok) return errorResult(scope.message);

      const parsed = scenarioSchema.safeParse(rawArgs);
      if (!parsed.success) return zodErrorResult(parsed.error);

      return textResult(
        await ctx.services.scenarios.simulate(ctx.user, parsed.data),
      );
    },
  );
}
