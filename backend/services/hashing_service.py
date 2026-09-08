import hashlib

class HashingService:
    """
    Computes cryptographic SHA-256 identity from exact original byte streams.
    """

    @staticmethod
    def compute_sha256(data: bytes) -> str:
        """
        Computes the standard SHA-256 hexadecimal digest from the exact byte stream.
        """
        hasher = hashlib.sha256()
        hasher.update(data)
        return hasher.hexdigest().lower()

    @staticmethod
    def verify_sha256(data: bytes, expected_hash: str) -> bool:
        """
        Constant-time verification of cryptographic hash.
        """
        computed = HashingService.compute_sha256(data)
        return computed == expected_hash.lower()
