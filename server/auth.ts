import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { isPostgresAvailable } from './db/postgres.js';
import { postgresRepo } from './db/postgresRepository.js';
import { User, SafeUser } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'notenest-super-secret-cryptographic-jwt-key-98247294';

export interface AuthenticatedRequest extends Request {
  user?: SafeUser;
}

export function generateToken(user: SafeUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. No bearer token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; email: string };
    let fullUser = db.findUserById(decoded.id);

    // Fallback: check by email in memory
    if (!fullUser && decoded.email) {
      fullUser = db.findUserByEmail(decoded.email);
    }

    // Fallback: check PostgreSQL database
    if (!fullUser && isPostgresAvailable()) {
      try {
        const pgUser = await postgresRepo.findUserById(decoded.id) || (decoded.email ? await postgresRepo.findUserByEmail(decoded.email) : null);
        if (pgUser) {
          db.syncUserFromPg(pgUser);
          fullUser = pgUser;
        }
      } catch (err: any) {
        console.warn('PostgreSQL auth user lookup warning:', err.message);
      }
    }

    if (!fullUser) {
      res.status(401).json({ error: 'User associated with token no longer exists.' });
      return;
    }

    req.user = db.toSafeUser(fullUser);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
    return;
  }
}

