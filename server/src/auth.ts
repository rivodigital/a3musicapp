import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { User } from './types';

export const USERS: User[] = [
    { id: '1', username: 'admin', role: 'admin' },
    { id: '2', username: 'musico1', role: 'musician', auxIndex: 0 },
    { id: '3', username: 'musico2', role: 'musician', auxIndex: 1 },
];

export const generateToken = (user: User) => {
    return jwt.sign(user, config.jwtSecret, { expiresIn: '12h' });
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Token error' });
    }

    const token = parts[1];
    jwt.verify(token, config.jwtSecret, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid token' });

        // Attach user to request
        (req as any).user = decoded;
        next();
    });
};

export const verifyWebSocketAuth = (token: string): User | null => {
    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        return decoded as User;
    } catch (e) {
        return null;
    }
};
