import { Role } from '@prisma/client';

// Augment Express Request to carry the authenticated user payload
// after the `authenticate` middleware populates it.

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: Role;
      jti?: string;
    }

    interface Request {
      /**
       * Set by authenticate.middleware.ts after successful JWT verification.
       * Undefined on unauthenticated routes.
       */
      user?: User;
    }
  }
}

export {};
