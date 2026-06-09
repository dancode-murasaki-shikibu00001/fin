import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PortfolioHeatmap from "@/components/PortfolioHeatmap";
import type { Position } from "@/lib/api";

const makePosition = (ticker: string, quantity: number, avgCost: number, currentPrice: number): Position => ({
  ticker,
  quantity,
  avg_cost: avgCost,
  current_price: currentPrice,
  unrealized_pnl: (currentPrice - avgCost) * quantity,
  pnl_percent: ((currentPrice - avgCost) / avgCost) * 100,
});

describe("PortfolioHeatmap", () => {
  it("renders positions", () => {
    const positions = [
      makePosition("AAPL", 10, 150.0, 160.0),
      makePosition("GOOGL", 5, 175.0, 170.0),
    ];
    render(<PortfolioHeatmap positions={positions} prices={{}} />);
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("GOOGL")).toBeInTheDocument();
  });

  it("shows empty state when no positions", () => {
    render(<PortfolioHeatmap positions={[]} prices={{}} />);
    expect(screen.getByText("No positions")).toBeInTheDocument();
  });

  it("shows positive P&L percentage", () => {
    const positions = [makePosition("AAPL", 10, 100.0, 110.0)];
    render(<PortfolioHeatmap positions={positions} prices={{}} />);
    expect(screen.getByText("+10.0%")).toBeInTheDocument();
  });

  it("shows negative P&L percentage", () => {
    const positions = [makePosition("TSLA", 5, 200.0, 180.0)];
    render(<PortfolioHeatmap positions={positions} prices={{}} />);
    expect(screen.getByText("-10.0%")).toBeInTheDocument();
  });

  it("uses live price from prices map when available", () => {
    const positions = [makePosition("AAPL", 10, 100.0, 100.0)];
    const prices = {
      AAPL: {
        ticker: "AAPL",
        price: 120.0,
        previous_price: 100.0,
        timestamp: "2026-01-01T00:00:00Z",
        direction: "up" as const,
      },
    };
    render(<PortfolioHeatmap positions={positions} prices={prices} />);
    // 120 vs cost 100 → +20%
    expect(screen.getByText("+20.0%")).toBeInTheDocument();
  });

  it("renders multiple positions", () => {
    const positions = [
      makePosition("AAPL", 10, 150.0, 155.0),
      makePosition("MSFT", 5, 420.0, 430.0),
      makePosition("TSLA", 2, 250.0, 240.0),
    ];
    render(<PortfolioHeatmap positions={positions} prices={{}} />);
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("MSFT")).toBeInTheDocument();
    expect(screen.getByText("TSLA")).toBeInTheDocument();
  });
});
