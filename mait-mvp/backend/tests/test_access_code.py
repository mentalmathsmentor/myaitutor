"""
The site-wide access code check must accept the configured code, reject
anything else, and never write either code to stdout, stderr or logs.
Uses a synthetic code set through the environment, never the real one.
"""
import logging

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers.auth import router

SYNTHETIC_CODE = "SYNTHETIC-CODE-42"
WRONG_CODE = "WRONG-GUESS-99"


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("MAIT_ACCESS_CODE", SYNTHETIC_CODE)
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


@pytest.mark.parametrize("submitted", [SYNTHETIC_CODE, f"  {SYNTHETIC_CODE.lower()}  "])
def test_configured_code_is_accepted(client, submitted):
    response = client.post("/auth/verify-access", json={"code": submitted})
    assert response.status_code == 200
    assert response.json() == {"status": "success"}


@pytest.mark.parametrize("submitted", [WRONG_CODE, "", "ÄÖÜ-non-ascii"])
def test_other_codes_are_rejected(client, submitted):
    response = client.post("/auth/verify-access", json={"code": submitted})
    assert response.status_code == 401


def test_codes_never_reach_output_or_logs(client, capfd, caplog):
    caplog.set_level(logging.DEBUG)
    client.post("/auth/verify-access", json={"code": SYNTHETIC_CODE})
    client.post("/auth/verify-access", json={"code": WRONG_CODE})

    out, err = capfd.readouterr()
    captured = out + err + caplog.text
    assert SYNTHETIC_CODE not in captured
    assert WRONG_CODE not in captured
