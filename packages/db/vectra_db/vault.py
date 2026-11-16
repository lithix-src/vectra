"""AES-256-GCM Envelope Encryption Vault with KMS Abstraction.

Only Temporal workers decrypt raw OAuth tokens / session cookies in memory.
The API layer stores encrypted envelopes and exposes masked metadata.
"""
from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass
from typing import Any, Dict

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


@dataclass(frozen=True)
class EncryptedEnvelope:
    encrypted_dek: bytes
    encryption_iv: bytes
    ciphertext: bytes
    auth_tag: bytes


class KMSEnvelopeVault:
    """AES-256-GCM envelope encryption using a Key Encryption Key (KEK) and per-record DEK."""

    def __init__(self, master_secret: str | None = None) -> None:
        raw_secret = master_secret or os.getenv(
            "VECTRA_KMS_MASTER_KEY",
            "vectra-enterprise-kms-master-kek-2026-erik-advisory-os",
        )
        self._kek: bytes = hashlib.sha256(raw_secret.encode("utf-8")).digest()

    def encrypt_payload(self, payload: Dict[str, Any], aad_context: str = "vectra-rls-vault") -> EncryptedEnvelope:
        """Encrypt a credential dictionary with a fresh 256-bit DEK and wrap the DEK with the KEK."""
        dek = AESGCM.generate_key(bit_length=256)
        dek_iv = os.urandom(12)
        kek_cipher = AESGCM(self._kek)
        wrapped_dek = kek_cipher.encrypt(dek_iv, dek, aad_context.encode("utf-8"))
        # Store dek_iv (12 bytes) + wrapped_dek together in encrypted_dek
        encrypted_dek_blob = dek_iv + wrapped_dek

        data_iv = os.urandom(12)
        data_cipher = AESGCM(dek)
        plaintext = json.dumps(payload, sort_keys=True).encode("utf-8")
        ct_with_tag = data_cipher.encrypt(data_iv, plaintext, aad_context.encode("utf-8"))
        ciphertext = ct_with_tag[:-16]
        auth_tag = ct_with_tag[-16:]

        return EncryptedEnvelope(
            encrypted_dek=encrypted_dek_blob,
            encryption_iv=data_iv,
            ciphertext=ciphertext,
            auth_tag=auth_tag,
        )

    def decrypt_in_worker_memory(
        self,
        envelope: EncryptedEnvelope,
        aad_context: str = "vectra-rls-vault",
    ) -> Dict[str, Any]:
        """Decrypt envelope in-memory inside Temporal worker activities."""
        dek_iv = envelope.encrypted_dek[:12]
        wrapped_dek = envelope.encrypted_dek[12:]
        kek_cipher = AESGCM(self._kek)
        dek = kek_cipher.decrypt(dek_iv, wrapped_dek, aad_context.encode("utf-8"))

        data_cipher = AESGCM(dek)
        ct_with_tag = envelope.ciphertext + envelope.auth_tag
        plaintext = data_cipher.decrypt(envelope.encryption_iv, ct_with_tag, aad_context.encode("utf-8"))
        return json.loads(plaintext.decode("utf-8"))
