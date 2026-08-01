"""Domain-layer exceptions."""


class DomainError(Exception):
    """Base domain error."""


class NotFoundError(DomainError):
    pass


class ForbiddenError(DomainError):
    pass


class ConflictError(DomainError):
    pass


class ValidationDomainError(DomainError):
    pass


class PayloadTooLargeError(DomainError):
    """Upload exceeds configured size limit (HTTP 413)."""
