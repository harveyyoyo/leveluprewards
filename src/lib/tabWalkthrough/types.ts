export type TabWalkthroughStep = {
  title: string;
  checklist: string[];
  example?: { heading: string; rows: string[] };
};

export type TabWalkthroughConfig = {
  title: string;
  subtitle?: string;
  steps: TabWalkthroughStep[];
};
