#!/usr/bin/env python3
"""Public registration must not allow privilege-bearing roles."""
import asyncio
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

BACKEND = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(BACKEND))

from pydantic import ValidationError  # noqa: E402
from fastapi import HTTPException  # noqa: E402
from app.api.endpoints.auth import update_current_user_profile  # noqa: E402
from app.api.endpoints.documents import upload_encrypted_document  # noqa: E402
from app.schemas.schemas import (  # noqa: E402
    PostCreateSchema,
    ProfileUpdateSchema,
    RoleChangeRequestCreateSchema,
    RoleChangeRequestReviewSchema,
    UserCreateSchema,
)


class UserRegistrationRoleTests(unittest.TestCase):
    def create_payload(self, role_name=None):
        payload = {
            "email": "member@upc.edu",
            "full_name": "UPC Member",
            "password": "valid-password",
        }
        if role_name is not None:
            payload["role_name"] = role_name
        return UserCreateSchema(**payload)

    def test_student_and_alumni_roles_are_allowed(self):
        self.assertEqual(self.create_payload("Student").role_name, "Student")
        self.assertEqual(self.create_payload("Alumni").role_name, "Alumni")

    def test_default_role_is_student(self):
        self.assertEqual(self.create_payload().role_name, "Student")

    def test_administrator_role_is_rejected(self):
        with self.assertRaises(ValidationError):
            self.create_payload("Administrator")

    def test_administrator_cannot_upload_cv(self):
        admin = SimpleNamespace(role=SimpleNamespace(name="Administrator"))
        with self.assertRaises(HTTPException) as raised:
            asyncio.run(upload_encrypted_document(file=None, db=Mock(), current_user=admin))
        self.assertEqual(raised.exception.status_code, 403)

    def test_administrator_cannot_edit_member_profile(self):
        admin = SimpleNamespace(role=SimpleNamespace(name="Administrator"))
        with self.assertRaises(HTTPException) as raised:
            update_current_user_profile(ProfileUpdateSchema(company="Example"), admin, Mock())
        self.assertEqual(raised.exception.status_code, 403)

    def test_role_change_requests_require_a_reason_and_valid_target(self):
        request = RoleChangeRequestCreateSchema(
            requested_role="Alumni",
            reason="I graduated and need the alumni profile."
        )
        self.assertEqual(request.requested_role, "Alumni")
        with self.assertRaises(ValidationError):
            RoleChangeRequestCreateSchema(requested_role="Administrator", reason="I want admin access.")
        with self.assertRaises(ValidationError):
            RoleChangeRequestCreateSchema(requested_role="Alumni", reason="Short")

    def test_admin_review_decision_is_constrained(self):
        self.assertEqual(RoleChangeRequestReviewSchema(decision="APPROVED").decision, "APPROVED")
        self.assertEqual(RoleChangeRequestReviewSchema(decision="REJECTED").decision, "REJECTED")
        with self.assertRaises(ValidationError):
            RoleChangeRequestReviewSchema(decision="Student")

    def test_post_schema_preserves_original_whitespace(self):
        content = "  First line\n    Second line\nThird line  "
        self.assertEqual(PostCreateSchema(content=content).content, content)

    def test_post_schema_rejects_whitespace_only_content(self):
        with self.assertRaises(ValidationError):
            PostCreateSchema(content="  \n\t ")

if __name__ == "__main__":
    unittest.main(verbosity=2)