import { Router } from 'express';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const usersPath = path.resolve(__dirname, '../users.json');

const loadUsers = async () => {
  const raw = await readFile(usersPath, 'utf-8');
  return JSON.parse(raw);
};

router.post('/login', async (request, response, next) => {
  try {
    const { username, password } = request.body ?? {};

    if (!username || !password) {
      return response.status(400).json({ message: 'Username and password are required' });
    }

    const users = await loadUsers();
    const matchedUser = users.find(
      (user) => user.username === username && user.password === password
    );

    if (!matchedUser) {
      return response.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { sub: matchedUser.username },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '8h' }
    );

    return response.json({ token });
  } catch (error) {
    return next(error);
  }
});

export default router;
