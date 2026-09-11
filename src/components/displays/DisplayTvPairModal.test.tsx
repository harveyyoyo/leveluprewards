import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { DisplayTvPairModal } from "./DisplayTvPairModal";

const props = {
  isOpen: true,
  onClose: vi.fn(),
  schoolId: "demo-school",
  screenId: "lobby & gym",
  screenName: "Lobby TV",
};
describe("TV setup", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("provides the exact screen link and explains sign-in and fullscreen", () => {
    render(<DisplayTvPairModal {...props} />);
    expect(screen.getByLabelText("Screen link")).toHaveValue(
      `${window.location.origin}/demo-school/displays?screen=lobby%20%26%20gym&fullscreen=1`,
    );
    expect(screen.getByText("Sign in if prompted")).toBeInTheDocument();
    expect(screen.getByText("Select Full Screen")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Open display in a new tab/ }),
    ).toHaveAttribute(
      "href",
      screen.getByLabelText("Screen link").getAttribute("value"),
    );
  });

  it("shows a manual-copy fallback when clipboard access fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(<DisplayTvPairModal {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("copy it manually"),
    );
    expect(screen.getByLabelText("Screen link")).toHaveFocus();
    expect(
      screen.queryByRole("button", { name: "Copied" }),
    ).not.toBeInTheDocument();
  });

  it("resets copied feedback when the selected TV changes", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    const view = render(<DisplayTvPairModal {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await screen.findByRole("button", { name: "Copied" });
    view.rerender(<DisplayTvPairModal {...props} screenId="another-screen" />);
    expect(
      screen.getByRole("button", { name: "Copy link" }),
    ).toBeInTheDocument();
  });

  it("renders no setup dialog when closed", () => {
    render(<DisplayTvPairModal {...props} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
