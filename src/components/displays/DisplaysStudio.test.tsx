import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import type { ModularScreenConfig } from "@/lib/displays/modularDisplaySchema";
import { READY_MADE_PRESET_SCREENS } from "@/lib/displays/modularDisplaySchema";
import DisplaysRealmPage from "@/app/[schoolId]/displays-realm/page";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  push: vi.fn(),
  initial: {} as Record<string, ModularScreenConfig>,
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ schoolId: "schoolabc" }),
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useDisplaysLiveFeed", () => ({
  useDisplaysLiveFeed: () => ({
    schoolMeta: { name: "School ABC" },
    classes: [{ id: "a", name: "Grade A" }],
    categories: [{ id: "kind", name: "Kindness" }],
    isJewishOrthodox: false,
    isLoading: false,
  }),
}));
vi.mock("@/components/displays/DisplayCanvasPreview", () => ({
  DisplayCanvasPreview: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("@/components/displays/modular/ModularDisplayView", () => ({
  ModularDisplayView: ({ config }: { config: ModularScreenConfig }) => (
    <output data-testid="preview">{JSON.stringify(config)}</output>
  ),
}));
vi.mock("@/components/displays/DisplayTvPairModal", () => ({
  DisplayTvPairModal: () => null,
}));
vi.mock("@/components/providers/SettingsProvider", async () => {
  const { useState } = await import("react");
  return {
    useSettings: () => {
      const [screens, setScreens] = useState(mocks.initial);
      return {
        settings: { displaysEnabled: true, modularDisplayScreens: screens },
        updateSettings: (updates: {
          modularDisplayScreens: Record<string, ModularScreenConfig>;
        }) => {
          mocks.update(updates);
          setScreens(updates.modularDisplayScreens);
        },
      };
    },
  };
});

describe("Displays Studio configuration", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.initial = {};
  });

  it("previews template edits without writing until Save, then creates a custom screen", () => {
    render(<DisplaysRealmPage />);
    fireEvent.change(screen.getByLabelText("Title on the TV"), {
      target: { value: "Welcome to our school" },
    });
    expect(screen.getByTestId("preview")).toHaveTextContent(
      "Welcome to our school",
    );
    expect(mocks.update).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Show on TV" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save screen" }));
    const saved = Object.values(
      mocks.update.mock.calls[0][0].modularDisplayScreens,
    ) as ModularScreenConfig[];
    expect(saved).toHaveLength(1);
    expect(saved[0].id).not.toBe("hall-of-fame");
    expect(saved[0]).toMatchObject({
      customTitle: "Welcome to our school",
      isReadyMade: false,
    });
    expect(screen.getByLabelText("Screen", { selector: "select" })).toHaveValue(
      saved[0].id,
    );
    expect(screen.getByRole("button", { name: "Show on TV" })).toBeEnabled();
  });

  it("protects drafts on screen switches and supports cancel and discard", () => {
    render(<DisplaysRealmPage />);
    fireEvent.change(screen.getByLabelText("Screen name"), {
      target: { value: "Lobby draft" },
    });
    fireEvent.change(screen.getByLabelText("Screen", { selector: "select" }), {
      target: { value: "smart-screen" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.getByLabelText("Screen name")).toHaveValue("Lobby draft");
    fireEvent.change(screen.getByLabelText("Screen", { selector: "select" }), {
      target: { value: "smart-screen" },
    });
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Discard changes",
      }),
    );
    expect(screen.getByLabelText("Screen name")).toHaveValue("Smart Screen");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("saves changes before continuing to another screen", () => {
    render(<DisplaysRealmPage />);
    fireEvent.change(screen.getByLabelText("Screen name"), {
      target: { value: "Lobby" },
    });
    fireEvent.change(screen.getByLabelText("Screen", { selector: "select" }), {
      target: { value: "bulletin-board" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Screen name")).toHaveValue("Bulletin Board");
    expect(screen.getByRole("option", { name: "Lobby" })).toBeInTheDocument();
  });

  it("keeps existing screens and legacy preset overrides when opening and saving", () => {
    mocks.initial = {
      "hall-of-fame": {
        ...READY_MADE_PRESET_SCREENS["hall-of-fame"],
        customTitle: "Existing title",
      },
      lobby: {
        ...READY_MADE_PRESET_SCREENS["smart-screen"],
        id: "lobby",
        name: "Lobby TV",
        isReadyMade: false,
      },
    };
    render(<DisplaysRealmPage />);
    expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Screen", { selector: "select" }), {
      target: { value: "lobby" },
    });
    fireEvent.change(screen.getByLabelText("Screen name"), {
      target: { value: "Cafeteria TV" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save screen" }));
    expect(
      mocks.update.mock.calls[0][0].modularDisplayScreens["hall-of-fame"]
        .customTitle,
    ).toBe("Existing title");
    expect(mocks.update.mock.calls[0][0].modularDisplayScreens.lobby.name).toBe(
      "Cafeteria TV",
    );
  });

  it("creates a new screen from a template as an unsaved draft", () => {
    render(<DisplaysRealmPage />);
    fireEvent.click(screen.getByRole("button", { name: "New screen" }));
    fireEvent.click(
      screen.getByRole("button", { name: /Smart Screen Daily Routine/ }),
    );
    expect(screen.getByLabelText("Screen name")).toHaveValue(
      "Smart Screen — custom",
    );
    expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Screen name"), {
      target: { value: "  " },
    });
    expect(screen.getByRole("button", { name: "Save screen" })).toBeDisabled();
  });

  it("previews content limits and prevents saving an empty screen", () => {
    render(<DisplaysRealmPage />);
    fireEvent.click(screen.getByRole("tab", { name: "Points" }));
    fireEvent.change(screen.getByLabelText("Students to show"), {
      target: { value: "5" },
    });
    expect(screen.getByTestId("preview")).toHaveTextContent('"studentLimit":5');
    fireEvent.click(screen.getByRole("tab", { name: "Content" }));
    for (const toggle of screen.getAllByRole("switch")) {
      if (toggle.getAttribute("aria-checked") === "true")
        fireEvent.click(toggle);
    }
    expect(
      screen.getByText("Choose at least one item before saving."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save screen" })).toBeDisabled();
    expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Find content"), {
      target: { value: "weather" },
    });
    expect(screen.getAllByRole("switch")).toHaveLength(1);
    fireEvent.click(screen.getByRole("switch", { name: "Weather & Forecast" }));
    expect(screen.getByRole("button", { name: "Save screen" })).toBeEnabled();
  });

  it("does not create a draft for an unchanged orientation", () => {
    render(<DisplaysRealmPage />);
    fireEvent.click(screen.getByRole("button", { name: "Wide · 16:9" }));
    expect(screen.getByRole("button", { name: "Save screen" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Tall · 9:16" }));
    expect(screen.getByTestId("preview")).toHaveTextContent(
      '"orientation":"portrait"',
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("configures class, categories, period, podium size and an exact student count as a draft", () => {
    render(<DisplaysRealmPage />);
    fireEvent.click(screen.getByRole("tab", { name: "Points" }));
    fireEvent.change(screen.getByLabelText("Who is this screen for?"), {
      target: { value: "a" },
    });
    fireEvent.change(screen.getByLabelText("Points to rank by"), {
      target: { value: "balance" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Kindness" }));
    expect(screen.getByLabelText("Points to rank by")).toHaveValue("lifetime");
    expect(screen.queryByRole("option", { name: "Today" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Points to rank by"), {
      target: { value: "month" },
    });
    fireEvent.change(screen.getByLabelText("Podium places"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Students to show"), {
      target: { value: "17" },
    });
    expect(
      JSON.parse(screen.getByTestId("preview").textContent!),
    ).toMatchObject({
      classId: "a",
      categoryIds: ["kind"],
      pointBasis: "month",
      podiumSize: 2,
      studentLimit: 17,
    });
    expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Students to show"), {
      target: { value: "0" },
    });
    expect(screen.getByRole("button", { name: "Save screen" })).toBeDisabled();
  });

  it("defaults Smart Screen to fitting pages and validates rotation settings", () => {
    render(<DisplaysRealmPage />);
    fireEvent.change(screen.getByLabelText("Screen", { selector: "select" }), {
      target: { value: "smart-screen" },
    });
    expect(screen.getByLabelText("When content fills the TV")).toHaveValue(
      "fit",
    );
    fireEvent.change(screen.getByLabelText("Cards per screen"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Rows per card"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Seconds between pages"), {
      target: { value: "2" },
    });
    expect(screen.getByRole("button", { name: "Save screen" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Seconds between pages"), {
      target: { value: "8" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save screen" }));
    expect(
      Object.values(mocks.update.mock.calls[0][0].modularDisplayScreens)[0],
    ).toMatchObject({ modulesPerPage: 4, itemsPerCard: 2, pageSeconds: 8 });
  });

  it("supports keyboard navigation through all four configuration tabs", () => {
    render(<DisplaysRealmPage />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Screen" }), {
      key: "End",
    });
    expect(screen.getByRole("tab", { name: "Style" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.keyDown(screen.getByRole("tab", { name: "Style" }), {
      key: "ArrowRight",
    });
    expect(screen.getByRole("tab", { name: "Screen" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.keyDown(screen.getByRole("tab", { name: "Screen" }), {
      key: "ArrowLeft",
    });
    expect(screen.getByRole("tab", { name: "Style" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("requires confirmation before deleting a saved screen", () => {
    mocks.initial = {
      lobby: {
        ...READY_MADE_PRESET_SCREENS["smart-screen"],
        id: "lobby",
        name: "Lobby TV",
        isReadyMade: false,
      },
    };
    render(<DisplaysRealmPage />);
    fireEvent.change(screen.getByLabelText("Screen", { selector: "select" }), {
      target: { value: "lobby" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Delete saved screen" }),
    );
    expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByLabelText("Screen name")).toHaveValue("Lobby TV");
    fireEvent.click(
      screen.getByRole("button", { name: "Delete saved screen" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete screen" }));
    expect(mocks.update).toHaveBeenCalledWith({ modularDisplayScreens: {} });
  });
});
