import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TradeBar from "@/components/TradeBar";

vi.mock("@/lib/api", () => ({
  api: {
    trade: vi.fn(),
  },
  apiFetch: vi.fn(),
}));

import { api } from "@/lib/api";

const mockTrade = (ticker: string, side: string, quantity: number, price: number) => ({
  id: "t1",
  ticker,
  side,
  quantity,
  price,
  executed_at: "2026-01-01T00:00:00Z",
});

describe("TradeBar", () => {
  const onTradeExecuted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders ticker, quantity inputs and buy/sell buttons", () => {
    render(<TradeBar onTradeExecuted={onTradeExecuted} />);
    expect(screen.getByPlaceholderText("Ticker")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Qty")).toBeInTheDocument();
    expect(screen.getByText("BUY")).toBeInTheDocument();
    expect(screen.getByText("SELL")).toBeInTheDocument();
  });

  it("buy button calls correct endpoint with buy side", async () => {
    vi.mocked(api.trade).mockResolvedValue(mockTrade("AAPL", "buy", 10, 150.0));

    render(<TradeBar onTradeExecuted={onTradeExecuted} />);
    fireEvent.change(screen.getByPlaceholderText("Ticker"), { target: { value: "AAPL" } });
    fireEvent.change(screen.getByPlaceholderText("Qty"), { target: { value: "10" } });
    fireEvent.click(screen.getByText("BUY"));

    await waitFor(() => {
      expect(api.trade).toHaveBeenCalledWith({ ticker: "AAPL", quantity: 10, side: "buy" });
    });
    expect(onTradeExecuted).toHaveBeenCalled();
  });

  it("sell button calls correct endpoint with sell side", async () => {
    vi.mocked(api.trade).mockResolvedValue(mockTrade("AAPL", "sell", 5, 150.0));

    render(<TradeBar onTradeExecuted={onTradeExecuted} />);
    fireEvent.change(screen.getByPlaceholderText("Ticker"), { target: { value: "AAPL" } });
    fireEvent.change(screen.getByPlaceholderText("Qty"), { target: { value: "5" } });
    fireEvent.click(screen.getByText("SELL"));

    await waitFor(() => {
      expect(api.trade).toHaveBeenCalledWith({ ticker: "AAPL", quantity: 5, side: "sell" });
    });
  });

  it("does not call api with empty ticker", async () => {
    render(<TradeBar onTradeExecuted={onTradeExecuted} />);
    fireEvent.change(screen.getByPlaceholderText("Qty"), { target: { value: "10" } });
    fireEvent.click(screen.getByText("BUY"));

    await new Promise((r) => setTimeout(r, 50));
    expect(api.trade).not.toHaveBeenCalled();
  });

  it("does not call api with zero quantity", async () => {
    render(<TradeBar onTradeExecuted={onTradeExecuted} />);
    fireEvent.change(screen.getByPlaceholderText("Ticker"), { target: { value: "AAPL" } });
    fireEvent.change(screen.getByPlaceholderText("Qty"), { target: { value: "0" } });
    fireEvent.click(screen.getByText("BUY"));

    await new Promise((r) => setTimeout(r, 50));
    expect(api.trade).not.toHaveBeenCalled();
  });
});
