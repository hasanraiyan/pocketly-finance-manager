"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, HeartHandshake, TrendingUp, Sparkles } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

type Currency = {
  symbol: string;
  code: string;
  defaultIncome: number;
};

const CURRENCIES: Currency[] = [
  { symbol: "₹", code: "INR", defaultIncome: 75000 },
  { symbol: "$", code: "USD", defaultIncome: 5000 },
  { symbol: "€", code: "EUR", defaultIncome: 4200 },
  { symbol: "£", code: "GBP", defaultIncome: 3800 },
  { symbol: "C$", code: "CAD", defaultIncome: 5500 },
  { symbol: "A$", code: "AUD", defaultIncome: 6000 },
];

type SplitPreset = {
  name: string;
  needs: number;
  wants: number;
  savings: number;
  description: string;
};

const PRESETS: SplitPreset[] = [
  {
    name: "Classic 50/30/20",
    needs: 50,
    wants: 30,
    savings: 20,
    description: "Standard balanced framework for steady savings and guilt-free spending.",
  },
  {
    name: "High Cost of Living (60/20/20)",
    needs: 60,
    wants: 20,
    savings: 20,
    description: "Ideal when rent and basic utilities take up a larger share of income.",
  },
  {
    name: "FIRE / Debt Payoff (50/15/35)",
    needs: 50,
    wants: 15,
    savings: 35,
    description: "Aggressive wealth building or rapid high-interest debt elimination.",
  },
];

export function BudgetCalculatorClient() {
  const [currency, setCurrency] = useState<Currency>(CURRENCIES[1]); // USD default
  const [monthlyIncome, setMonthlyIncome] = useState<number>(currency.defaultIncome);
  const [activePreset, setActivePreset] = useState<SplitPreset>(PRESETS[0]);

  const needsAmount = (monthlyIncome * activePreset.needs) / 100;
  const wantsAmount = (monthlyIncome * activePreset.wants) / 100;
  const savingsAmount = (monthlyIncome * activePreset.savings) / 100;

  const handleCurrencyChange = (newCurrency: Currency) => {
    setCurrency(newCurrency);
    setMonthlyIncome(newCurrency.defaultIncome);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(Math.round(num));
  };

  return (
    <div className="flex flex-col gap-10">
      {/* Calculator Core Card */}
      <Card className="p-2 sm:p-4">
        <CardContent className="p-4 sm:p-6">
          <div className="grid gap-8 md:grid-cols-12">
            {/* Left Controls */}
            <div className="flex flex-col gap-6 md:col-span-5">
              <div>
                <p className="mb-2 font-heading text-xs uppercase tracking-wider text-muted-foreground">
                  Currency
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {CURRENCIES.map((c) => (
                    <Button
                      key={c.code}
                      type="button"
                      variant={currency.code === c.code ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleCurrencyChange(c)}
                      className="font-mono text-xs"
                    >
                      {c.symbol} {c.code}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block font-heading text-xs uppercase tracking-wider text-muted-foreground">
                  Monthly Take-Home Income
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-mono text-sm text-muted-foreground">
                    {currency.symbol}
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={monthlyIncome || ""}
                    onChange={(e) => setMonthlyIncome(Number(e.target.value) || 0)}
                    className="pl-8 font-mono text-base font-medium"
                    placeholder="Enter monthly net income"
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Enter net income after taxes and payroll deductions.
                </p>
              </div>

              <div>
                <p className="mb-2 font-heading text-xs uppercase tracking-wider text-muted-foreground">
                  Budget Framework Split
                </p>
                <div className="flex flex-col gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setActivePreset(preset)}
                      className={`flex flex-col items-start p-3 text-left transition-colors ring-1 ${
                        activePreset.name === preset.name
                          ? "bg-muted/60 ring-foreground/40"
                          : "bg-background ring-foreground/10 hover:bg-muted/30 hover:ring-foreground/25"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-heading text-xs font-medium text-foreground">
                          {preset.name}
                        </span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {preset.needs}% / {preset.wants}% / {preset.savings}%
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Visual Breakdown */}
            <div className="flex flex-col justify-between gap-6 md:col-span-7">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-heading text-sm font-medium text-foreground">
                    Allocation Breakdown
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    Total: {currency.symbol}{formatNumber(monthlyIncome)}
                  </span>
                </div>

                {/* Split Progress Track */}
                <div className="mb-6 flex h-3 w-full overflow-hidden bg-muted ring-1 ring-foreground/10">
                  <div
                    style={{ width: `${activePreset.needs}%` }}
                    className="bg-blue-500 transition-all duration-300"
                    title={`Needs: ${activePreset.needs}%`}
                  />
                  <div
                    style={{ width: `${activePreset.wants}%` }}
                    className="bg-amber-500 transition-all duration-300"
                    title={`Wants: ${activePreset.wants}%`}
                  />
                  <div
                    style={{ width: `${activePreset.savings}%` }}
                    className="bg-emerald-500 transition-all duration-300"
                    title={`Savings: ${activePreset.savings}%`}
                  />
                </div>

                {/* 3 Metric Cards */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {/* Needs */}
                  <Card size="sm" className="bg-background">
                    <CardHeader className="pb-1">
                      <div className="flex items-center gap-1.5 text-blue-500">
                        <ShieldCheck className="size-3.5" />
                        <CardTitle className="text-xs">Needs ({activePreset.needs}%)</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="font-mono text-lg font-medium text-foreground">
                        {currency.symbol}{formatNumber(needsAmount)}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Housing, food, utilities, transit.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Wants */}
                  <Card size="sm" className="bg-background">
                    <CardHeader className="pb-1">
                      <div className="flex items-center gap-1.5 text-amber-500">
                        <HeartHandshake className="size-3.5" />
                        <CardTitle className="text-xs">Wants ({activePreset.wants}%)</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="font-mono text-lg font-medium text-foreground">
                        {currency.symbol}{formatNumber(wantsAmount)}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Dining, entertainment, shopping.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Savings */}
                  <Card size="sm" className="bg-background">
                    <CardHeader className="pb-1">
                      <div className="flex items-center gap-1.5 text-emerald-500">
                        <TrendingUp className="size-3.5" />
                        <CardTitle className="text-xs">Savings ({activePreset.savings}%)</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="font-mono text-lg font-medium text-foreground">
                        {currency.symbol}{formatNumber(savingsAmount)}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Emergency fund, investments.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Conversion CTA Box */}
              <Card size="sm" className="border-border bg-muted/40">
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <Sparkles className="size-3.5 text-amber-500" />
                      <span>Track this in Pocketly</span>
                    </div>
                    <CardDescription className="mt-1 text-xs">
                      Set up your {activePreset.needs}/{activePreset.wants}/{activePreset.savings} category limits with zero spreadsheet friction.
                    </CardDescription>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    render={
                      <Link href="/sign-up">
                        Start Tracking Free <ArrowRight className="size-3" />
                      </Link>
                    }
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggested Category Sub-Splits Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recommended Category Sub-Allocations</CardTitle>
          <CardDescription>
            Estimated distribution for{" "}
            <strong className="text-foreground">{currency.symbol}{formatNumber(monthlyIncome)}</strong> monthly take-home income:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bucket</TableHead>
                <TableHead>Category Example</TableHead>
                <TableHead>Recommended Share</TableHead>
                <TableHead className="text-right">Monthly Target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="font-mono text-xs">
              <TableRow>
                <TableCell className="font-sans font-medium text-blue-500">Needs ({activePreset.needs}%)</TableCell>
                <TableCell className="font-sans text-foreground">Rent / Mortgage & Property Fees</TableCell>
                <TableCell className="text-muted-foreground">~30% of net income</TableCell>
                <TableCell className="text-right text-foreground">{currency.symbol}{formatNumber(monthlyIncome * 0.3)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-sans font-medium text-blue-500">Needs ({activePreset.needs}%)</TableCell>
                <TableCell className="font-sans text-foreground">Groceries & Essential Household</TableCell>
                <TableCell className="text-muted-foreground">~10% of net income</TableCell>
                <TableCell className="text-right text-foreground">{currency.symbol}{formatNumber(monthlyIncome * 0.1)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-sans font-medium text-blue-500">Needs ({activePreset.needs}%)</TableCell>
                <TableCell className="font-sans text-foreground">Utilities, Transit & Healthcare</TableCell>
                <TableCell className="text-muted-foreground">~10% of net income</TableCell>
                <TableCell className="text-right text-foreground">{currency.symbol}{formatNumber(monthlyIncome * 0.1)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-sans font-medium text-amber-500">Wants ({activePreset.wants}%)</TableCell>
                <TableCell className="font-sans text-foreground">Dining Out, Coffee & Delivery</TableCell>
                <TableCell className="text-muted-foreground">~15% of net income</TableCell>
                <TableCell className="text-right text-foreground">{currency.symbol}{formatNumber(monthlyIncome * 0.15)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-sans font-medium text-amber-500">Wants ({activePreset.wants}%)</TableCell>
                <TableCell className="font-sans text-foreground">Entertainment, Shopping & Hobbies</TableCell>
                <TableCell className="text-muted-foreground">~15% of net income</TableCell>
                <TableCell className="text-right text-foreground">{currency.symbol}{formatNumber(monthlyIncome * 0.15)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-sans font-medium text-emerald-500">Savings ({activePreset.savings}%)</TableCell>
                <TableCell className="font-sans text-foreground">Emergency Fund / Debt Overpayments</TableCell>
                <TableCell className="text-muted-foreground">~10% of net income</TableCell>
                <TableCell className="text-right text-foreground">{currency.symbol}{formatNumber(monthlyIncome * 0.1)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-sans font-medium text-emerald-500">Savings ({activePreset.savings}%)</TableCell>
                <TableCell className="font-sans text-foreground">Long-Term Investing & Retirement</TableCell>
                <TableCell className="text-muted-foreground">~10% of net income</TableCell>
                <TableCell className="text-right text-foreground">{currency.symbol}{formatNumber(monthlyIncome * 0.1)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
