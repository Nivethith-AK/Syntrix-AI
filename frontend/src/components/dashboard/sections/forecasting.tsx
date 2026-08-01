"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts";

const forecastData = [
  { month: "Jan", actual: 420000, forecast: 400000, target: 450000 },
  { month: "Feb", actual: 480000, forecast: 460000, target: 450000 },
  { month: "Mar", actual: 510000, forecast: 500000, target: 500000 },
  { month: "Apr", actual: 485000, forecast: 520000, target: 500000 },
  { month: "May", actual: 560000, forecast: 550000, target: 550000 },
  { month: "Jun", actual: 620000, forecast: 600000, target: 550000 },
  { month: "Jul", actual: null, forecast: 650000, target: 600000 },
  { month: "Aug", actual: null, forecast: 680000, target: 600000 },
  { month: "Sep", actual: null, forecast: 720000, target: 650000 },
  { month: "Oct", actual: null, forecast: 750000, target: 650000 },
  { month: "Nov", actual: null, forecast: 800000, target: 700000 },
  { month: "Dec", actual: null, forecast: 850000, target: 700000 },
];

const quarterlyForecast = [
  { quarter: "Q1", committed: 1200000, bestCase: 1450000, pipeline: 1800000 },
  { quarter: "Q2", committed: 1500000, bestCase: 1750000, pipeline: 2100000 },
  { quarter: "Q3", committed: 1800000, bestCase: 2100000, pipeline: 2500000 },
  { quarter: "Q4", committed: 2200000, bestCase: 2600000, pipeline: 3000000 },
];

const riskFactors = [
  {
    id: 1,
    title: "Deal Slippage Risk",
    description: "3 deals at risk of pushing to next quarter",
    impact: "-$180,000",
    severity: "high",
    deals: ["Acme Corp Enterprise", "GlobalTech Phase 2", "DataStream Analytics"],
  },
  {
    id: 2,
    title: "Competitor Activity",
    description: "Increased competition in mid-market segment",
    impact: "-$95,000",
    severity: "medium",
    deals: ["NextGen Solutions", "CloudFirst Expansion"],
  },
  {
    id: 3,
    title: "Budget Freeze Warning",
    description: "2 accounts reported potential budget freezes",
    impact: "-$120,000",
    severity: "high",
    deals: ["Innovate Labs", "TechStart Inc"],
  },
];

const scenarios = [
  { name: "Conservative", probability: 85, revenue: 6200000, color: "chart-4" },
  { name: "Base Case", probability: 65, revenue: 7400000, color: "accent" },
  { name: "Optimistic", probability: 40, revenue: 8600000, color: "chart-1" },
];

export function ForecastingSection() {
  const [timeframe, setTimeframe] = useState("quarterly");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const currentQuarterTarget = 1800000;
  const currentQuarterForecast = 2100000;
  const forecastAccuracy = 94;
  const pipelineCoverage = 3.2;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Sales Forecasting</h2>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered predictions based on historical data and pipeline analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[140px] bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: "Q2 Forecast",
            value: `$${(currentQuarterForecast / 1000000).toFixed(1)}M`,
            subtext: `Target: $${(currentQuarterTarget / 1000000).toFixed(1)}M`,
            icon: Target,
            trend: "+17%",
            trendUp: true,
          },
          {
            label: "Forecast Accuracy",
            value: `${forecastAccuracy}%`,
            subtext: "Last 6 months avg",
            icon: CheckCircle2,
            trend: "+2.3%",
            trendUp: true,
          },
          {
            label: "Pipeline Coverage",
            value: `${pipelineCoverage}x`,
            subtext: "vs quota",
            icon: TrendingUp,
            trend: "+0.4x",
            trendUp: true,
          },
          {
            label: "At-Risk Revenue",
            value: "$395K",
            subtext: "3 deals flagged",
            icon: AlertTriangle,
            trend: "-12%",
            trendUp: false,
          },
        ].map((stat, index) => (
          <Card
            key={stat.label}
            className={`border-border bg-card transition-all duration-500 ${
              isLoading ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
            }`}
            style={{ transitionDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-semibold text-foreground mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.subtext}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <stat.icon
                    className={`w-5 h-5 ${
                      stat.label === "At-Risk Revenue" ? "text-chart-3" : "text-accent"
                    }`}
                  />
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      stat.trendUp
                        ? "text-accent border-accent/30"
                        : "text-destructive border-destructive/30"
                    }`}
                  >
                    {stat.trendUp ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {stat.trend}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Revenue Forecast vs Actual</CardTitle>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span className="text-muted-foreground">Actual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-chart-1" />
                <span className="text-muted-foreground">Forecast</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                <span className="text-muted-foreground">Target</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.7 0.18 145)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.7 0.18 145)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.7 0.18 220)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.7 0.18 220)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.005 260)" />
                <XAxis dataKey="month" stroke="oklch(0.65 0 0)" fontSize={12} />
                <YAxis
                  stroke="oklch(0.65 0 0)"
                  fontSize={12}
                  tickFormatter={(value) => `$${value / 1000}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.12 0.005 260)",
                    border: "1px solid oklch(0.22 0.005 260)",
                    borderRadius: "8px",
                    color: "oklch(0.95 0 0)",
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                />
                <Area
                  type="monotone"
                  dataKey="target"
                  stroke="oklch(0.65 0 0)"
                  strokeDasharray="5 5"
                  fill="none"
                  strokeWidth={1}
                />
                <Area
                  type="monotone"
                  dataKey="forecast"
                  stroke="oklch(0.7 0.18 220)"
                  fill="url(#forecastGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="oklch(0.7 0.18 145)"
                  fill="url(#actualGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quarterly Forecast Breakdown */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Quarterly Forecast Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quarterlyForecast} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.005 260)" />
                  <XAxis dataKey="quarter" stroke="oklch(0.65 0 0)" fontSize={12} />
                  <YAxis
                    stroke="oklch(0.65 0 0)"
                    fontSize={12}
                    tickFormatter={(value) => `$${value / 1000000}M`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.12 0.005 260)",
                      border: "1px solid oklch(0.22 0.005 260)",
                      borderRadius: "8px",
                      color: "oklch(0.95 0 0)",
                    }}
                    formatter={(value: number) => [`$${(value / 1000000).toFixed(2)}M`, ""]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px" }}
                    formatter={(value) => (
                      <span style={{ color: "oklch(0.65 0 0)" }}>{value}</span>
                    )}
                  />
                  <Bar dataKey="committed" name="Committed" fill="oklch(0.7 0.18 145)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="bestCase" name="Best Case" fill="oklch(0.7 0.18 220)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pipeline" name="Pipeline" fill="oklch(0.22 0.005 260)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Scenario Analysis */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Scenario Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {scenarios.map((scenario, index) => (
              <div
                key={scenario.name}
                className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-muted-foreground/30 transition-all duration-300 animate-in fade-in slide-in-from-right-2"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-8 rounded-full"
                      style={{
                        backgroundColor:
                          scenario.color === "accent"
                            ? "oklch(0.7 0.18 145)"
                            : scenario.color === "chart-1"
                            ? "oklch(0.7 0.18 220)"
                            : "oklch(0.65 0.2 25)",
                      }}
                    />
                    <div>
                      <p className="font-medium text-foreground">{scenario.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {scenario.probability}% probability
                      </p>
                    </div>
                  </div>
                  <p className="text-xl font-semibold text-foreground">
                    ${(scenario.revenue / 1000000).toFixed(1)}M
                  </p>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${scenario.probability}%`,
                      backgroundColor:
                        scenario.color === "accent"
                          ? "oklch(0.7 0.18 145)"
                          : scenario.color === "chart-1"
                          ? "oklch(0.7 0.18 220)"
                          : "oklch(0.65 0.2 25)",
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Risk Factors */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Risk Factors</CardTitle>
            <Badge variant="outline" className="text-chart-3 border-chart-3/30">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {riskFactors.length} identified
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {riskFactors.map((risk, index) => (
              <div
                key={risk.id}
                className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-chart-3/30 transition-all duration-300 group animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${
                        risk.severity === "high" ? "bg-destructive" : "bg-chart-3"
                      }`}
                    />
                    <div>
                      <p className="font-medium text-foreground">{risk.title}</p>
                      <p className="text-sm text-muted-foreground">{risk.description}</p>
                    </div>
                  </div>
                  <Badge
                    className={
                      risk.severity === "high"
                        ? "bg-destructive/20 text-destructive border-destructive/30"
                        : "bg-chart-3/20 text-chart-3 border-chart-3/30"
                    }
                  >
                    {risk.impact}
                  </Badge>
                </div>
                <div className="ml-5 flex items-center gap-2 flex-wrap">
                  {risk.deals.map((deal) => (
                    <Badge
                      key={deal}
                      variant="outline"
                      className="text-xs text-muted-foreground border-border"
                    >
                      {deal}
                    </Badge>
                  ))}
                </div>
                <div className="ml-5 mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground p-0 h-auto"
                  >
                    View mitigation plan
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
