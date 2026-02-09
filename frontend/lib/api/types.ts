export interface User {
  id: string;
  school_code: string;
  email?: string;
  profile_image?: string;
  problem_generation_limit: number;
  problem_generation_count: number;
  figure_regeneration_limit: number;
  figure_regeneration_count: number;
  preview_limit: number;
  preview_count: number;
  role: "teacher" | "admin" | "demo";
  preferred_api: string;
  preferred_model: string;
}

export interface Problem {
  id: number;
  user_id: string;
  subject: string;
  prompt?: string;
  content?: string;
  solution?: string;
  image_base64?: string;
  conversation_history?: Array<{ role: string; content: string }>;
  check_info?: CheckInfo;
  opinion_profile_v2?: OpinionProfileV2;
  created_at?: string;
  updated_at?: string;
}

export interface CheckInfo {
  problem_text_ok: boolean;
  solution_ok: boolean;
  figure_ok: boolean;
  units?: string[];
  year?: string;
  exam_session?: string;
  tags?: string[];
}

export interface OpinionProfileV2 {
  text_length_min?: number;
  text_length_max?: number;
  sub_problem_count_min?: number;
  sub_problem_count_max?: number;
  given_values_count_min?: number;
  given_values_count_max?: number;
  solid_composition?: string;
  answer_format?: string[];
  answer_unit?: string;
  auxiliary_points?: boolean;
  setup_units?: string[];
  solution_units?: string[];
  vertices_count_min?: number;
  vertices_count_max?: number;
  moving_point?: boolean;
  figure_values_count_min?: number;
  figure_values_count_max?: number;
  solution_steps_min?: number;
  solution_steps_max?: number;
  logical_branching?: boolean;
  theorem_count_min?: number;
  theorem_count_max?: number;
  multi_unit_integration?: boolean;
  irrelevant_info?: boolean;
}

export interface SearchFilter {
  id: number;
  name: string;
  keyword?: string;
  subject?: string;
  units?: string[];
  year?: string;
  exam_session?: string;
  is_checked?: boolean;
  created_at?: string;
}

export interface SourceListItem {
  id: number;
  year: string;
  exam_session: string;
  created_at?: string;
}

export interface SSEStageEvent {
  event: string;
  data: {
    stage: number;
    total: number;
    pattern?: string;
    pattern_stage?: number;
    message?: string;
    content?: string;
    image_base64?: string;
    error?: string;
    problems?: Problem[];
    [key: string]: unknown;
  };
}
