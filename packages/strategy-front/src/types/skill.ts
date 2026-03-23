export interface RuntimeSkill {
  name: string;
  description: string;
  location: string;
  content: string;
}

export interface GlobalSkill {
  name: string;
  description: string;
  path: string;
  content: string;
  updated_at: string;
}

export interface GlobalSkillCatalog {
  root: string;
  skills: GlobalSkill[];
}

export interface SkillChange {
  skill?: GlobalSkill;
  name?: string;
  reload_required: boolean;
}

export interface SkillBody {
  name: string;
  content: string;
}
