import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth';

const router = Router();

// Pre-seeded users: 1 broker + 16 agents
const USERS = [
  { id: '1', name: 'Sarah Mitchell', email: 'broker@agentadvantage.com', password: bcrypt.hashSync('broker2024!', 10), role: 'broker', agentId: 'BROKER' },
  { id: '2', name: 'James Caldwell', email: 'james@agentadvantage.com', password: bcrypt.hashSync('agent2024!', 10), role: 'agent', agentId: 'AGT001' },
  { id: '3', name: 'Maria Gonzalez', email: 'maria@agentadvantage.com', password: bcrypt.hashSync('agent2024!', 10), role: 'agent', agentId: 'AGT002' },
  { id: '4', name: 'David Chen', email: 'david@agentadvantage.com', password: bcrypt.hashSync('agent2024!', 10), role: 'agent', agentId: 'AGT003' },
  { id: '5', name: 'Ashley Thompson', email: 'ashley@agentadvantage.com', password: bcrypt.hashSync('agent2024!', 10), role: 'agent', agentId: 'AGT004' },
  { id: '6', name: 'Robert Williams', email: 'robert@agentadvantage.com', password: bcrypt.hashSync('agent2024!', 10), role: 'agent', agentId: 'AGT005' },
  { id: '7', name: 'Jennifer Davis', email: 'jennifer@agentadvantage.com', password: bcrypt.hashSync('agent2024!', 10), role: 'agent', agentId: 'AGT006' },
  { id: '8', name: 'Michael Brown', email: 'michael@agentadvantage.com', password: bcrypt.hashSync('agent2024!', 10), role: 'agent', agentId: 'AGT007' },
  { id: '9', name: 'Lisa Martinez', email: 'lisa@agentadvantage.com', password: bcrypt.hashSync('agent2024!', 10), role: 'agent', agentId: 'AGT008' },
  { id: '10', name: 'Kevin Anderson', email: 'kevin@agentadvantage.com', password: bcrypt.hashSync('agent2024!', 10), role: 'agent', agentId: 'AGT009' },
  { id: '11', name: 'Stephanie Wilson', email: 'stephanie@agentadvantage.com', password: bcrypt.hashSync('agent2024!', 10), role: 'agent', agentId: 'AGT010' },
  { id: '12', name: 'Brandon Taylor', email: 'brandon@agentadvantage.com', password: bcrypt.hashSync('agent2024!', 10), role: 'agent', agentId: 'AGT011' },
  { id: '13', name: 'Amanda Johnson', email: 'amanda@agentadvantage.com', password: bcrypt.hashSync('agent2024!', 10), role: 'agent', agentId: 'AGT012' },
  { id: '14', name: 'Tyler Harris', email: 'tyler@agentadvantage.com', password: bcrypt.hashSync('agent2024!', 10), role: 'agent', agentId: 'AGT013' },
  { id: '15', name: 'Nicole Moore', email: 'nicole@agentadvantage.com', password: bcrypt.hashSync('agent2024!', 10), role: 'agent', agentId: 'AGT014' },
  { id: '16', name: 'Dustin Jackson', email: 'dustin@agentadvantage.com', password: bcrypt.hashSync('agent2024!', 10), role: 'agent', agentId: 'AGT015' },
  { id: '17', name: 'Courtney White', email: 'courtney@agentadvantage.com', password: bcrypt.hashSync('agent2024!', 10), role: 'agent', agentId: 'AGT016' },
];

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = USERS.find(u => u.email === email.toLowerCase());
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, agentId: user.agentId },
  });
});

router.get('/users', (_req: Request, res: Response) => {
  res.json(USERS.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, agentId: u.agentId })));
});

export default router;
