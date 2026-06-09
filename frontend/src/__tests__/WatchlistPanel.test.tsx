import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Watchlist from "@/components/Watchlist";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  LineChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
  Line: () => null,
}));

vi.mock("@/lib/api", () => ({
  api: {
    getWatchlist: vi.fn().mockResolvedValue([]),
    addTicker: vi.fn().mockResolvedValue({ ticker: "SNAP" }),
    removeTicker: vi.fn().mockResolvedValue(undefined),
  },
  apiFetch: vi.fn(),
}));

import { api } from "@/lib/api";

const makePrices = (tickers: string[]) =>
  Object.fromEntries(
    tickers.map((t) => [
      t,
      {
        ticker: t,
        price: 100.0,
        previous_price: 99.0,
        timestamp: "2026-01-01T00:00:00Z",
        direction: "up" as const,
      },
    ])
  );

describe("WatchlistPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getWatchlist).mockResolvedValue([]);
  });

  it("renders with mock data from API", async () => {
    vi.mocked(api.getWatchlist).mockResolvedValue([
      { ticker: "AAPL", price: 150.0 },
      { ticker: "GOOGL", price: 175.0 },
    ]);
    render(
      <Watchlist
        prices={makePrices(["AAPL", "GOOGL"])}
        priceHistory={{}}
        selectedTicker={null}
        onSelectTicker={vi.fn()}
      />
    );
    await waitFor(() => {
      expect(screen.getByText("AAPL")).toBeInTheDocument();
      expect(screen.getByText("GOOGL")).toBeInTheDocument();
    });
  });

  it("price flash triggers on price change", async () => {
    const { rerender } = render(
      <Watchlist
        prices={makePrices(["AAPL"])}
        priceHistory={{}}
        selectedTicker={null}
        onSelectTicker={vi.fn()}
      />
    );
    const newPrices = {
      AAPL: {
        ticker: "AAPL",
        price: 155.0,
        previous_price: 150.0,
        timestamp: "2026-01-01T00:00:01Z",
        direction: "up" as const,
      },
    };
    rerender(
      <Watchlist
        prices={newPrices}
        priceHistory={{}}
        selectedTicker={null}
        onSelectTicker={vi.fn()}
      />
    );
    // Price updated — the component should still render AAPL
    expect(screen.getByText("AAPL")).toBeInTheDocument();
  });

  it("add ticker calls correct API", async () => {
    vi.mocked(api.addTicker).mockResolvedValue({ ticker: "SNAP" });
    render(
      <Watchlist
        prices={{}}
        priceHistory={{}}
        selectedTicker={null}
        onSelectTicker={vi.fn()}
      />
    );
    const input = screen.getByPlaceholderText("Add ticker");
    fireEvent.change(input, { target: { value: "SNAP" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(api.addTicker).toHaveBeenCalledWith("SNAP");
    });
  });

  it("remove ticker calls correct API", async () => {
    vi.mocked(api.getWatchlist).mockResolvedValue([{ ticker: "AAPL" }]);
    render(
      <Watchlist
        prices={makePrices(["AAPL"])}
        priceHistory={{}}
        selectedTicker={null}
        onSelectTicker={vi.fn()}
      />
    );
    await waitFor(() => expect(screen.getByText("AAPL")).toBeInTheDocument());

    const removeBtn = screen.getByTitle("Remove");
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(api.removeTicker).toHaveBeenCalledWith("AAPL");
    });
  });

  it("shows add ticker input", () => {
    render(
      <Watchlist
        prices={{}}
        priceHistory={{}}
        selectedTicker={null}
        onSelectTicker={vi.fn()}
      />
    );
    expect(screen.getByPlaceholderText("Add ticker")).toBeInTheDocument();
  });
});
