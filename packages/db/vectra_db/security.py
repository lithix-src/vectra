"""Per-Tenant HKDF-SHA256 Key Derivation & AES-256-GCM KMS Envelope Vault.

Provides HKDF-SHA256 derived tenant key encryption keys (KEKs) with 96-bit (12-byte)
GCM nonces and re-exports `KMSEnvelopeVault` and `EncryptedEnvelope`.
"""
from __future__ import annotations

import os

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from .vault import EncryptedEnvelope, KMSEnvelopeVault


def derive_tenant_kek_hkdf(tenant_id: str, master_secret: str | None = None) -> bytes:
    """Derive a deterministic 256-bit (32-byte) tenant KEK via HKDF-SHA256."""
    raw_secret = (
        master_secret
        or os.getenv(
            "VECTRA_KMS_MASTER_KEY",
            "vectra-enterprise-kms-master-kek-2026-erik-advisory-os",
        )
    ).encode("utf-8")
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"vectra-kms-hkdf-salt-v1",
        info=f"vectra-tenant-kek:{tenant_id}".encode("utf-8"),
    )
    return hkdf.derive(raw_secret)


__all__ = [
    "EncryptedEnvelope",
    "KMSEnvelopeVault",
    "derive_tenant_kek_hkdf",
]
