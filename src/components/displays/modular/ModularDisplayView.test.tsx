import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { ModularDisplayView } from "./ModularDisplayView";
import { READY_MADE_PRESET_SCREENS } from "@/lib/displays/modularDisplaySchema";
import type { DisplaysLiveFeed } from "@/hooks/useDisplaysLiveFeed";
import type { Student } from "@/lib/types";
const feed: DisplaysLiveFeed = {
  schoolId: "demo",
  now: new Date(2026, 8, 11),
  schoolMeta: { name: "Demo" },
  students: Array.from({ length: 17 }, (_, index) => ({
    id: String(index),
    name: `Student ${index}`,
    lastName: "Example",
    nfcId: `test-${index}`,
    firstName: `Student ${index}`,
    points: 100 - index,
  })) as Student[],
  classes: [],
  categories: [],
  houses: [],
  prizes: [],
  goals: [],
  bulletinIncentives: [],
  bulletinPosts: [],
  locationInfo: null,
  isJewishOrthodox: false,
  isLoading: false,
};
describe("TV presentation", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it.each([1, 2, 3] as const)(
    "keeps %i podium places outside the scrolling full-width rankings",
    (podiumSize) => {
      const { container } = render(
        <ModularDisplayView
          feed={feed}
          config={{
            ...READY_MADE_PRESET_SCREENS["hall-of-fame"],
            studentLimit: 17,
            podiumSize,
          }}
          autoScroll={false}
        />,
      );
      const region = screen.getByRole("region", {
        name: "Rankings below the podium",
      });
      expect(container.querySelectorAll("[data-podium-place]")).toHaveLength(
        podiumSize,
      );
      expect(region.querySelector("[data-display-podium]")).toBeNull();
      expect(region.querySelectorAll("[data-student-rank]")).toHaveLength(
        17 - podiumSize,
      );
      expect(region.querySelector("[data-student-rank]")).toHaveAttribute(
        "data-student-rank",
        String(podiumSize + 1),
      );
    },
  );
  it("fits cards without a scrolling region and rotates remaining student rows", () => {
    vi.useFakeTimers();
    const { container } = render(
      <ModularDisplayView
        feed={feed}
        config={{
          ...READY_MADE_PRESET_SCREENS["smart-screen"],
          enabledModules: ["studentLeaders", "quote"],
          studentLimit: 17,
          itemsPerCard: 2,
          modulesPerPage: 1,
          pageSeconds: 3,
        }}
      />,
    );
    expect(screen.queryByRole("region")).toBeNull();
    expect(
      container.querySelector("[data-display-fit-grid]"),
    ).toBeInTheDocument();
    expect(container.querySelector("[data-student-rank]")).toHaveAttribute(
      "data-student-rank",
      "1",
    );
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText(/Screen 2 of 2/)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(container.querySelector("[data-student-rank]")).toHaveAttribute(
      "data-student-rank",
      "3",
    );
  });
});
