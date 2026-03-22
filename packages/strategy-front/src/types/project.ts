export interface ProjectInfo {
  id: string;
  worktree: string;
  vcs?: "git";
  name?: string;
  time: {
    created: number;
    updated: number;
    initialized?: number;
  };
}
