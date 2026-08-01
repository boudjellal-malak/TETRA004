"""
Configuration pytest — initialisation partagée des tests.

Utilise TestClient comme context manager pour déclencher le lifespan
FastAPI (chargement des modèles) avant l'exécution des tests.
"""

import pytest
from fastapi.testclient import TestClient

from src.api.main import app


@pytest.fixture(scope="session")
def client():
    """
    Client HTTP de test avec lifespan activé (charge les modèles une seule fois
    pour toute la session de tests).
    """
    with TestClient(app) as c:
        yield c
