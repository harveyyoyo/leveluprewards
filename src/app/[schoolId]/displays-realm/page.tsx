"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  LayoutGrid,
  Monitor,
  Palette,
  Pause,
  Play,
  Plus,
  Save,
  Search,
  Settings2,
  Smartphone,
  Trash2,
  Trophy,
  Tv,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSettings } from "@/components/providers/SettingsProvider";
import { displaysFeatureEnabled } from "@/lib/displays/displayRoutes";
import { schoolPortalHref } from "@/lib/officePublicUrl";
import { useToast } from "@/hooks/use-toast";
import {
  CURATED_MIX_RECIPES,
  DISPLAY_MODULE_CATALOG,
  DISPLAY_PRESET_CATALOG,
  MODULAR_THEMES,
  READY_MADE_PRESET_SCREENS,
  type DisplayModuleKey,
  type ModularScreenConfig,
} from "@/lib/displays/modularDisplaySchema";
import { useDisplaysLiveFeed } from "@/hooks/useDisplaysLiveFeed";
import { ModularDisplayView } from "@/components/displays/modular/ModularDisplayView";
import { DisplayCanvasPreview } from "@/components/displays/DisplayCanvasPreview";
import { DisplayTvPairModal } from "@/components/displays/DisplayTvPairModal";

import {
  DisplayLeaderboardSettings,
  DisplayLayoutSettings,
  validDisplayNumbers,
} from "@/components/displays/DisplayConfiguration";

type EditorTab = "screen" | "content" | "points" | "style";
type PendingAction =
  { type: "select"; id: string } | { type: "new" } | { type: "leave" };
const EDITOR_TABS = [
  { id: "screen" as const, label: "Screen", icon: Settings2 },
  { id: "content" as const, label: "Content", icon: LayoutGrid },
  { id: "points" as const, label: "Points", icon: Trophy },
  { id: "style" as const, label: "Style", icon: Palette },
];
const isTemplateId = (id: string) =>
  Object.prototype.hasOwnProperty.call(READY_MADE_PRESET_SCREENS, id);

export default function DisplaysRealmPage() {
  const { schoolId: schoolParam } = useParams();
  const schoolId = String(schoolParam || "");
  const router = useRouter();
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const liveFeed = useDisplaysLiveFeed(schoolId);
  const [selectedId, setSelectedId] = useState("hall-of-fame");
  const [draft, setDraft] = useState<ModularScreenConfig | null>(null);
  const [tab, setTab] = useState<EditorTab>("screen");
  const [search, setSearch] = useState("");
  const [tone, setTone] = useState<"all" | "dark" | "light">("all");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTv, setShowTv] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const savedScreens = settings.modularDisplayScreens || {};
  const selected =
    savedScreens[selectedId] ||
    READY_MADE_PRESET_SCREENS[selectedId] ||
    READY_MADE_PRESET_SCREENS["hall-of-fame"];
  const screen = draft || selected;
  const dirty = draft !== null;
  const isTemplate = isTemplateId(screen.id);
  const customScreens = Object.values(savedScreens).filter(
    (item) => item && !isTemplateId(item.id),
  );
  const validDraft =
    screen.name.trim().length > 0 &&
    screen.enabledModules.length > 0 &&
    validDisplayNumbers(screen);
  const fitMode =
    screen.presetKey !== "hall-of-fame" &&
    screen.id !== "hall-of-fame" &&
    screen.presentation !== "scroll";
  const autoScroll =
    !fitMode && (screen.autoScroll ?? screen.presetKey === "hall-of-fame");

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const edit = (updates: Partial<ModularScreenConfig>) => {
    if (
      Object.entries(updates).every(
        ([key, value]) =>
          JSON.stringify(screen[key as keyof ModularScreenConfig]) ===
          JSON.stringify(value),
      )
    )
      return;
    setDraft((previous) => ({
      ...(previous || selected),
      ...(!previous && isTemplateId(selected.id)
        ? { name: `${selected.name} — custom` }
        : {}),
      ...updates,
    }));
  };

  const save = () => {
    if (!draft || !validDraft) return;
    const now = Date.now();
    const next: ModularScreenConfig = {
      ...draft,
      id: isTemplateId(draft.id) ? `screen-${crypto.randomUUID()}` : draft.id,
      name: draft.name.trim(),
      isReadyMade: false,
      createdAt: isTemplateId(draft.id) ? now : draft.createdAt,
      updatedAt: now,
    };
    updateSettings({
      modularDisplayScreens: { ...savedScreens, [next.id]: next },
    });
    setSelectedId(next.id);
    setDraft(null);
    toast({
      title: "Screen saved",
      description: `“${next.name}” is ready to open. Changes sync through your school settings.`,
    });
  };

  const perform = (action: PendingAction) => {
    setDraft(null);
    setPending(null);
    setPreviewPlaying(false);
    if (action.type === "select") setSelectedId(action.id);
    if (action.type === "new") setShowTemplates(true);
    if (action.type === "leave") router.push(schoolPortalHref(schoolId));
  };
  const request = (action: PendingAction) => {
    if (dirty) setPending(action);
    else perform(action);
  };

  const startFrom = (template: ModularScreenConfig) => {
    setSelectedId(template.presetKey || template.id);
    setDraft({
      ...template,
      id: `screen-${crypto.randomUUID()}`,
      name: `${template.name} — custom`,
      isReadyMade: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setTab("screen");
    setShowTemplates(false);
    setShowControls(true);
  };

  const toggleModule = (key: DisplayModuleKey, checked: boolean) => {
    edit({
      enabledModules: checked
        ? [...screen.enabledModules, key]
        : screen.enabledModules.filter((value) => value !== key),
    });
  };

  const remove = () => {
    const next = { ...savedScreens };
    delete next[selected.id];
    updateSettings({ modularDisplayScreens: next });
    setDraft(null);
    setSelectedId("hall-of-fame");
    setConfirmDelete(false);
    toast({
      title: "Screen deleted",
      description: "Choose another screen for any TV that used this link.",
    });
  };

  if (!displaysFeatureEnabled(settings)) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
        <Monitor className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Displays is off for this school</h1>
        <p className="text-muted-foreground">
          Turn on Displays in school settings to get started.
        </p>
        <Button onClick={() => router.push(schoolPortalHref(schoolId))}>
          Back to LevelUp
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="shrink-0 border-b bg-card px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => request({ type: "leave" })}
              aria-label="Back to LevelUp"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="flex items-center gap-2 text-lg font-bold">
                <Monitor className="h-5 w-5 text-primary" />
                Displays Studio
              </h1>
              <p className="text-xs text-muted-foreground">
                Choose a screen. Make it yours. Show it on a TV.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {dirty && (
              <Button
                variant="ghost"
                onClick={() => setPending({ type: "select", id: selectedId })}
              >
                Discard changes
              </Button>
            )}
            <Button
              onClick={save}
              disabled={!dirty || !validDraft}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save screen
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowTv(true)}
              disabled={dirty}
              title={
                dirty
                  ? "Save your changes before opening this screen on a TV"
                  : undefined
              }
              className="gap-2"
            >
              <Tv className="h-4 w-4" />
              Show on TV
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="display-selector" className="text-sm font-medium">
            Screen
          </label>
          <select
            id="display-selector"
            value={selectedId}
            onChange={(event) =>
              request({ type: "select", id: event.target.value })
            }
            className="h-10 w-full max-w-xs rounded-lg border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <optgroup label="Ready to use">
              {DISPLAY_PRESET_CATALOG.map((preset) => (
                <option key={preset.key} value={preset.key}>
                  {preset.name}
                </option>
              ))}
            </optgroup>
            {customScreens.length > 0 && (
              <optgroup label="Your saved screens">
                {customScreens.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <Button
            variant="outline"
            onClick={() => request({ type: "new" })}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New screen
          </Button>
          <p
            role="status"
            className={cn(
              "text-xs",
              dirty
                ? "font-semibold text-amber-700 dark:text-amber-300"
                : "text-muted-foreground",
            )}
          >
            {dirty
              ? "Unsaved changes · Preview only"
              : isTemplate
                ? "Ready to use · Edits create your own copy"
                : "Saved screen · Edit and save to update your TV"}
          </p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        {showControls && (
          <aside
            aria-label="Screen configuration"
            className="flex max-h-[55dvh] w-full shrink-0 flex-col border-b bg-card md:max-h-none md:w-[340px] md:border-b-0 md:border-r xl:w-[380px]"
          >
            <div
              role="tablist"
              aria-label="Configure screen"
              className="grid shrink-0 grid-cols-4 gap-1 border-b p-2"
            >
              {EDITOR_TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  id={`tab-${id}`}
                  role="tab"
                  aria-selected={tab === id}
                  aria-controls="configuration-panel"
                  tabIndex={tab === id ? 0 : -1}
                  onClick={() => setTab(id)}
                  onKeyDown={(event) => {
                    if (
                      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                        event.key,
                      )
                    )
                      return;
                    event.preventDefault();
                    const index = EDITOR_TABS.findIndex(
                      (item) => item.id === id,
                    );
                    const next =
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? EDITOR_TABS.length - 1
                          : (index +
                              (event.key === "ArrowRight"
                                ? 1
                                : EDITOR_TABS.length - 1)) %
                            EDITOR_TABS.length;
                    setTab(EDITOR_TABS[next].id);
                    document
                      .getElementById(`tab-${EDITOR_TABS[next].id}`)
                      ?.focus();
                  }}
                  className={cn(
                    "flex items-center justify-center gap-1 rounded-lg px-2 py-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    tab === id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
            <div
              id="configuration-panel"
              role="tabpanel"
              aria-labelledby={`tab-${tab}`}
              className="min-h-0 flex-1 overflow-y-auto p-5"
            >
              {tab === "screen" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold">Screen details</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Changes appear in the preview. Save when you’re ready.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="screen-name"
                      className="text-sm font-semibold"
                    >
                      Screen name
                    </label>
                    <Input
                      id="screen-name"
                      value={screen.name}
                      onChange={(event) => edit({ name: event.target.value })}
                      placeholder="e.g. Front entrance TV"
                      maxLength={80}
                    />
                    <p className="text-xs text-muted-foreground">
                      For finding this screen in your list.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="screen-title"
                      className="text-sm font-semibold"
                    >
                      Title on the TV
                    </label>
                    <Input
                      id="screen-title"
                      value={screen.customTitle || ""}
                      onChange={(event) =>
                        edit({ customTitle: event.target.value })
                      }
                      placeholder={liveFeed.schoolMeta?.name || "School name"}
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="screen-message"
                      className="text-sm font-semibold"
                    >
                      Message on the TV
                    </label>
                    <textarea
                      id="screen-message"
                      value={screen.customMessage || ""}
                      onChange={(event) =>
                        edit({ customMessage: event.target.value })
                      }
                      placeholder="Learn, level up, and lead today!"
                      maxLength={200}
                      rows={3}
                      className="flex w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-semibold">
                      TV orientation
                    </legend>
                    <div className="grid grid-cols-2 gap-2">
                      {(["landscape", "portrait"] as const).map(
                        (orientation) => (
                          <button
                            key={orientation}
                            type="button"
                            aria-pressed={screen.orientation === orientation}
                            onClick={() => edit({ orientation })}
                            className={cn(
                              "flex items-center justify-center gap-2 rounded-xl border p-3 text-sm focus-visible:ring-2 focus-visible:ring-ring",
                              screen.orientation === orientation
                                ? "border-primary bg-primary/10 text-primary"
                                : "hover:bg-muted",
                            )}
                          >
                            {orientation === "landscape" ? (
                              <Monitor className="h-5 w-5" />
                            ) : (
                              <Smartphone className="h-5 w-5" />
                            )}
                            {orientation === "landscape"
                              ? "Wide · 16:9"
                              : "Tall · 9:16"}
                          </button>
                        ),
                      )}
                    </div>
                  </fieldset>
                  <DisplayLayoutSettings screen={screen} onChange={edit} />
                  {!fitMode && (
                    <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
                      <div>
                        <label
                          htmlFor="screen-scroll"
                          className="text-sm font-semibold"
                        >
                          Scroll automatically
                        </label>
                        <p
                          id="scroll-help"
                          className="mt-1 text-xs leading-relaxed text-muted-foreground"
                        >
                          Move through content that doesn’t fit on the TV.
                          Useful for long leaderboards.
                        </p>
                      </div>
                      <Switch
                        id="screen-scroll"
                        aria-describedby="scroll-help"
                        checked={autoScroll}
                        onCheckedChange={(checked) =>
                          edit({ autoScroll: checked })
                        }
                      />
                    </div>
                  )}
                  {!isTemplateId(selected.id) && (
                    <div className="border-t pt-4">
                      <Button
                        variant="ghost"
                        className="gap-2 text-destructive"
                        onClick={() => setConfirmDelete(true)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete saved screen
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {tab === "content" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base font-bold">
                      What’s on your screen
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Turn items on or off. {screen.enabledModules.length}{" "}
                      selected.
                    </p>
                  </div>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      aria-label="Find content"
                      placeholder="Find content…"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {screen.enabledModules.length === 0 && (
                    <p
                      role="status"
                      className="rounded-lg bg-amber-500/10 p-3 text-sm"
                    >
                      Choose at least one item before saving.
                    </p>
                  )}
                  {(["hall-of-fame", "smart-screen", "bulletin"] as const).map(
                    (category) => {
                      const modules = DISPLAY_MODULE_CATALOG.filter(
                        (item) =>
                          item.category === category &&
                          (item.key !== "hebrewCalendar" ||
                            liveFeed.isJewishOrthodox) &&
                          `${item.label} ${item.description}`
                            .toLowerCase()
                            .includes(search.trim().toLowerCase()),
                      );
                      if (!modules.length) return null;
                      return (
                        <fieldset key={category} className="space-y-2">
                          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {category === "hall-of-fame"
                              ? "Recognition"
                              : category === "smart-screen"
                                ? "Daily information"
                                : "News & rewards"}
                          </legend>
                          {modules.map((item) => (
                            <div
                              key={item.key}
                              className={cn(
                                "flex items-start gap-3 rounded-xl border p-3",
                                screen.enabledModules.includes(item.key) &&
                                  "border-primary/30 bg-primary/5",
                              )}
                            >
                              <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                              <div className="min-w-0 flex-1">
                                <label
                                  htmlFor={`module-${item.key}`}
                                  className="cursor-pointer text-sm font-semibold"
                                >
                                  {item.label}
                                </label>
                                <p
                                  id={`help-${item.key}`}
                                  className="mt-1 text-xs leading-relaxed text-muted-foreground"
                                >
                                  {item.description}
                                </p>
                              </div>
                              <Switch
                                id={`module-${item.key}`}
                                aria-describedby={`help-${item.key}`}
                                checked={screen.enabledModules.includes(
                                  item.key,
                                )}
                                onCheckedChange={(checked) =>
                                  toggleModule(item.key, checked)
                                }
                              />
                            </div>
                          ))}
                        </fieldset>
                      );
                    },
                  )}
                  {!DISPLAY_MODULE_CATALOG.some(
                    (item) =>
                      (item.key !== "hebrewCalendar" ||
                        liveFeed.isJewishOrthodox) &&
                      `${item.label} ${item.description}`
                        .toLowerCase()
                        .includes(search.trim().toLowerCase()),
                  ) && (
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>No content matches “{search}”.</p>
                      <Button variant="outline" onClick={() => setSearch("")}>
                        Clear search
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {tab === "points" && (
                <div className="space-y-4">
                  <h2 className="text-base font-bold">
                    Choose who and what to celebrate
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    These settings apply to the ranking and student cards you
                    turn on in Content.
                  </p>
                  <DisplayLeaderboardSettings
                    screen={screen}
                    onChange={edit}
                    classes={liveFeed.classes || []}
                    categories={liveFeed.categories || []}
                  />
                </div>
              )}

              {tab === "style" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base font-bold">Choose a look</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try any theme in the preview before saving.
                    </p>
                  </div>
                  <div
                    role="group"
                    aria-label="Theme brightness"
                    className="flex gap-1 rounded-lg bg-muted p-1"
                  >
                    {(["all", "dark", "light"] as const).map((value) => (
                      <button
                        key={value}
                        aria-pressed={tone === value}
                        onClick={() => setTone(value)}
                        className={cn(
                          "flex-1 rounded-md px-3 py-2 text-sm capitalize focus-visible:ring-2 focus-visible:ring-ring",
                          tone === value
                            ? "bg-background font-semibold shadow-sm"
                            : "text-muted-foreground",
                        )}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.values(MODULAR_THEMES)
                      .filter((theme) => tone === "all" || theme.tone === tone)
                      .map((theme) => (
                        <button
                          key={theme.id}
                          aria-pressed={screen.theme === theme.id}
                          onClick={() => edit({ theme: theme.id })}
                          className={cn(
                            "overflow-hidden rounded-xl border-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            screen.theme === theme.id
                              ? "border-primary"
                              : "border-border hover:border-primary/40",
                          )}
                        >
                          <div
                            className="space-y-2 p-3"
                            style={{ background: theme.previewBg }}
                          >
                            <div
                              className="h-2 w-1/2 rounded"
                              style={{ background: theme.previewAccent }}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div
                                className="h-8 rounded"
                                style={{ background: theme.previewCard }}
                              />
                              <div
                                className="h-8 rounded"
                                style={{ background: theme.previewCard }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-1 p-2.5 text-xs font-semibold">
                            {theme.name}
                            {screen.theme === theme.id && (
                              <Check className="h-4 w-4 shrink-0 text-primary" />
                            )}
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        <main
          aria-label="Display preview"
          className="flex min-h-[420px] min-w-0 flex-1 flex-col gap-4 bg-slate-100 p-4 dark:bg-slate-950/40 md:min-h-0 xl:p-6"
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">
                {dirty ? "Preview of your changes" : screen.name}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {screen.orientation === "portrait"
                  ? "Tall · 9:16"
                  : "Wide · 16:9"}{" "}
                · {screen.enabledModules.length} content items
                {dirty ? " · Save to update your TV" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {autoScroll && (
                <Button
                  variant="outline"
                  size="sm"
                  aria-pressed={previewPlaying}
                  onClick={() => setPreviewPlaying(!previewPlaying)}
                  className="gap-2"
                >
                  {previewPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {previewPlaying ? "Pause preview" : "Play preview"}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowControls(!showControls)}
                aria-expanded={showControls}
                className="gap-2"
              >
                {showControls ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Settings2 className="h-4 w-4" />
                )}
                {showControls ? "Hide controls" : "Edit screen"}
              </Button>
            </div>
          </div>
          <DisplayCanvasPreview orientation={screen.orientation}>
            {screen.enabledModules.length > 0 ? (
              <ModularDisplayView
                config={screen}
                feed={liveFeed}
                variant="preview"
                autoScroll={autoScroll && previewPlaying}
                onToggleAutoScroll={() => setPreviewPlaying((value) => !value)}
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 bg-slate-950 text-white">
                <LayoutGrid className="h-12 w-12" />
                <p className="text-3xl font-bold">Your screen starts here</p>
                <p className="text-xl">
                  Choose items in Content to fill your display.
                </p>
              </div>
            )}
          </DisplayCanvasPreview>
          <p className="shrink-0 text-center text-xs text-muted-foreground">
            {liveFeed.isLoading
              ? "Loading school data…"
              : "School data updates automatically."}{" "}
            Preview is scaled to fit this window.
          </p>
        </main>
      </div>

      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Start with a screen</DialogTitle>
            <DialogDescription>
              Choose a starting point, then make it yours. Nothing changes on
              your TVs until you save.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {DISPLAY_PRESET_CATALOG.map((preset) => (
              <button
                key={preset.key}
                onClick={() => startFrom(READY_MADE_PRESET_SCREENS[preset.key])}
                className="flex w-full items-start gap-4 rounded-xl border p-4 text-left hover:border-primary hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <preset.icon className="mt-1 h-6 w-6 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold">{preset.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {preset.tagline}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {preset.highlightModules.join(" · ")}
                  </p>
                </div>
                <Plus className="ml-auto mt-1 h-4 w-4 shrink-0" />
              </button>
            ))}
          </div>
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              More starting combinations
            </summary>
            <div className="mt-3 space-y-2">
              {CURATED_MIX_RECIPES.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() =>
                    startFrom({
                      ...READY_MADE_PRESET_SCREENS["smart-screen"],
                      name: recipe.name,
                      theme: recipe.theme,
                      enabledModules: [...recipe.modules],
                      heroModule: recipe.modules[0],
                    })
                  }
                  className="w-full rounded-lg p-3 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <p className="text-sm font-semibold">{recipe.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {recipe.description}
                  </p>
                </button>
              ))}
            </div>
          </details>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Keep your changes?</DialogTitle>
            <DialogDescription>
              You have unsaved changes to “{screen.name || "Untitled screen"}”.
              Save them before continuing, or discard this preview.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setPending(null)}>
              Keep editing
            </Button>
            <Button
              variant="outline"
              onClick={() => pending && perform(pending)}
            >
              Discard changes
            </Button>
            <Button
              disabled={!validDraft}
              onClick={() => {
                if (pending) {
                  save();
                  perform(pending);
                }
              }}
            >
              Save and continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete “{selected.name}”?</DialogTitle>
            <DialogDescription>
              This removes the saved screen and any unsaved edits. TVs using its
              link will need another screen. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove}>
              Delete screen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DisplayTvPairModal
        isOpen={showTv}
        onClose={() => setShowTv(false)}
        schoolId={schoolId}
        screenId={selected.id}
        screenName={selected.name}
      />
    </div>
  );
}
