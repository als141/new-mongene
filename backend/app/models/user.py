from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class User(BaseModel):
    id: str  # Clerk user ID
    school_code: str
    email: Optional[str] = None
    profile_image: Optional[str] = None
    problem_generation_limit: int = 10
    problem_generation_count: int = 0
    figure_regeneration_limit: int = 5
    figure_regeneration_count: int = 0
    preview_limit: int = 3
    preview_count: int = 0
    role: str = "teacher"  # teacher, admin, demo
    preferred_api: str = "gemini"
    preferred_model: str = "gemini-2.5-flash"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class UserSettings(BaseModel):
    preferred_api: Optional[str] = None
    preferred_model: Optional[str] = None


class LoginResponse(BaseModel):
    token: str
    user: User
