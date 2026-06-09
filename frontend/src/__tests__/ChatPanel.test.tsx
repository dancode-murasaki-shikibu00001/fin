import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ChatPanel from "@/components/ChatPanel";

vi.mock("@/lib/api", () => ({
  api: {
    chat: vi.fn(),
  },
  apiFetch: vi.fn(),
}));

import { api } from "@/lib/api";

describe("ChatPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders message input and send button", () => {
    render(<ChatPanel />);
    expect(screen.getByPlaceholderText("Message...")).toBeInTheDocument();
    expect(screen.getByText("Send")).toBeInTheDocument();
  });

  it("shows loading state while waiting for response", async () => {
    let resolve: (v: { message: string }) => void;
    vi.mocked(api.chat).mockImplementation(
      () => new Promise((r) => { resolve = r; })
    );

    render(<ChatPanel />);
    fireEvent.change(screen.getByPlaceholderText("Message..."), {
      target: { value: "test" },
    });
    fireEvent.click(screen.getByText("Send"));

    expect(screen.getByPlaceholderText("Message...")).toBeDisabled();

    resolve!({ message: "done" });
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Message...")).not.toBeDisabled();
    });
  });

  it("messages render correctly after send", async () => {
    vi.mocked(api.chat).mockResolvedValue({
      message: "Here is your portfolio analysis.",
    });

    render(<ChatPanel />);
    const input = screen.getByPlaceholderText("Message...");
    fireEvent.change(input, { target: { value: "Show portfolio" } });
    fireEvent.click(screen.getByText("Send"));

    expect(screen.getByText("Show portfolio")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Here is your portfolio analysis.")).toBeInTheDocument();
    });
  });

  it("shows error message on API failure", async () => {
    vi.mocked(api.chat).mockRejectedValue(new Error("Network error"));

    render(<ChatPanel />);
    fireEvent.change(screen.getByPlaceholderText("Message..."), {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByText("Send"));

    await waitFor(() => {
      expect(screen.getByText("Error: failed to get response.")).toBeInTheDocument();
    });
  });

  it("send button is disabled when input is empty", () => {
    render(<ChatPanel />);
    expect(screen.getByText("Send")).toBeDisabled();
  });

  it("calls onDataRefresh after trade execution", async () => {
    const onDataRefresh = vi.fn();
    vi.mocked(api.chat).mockResolvedValue({
      message: "Bought 10 AAPL.",
      trades: [{ ticker: "AAPL", side: "buy", quantity: 10 }],
    });

    render(<ChatPanel onDataRefresh={onDataRefresh} />);
    fireEvent.change(screen.getByPlaceholderText("Message..."), {
      target: { value: "buy AAPL" },
    });
    fireEvent.click(screen.getByText("Send"));

    await waitFor(() => {
      expect(onDataRefresh).toHaveBeenCalledTimes(1);
    });
  });
});
